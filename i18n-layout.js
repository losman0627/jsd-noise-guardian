(() => {
  'use strict';

  const LANGUAGE_KEY = 'jsd_language';
  const LAYOUT_KEY = 'jsd_layout_mode';
  const LANGUAGES = new Set(['ko', 'en']);
  const LAYOUTS = new Set(['auto', 'mobile', 'desktop']);
  const $ = id => document.getElementById(id);
  const storageGet = key => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const storageSet = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
  const hasHangul = value => /[가-힣]/.test(String(value || ''));

  const exact = new Map(Object.entries({
    '도시 소음 지킴이': 'Urban Noise Guardian',
    '도시 소음 지킴이 v5': 'Urban Noise Guardian v5',
    'JSD · 소리 정의 연구소': 'JSD · Acoustic Justice Lab',
    '소리 정의 연구소': 'Acoustic Justice Lab',
    '홈': 'Home',
    '측정': 'Measure',
    '지도': 'Map',
    '안내': 'Guide',
    '상담': 'AI Help',
    '뉴스': 'News',
    '더보기': 'More',
    '가이드': 'Guide',
    '빠른 메뉴': 'Quick access',
    '정밀 측정': 'Noise measurement',
    'ANC 실험': 'ANC experiment',
    '소음 지도': 'Noise map',
    'AI 안내': 'AI guidance',
    '소음 측정': 'Noise measurement',
    '소음 측정 시작': 'Start measuring noise',
    '측정 시작': 'Start measurement',
    '측정 정지': 'Stop measurement',
    '완전 정지': 'Stop completely',
    '실시간 분석': 'Real-time analysis',
    '스펙트럼': 'Spectrum',
    '측정 변화': 'Measurement history',
    '주파수 탐색 방식': 'Frequency detection mode',
    '알고 있는 테스트 주파수': 'Known test frequency',
    '비워 두면 자동': 'Leave blank for auto',
    '적용': 'Apply',
    '자동': 'Auto',
    '마이크와 보정': 'Microphone and calibration',
    '입력 장치': 'Input device',
    '출력 장치': 'Output device',
    '시스템 기본 마이크': 'System default microphone',
    '시스템 기본 출력': 'System default output',
    '선택 마이크로 다시 연결': 'Reconnect selected microphone',
    '장치 새로고침': 'Refresh devices',
    '음량 보정값': 'Sound calibration',
    '기기에 기록 저장': 'Save on this device',
    '서버에 저장': 'Save to server',
    '저주파 상쇄 원리 실험': 'Low-frequency cancellation experiment',
    '낮은 음량으로 시작하세요.': 'Start at a low volume.',
    '잠긴 목표 주파수': 'Locked target frequency',
    '현재 주파수 잠금': 'Lock current frequency',
    '잠금 해제': 'Unlock',
    '수동 목표 주파수': 'Manual target frequency',
    '잠금': 'Lock',
    'ANC 시작·자동 위상 탐색': 'Start ANC · Auto phase search',
    'ANC 즉시 정지': 'Stop ANC now',
    '잔류 주파수 추적': 'Residual frequency tracking',
    '기준 진폭': 'Baseline level',
    '현재 잔류': 'Current residual',
    '변화량': 'Change',
    '현재 위상': 'Current phase',
    '출력 제어': 'Output controls',
    '상쇄음 출력 레벨': 'Cancellation output level',
    '수동 위상': 'Manual phase',
    '권장 배치': 'Recommended setup',
    '외부 소음 스피커': 'External noise speaker',
    '핸드폰 마이크': 'Phone microphone',
    'ANC 출력 스피커': 'ANC output speaker',
    '효과를 확인할 지점': 'Listening point',
    '소음 분석 안내': 'Noise analysis guidance',
    '측정값 해석': 'Interpret measurement',
    '주파수 흔들림': 'Frequency fluctuation',
    '질문을 입력하세요': 'Ask a question',
    '전송': 'Send',
    '지도 데이터 새로고침': 'Refresh map data',
    '내 위치': 'My location',
    '위치 추가': 'Add location',
    '현재 위치 추가': 'Add current location',
    '지도에서 위치 선택': 'Select a location on the map',
    '민원 기록 도우미': 'Noise complaint assistant',
    '새 민원 작성': 'Create complaint',
    '새로 작성': 'Create new',
    '앱에 저장': 'Save in app',
    '변경 저장': 'Save changes',
    '민원 기록 수정': 'Edit complaint record',
    '민원 기록': 'Complaint records',
    '측정 기록': 'Measurement records',
    '내용 보기': 'View details',
    '수정': 'Edit',
    '복사': 'Copy',
    '삭제': 'Delete',
    '기록 삭제': 'Delete record',
    '문안 복사': 'Copy text',
    '닫기': 'Close',
    '기록·민원·설정': 'Records, complaints and settings',
    '저장된 측정 기록': 'Saved measurements',
    '저장된 민원 기록': 'Saved complaints',
    '기록 새로고침': 'Refresh records',
    '서버·LLM 상태': 'Server and LLM status',
    '내 기록 내보내기': 'Export my records',
    '개인정보·기기 데이터 관리': 'Privacy and device data',
    '위치값만 삭제': 'Delete location data only',
    '모든 기록 삭제': 'Delete all records',
    '소음 관련 뉴스': 'Noise-related news',
    '뉴스 전체 보기': 'View all news',
    '최신 소음 소식': 'Latest noise news',
    '소리정 · 생활형 소음 저감 커튼': 'Sori-Jung · Everyday noise-reducing curtain',
    '소리정': 'Sori-Jung',
    '소리를 바르게 정하다': 'Redefining sound, fairly',
    '소리정 기본형': 'Sori-Jung Basic',
    '소리정 하이브리드': 'Sori-Jung Hybrid',
    '서버 연결': 'Server connection',
    '서버 설정': 'Server settings',
    'Apps Script 서버 연결': 'Apps Script server connection',
    '웹 앱 주소': 'Web app URL',
    '연결 시험': 'Test connection',
    '저장': 'Save',
    '연결됨': 'Connected',
    '확인 중': 'Checking',
    '연결 오류': 'Connection error',
    '로컬 모드': 'Local mode',
    '대기 중': 'Waiting',
    '마이크 미사용': 'Microphone inactive',
    '마이크 연결됨': 'Microphone connected',
    '잠금 안 됨': 'Not locked',
    '아직 잠그지 않았습니다.': 'No target has been locked yet.',
    '아직 연결을 확인하지 않았습니다.': 'Connection has not been checked yet.',
    '피크 정보가 없습니다.': 'No peak data available.',
    '자동 피크 탐색': 'Automatic peak detection',
    '추정 dB': 'Estimated dB',
    '순간값': 'Instant',
    '최댓값': 'Maximum',
    '주요 주파수': 'Dominant frequency',
    '검출 신뢰도': 'Detection confidence',
    '현재 입력': 'Current input',
    'ANC 목표': 'ANC target',
    '조용함': 'Quiet',
    '보통': 'Moderate',
    '주의': 'Caution',
    '높음': 'High',
    '매우 높음': 'Very high',
    '사용 및 배포 안내': 'Usage and deployment guide',
    '버전 정보': 'Version information',
    '화면 테마 전환': 'Toggle appearance',
    '홈으로 이동': 'Go to home',
    '주요 메뉴': 'Main navigation',
    '언어 및 화면': 'Language and display',
    '언어': 'Language',
    '화면 모드': 'Display mode',
    '한국어': 'Korean',
    '영어': 'English',
    '모바일': 'Mobile',
    '컴퓨터': 'Desktop',
    '자동 맞춤': 'Automatic',
    '기기 화면에 맞게 자동으로 조정합니다.': 'Automatically adapts to the current screen.',
    '휴대전화 비율로 보기 좋게 구성합니다.': 'Uses a compact phone-friendly layout.',
    '넓은 화면과 사이드 메뉴 중심으로 구성합니다.': 'Uses a wide layout with side navigation.',
    '설정 완료': 'Preferences saved',
    'LLM 연결 확인 중…': 'Checking LLM connection…',
    'Gemini 실제 응답 확인 중…': 'Testing a live Gemini response…',
    'LLM 연결 끊김 · 눌러서 재연결': 'LLM disconnected · Tap to reconnect',
    '네트워크 오프라인 · 연결 대기': 'Offline · Waiting for connection'
  }));

  const phrasePairs = [
    ['공사 현장에서 버려지는 폴리에스터 소재를 재활용한 방음 원단으로 생활소음을 줄이고, 필요한 공간에는 저주파 제어 기술까지 더합니다.', 'Made with sound-reducing fabric using recycled polyester from construction sites, with optional low-frequency control for spaces that need more protection.'],
    ['방음 원단만 적용한 간결하고 접근성 높은 모델', 'An accessible model using sound-reducing fabric only'],
    ['기본형에 저주파 ANC 헤더 모듈을 결합한 모델', 'A hybrid model combining the basic curtain with a low-frequency ANC header module'],
    ['소리 + 正(Justice) + 定(Definition) · 소음으로부터 권리를 지키고, 소리의 기준을 다시 정하는 이름', 'Sound + 正 (Justice) + 定 (Definition) · a name that protects the right to quiet and redefines how sound should be managed'],
    ['주변 소음을 측정하고 기록해 더 조용한 생활환경을 만드는 데 활용합니다.', 'Measure and record surrounding noise to support a quieter living environment.'],
    ['저장한 측정값과 민원 문안을 다시 확인하고 개인정보·연결 상태를 관리합니다.', 'Review saved measurements and complaint drafts, and manage privacy and connection settings.'],
    ['민원 문안과 상세 장소는 현재 브라우저의 이 기기에 저장됩니다.', 'Complaint drafts and detailed locations are stored in this browser on this device.'],
    ['마이크 원음은 저장하지 않습니다.', 'Raw microphone audio is not stored.'],
    ['표시값은 휴대전화 마이크의 상대 입력을 보정한 추정치이며 공인 소음계 값이 아닙니다.', 'Displayed values are calibrated estimates from the device microphone and are not certified sound-level readings.'],
    ['단일 주파수를 한 지점에서 줄이는 원리 실험입니다. 소리가 커지거나 불편하면 즉시 정지하세요.', 'This demonstrates single-frequency cancellation at one point. Stop immediately if the sound becomes louder or uncomfortable.'],
    ['기기에 저장한 측정과 연결된 Apps Script의 지도 데이터를 함께 표시합니다.', 'Shows measurements saved on this device together with map data from the connected server.'],
    ['측정을 시작한 뒤 현재 소음이나 ANC 실험에 관해 질문해 보세요.', 'Start a measurement, then ask about the current noise or the ANC experiment.'],
    ['Apps Script가 연결되면 AI 응답을 요청하고, 연결되지 않으면 측정값 기반 로컬 안내를 제공합니다.', 'Uses Gemini when the server is connected and provides local measurement-based guidance when it is not.'],
    ['측정 후 목표를 잠그고 시작하세요.', 'Measure first, lock the target, then start.'],
    ['마이크를 시작하면 현재 음량과 주요 주파수를 표시합니다.', 'Start the microphone to view the current level and dominant frequency.'],
    ['빠른 음량 반응과 상위 피크 확인', 'View responsive sound levels and major peaks'],
    ['목표 주파수 고정 후 잔류 성분 추적', 'Lock a target frequency and track the residual'],
    ['서버 또는 기기 저장 측정값 확인', 'Review server and device measurements'],
    ['연결 서버 또는 로컬 규칙 기반 분석', 'Server-based AI or local guidance'],
    ['소음 정책, 생활환경, 건강과 기술에 관한 최신 소식을 한곳에서 확인합니다.', 'Browse current news on noise policy, living environments, health and technology.'],
    ['소음 정책, 생활환경, 건강과 기술에 관한 최신 소식', 'Current news on noise policy, living environments, health and technology'],
    ['저장된 민원 기록이 없습니다.', 'No complaint records have been saved.'],
    ['저장된 측정 기록이 없습니다.', 'No measurement records have been saved.'],
    ['장소 미입력', 'No location entered'],
    ['기기 저장 기록', 'Records stored on this device'],
    ['연결 준비 완료', 'Ready'],
    ['API 키 미설정', 'API key not configured'],
    ['눌러서 실제 LLM 응답까지 다시 확인합니다.', 'Tap to test a live LLM response again.'],
    ['눌러서 LLM 연결을 다시 시도합니다.', 'Tap to reconnect the LLM.'],
    ['현재 Apps Script 서버에 다시 연결하고 있습니다.', 'Reconnecting to the Apps Script server.'],
    ['인터넷 연결을 확인해 주세요.', 'Check your internet connection.'],
    ['백엔드:', 'Backend:'],
    ['서버 시간:', 'Server time:'],
    ['저장소:', 'Storage:'],
    ['저장소 오류:', 'Storage error:'],
    ['LLM:', 'LLM:']
  ].sort((a, b) => b[0].length - a[0].length);

  const originals = new WeakMap();
  const attributeOriginals = new WeakMap();
  const savedLanguage = storageGet(LANGUAGE_KEY);
  const savedLayout = storageGet(LAYOUT_KEY);
  let language = LANGUAGES.has(savedLanguage) ? savedLanguage : 'ko';
  let layout = LAYOUTS.has(savedLayout) ? savedLayout : 'auto';
  let applying = false;
  let scheduled = false;

  function translateString(value) {
    const input = String(value ?? '');
    const trimmed = input.trim();
    if (!trimmed || !hasHangul(trimmed)) return input;
    if (exact.has(trimmed)) return input.replace(trimmed, exact.get(trimmed));

    let output = input;
    for (const [ko, en] of phrasePairs) output = output.split(ko).join(en);

    output = output
      .replace(/^Gemini LLM 연결됨 · (.+)$/u, 'Gemini LLM connected · $1')
      .replace(/^(.+)개 위치를 표시했습니다\.$/u, 'Showing $1 locations.')
      .replace(/^위치 (.+), (.+)$/u, 'Location $1, $2')
      .replace(/^최대 (.+) dB · 주요 주파수 (.+) Hz/u, 'Max $1 dB · Dominant frequency $2 Hz')
      .replace(/^LLM: 연결 준비 완료 \((.+)\)$/u, 'LLM: Ready ($1)')
      .replace(/^백엔드: (.+)$/u, 'Backend: $1')
      .replace(/^서버 시간: (.+)$/u, 'Server time: $1')
      .replace(/^저장소: 연결됨$/u, 'Storage: Connected')
      .replace(/^저장소 오류: (.+)$/u, 'Storage error: $1')
      .replace(/연결 중…/gu, 'Connecting…')
      .replace(/불러오는 중입니다\./gu, 'Loading…')
      .replace(/새로고침했습니다\./gu, 'refreshed.')
      .replace(/저장했습니다\./gu, 'saved.')
      .replace(/삭제했습니다\./gu, 'deleted.')
      .replace(/복사했습니다\./gu, 'copied.');

    return output;
  }

  function shouldSkip(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    return Boolean(parent.closest('script,style,code,pre,textarea,input,select,.leaflet-container,.news-item a,.bubble.user'));
  }

  function translateTextNode(node) {
    if (shouldSkip(node)) return;
    const current = node.nodeValue || '';
    if (language === 'en') {
      if (hasHangul(current)) originals.set(node, current);
      const source = hasHangul(current) ? current : originals.get(node);
      if (!source) return;
      const translated = translateString(source);
      if (translated !== current) node.nodeValue = translated;
    } else {
      const source = originals.get(node);
      if (source && current !== source) node.nodeValue = source;
    }
  }

  function translateAttributes(element) {
    if (!(element instanceof HTMLElement)) return;
    const attrs = ['placeholder', 'title', 'aria-label'];
    let stored = attributeOriginals.get(element);
    if (!stored) {
      stored = {};
      attributeOriginals.set(element, stored);
    }
    for (const attr of attrs) {
      const current = element.getAttribute(attr);
      if (!current) continue;
      if (language === 'en') {
        if (hasHangul(current)) stored[attr] = current;
        const source = hasHangul(current) ? current : stored[attr];
        if (source) {
          const translated = translateString(source);
          if (current !== translated) element.setAttribute(attr, translated);
        }
      } else if (stored[attr] && current !== stored[attr]) {
        element.setAttribute(attr, stored[attr]);
      }
    }
  }

  function applyLanguage() {
    if (applying) return;
    applying = true;
    try {
      document.documentElement.lang = language;
      document.body.dataset.jsdLanguage = language;
      document.title = language === 'en' ? 'JSD · Urban Noise Guardian' : 'JSD · 도시 소음 지킴이';
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) translateTextNode(node);
      document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(translateAttributes);
      updatePreferenceControls();
    } finally {
      applying = false;
    }
  }

  function scheduleLanguage() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyLanguage();
    });
  }

  function isWideLayout() {
    return layout === 'desktop' || (layout === 'auto' && window.innerWidth >= 900);
  }

  function applyLayout() {
    document.body.dataset.jsdLayout = layout;
    document.body.classList.toggle('jsd-wide-layout', isWideLayout());
    document.body.classList.toggle('jsd-mobile-frame', layout === 'mobile');
    document.querySelectorAll('[data-layout-choice]').forEach(button => {
      button.classList.toggle('selected', button.dataset.layoutChoice === layout);
      button.setAttribute('aria-pressed', String(button.dataset.layoutChoice === layout));
    });
    window.dispatchEvent(new Event('resize'));
    setTimeout(() => window.dispatchEvent(new Event('resize')), 180);
  }

  function toast(messageKo, messageEn = messageKo) {
    const target = $('toast');
    if (!target) return;
    target.textContent = language === 'en' ? messageEn : messageKo;
    target.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => target.classList.remove('show'), 2200);
  }

  function setLanguage(next) {
    if (!LANGUAGES.has(next)) return;
    language = next;
    storageSet(LANGUAGE_KEY, language);
    applyLanguage();
    toast('언어 설정을 변경했습니다.', 'Language preference updated.');
  }

  function setLayout(next) {
    if (!LAYOUTS.has(next)) return;
    layout = next;
    storageSet(LAYOUT_KEY, layout);
    applyLayout();
    updatePreferenceControls();
    toast('화면 모드를 변경했습니다.', 'Display mode updated.');
  }

  function updatePreferenceControls() {
    document.querySelectorAll('[data-language-choice]').forEach(button => {
      button.classList.toggle('selected', button.dataset.languageChoice === language);
      button.setAttribute('aria-pressed', String(button.dataset.languageChoice === language));
    });
    document.querySelectorAll('[data-layout-choice]').forEach(button => {
      button.classList.toggle('selected', button.dataset.layoutChoice === layout);
      button.setAttribute('aria-pressed', String(button.dataset.layoutChoice === layout));
    });
    const trigger = $('displayPreferencesButton');
    if (trigger) {
      const layoutMark = layout === 'mobile' ? 'M' : layout === 'desktop' ? 'PC' : 'A';
      trigger.textContent = `${language === 'en' ? 'EN' : 'KO'} · ${layoutMark}`;
      const aria = language === 'en' ? 'Language and display settings' : '언어 및 화면 설정';
      if (trigger.getAttribute('aria-label') !== aria) trigger.setAttribute('aria-label', aria);
    }
  }

  function preferencePanelMarkup(compact = false) {
    return `
      <div class="jsd-pref-group">
        <span>${language === 'en' ? 'Language' : '언어'}</span>
        <div class="jsd-segmented">
          <button type="button" data-language-choice="ko">한국어</button>
          <button type="button" data-language-choice="en">English</button>
        </div>
      </div>
      <div class="jsd-pref-group">
        <span>${language === 'en' ? 'Display mode' : '화면 모드'}</span>
        <div class="jsd-segmented ${compact ? 'compact' : ''}">
          <button type="button" data-layout-choice="auto">${language === 'en' ? 'Auto' : '자동'}</button>
          <button type="button" data-layout-choice="mobile">${language === 'en' ? 'Mobile' : '모바일'}</button>
          <button type="button" data-layout-choice="desktop">${language === 'en' ? 'Desktop' : '컴퓨터'}</button>
        </div>
        <p class="jsd-pref-help">${language === 'en' ? 'Auto adapts to the device. Mobile creates a compact phone layout. Desktop uses a wider layout and side navigation.' : '자동은 기기에 맞춰 조정하고, 모바일은 휴대전화형 화면, 컴퓨터는 넓은 화면과 사이드 메뉴로 구성합니다.'}</p>
      </div>`;
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.id = 'jsd-i18n-layout-style';
    style.textContent = `
      #displayPreferencesButton{min-width:62px;width:auto;padding:0 10px;font-size:10px;font-weight:900;letter-spacing:.02em;white-space:nowrap}
      #displayPreferencesModal .sheet{max-width:520px}
      .jsd-pref-group{display:flex;flex-direction:column;gap:8px;margin-top:16px}
      .jsd-pref-group>span{font-size:11px;font-weight:900;color:var(--muted)}
      .jsd-segmented{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:5px;border-radius:15px;background:var(--surface2);border:1px solid var(--line)}
      .jsd-segmented.compact,.jsd-pref-group:nth-of-type(2) .jsd-segmented{grid-template-columns:repeat(3,minmax(0,1fr))}
      .jsd-segmented button{border:0;border-radius:11px;min-height:39px;padding:7px 9px;background:transparent;color:var(--muted);font:inherit;font-size:10.5px;font-weight:900;cursor:pointer}
      .jsd-segmented button.selected{background:var(--surface);color:var(--navy);box-shadow:0 2px 10px rgba(17,38,68,.10)}
      body[data-theme="dark"] .jsd-segmented button.selected{color:var(--yellow)}
      .jsd-pref-help{margin:0;color:var(--muted);font-size:10px;line-height:1.6}
      .jsd-settings-card{margin-top:14px}
      .jsd-settings-card h3{margin:0;font-size:14px}
      .jsd-settings-card .jsd-pref-group{margin-top:12px}

      body[data-jsd-layout="mobile"]{background:color-mix(in srgb,var(--navy) 7%,#e9edf4)}
      body[data-jsd-layout="mobile"] .app-shell{width:min(100%,560px);margin:0 auto;min-height:100dvh;background:var(--bg);box-shadow:0 0 36px rgba(16,36,63,.15)}
      body[data-jsd-layout="mobile"] main{padding-left:12px!important;padding-right:12px!important}
      body[data-jsd-layout="mobile"] .topbar{padding-left:12px;padding-right:12px}
      body[data-jsd-layout="mobile"] .tabbar{left:50%;right:auto;transform:translateX(-50%);width:min(100%,560px);overflow-x:auto;scrollbar-width:none}
      body[data-jsd-layout="mobile"] .tabbar::-webkit-scrollbar{display:none}
      body[data-jsd-layout="mobile"] .tabbar .tab{min-width:58px}
      body[data-jsd-layout="mobile"] .quick-grid{grid-template-columns:1fr 1fr}
      body[data-jsd-layout="mobile"] .sorijung-models{grid-template-columns:1fr}

      body.jsd-wide-layout .app-shell{max-width:none;min-height:100dvh;padding-left:92px}
      body.jsd-wide-layout .topbar{padding:14px 28px;min-height:70px}
      body.jsd-wide-layout main{max-width:1240px;margin:0 auto;padding:28px 34px 70px}
      body.jsd-wide-layout .screen.active{animation:none}
      body.jsd-wide-layout .tabbar{position:fixed;z-index:60;left:0;top:0;bottom:0;width:92px;height:100dvh;display:flex;flex-direction:column;justify-content:center;gap:5px;padding:14px 8px;border-top:0;border-right:1px solid var(--line);background:color-mix(in srgb,var(--surface) 94%,transparent);backdrop-filter:blur(18px);transform:none}
      body.jsd-wide-layout .tabbar .tab{flex:0 0 auto;width:100%;min-height:66px;border-radius:15px;padding:8px 3px}
      body.jsd-wide-layout .tabbar .tab b{font-size:20px}
      body.jsd-wide-layout .tabbar .tab span{font-size:9px}
      body.jsd-wide-layout .hero{padding:30px;min-height:260px}
      body.jsd-wide-layout .hero h1{font-size:clamp(31px,4vw,50px);max-width:800px}
      body.jsd-wide-layout .quick-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
      body.jsd-wide-layout .quick-card{min-height:142px;padding:18px}
      body.jsd-wide-layout .info-card{grid-template-columns:repeat(3,minmax(0,1fr))}
      body.jsd-wide-layout .metric-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
      body.jsd-wide-layout .card{padding:22px}
      body.jsd-wide-layout canvas{max-height:360px}
      body.jsd-wide-layout .map{height:560px}
      body.jsd-wide-layout .chat-card{min-height:560px}
      body.jsd-wide-layout #chat{min-height:380px;max-height:520px}
      body.jsd-wide-layout .sorijung-card{padding:25px!important}
      body.jsd-wide-layout .sorijung-models{grid-template-columns:1fr 1fr;gap:12px}
      body.jsd-wide-layout #newsScreenList{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;background:transparent;border:0;padding:0}
      body.jsd-wide-layout #newsScreenList .news-item{border:1px solid var(--line);border-radius:16px;background:var(--surface);padding:16px!important}
      body.jsd-wide-layout .more-summary{grid-template-columns:repeat(2,minmax(0,1fr))}
      body.jsd-wide-layout .more-actions{grid-template-columns:repeat(4,minmax(0,1fr))!important}
      body.jsd-wide-layout .record-list{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px!important}

      @media(max-width:759px){
        body[data-jsd-layout="desktop"].jsd-wide-layout .app-shell{padding-left:0}
        body[data-jsd-layout="desktop"].jsd-wide-layout .tabbar{position:fixed;left:0;right:0;top:auto;bottom:0;width:100%;height:auto;flex-direction:row;justify-content:flex-start;overflow-x:auto;padding:7px 6px;border-right:0;border-top:1px solid var(--line)}
        body[data-jsd-layout="desktop"].jsd-wide-layout .tabbar .tab{min-width:70px;width:auto;min-height:54px}
        body[data-jsd-layout="desktop"].jsd-wide-layout main{padding:18px 14px 92px}
        body[data-jsd-layout="desktop"].jsd-wide-layout .quick-grid{grid-template-columns:1fr 1fr}
        body[data-jsd-layout="desktop"].jsd-wide-layout #newsScreenList,body[data-jsd-layout="desktop"].jsd-wide-layout .record-list{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function bindPreferenceButtons(root = document) {
    root.querySelectorAll('[data-language-choice]').forEach(button => {
      if (button.dataset.jsdBound === 'true') return;
      button.dataset.jsdBound = 'true';
      button.addEventListener('click', () => setLanguage(button.dataset.languageChoice));
    });
    root.querySelectorAll('[data-layout-choice]').forEach(button => {
      if (button.dataset.jsdBound === 'true') return;
      button.dataset.jsdBound = 'true';
      button.addEventListener('click', () => setLayout(button.dataset.layoutChoice));
    });
  }

  function injectPreferenceModal() {
    if ($('displayPreferencesModal')) return;
    const modal = document.createElement('div');
    modal.id = 'displayPreferencesModal';
    modal.className = 'modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="sheet">
        <div class="sheet-handle"></div>
        <p class="eyebrow">Accessibility</p>
        <h2>${language === 'en' ? 'Language and display' : '언어 및 화면'}</h2>
        <p class="help">${language === 'en' ? 'Choose a language and a layout designed for your device.' : '사용 언어와 기기에 맞는 화면 구성을 선택하세요.'}</p>
        <div id="displayPreferencesContent">${preferencePanelMarkup()}</div>
        <button id="closeDisplayPreferences" class="button primary full top-gap" type="button">${language === 'en' ? 'Done' : '설정 완료'}</button>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', event => {
      if (event.target === modal) closePreferences();
    });
    $('closeDisplayPreferences')?.addEventListener('click', closePreferences);
    bindPreferenceButtons(modal);
  }

  function openPreferences() {
    const modal = $('displayPreferencesModal');
    if (!modal) return;
    const content = $('displayPreferencesContent');
    if (content) content.innerHTML = preferencePanelMarkup();
    const title = modal.querySelector('h2');
    const help = modal.querySelector('.help');
    const close = $('closeDisplayPreferences');
    if (title) title.textContent = language === 'en' ? 'Language and display' : '언어 및 화면';
    if (help) help.textContent = language === 'en' ? 'Choose a language and a layout designed for your device.' : '사용 언어와 기기에 맞는 화면 구성을 선택하세요.';
    if (close) close.textContent = language === 'en' ? 'Done' : '설정 완료';
    bindPreferenceButtons(modal);
    updatePreferenceControls();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closePreferences() {
    const modal = $('displayPreferencesModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function injectTopButton() {
    if ($('displayPreferencesButton')) return;
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    const button = document.createElement('button');
    button.id = 'displayPreferencesButton';
    button.className = 'icon-button';
    button.type = 'button';
    button.addEventListener('click', openPreferences);
    const themeButton = $('themeButton');
    if (themeButton) topbar.insertBefore(button, themeButton);
    else topbar.appendChild(button);
    updatePreferenceControls();
  }

  function injectMoreSettings() {
    const more = $('screen-more') || $('screen-news');
    if (!more || more.querySelector('.jsd-settings-card')) return;
    const privacyHeading = [...more.querySelectorAll('.section-heading')].find(el => /개인정보|Privacy/.test(el.textContent));
    const heading = document.createElement('h2');
    heading.className = 'section-heading jsd-display-heading';
    heading.textContent = language === 'en' ? 'Language and display' : '언어 및 화면';
    const card = document.createElement('article');
    card.className = 'card jsd-settings-card';
    card.innerHTML = preferencePanelMarkup(true);
    if (privacyHeading) {
      more.insertBefore(heading, privacyHeading);
      more.insertBefore(card, privacyHeading);
    } else {
      more.appendChild(heading);
      more.appendChild(card);
    }
    bindPreferenceButtons(card);
    updatePreferenceControls();
  }

  function base64UrlDecode(value) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function base64UrlEncode(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function patchAiLanguage() {
    const previousAppend = Node.prototype.appendChild;
    Node.prototype.appendChild = function jsdLanguageAppend(node) {
      if (language === 'en' && node instanceof HTMLScriptElement && node.src) {
        try {
          const url = new URL(node.src, location.href);
          if (url.searchParams.get('action') === 'askAI') {
            const encoded = url.searchParams.get('payload_b64');
            if (encoded) {
              const payload = JSON.parse(base64UrlDecode(encoded));
              if (typeof payload.q === 'string' && !/\[Response language: English\]/.test(payload.q)) {
                payload.q += '\n\n[Response language: English. Reply clearly and concisely in English.]';
                payload.language = 'en';
                url.searchParams.set('payload_b64', base64UrlEncode(JSON.stringify(payload)));
                node.src = url.toString();
              }
            }
          }
        } catch (_) {
          // Keep the original request if it cannot be decoded.
        }
      }
      return previousAppend.call(this, node);
    };
  }

  function initialize() {
    injectStyles();
    injectPreferenceModal();
    injectTopButton();
    injectMoreSettings();
    bindPreferenceButtons();
    applyLayout();
    applyLanguage();
    patchAiLanguage();

    const observer = new MutationObserver(() => {
      if (applying) return;
      injectTopButton();
      injectMoreSettings();
      bindPreferenceButtons();
      scheduleLanguage();
    });
    observer.observe(document.body, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['placeholder','title','aria-label']});

    window.addEventListener('resize', () => {
      const before = document.body.classList.contains('jsd-wide-layout');
      document.body.classList.toggle('jsd-wide-layout', isWideLayout());
      if (before !== document.body.classList.contains('jsd-wide-layout')) {
        window.dispatchEvent(new Event('orientationchange'));
      }
    }, {passive:true});
  }

  initialize();
})();
