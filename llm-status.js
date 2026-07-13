(() => {
  'use strict';

  const chip = document.getElementById('aiStatusChip');
  if (!chip) return;

  const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwHY7B15trgsBZZcug2snywAO2AVg8LfmpshAdxlGa0Afe9d_yW-tyaewmSOix5IrEl/exec';
  const validGasUrl = url => /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec(?:\?.*)?$/i.test(String(url || '').trim());
  const getGasUrl = () => {
    const saved = localStorage.getItem('jsd_gas_url');
    return validGasUrl(saved) ? saved.trim() : DEFAULT_GAS_URL;
  };

  const style = document.createElement('style');
  style.textContent = `
    #aiStatusChip.ai-status{justify-content:flex-start;width:max-content;max-width:100%;padding:8px 11px;border:1px solid var(--line);border-radius:999px;background:var(--surface);font-weight:800;cursor:pointer;user-select:none;transition:transform .15s ease,border-color .15s ease,background .15s ease}
    #aiStatusChip.ai-status:hover{transform:translateY(-1px)}
    #aiStatusChip.ai-status:focus-visible{outline:3px solid color-mix(in srgb,var(--blue) 30%,transparent);outline-offset:2px}
    #aiStatusChip.ai-status::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--muted2);flex:0 0 auto}
    #aiStatusChip.ai-status.ok{color:var(--good);border-color:color-mix(in srgb,var(--good) 35%,var(--line));background:color-mix(in srgb,var(--good) 7%,var(--surface))}
    #aiStatusChip.ai-status.ok::before{background:var(--good);box-shadow:0 0 0 4px color-mix(in srgb,var(--good) 15%,transparent)}
    #aiStatusChip.ai-status.busy{color:var(--warn);border-color:color-mix(in srgb,var(--warn) 35%,var(--line));background:color-mix(in srgb,var(--warn) 7%,var(--surface))}
    #aiStatusChip.ai-status.busy::before{background:var(--warn);animation:jsdAiPulse 1.2s ease-in-out infinite}
    #aiStatusChip.ai-status.bad{color:var(--bad);border-color:color-mix(in srgb,var(--bad) 35%,var(--line));background:color-mix(in srgb,var(--bad) 6%,var(--surface))}
    #aiStatusChip.ai-status.bad::before{background:var(--bad)}
    @keyframes jsdAiPulse{0%,100%{opacity:.45;transform:scale(.8)}50%{opacity:1;transform:scale(1.15)}}
  `;
  document.head.appendChild(style);

  let busy = false;
  let lastChecked = 0;
  let lastModel = 'Gemini';
  let currentKind = 'busy';
  let currentText = 'LLM 연결 확인 중…';
  let currentDetail = '';
  let rendering = false;

  function show(kind, text, detail = '') {
    currentKind = kind;
    currentText = text;
    currentDetail = detail;
    rendering = true;
    chip.className = `ai-status ${kind}`;
    chip.textContent = text;
    chip.setAttribute('role', 'button');
    chip.setAttribute('tabindex', '0');
    chip.setAttribute('aria-live', 'polite');
    chip.setAttribute('aria-label', `${text}. 눌러서 연결 상태를 다시 확인합니다.`);
    chip.title = detail || (kind === 'ok' ? '눌러서 실제 LLM 응답까지 다시 확인합니다.' : '눌러서 LLM 연결을 다시 시도합니다.');
    queueMicrotask(() => { rendering = false; });
  }

  function toast(message) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function payloadB64(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj || {}));
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function jsonp(action, params = {}, timeout = 16000) {
    const gasUrl = getGasUrl();
    if (!validGasUrl(gasUrl)) return Promise.reject(new Error('Apps Script 서버 주소가 올바르지 않습니다.'));
    return new Promise((resolve, reject) => {
      const callback = `jsd_llm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const script = document.createElement('script');
      const timer = setTimeout(() => done(new Error('LLM 서버 응답 시간이 초과되었습니다.')), timeout);
      function done(error, data) {
        clearTimeout(timer);
        try { delete window[callback]; } catch (_) {}
        script.remove();
        error ? reject(error) : resolve(data);
      }
      window[callback] = data => done(null, data);
      script.onerror = () => done(new Error('LLM 서버 연결에 실패했습니다.'));
      const query = new URLSearchParams({action, callback, payload_b64: payloadB64(params)});
      script.src = `${gasUrl}?${query.toString()}`;
      document.head.appendChild(script);
    });
  }

  function updateDiagnostics(health) {
    const box = document.getElementById('serverDiagnostics');
    if (!box || !health) return;
    const lines = box.textContent.split('\n').filter(line => !line.startsWith('LLM:'));
    lines.push(health.geminiConfigured === true ? `LLM: 연결 준비 완료 (${health.geminiModel || 'Gemini'})` : 'LLM: API 키 미설정');
    box.textContent = lines.join('\n');
  }

  async function verify(forceProbe = false) {
    if (busy) return;
    if (!navigator.onLine) {
      show('bad', '네트워크 오프라인 · 연결 대기');
      return;
    }
    busy = true;
    show('busy', forceProbe ? 'Gemini 실제 응답 확인 중…' : 'LLM 연결 확인 중…');
    try {
      const health = await jsonp('health', {}, 12000);
      lastChecked = Date.now();
      if (!health?.ok) throw new Error(health?.error || '백엔드 상태 응답이 올바르지 않습니다.');
      updateDiagnostics(health);
      if (health.geminiConfigured !== true) throw new Error('Gemini API 키가 설정되지 않았습니다.');
      lastModel = health.geminiModel || 'Gemini';
      if (forceProbe) {
        const probe = await jsonp('askAI', {q: '연결 상태 확인입니다. OK라고만 답해 주세요.', connection_test: true}, 22000);
        const answer = probe?.answer || probe?.text || probe?.message;
        if (!answer) throw new Error(probe?.error || 'Gemini가 응답하지 않았습니다.');
      }
      show('ok', `Gemini LLM 연결됨 · ${lastModel}`);
      if (forceProbe) toast('Gemini LLM 실제 응답까지 확인했습니다.');
    } catch (error) {
      show('bad', 'LLM 연결 끊김 · 눌러서 재연결', error?.message || String(error));
      if (forceProbe) toast(error?.message || 'LLM 재연결에 실패했습니다.');
    } finally {
      busy = false;
    }
  }

  const chat = document.getElementById('chat');
  if (chat) {
    new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement) || !node.classList.contains('bubble') || !node.classList.contains('ai')) continue;
          const text = node.textContent || '';
          if (/서버 응답을 받지 못해|LLM 연결이 끊겨|로컬 안내로 전환/.test(text)) {
            show('bad', 'LLM 연결 끊김 · 눌러서 재연결');
          } else if (text && !/로컬 안내/.test(text)) {
            show('ok', `Gemini LLM 연결됨 · ${lastModel}`);
          }
        }
      }
    }).observe(chat, {childList: true});
  }

  new MutationObserver(() => {
    if (rendering) return;
    requestAnimationFrame(() => show(currentKind, currentText, currentDetail));
  }).observe(chip, {childList: true, attributes: true, subtree: true});

  const reconnect = () => verify(true);
  chip.addEventListener('click', reconnect);
  chip.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      reconnect();
    }
  });

  window.addEventListener('offline', () => show('bad', '네트워크 오프라인 · 연결 대기'));
  window.addEventListener('online', () => verify(false));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - lastChecked > 60000) verify(false);
  });
  setInterval(() => {
    if (!document.hidden && Date.now() - lastChecked > 60000) verify(false);
  }, 60000);

  show('busy', 'LLM 연결 확인 중…');
  setTimeout(() => verify(false), 350);
})();