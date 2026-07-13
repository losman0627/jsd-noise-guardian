(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN;
  const median = a => {
    const s = a.filter(Number.isFinite).slice().sort((x, y) => x - y);
    if (!s.length) return NaN;
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const format = (v, digits = 0) => Number.isFinite(v) ? v.toFixed(digits) : '--';
  const userId = localStorage.getItem('jsd_user_id') || `u_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem('jsd_user_id', userId);

  const state = {
    stream: null, track: null, ctx: null, source: null, analyser: null,
    time: null, freq: null, spectrumFloor: null, raf: 0, measuring: false,
    instantDb: NaN, stableDb: NaN, maxDb: NaN, dominant: NaN, confidence: 0,
    topPeaks: [], freqHistory: [], dbHistory: [], chartHistory: [],
    expectedFreq: Number(localStorage.getItem('jsd_expected_freq')) || 0,
    currentCandidate: null, pendingCandidate: null, pendingCount: 0, lastUi: 0,
    map: null, mapLayer: null, gasUrl: localStorage.getItem('jsd_gas_url') || '',
    anc: {
      lockedFreq: 0, on: false, busy: false, osc: null, delay: null, gain: null,
      baselineDb: NaN, residualDb: NaN, phase: 180, history: [], monitor: null,
      badCount: 0, tuneToken: 0
    }
  };

  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  function setTheme(theme) {
    document.body.dataset.theme = theme;
    localStorage.setItem('jsd_theme', theme);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', theme === 'dark' ? '#0b1322' : '#f4f6fb');
  }
  setTheme(localStorage.getItem('jsd_theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  $('themeButton').addEventListener('click', () => setTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark'));

  function navigate(name) {
    document.querySelectorAll('.screen').forEach(x => x.classList.toggle('active', x.id === `screen-${name}`));
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x.dataset.nav === name));
    window.scrollTo({top: 0, behavior: 'smooth'});
    if (name === 'map') initMap();
  }
  document.querySelectorAll('[data-nav]').forEach(x => x.addEventListener('click', () => navigate(x.dataset.nav)));

  function grade(db) {
    if (!Number.isFinite(db)) return ['대기 중', 'var(--muted2)'];
    if (db < 45) return ['조용함', 'var(--good)'];
    if (db < 60) return ['보통', 'var(--blue)'];
    if (db < 70) return ['주의', 'var(--warn)'];
    if (db < 80) return ['높음', 'var(--bad)'];
    return ['매우 높음', 'var(--bad)'];
  }

  function constraintsFor(deviceId, exact = true) {
    const raw = exact ? {exact: false} : false;
    return {
      echoCancellation: raw,
      noiseSuppression: raw,
      autoGainControl: raw,
      channelCount: {ideal: 1},
      sampleRate: {ideal: 48000},
      ...(deviceId ? {deviceId: exact ? {exact: deviceId} : {ideal: deviceId}} : {})
    };
  }

  async function requestMicrophone(deviceId = '') {
    try {
      return await navigator.mediaDevices.getUserMedia({audio: constraintsFor(deviceId, true), video: false});
    } catch (error) {
      if (error && ['OverconstrainedError', 'TypeError'].includes(error.name)) {
        return navigator.mediaDevices.getUserMedia({audio: constraintsFor(deviceId, false), video: false});
      }
      throw error;
    }
  }

  async function startMeasurement(deviceId = $('micSelect').value) {
    if (state.measuring) return true;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('마이크 기능은 HTTPS 주소와 지원 브라우저에서만 사용할 수 있습니다.');
    }
    $('measureStatus').textContent = '마이크를 연결하고 있습니다…';
    let stream;
    try {
      stream = await requestMicrophone(deviceId);
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error('Web Audio API를 지원하지 않는 브라우저입니다.');
      const ctx = new AudioCtx({latencyHint: 'interactive'});
      await ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 32768;
      analyser.smoothingTimeConstant = 0.08;
      analyser.minDecibels = -110;
      analyser.maxDecibels = -10;
      source.connect(analyser);

      state.stream = stream;
      state.track = stream.getAudioTracks()[0];
      state.ctx = ctx;
      state.source = source;
      state.analyser = analyser;
      state.time = new Float32Array(analyser.fftSize);
      state.freq = new Float32Array(analyser.frequencyBinCount);
      state.spectrumFloor = null;
      state.measuring = true;
      state.stableDb = state.instantDb = state.maxDb = NaN;
      state.dominant = NaN;
      state.freqHistory = [];
      state.dbHistory = [];
      state.chartHistory = [];
      state.lastUi = 0;
      state.currentCandidate = null;
      state.pendingCandidate = null;
      state.pendingCount = 0;

      state.track.addEventListener('ended', () => stopMeasurement('마이크 연결이 종료되었습니다.'));
      $('startMeasure').disabled = true;
      $('stopMeasure').disabled = false;
      $('saveLocal').disabled = false;
      $('saveServer').disabled = !isGasUrl(state.gasUrl);
      $('measureStatus').textContent = '측정 중 · ANC 출력 전에는 전체 피크를 분석합니다.';
      await refreshDevices();
      renderTrackSettings();
      state.raf = requestAnimationFrame(loop);
      return true;
    } catch (error) {
      if (stream) stream.getTracks().forEach(t => t.stop());
      stopMeasurement('측정을 시작하지 못했습니다.');
      throw error;
    }
  }

  function stopMeasurement(message = '측정을 정지했습니다.') {
    stopAnc('측정이 중단되어 ANC도 정지했습니다.', false);
    state.measuring = false;
    cancelAnimationFrame(state.raf);
    if (state.stream) state.stream.getTracks().forEach(t => t.stop());
    if (state.source) { try { state.source.disconnect(); } catch (_) {} }
    if (state.ctx) state.ctx.close().catch(() => {});
    Object.assign(state, {stream: null, track: null, ctx: null, source: null, analyser: null, time: null, freq: null});
    $('startMeasure').disabled = false;
    $('stopMeasure').disabled = true;
    $('saveLocal').disabled = true;
    $('saveServer').disabled = true;
    $('measureStatus').textContent = message;
    $('trackSettings').textContent = '마이크가 정지되었습니다.';
    $('homeMic').textContent = '마이크 미사용';
  }

  function frameDb(buffer, calibration) {
    const count = Math.min(4096, buffer.length);
    const start = buffer.length - count;
    let avg = 0;
    for (let i = start; i < buffer.length; i++) avg += buffer[i];
    avg /= count;
    let sum = 0;
    for (let i = start; i < buffer.length; i++) {
      const v = buffer[i] - avg;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / count);
    return 20 * Math.log10(Math.max(rms, 1e-9)) + calibration;
  }

  function toneAmplitudeDb(buffer, frequency, sampleRate) {
    if (!buffer || !Number.isFinite(frequency) || frequency < 20 || frequency > sampleRate / 2) return -120;
    const count = Math.min(8192, buffer.length);
    const start = buffer.length - count;
    const w = 2 * Math.PI * frequency / sampleRate;
    let sumSin = 0, sumCos = 0, weightSum = 0;
    for (let n = 0; n < count; n++) {
      const win = 0.5 - 0.5 * Math.cos(2 * Math.PI * n / (count - 1));
      const x = buffer[start + n] * win;
      sumCos += x * Math.cos(w * n);
      sumSin += x * Math.sin(w * n);
      weightSum += win;
    }
    const amp = 2 * Math.hypot(sumCos, sumSin) / Math.max(weightSum, 1e-9);
    return 20 * Math.log10(Math.max(amp, 1e-9));
  }

  function localCorrelation(buffer, frequency, sampleRate) {
    const lag = sampleRate / frequency;
    const whole = Math.floor(lag);
    const frac = lag - whole;
    const count = Math.min(3072, buffer.length - whole - 2);
    if (count < 512) return 0;
    const start = buffer.length - count - whole - 2;
    let mx = 0, my = 0;
    for (let i = 0; i < count; i++) {
      const x = buffer[start + i];
      const j = start + i + whole;
      const y = buffer[j] * (1 - frac) + buffer[j + 1] * frac;
      mx += x; my += y;
    }
    mx /= count; my /= count;
    let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < count; i++) {
      const x = buffer[start + i] - mx;
      const j = start + i + whole;
      const y = buffer[j] * (1 - frac) + buffer[j + 1] * frac - my;
      num += x * y; dx += x * x; dy += y * y;
    }
    return dx > 1e-12 && dy > 1e-12 ? clamp(num / Math.sqrt(dx * dy), -1, 1) : 0;
  }

  function analyzeSpectrum() {
    state.analyser.getFloatFrequencyData(state.freq);
    const sr = state.ctx.sampleRate;
    const fftSize = state.analyser.fftSize;
    const binHz = sr / fftSize;
    const minBin = Math.max(2, Math.ceil(40 / binHz));
    const maxBin = Math.min(state.freq.length - 3, Math.floor(600 / binHz));
    if (!state.spectrumFloor || state.spectrumFloor.length !== state.freq.length) {
      state.spectrumFloor = Float32Array.from(state.freq);
    }
    const values = [];
    for (let i = minBin; i <= maxBin; i++) values.push(state.freq[i]);
    const globalFloor = median(values);
    const radius = Math.max(10, Math.round(35 / binHz));
    const guard = Math.max(2, Math.round(5 / binHz));
    const candidates = [];

    for (let k = minBin + 2; k <= maxBin - 2; k++) {
      const b = state.freq[k];
      if (!(b > state.freq[k - 1] && b >= state.freq[k + 1])) continue;
      const around = [];
      for (let i = Math.max(minBin, k - radius); i <= Math.min(maxBin, k + radius); i++) {
        if (Math.abs(i - k) > guard) around.push(state.freq[i]);
      }
      const localFloor = around.length ? median(around) : globalFloor;
      const prominence = b - localFloor;
      const novelty = b - state.spectrumFloor[k];
      if (b < -102 || (prominence < 4.5 && novelty < 7)) continue;
      const a = state.freq[k - 1], c = state.freq[k + 1];
      const den = a - 2 * b + c;
      const delta = Math.abs(den) > 1e-6 ? clamp(0.5 * (a - c) / den, -0.5, 0.5) : 0;
      const f = (k + delta) * binHz;
      const corr = Math.max(0, localCorrelation(state.time, f, sr));
      const continuity = Number.isFinite(state.dominant) ? Math.max(0, 5 - Math.abs(f - state.dominant) / Math.max(3, state.dominant * 0.018)) : 0;
      const expectedBonus = state.expectedFreq ? Math.max(0, 16 - Math.abs(f - state.expectedFreq) * 0.8) : 0;
      const score = prominence * 1.9 + Math.max(0, novelty) * 0.7 + Math.max(0, b - globalFloor) * 0.25 + corr * 6 + continuity + expectedBonus;
      candidates.push({f, bin: k, db: b, prominence, novelty, corr, score});
    }
    candidates.sort((x, y) => y.score - x.score);
    state.topPeaks = candidates.slice(0, 5);

    let selected = null;
    if (state.expectedFreq) {
      const radiusHz = Math.max(14, state.expectedFreq * 0.06);
      selected = candidates.filter(x => Math.abs(x.f - state.expectedFreq) <= radiusHz).sort((x, y) => y.db - x.db)[0] || null;
      if (!selected) {
        const exactDb = toneAmplitudeDb(state.time, state.expectedFreq, sr);
        selected = {f: state.expectedFreq, db: exactDb, prominence: 0, novelty: 0, corr: 0, score: 0, tracked: true};
      }
    } else {
      selected = candidates[0] || null;
    }

    if (selected) {
      const proposed = selected.f;
      if (!Number.isFinite(state.dominant) || Math.abs(proposed - state.dominant) <= Math.max(6, state.dominant * 0.035) || state.expectedFreq) {
        state.dominant = Number.isFinite(state.dominant) ? state.dominant * 0.58 + proposed * 0.42 : proposed;
        state.pendingCandidate = null; state.pendingCount = 0;
      } else {
        const samePending = state.pendingCandidate && Math.abs(proposed - state.pendingCandidate) < Math.max(5, proposed * 0.025);
        state.pendingCandidate = proposed;
        state.pendingCount = samePending ? state.pendingCount + 1 : 1;
        if (state.pendingCount >= 4) {
          state.dominant = proposed;
          state.pendingCandidate = null; state.pendingCount = 0;
          state.freqHistory = [];
        }
      }
      const second = candidates[1];
      const gap = second ? selected.score - second.score : 10;
      state.confidence = clamp(0.28 + Math.min(Math.max(selected.prominence, 0), 24) / 42 + Math.min(Math.max(gap, 0), 12) / 30 + (state.expectedFreq ? 0.18 : 0), 0, 1);
      state.freqHistory.push(state.dominant);
      if (state.freqHistory.length > 28) state.freqHistory.shift();
    } else {
      state.confidence = Math.max(0, state.confidence - 0.1);
    }

    for (let i = minBin; i <= maxBin; i++) {
      const target = state.freq[i];
      const rate = target < state.spectrumFloor[i] ? 0.08 : 0.004;
      state.spectrumFloor[i] += (target - state.spectrumFloor[i]) * rate;
    }
  }

  function loop(ts) {
    if (!state.measuring) return;
    state.analyser.getFloatTimeDomainData(state.time);
    state.instantDb = frameDb(state.time, Number($('calibration').value));
    analyzeSpectrum();
    if (!state.lastUi || ts - state.lastUi >= 105) {
      const target = state.instantDb;
      const attack = 0.72, release = 0.28;
      const alpha = !Number.isFinite(state.stableDb) || target >= state.stableDb ? attack : release;
      state.stableDb = Number.isFinite(state.stableDb) ? state.stableDb + (target - state.stableDb) * alpha : target;
      state.stableDb = clamp(state.stableDb, 10, 120);
      state.maxDb = Number.isFinite(state.maxDb) ? Math.max(state.maxDb, state.instantDb) : state.instantDb;
      state.dbHistory.push(state.stableDb);
      if (state.dbHistory.length > 180) state.dbHistory.shift();
      state.chartHistory.push({db: state.stableDb, f: state.dominant, t: Date.now()});
      if (state.chartHistory.length > 150) state.chartHistory.shift();
      renderMeasurement();
      state.lastUi = ts;
    }
    state.raf = requestAnimationFrame(loop);
  }

  function renderMeasurement() {
    const db = state.stableDb;
    const [label, color] = grade(db);
    $('dbValue').textContent = format(db);
    $('instantDb').textContent = format(state.instantDb);
    $('maxDb').textContent = format(state.maxDb);
    $('dominantFreq').textContent = format(state.dominant);
    $('freqConfidence').textContent = format(state.confidence * 100);
    $('dbGrade').textContent = label;
    $('dbGrade').style.color = color;
    const circumference = 405;
    const p = clamp((db - 20) / 80, 0, 1);
    $('gaugeFill').style.strokeDashoffset = String(circumference * (1 - p));
    $('gaugeFill').style.stroke = color;
    $('homeDb').textContent = format(db);
    $('homeFreq').textContent = `${format(state.dominant)} Hz`;
    $('homeSummary').textContent = `${label} · ${format(state.dominant)}Hz · 검출 신뢰도 ${format(state.confidence * 100)}%`;
    renderSpectrum();
    renderHistory();
    renderPeakList();
    if (state.anc.on && state.anc.lockedFreq) updateAncResidual();
  }

  function drawCanvasBase(ctx, canvas) {
    const dark = document.body.dataset.theme === 'dark';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = dark ? '#101b30' : '#f2f5fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = dark ? '#2a3c5d' : '#dce3ed';
    ctx.lineWidth = 1;
  }

  function renderSpectrum() {
    const canvas = $('spectrumCanvas'), ctx = canvas.getContext('2d');
    drawCanvasBase(ctx, canvas);
    if (!state.freq || !state.ctx) return;
    const sr = state.ctx.sampleRate, n = state.analyser.fftSize, binHz = sr / n;
    const min = Math.ceil(40 / binHz), max = Math.floor(600 / binHz);
    const width = canvas.width, height = canvas.height;
    const floor = -105, ceiling = -25;
    ctx.beginPath();
    for (let px = 0; px < width; px++) {
      const f = 40 + (560 * px / (width - 1));
      const bin = clamp(Math.round(f / binHz), min, max);
      const value = state.freq[bin];
      const y = height - clamp((value - floor) / (ceiling - floor), 0, 1) * (height - 18) - 8;
      if (px === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
    }
    ctx.strokeStyle = '#397fc0'; ctx.lineWidth = 3; ctx.stroke();
    const markers = [];
    if (Number.isFinite(state.dominant)) markers.push({f: state.dominant, color: '#ffd400', label: `${Math.round(state.dominant)}Hz`});
    if (state.expectedFreq) markers.push({f: state.expectedFreq, color: '#278a5b', label: `추적 ${Math.round(state.expectedFreq)}Hz`});
    if (state.anc.lockedFreq) markers.push({f: state.anc.lockedFreq, color: '#d94747', label: `잠금 ${Math.round(state.anc.lockedFreq)}Hz`});
    markers.forEach(m => {
      const x = (m.f - 40) / 560 * width;
      ctx.strokeStyle = m.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      ctx.fillStyle = m.color; ctx.font = 'bold 24px sans-serif'; ctx.fillText(m.label, clamp(x + 7, 8, width - 170), 28);
    });
  }

  function renderHistory() {
    const canvas = $('historyCanvas'), ctx = canvas.getContext('2d');
    drawCanvasBase(ctx, canvas);
    const data = state.chartHistory;
    if (data.length < 2) return;
    const w = canvas.width, h = canvas.height;
    ctx.strokeStyle = '#ffd400'; ctx.lineWidth = 3; ctx.beginPath();
    data.forEach((d, i) => {
      const x = i / (data.length - 1) * w;
      const y = h - clamp((d.db - 20) / 80, 0, 1) * (h - 16) - 8;
      if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }); ctx.stroke();
    ctx.strokeStyle = '#397fc0'; ctx.lineWidth = 2; ctx.beginPath();
    data.forEach((d, i) => {
      const x = i / (data.length - 1) * w;
      const y = h - clamp((Number.isFinite(d.f) ? d.f : 40) - 40, 0, 560) / 560 * (h - 16) - 8;
      if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }); ctx.stroke();
  }

  function renderPeakList() {
    const peaks = state.topPeaks.slice(0, 3);
    $('peakList').innerHTML = peaks.length ? peaks.map((p, i) => `<span>${i + 1}위 ${Math.round(p.f)}Hz · ${p.db.toFixed(1)}dBFS</span>`).join('') : '<span>뚜렷한 피크가 없습니다.</span>';
    $('spectrumMode').textContent = state.expectedFreq ? `${Math.round(state.expectedFreq)}Hz 주변 추적` : '자동 피크 탐색';
  }

  async function refreshDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter(d => d.kind === 'audioinput');
      const outputs = devices.filter(d => d.kind === 'audiooutput');
      const selectedMic = $('micSelect').value;
      $('micSelect').innerHTML = '<option value="">시스템 기본 마이크</option>' + inputs.map((d, i) => `<option value="${escapeHtml(d.deviceId)}">${escapeHtml(d.label || `마이크 ${i + 1}`)}</option>`).join('');
      if ([...$('micSelect').options].some(o => o.value === selectedMic)) $('micSelect').value = selectedMic;
      const selectedOut = $('outputSelect').value;
      $('outputSelect').innerHTML = '<option value="">시스템 기본 출력</option>' + outputs.map((d, i) => `<option value="${escapeHtml(d.deviceId)}">${escapeHtml(d.label || `출력 ${i + 1}`)}</option>`).join('');
      if ([...$('outputSelect').options].some(o => o.value === selectedOut)) $('outputSelect').value = selectedOut;
    } catch (_) {}
  }

  function renderTrackSettings() {
    if (!state.track) return;
    const s = state.track.getSettings ? state.track.getSettings() : {};
    const lines = [
      `입력 장치: ${state.track.label || '장치명 확인 불가'}`,
      `에코 제거: ${settingText(s.echoCancellation)}`,
      `소음 억제: ${settingText(s.noiseSuppression)}`,
      `자동 이득: ${settingText(s.autoGainControl)}`,
      `샘플레이트: ${s.sampleRate || state.ctx?.sampleRate || '확인 불가'} Hz`,
      `채널 수: ${s.channelCount || '확인 불가'}`
    ];
    $('trackSettings').textContent = lines.join('\n');
    $('homeMic').textContent = state.track.label || '마이크 연결됨';
  }
  function settingText(v) { return v === true ? '켜짐' : v === false ? '꺼짐' : '확인 불가'; }
  function escapeHtml(v) { return String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  function applyExpectedFrequency(value) {
    const f = Number(value);
    state.expectedFreq = Number.isFinite(f) && f >= 40 && f <= 600 ? f : 0;
    if (state.expectedFreq) {
      localStorage.setItem('jsd_expected_freq', String(state.expectedFreq));
      $('expectedFrequency').value = String(state.expectedFreq);
      toast(`${Math.round(state.expectedFreq)}Hz 주변 추적을 시작합니다.`);
    } else {
      localStorage.removeItem('jsd_expected_freq');
      $('expectedFrequency').value = '';
      toast('자동 피크 탐색으로 전환했습니다.');
    }
    state.dominant = NaN; state.freqHistory = [];
  }
  if (state.expectedFreq) $('expectedFrequency').value = state.expectedFreq;
  $('applyExpected').addEventListener('click', () => applyExpectedFrequency($('expectedFrequency').value));
  $('clearExpected').addEventListener('click', () => applyExpectedFrequency(0));
  document.querySelectorAll('[data-expected]').forEach(x => x.addEventListener('click', () => applyExpectedFrequency(x.dataset.expected)));
  $('calibration').addEventListener('input', () => { $('calibrationOutput').textContent = `${$('calibration').value} dB`; });

  $('startMeasure').addEventListener('click', async () => {
    try { await startMeasurement(); } catch (e) { toast(e.message || String(e)); $('measureStatus').textContent = e.message || String(e); }
  });
  $('stopMeasure').addEventListener('click', () => stopMeasurement());
  $('refreshDevices').addEventListener('click', async () => { await refreshDevices(); toast('오디오 장치 목록을 새로고침했습니다.'); });
  $('reconnectMic').addEventListener('click', async () => {
    const id = $('micSelect').value;
    if (state.measuring) stopMeasurement('마이크를 다시 연결합니다.');
    try { await startMeasurement(id); toast('선택한 입력 장치로 다시 연결했습니다.'); } catch (e) { toast(e.message || String(e)); }
  });

  async function captureTarget(manual = 0) {
    if (!state.measuring) await startMeasurement();
    let f = Number(manual) || state.expectedFreq || state.dominant;
    if (!Number.isFinite(f) || f < 40 || f > 600) throw new Error('40~600Hz 범위의 목표 주파수를 확인하지 못했습니다.');
    if (!manual && !state.expectedFreq && state.confidence < 0.38) throw new Error('주파수 신뢰도가 낮습니다. 수동 목표 주파수를 입력하세요.');
    state.anc.lockedFreq = Math.round(f * 10) / 10;
    $('lockedFrequency').textContent = `${format(state.anc.lockedFreq, 1)} Hz`;
    $('lockState').textContent = 'ANC 실행 중에도 이 목표는 자동으로 바뀌지 않습니다.';
    $('homeAnc').textContent = `${format(state.anc.lockedFreq, 1)} Hz 잠금`;
    $('manualAncFrequency').value = String(Math.round(state.anc.lockedFreq));
    renderSpectrum();
    return state.anc.lockedFreq;
  }

  function unlockTarget() {
    if (state.anc.on || state.anc.busy) stopAnc('목표 잠금을 해제해 ANC를 정지했습니다.');
    state.anc.lockedFreq = 0;
    $('lockedFrequency').textContent = '-- Hz';
    $('lockState').textContent = '아직 잠그지 않았습니다.';
    $('homeAnc').textContent = '잠금 안 됨';
    renderSpectrum();
  }

  function setAncPhase(phase) {
    state.anc.phase = ((Number(phase) % 360) + 360) % 360;
    $('ancPhase').value = String(Math.round(state.anc.phase));
    $('ancPhaseValue').textContent = `${Math.round(state.anc.phase)}°`;
    $('phaseValue').textContent = format(state.anc.phase);
    if (state.anc.delay && state.anc.lockedFreq) {
      const seconds = state.anc.phase / 360 / state.anc.lockedFreq;
      state.anc.delay.delayTime.setTargetAtTime(seconds, state.ctx.currentTime, 0.015);
    }
  }

  function outputGainValue() {
    const percent = Number($('ancOutput').value);
    return clamp(percent / 100 * 0.08, 0.001, 0.04);
  }

  async function applyOutputDevice() {
    if (!state.ctx || typeof state.ctx.setSinkId !== 'function') {
      $('outputSupport').textContent = '이 브라우저는 웹페이지의 직접 출력 장치 선택을 지원하지 않습니다. Android 미디어 출력에서 유선 스피커를 선택하세요.';
      return;
    }
    try {
      await state.ctx.setSinkId($('outputSelect').value || '');
      $('outputSupport').textContent = '선택한 출력 장치를 AudioContext에 적용했습니다.';
    } catch (e) {
      $('outputSupport').textContent = `출력 장치 적용 실패: ${e.message || e}`;
    }
  }

  async function sampleToneDb(duration = 320) {
    const values = [];
    const end = performance.now() + duration;
    while (performance.now() < end) {
      if (!state.measuring || !state.time) break;
      values.push(toneAmplitudeDb(state.time, state.anc.lockedFreq, state.ctx.sampleRate));
      await sleep(55);
    }
    return median(values);
  }

  async function startAnc() {
    if (state.anc.on || state.anc.busy) return;
    state.anc.busy = true;
    state.anc.tuneToken++;
    const token = state.anc.tuneToken;
    $('startAnc').disabled = true;
    $('ancStatus').textContent = '목표 주파수와 기준 진폭을 확인하고 있습니다…';
    try {
      if (!state.measuring) await startMeasurement();
      if (!state.anc.lockedFreq) await captureTarget(Number($('manualAncFrequency').value));
      await applyOutputDevice();
      state.analyser.getFloatTimeDomainData(state.time);
      state.anc.baselineDb = await sampleToneDb(520);
      if (!Number.isFinite(state.anc.baselineDb) || state.anc.baselineDb < -100) throw new Error('목표 주파수 신호가 너무 약합니다. 외부 소음을 먼저 재생하세요.');

      const osc = state.ctx.createOscillator();
      const delay = state.ctx.createDelay(0.1);
      const gain = state.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(state.anc.lockedFreq, state.ctx.currentTime);
      gain.gain.setValueAtTime(0, state.ctx.currentTime);
      osc.connect(delay).connect(gain).connect(state.ctx.destination);
      osc.start();
      state.anc.osc = osc; state.anc.delay = delay; state.anc.gain = gain;
      state.anc.on = true;
      state.anc.history = [];
      state.anc.badCount = 0;
      $('stopAnc').disabled = false;
      setAncPhase(Number($('ancPhase').value));
      gain.gain.setTargetAtTime(outputGainValue(), state.ctx.currentTime, 0.08);
      $('ancStatus').textContent = '자동 위상 탐색 중 · 목표 주파수는 고정되어 있습니다.';

      const coarse = [0, 45, 90, 135, 180, 225, 270, 315];
      let best = {phase: 180, db: Infinity};
      for (const phase of coarse) {
        if (token !== state.anc.tuneToken || !state.anc.on) return;
        setAncPhase(phase);
        await sleep(220);
        const db = await sampleToneDb(210);
        state.anc.history.push(db);
        if (db < best.db) best = {phase, db};
        if (db > state.anc.baselineDb + 8) throw new Error('상쇄음으로 목표 주파수가 크게 증가해 안전 정지했습니다.');
        renderAnc();
      }
      const fine = [];
      for (let d = -35; d <= 35; d += 10) fine.push((best.phase + d + 360) % 360);
      for (const phase of fine) {
        if (token !== state.anc.tuneToken || !state.anc.on) return;
        setAncPhase(phase);
        await sleep(170);
        const db = await sampleToneDb(180);
        state.anc.history.push(db);
        if (db < best.db) best = {phase, db};
        if (db > state.anc.baselineDb + 8) throw new Error('상쇄음으로 목표 주파수가 크게 증가해 안전 정지했습니다.');
        renderAnc();
      }
      setAncPhase(best.phase);
      state.anc.residualDb = best.db;
      $('ancStatus').textContent = `위상 잠금 완료 · ${Math.round(best.phase)}° · 목표 ${format(state.anc.lockedFreq, 1)}Hz`;
      state.anc.monitor = setInterval(async () => {
        if (!state.anc.on || state.anc.busy) return;
        const db = await sampleToneDb(210);
        state.anc.residualDb = db;
        state.anc.history.push(db);
        if (state.anc.history.length > 80) state.anc.history.shift();
        state.anc.badCount = db > state.anc.baselineDb + 6 ? state.anc.badCount + 1 : 0;
        if (state.anc.badCount >= 2) stopAnc('목표 주파수가 기준보다 커져 자동 정지했습니다.');
        renderAnc();
      }, 720);
    } catch (e) {
      stopAnc(e.message || String(e));
      toast(e.message || String(e));
    } finally {
      state.anc.busy = false;
      $('startAnc').disabled = state.anc.on;
    }
  }

  function stopAnc(message = 'ANC를 정지했습니다.', notify = true) {
    state.anc.tuneToken++;
    clearInterval(state.anc.monitor); state.anc.monitor = null;
    if (state.anc.gain && state.ctx) {
      try { state.anc.gain.gain.cancelScheduledValues(state.ctx.currentTime); state.anc.gain.gain.setTargetAtTime(0, state.ctx.currentTime, 0.02); } catch (_) {}
    }
    if (state.anc.osc) { try { state.anc.osc.stop(state.ctx ? state.ctx.currentTime + 0.08 : 0); } catch (_) {} }
    [state.anc.osc, state.anc.delay, state.anc.gain].forEach(n => { if (n) try { n.disconnect(); } catch (_) {} });
    state.anc.osc = state.anc.delay = state.anc.gain = null;
    state.anc.on = false; state.anc.busy = false; state.anc.badCount = 0;
    $('startAnc').disabled = false; $('stopAnc').disabled = true;
    $('ancStatus').textContent = message;
    if (notify && message) toast(message);
  }

  function updateAncResidual() {
    if (!state.anc.on || !state.time || !state.anc.lockedFreq) return;
    state.anc.residualDb = toneAmplitudeDb(state.time, state.anc.lockedFreq, state.ctx.sampleRate);
    renderAnc();
  }

  function renderAnc() {
    $('baselineTone').textContent = format(state.anc.baselineDb, 1);
    $('residualTone').textContent = format(state.anc.residualDb, 1);
    const reduction = Number.isFinite(state.anc.baselineDb) && Number.isFinite(state.anc.residualDb) ? state.anc.baselineDb - state.anc.residualDb : NaN;
    $('reductionValue').textContent = Number.isFinite(reduction) ? `${reduction >= 0 ? '-' : '+'}${Math.abs(reduction).toFixed(1)}` : '--';
    $('phaseValue').textContent = format(state.anc.phase);
    const canvas = $('ancCanvas'), ctx = canvas.getContext('2d');
    drawCanvasBase(ctx, canvas);
    const values = state.anc.history.filter(Number.isFinite);
    if (values.length < 2) return;
    const min = Math.min(...values, state.anc.baselineDb - 12), max = Math.max(...values, state.anc.baselineDb + 8);
    ctx.strokeStyle = '#ffd400'; ctx.lineWidth = 3; ctx.beginPath();
    values.forEach((v, i) => {
      const x = i / Math.max(values.length - 1, 1) * canvas.width;
      const y = canvas.height - (v - min) / Math.max(max - min, 1) * (canvas.height - 20) - 10;
      if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }); ctx.stroke();
    if (Number.isFinite(state.anc.baselineDb)) {
      const y = canvas.height - (state.anc.baselineDb - min) / Math.max(max - min, 1) * (canvas.height - 20) - 10;
      ctx.strokeStyle = '#d94747'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  $('captureTarget').addEventListener('click', async () => { try { await captureTarget(); toast('현재 주파수를 ANC 목표로 고정했습니다.'); } catch (e) { toast(e.message || String(e)); } });
  $('applyManualAnc').addEventListener('click', async () => { try { await captureTarget(Number($('manualAncFrequency').value)); toast('수동 목표 주파수를 고정했습니다.'); } catch (e) { toast(e.message || String(e)); } });
  $('unlockTarget').addEventListener('click', unlockTarget);
  $('startAnc').addEventListener('click', startAnc);
  $('stopAnc').addEventListener('click', () => stopAnc());
  $('ancOutput').addEventListener('input', () => {
    $('ancOutputValue').textContent = `${$('ancOutput').value}%`;
    if (state.anc.gain && state.ctx) state.anc.gain.gain.setTargetAtTime(outputGainValue(), state.ctx.currentTime, 0.05);
  });
  $('ancPhase').addEventListener('input', () => setAncPhase(Number($('ancPhase').value)));
  $('outputSelect').addEventListener('change', applyOutputDevice);

  function localMeasurements() {
    try { return JSON.parse(localStorage.getItem('jsd_measurements') || '[]'); } catch (_) { return []; }
  }
  function saveLocalMeasurement() {
    if (!Number.isFinite(state.stableDb)) return;
    const rows = localMeasurements();
    rows.push({id: `local_${Date.now()}`, timestamp: new Date().toISOString(), db_avg: state.stableDb, db_max: state.maxDb, dominant_freq: state.dominant, lat: '', lng: '', type: 'local'});
    localStorage.setItem('jsd_measurements', JSON.stringify(rows.slice(-100)));
    toast('현재 측정값을 이 기기에 저장했습니다.');
  }
  $('saveLocal').addEventListener('click', saveLocalMeasurement);

  function isGasUrl(url) { return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec(?:\?.*)?$/.test(String(url || '').trim()); }
  function payloadB64(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj || {}));
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  function jsonp(action, params = {}, timeout = 14000) {
    if (!isGasUrl(state.gasUrl)) return Promise.reject(new Error('Apps Script 서버가 연결되지 않았습니다.'));
    return new Promise((resolve, reject) => {
      const cb = `jsd_cb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const script = document.createElement('script');
      const timer = setTimeout(() => cleanup(new Error('서버 응답 시간이 초과되었습니다.')), timeout);
      function cleanup(error, data) { clearTimeout(timer); try { delete window[cb]; } catch (_) {} script.remove(); error ? reject(error) : resolve(data); }
      window[cb] = data => cleanup(null, data);
      script.onerror = () => cleanup(new Error('서버 연결에 실패했습니다.'));
      const query = new URLSearchParams({action, callback: cb, payload_b64: payloadB64(params)});
      script.src = `${state.gasUrl}?${query.toString()}`;
      document.head.appendChild(script);
    });
  }
  function setServerStatus(kind, text) {
    $('serverStatus').className = `server-status ${kind || ''}`;
    $('serverStatus').querySelector('span').textContent = text;
  }
  async function checkServer(url = state.gasUrl, save = false) {
    const clean = String(url || '').trim();
    if (!isGasUrl(clean)) throw new Error('올바른 Apps Script /exec 주소를 입력하세요.');
    const old = state.gasUrl; state.gasUrl = clean;
    setServerStatus('busy', '확인 중');
    try {
      const result = await jsonp('health');
      if (!result?.ok) throw new Error(result?.error || '정상적인 health 응답이 아닙니다.');
      if (save) localStorage.setItem('jsd_gas_url', clean);
      setServerStatus('ok', '연결됨');
      $('serverDiagnostics').textContent = [`백엔드: ${result.version || '버전 정보 없음'}`, `서버 시간: ${result.serverTime || result.server_time || '확인 불가'}`, result.sheetError ? `저장소 오류: ${result.sheetError}` : '연결 응답 정상'].join('\n');
      $('saveServer').disabled = !state.measuring;
      return true;
    } catch (e) {
      state.gasUrl = old;
      setServerStatus('bad', '연결 오류');
      $('serverDiagnostics').textContent = e.message || String(e);
      throw e;
    }
  }
  function openServerModal() { $('gasUrl').value = state.gasUrl; $('serverModal').classList.add('open'); $('serverModal').setAttribute('aria-hidden', 'false'); }
  function closeServerModal() { $('serverModal').classList.remove('open'); $('serverModal').setAttribute('aria-hidden', 'true'); }
  $('serverStatus').addEventListener('click', openServerModal);
  $('openServerSettings').addEventListener('click', openServerModal);
  $('closeServerModal').addEventListener('click', closeServerModal);
  $('serverModal').addEventListener('click', e => { if (e.target === $('serverModal')) closeServerModal(); });
  $('testServer').addEventListener('click', async () => { try { await checkServer($('gasUrl').value, false); toast('서버 연결 시험에 성공했습니다.'); } catch (e) { toast(e.message || String(e)); } });
  $('saveServerUrl').addEventListener('click', async () => { try { await checkServer($('gasUrl').value, true); closeServerModal(); toast('서버 주소를 저장했습니다.'); } catch (e) { toast(e.message || String(e)); } });
  if (isGasUrl(state.gasUrl)) checkServer(state.gasUrl, false).catch(() => {}); else setServerStatus('', '로컬 모드');

  $('saveServer').addEventListener('click', async () => {
    try {
      const result = await jsonp('saveMeasurement', {user_id: userId, db_avg: state.stableDb, db_max: state.maxDb, db_grade: grade(state.stableDb)[0], dominant_freq: state.dominant});
      if (!result?.ok) throw new Error(result?.error || '저장 실패');
      toast('서버에 측정값을 저장했습니다.');
    } catch (e) { toast(e.message || String(e)); }
  });

  async function initMap() {
    if (!window.L) { $('mapStatus').textContent = '지도 라이브러리를 불러오지 못했습니다.'; return; }
    if (!state.map) {
      state.map = L.map('map', {zoomControl: true}).setView([37.45, 127.05], 9);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 18, attribution: '&copy; OpenStreetMap contributors'}).addTo(state.map);
      state.mapLayer = L.layerGroup().addTo(state.map);
      setTimeout(() => state.map.invalidateSize(), 150);
    }
    await loadMapData();
  }
  async function loadMapData() {
    if (!state.mapLayer) return;
    $('mapStatus').textContent = '지도 데이터를 불러오는 중입니다…';
    let items = localMeasurements().filter(x => Number.isFinite(Number(x.lat)) && Number.isFinite(Number(x.lng)));
    if (isGasUrl(state.gasUrl)) {
      try {
        const result = await jsonp('getMapData');
        const remote = result?.items || result?.data || [];
        items = items.concat(Array.isArray(remote) ? remote : []);
      } catch (e) { $('mapStatus').textContent = `서버 지도 오류: ${e.message || e} · 기기 저장값만 표시합니다.`; }
    }
    state.mapLayer.clearLayers();
    items.forEach(item => {
      const lat = Number(item.lat), lng = Number(item.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const db = Number(item.db ?? item.db_avg);
      const marker = L.circleMarker([lat, lng], {radius: 8, weight: 2, color: Number.isFinite(db) && db >= 70 ? '#d94747' : '#397fc0', fillOpacity: .72});
      marker.bindPopup(`<b>${escapeHtml(item.station || item.address || '측정 위치')}</b><br>${Number.isFinite(db) ? `${db.toFixed(1)} dB` : '수치 없음'}<br>${escapeHtml(item.measured_at || item.timestamp || '')}`);
      marker.addTo(state.mapLayer);
    });
    $('mapStatus').textContent = items.length ? `${items.length}개 위치를 표시했습니다.` : '위치가 포함된 측정값이 없습니다.';
  }
  $('loadMap').addEventListener('click', loadMapData);
  $('locateMe').addEventListener('click', () => {
    if (!navigator.geolocation) return toast('위치 기능을 지원하지 않습니다.');
    navigator.geolocation.getCurrentPosition(p => { state.map?.setView([p.coords.latitude, p.coords.longitude], 15); }, e => toast(e.message || '위치를 가져오지 못했습니다.'), {enableHighAccuracy: true, timeout: 10000});
  });

  function addBubble(text, who = 'ai') {
    const div = document.createElement('div'); div.className = `bubble ${who}`; div.textContent = text; $('chat').appendChild(div); $('chat').scrollTop = $('chat').scrollHeight;
  }
  function localGuidance(question) {
    const db = state.stableDb, f = state.dominant, locked = state.anc.lockedFreq;
    const snapshot = Number.isFinite(db) ? `현재 추정 음량은 ${db.toFixed(0)}dB이고 주요 주파수는 ${Number.isFinite(f) ? `${f.toFixed(0)}Hz` : '미확인'}입니다.` : '아직 측정을 시작하지 않았습니다.';
    if (/300|주파수|흔들/.test(question)) return `${snapshot}\n300Hz 테스트라면 측정 화면의 ‘알고 있는 테스트 주파수’에 300을 입력하세요. 그러면 180Hz 같은 방 공진이 더 커도 300Hz 성분을 별도로 추적합니다.`;
    if (/ANC|상쇄|위상/.test(question)) return `${snapshot}\nANC 목표는 ${locked ? `${locked.toFixed(1)}Hz로 잠겨 있습니다` : '아직 잠기지 않았습니다'}. 출력 시작 뒤에는 목표를 변경하지 않고 해당 주파수의 잔류 진폭만 확인하는 것이 중요합니다.`;
    return `${snapshot}\n휴대전화 수치는 공인 소음계 값이 아니라 상대 비교용 추정치입니다. 같은 기기·같은 보정값에서 변화 방향을 비교해 주세요.`;
  }
  async function ask(question) {
    addBubble(question, 'me');
    let reply;
    if (isGasUrl(state.gasUrl)) {
      try {
        const result = await jsonp('askAI', {q: question, db: state.stableDb, dominant_freq: state.dominant, anc_target: state.anc.lockedFreq}, 20000);
        reply = result?.answer || result?.text || result?.message;
        if (!reply) throw new Error(result?.error || '빈 응답');
      } catch (_) { reply = `서버 응답을 받지 못해 로컬 안내로 전환했습니다.\n${localGuidance(question)}`; }
    } else reply = `로컬 안내\n${localGuidance(question)}`;
    addBubble(reply, 'ai');
  }
  $('chatForm').addEventListener('submit', e => { e.preventDefault(); const q = $('chatInput').value.trim(); if (!q) return; $('chatInput').value = ''; ask(q); });
  document.querySelectorAll('[data-prompt]').forEach(x => x.addEventListener('click', () => ask(x.dataset.prompt)));

  $('homeMic').textContent = '마이크 미사용';
  refreshDevices();
  navigator.mediaDevices?.addEventListener?.('devicechange', async () => { await refreshDevices(); if (state.measuring) { renderTrackSettings(); toast('오디오 장치 구성이 변경되었습니다. 입력 장치를 확인하세요.'); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state.anc.on) stopAnc('앱이 백그라운드로 이동해 ANC를 정지했습니다.'); });
  window.addEventListener('pagehide', () => { if (state.measuring) stopMeasurement('페이지 종료'); });
})();
