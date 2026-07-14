(() => {
  'use strict';

  const hasHangul = value => /[가-힣]/.test(String(value || ''));
  const textOriginals = new WeakMap();
  const attrOriginals = new WeakMap();
  let applying = false;
  let scheduled = false;

  const translations = new Map(Object.entries({
    '도시는 더 조용해질 수 있다.': 'The city can become quieter.',
    '지금 있는 곳의 소음을 쉽게 확인해 보세요.': 'Check the noise around you with ease.',
    '측정을 시작하면 소음 크기와 주요 주파수를 보여드립니다.': 'Start measuring to see the sound level and dominant frequency.',
    '핵심 실험 기능': 'Core experimental features',
    '측정 후 자동 분석': 'Automatic analysis after measurement',
    '강한 저주파를 찾아 반대 위상으로 자동 보정': 'Detect strong low frequencies and automatically apply an opposite phase',
    '마이크가 감지한 40~600Hz의 강한 피크를 추적하고, 고정된 위치에서 잔류음이 작아지도록 위상을 다시 맞춥니다.': 'Tracks strong peaks between 40 and 600 Hz and readjusts the phase to reduce residual sound at a fixed listening point.',
    '현재 소음': 'Current noise',
    '현재 소음도': 'Current sound level',
    '현재 상태': 'Current status',
    '측정 준비': 'Ready to measure',
    '측정 대기 중': 'Waiting to measure',
    '측정 중': 'Measuring',
    '측정 완료': 'Measurement complete',
    '측정값 없음': 'No measurement data',
    '마이크 권한이 필요합니다.': 'Microphone permission is required.',
    '마이크 권한을 허용해 주세요.': 'Please allow microphone access.',
    '마이크를 사용할 수 없습니다.': 'The microphone is unavailable.',
    '마이크 연결에 실패했습니다.': 'Failed to connect to the microphone.',
    '측정을 시작할 수 없습니다.': 'Unable to start measurement.',
    '주변 소음을 측정합니다.': 'Measure the noise around you.',
    '주변 소음을 분석하고 기록합니다.': 'Analyze and record the noise around you.',
    '소음 크기': 'Sound level',
    '평균 소음': 'Average sound level',
    '최대 소음': 'Maximum sound level',
    '평균값': 'Average',
    '최대값': 'Maximum',
    '주파수': 'Frequency',
    '주요 피크': 'Major peaks',
    '분석 결과': 'Analysis results',
    '측정 결과': 'Measurement results',
    '기록 저장': 'Save record',
    '지도에 저장': 'Save to map',
    '저장 완료': 'Saved',
    '측정값을 저장했습니다.': 'Measurement saved.',
    '측정값 저장에 실패했습니다.': 'Failed to save the measurement.',
    '소음 위치 기록': 'Noise location record',
    '선택한 위치': 'Selected location',
    '현재 위치를 찾는 중입니다.': 'Finding your current location.',
    '현재 위치를 찾지 못했습니다.': 'Unable to find your current location.',
    '위치 권한을 허용해 주세요.': 'Please allow location access.',
    '지도에서 지점을 선택하세요.': 'Select a point on the map.',
    '지도를 눌러 위치를 선택하세요.': 'Tap the map to select a location.',
    '소음 정도': 'Noise level',
    '소음 유형': 'Noise type',
    '발생 장소': 'Location',
    '발생 시간': 'Time of occurrence',
    '상세 내용': 'Details',
    '설명': 'Description',
    '선택 안 함': 'Not selected',
    '위치 정보 없음': 'No location data',
    '데이터 없음': 'No data',
    '불러오는 중': 'Loading',
    '새로고침': 'Refresh',
    '다시 시도': 'Try again',
    '확인': 'Confirm',
    '취소': 'Cancel',
    '완료': 'Done',
    '열기': 'Open',
    '전체 보기': 'View all',
    '자세히 보기': 'View details',
    '도움말': 'Help',
    '사용 방법': 'How to use',
    '작동 원리': 'How it works',
    '주의사항': 'Safety notes',
    '연결 상태': 'Connection status',
    '서버 연결 확인': 'Check server connection',
    '서버에 연결되었습니다.': 'Connected to the server.',
    '서버 연결에 실패했습니다.': 'Failed to connect to the server.',
    '서버 응답을 기다리고 있습니다.': 'Waiting for the server response.',
    '서버 응답이 없습니다.': 'The server is not responding.',
    '연결을 다시 시도하세요.': 'Try reconnecting.',
    '로컬 안내로 전환': 'Switched to local guidance',
    'AI 상담': 'AI guidance',
    'AI 소음 상담': 'AI noise guidance',
    '소음 상황을 입력하세요.': 'Describe your noise situation.',
    '상황을 구체적으로 입력해 주세요.': 'Describe the situation in detail.',
    '질문을 입력해 주세요.': 'Enter your question.',
    '답변 생성 중…': 'Generating a response…',
    '응답을 불러오는 중…': 'Loading the response…',
    'AI 응답을 받지 못했습니다.': 'Could not receive an AI response.',
    '다시 질문하기': 'Ask again',
    '추천 질문': 'Suggested questions',
    '민원 작성 도우미': 'Complaint writing assistant',
    '민원 문안': 'Complaint draft',
    '민원 초안': 'Complaint draft',
    '민원 내용': 'Complaint details',
    '민원 유형': 'Complaint type',
    '민원 초안 생성': 'Generate complaint draft',
    '문안 생성': 'Generate draft',
    '작성한 민원': 'Saved complaints',
    '민원 기록을 저장했습니다.': 'Complaint record saved.',
    '민원 기록을 수정했습니다.': 'Complaint record updated.',
    '민원 기록을 삭제했습니다.': 'Complaint record deleted.',
    '저장된 기록': 'Saved records',
    '기록 관리': 'Manage records',
    '개인정보 관리': 'Privacy settings',
    '기기 데이터': 'Device data',
    '모든 데이터를 삭제합니다.': 'Delete all data.',
    '삭제 후 복구할 수 없습니다.': 'Deleted data cannot be restored.',
    '소음 관련 소식': 'Noise news',
    '최신 기사': 'Latest articles',
    '기사를 불러오는 중입니다.': 'Loading articles.',
    '뉴스를 불러오지 못했습니다.': 'Unable to load the news.',
    '소리정 · 생활형 소음 저감 커튼': 'Sori-Jung · Everyday noise-reducing curtain',
    '공사 현장 폐기물에서 다시 태어난 방음 커튼': 'A noise-reducing curtain reborn from construction waste',
    '방음 원단을 적용한 기본형': 'Basic model with sound-reducing fabric',
    'ANC 모듈을 더한 하이브리드형': 'Hybrid model with an added ANC module',
    '소리를 바르게 정하다': 'Redefining sound, fairly',
    '연구 중인 생활환경 솔루션': 'Living-environment solution in development',
    '더 편안하게 쉬고 집중할 수 있는 공간': 'A space where you can rest and focus more comfortably',
    '커튼형 다층 소재와 저주파 제어 기술을 결합해 불필요한 소음 노출을 줄이는 방법을 연구합니다.': 'We combine multilayer curtain materials with low-frequency control technology to reduce unnecessary noise exposure.',
    'ANC 작동 전': 'Before ANC',
    'ANC 작동 중': 'ANC active',
    'ANC 정지됨': 'ANC stopped',
    'ANC 준비': 'ANC ready',
    '목표 주파수를 찾는 중입니다.': 'Finding the target frequency.',
    '목표 주파수를 잠가 주세요.': 'Lock the target frequency.',
    '목표 주파수가 잠겼습니다.': 'Target frequency locked.',
    '반대 위상 신호를 출력합니다.': 'Outputting an opposite-phase signal.',
    '자동 위상 탐색 중…': 'Searching for the optimal phase…',
    '잔류음을 분석하는 중…': 'Analyzing residual sound…',
    'ANC 기능을 중지했습니다.': 'ANC has been stopped.',
    '낮은 음량으로 시작하세요.': 'Start at a low volume.',
    '이어폰이나 헤드폰으로 실험하지 마세요.': 'Do not run this experiment with earphones or headphones.',
    '외부 스피커를 사용하세요.': 'Use an external speaker.',
    '소리가 커지거나 불편하면 즉시 중지하세요.': 'Stop immediately if the sound becomes louder or uncomfortable.',
    '정확한 소음계 측정값이 아닙니다.': 'This is not a certified sound-level reading.',
    '참고용 추정값입니다.': 'This is an estimate for reference only.',
    '언어 및 화면 설정': 'Language and display settings',
    '사용 언어와 기기에 맞는 화면 구성을 선택하세요.': 'Choose a language and a layout designed for your device.'
  }));

  const phrasePairs = [
    ['도시는 더 조용해질 수 있다.', 'The city can become quieter.'],
    ['지금 있는 곳의 소음을 쉽게 확인해 보세요.', 'Check the noise around you with ease.'],
    ['측정을 시작하면 소음 크기와 주요 주파수를 보여드립니다.', 'Start measuring to see the sound level and dominant frequency.'],
    ['강한 저주파를 찾아 반대 위상으로 자동 보정', 'Detect strong low frequencies and automatically apply an opposite phase'],
    ['마이크가 감지한 40~600Hz의 강한 피크를 추적하고, 고정된 위치에서 잔류음이 작아지도록 위상을 다시 맞춥니다.', 'Tracks strong peaks between 40 and 600 Hz and readjusts the phase to reduce residual sound at a fixed listening point.'],
    ['측정을 시작하면', 'When measurement starts,'],
    ['측정을 시작한 뒤', 'After starting a measurement,'],
    ['측정 후', 'After measurement'],
    ['현재 위치', 'Current location'],
    ['주요 주파수', 'Dominant frequency'],
    ['최대 소음도', 'Maximum sound level'],
    ['평균 소음도', 'Average sound level'],
    ['소음 크기', 'Sound level'],
    ['자동 분석', 'Automatic analysis'],
    ['자동 보정', 'Automatic correction'],
    ['반대 위상', 'opposite phase'],
    ['저주파', 'low frequency'],
    ['잔류음', 'residual sound'],
    ['연결 오류', 'Connection error'],
    ['연결됨', 'Connected'],
    ['연결 중', 'Connecting'],
    ['확인 중', 'Checking'],
    ['저장 중', 'Saving'],
    ['불러오는 중', 'Loading'],
    ['다시 연결', 'Reconnect'],
    ['권한이 거부되었습니다.', 'Permission was denied.'],
    ['권한을 허용해 주세요.', 'Please allow permission.'],
    ['잠시 후 다시 시도해 주세요.', 'Please try again shortly.'],
    ['기록이 없습니다.', 'No records available.'],
    ['정보가 없습니다.', 'No information available.']
  ].sort((a, b) => b[0].length - a[0].length);

  function currentLanguage() {
    return document.body?.dataset.jsdLanguage || document.documentElement.lang || 'ko';
  }

  function translate(value) {
    const input = String(value ?? '');
    const trimmed = input.trim();
    if (!trimmed || !hasHangul(trimmed)) return input;
    if (translations.has(trimmed)) return input.replace(trimmed, translations.get(trimmed));

    let output = input;
    for (const [ko, en] of phrasePairs) output = output.split(ko).join(en);

    output = output
      .replace(/([0-9,.]+)개 기록/gu, '$1 records')
      .replace(/([0-9,.]+)개 위치/gu, '$1 locations')
      .replace(/([0-9,.]+)초 전/gu, '$1 seconds ago')
      .replace(/([0-9,.]+)분 전/gu, '$1 minutes ago')
      .replace(/([0-9,.]+)시간 전/gu, '$1 hours ago')
      .replace(/약 ([0-9,.]+)km/gu, 'About $1 km')
      .replace(/약 ([0-9,.]+)m/gu, 'About $1 m')
      .replace(/오차 ([0-9,.]+)m/gu, 'Accuracy $1 m')
      .replace(/최대 ([0-9,.]+) dB/gu, 'Max $1 dB')
      .replace(/평균 ([0-9,.]+) dB/gu, 'Average $1 dB')
      .replace(/주요 주파수 ([0-9,.]+) Hz/gu, 'Dominant frequency $1 Hz')
      .replace(/([0-9,.]+) Hz로 잠금/gu, 'Locked at $1 Hz')
      .replace(/([0-9,.]+)% 감소/gu, '$1% reduction')
      .replace(/([0-9,.]+)% 증가/gu, '$1% increase');

    return output;
  }

  function skipTextNode(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    return Boolean(parent.closest('script,style,code,pre,textarea,input,.leaflet-container,.news-item a,.bubble.user,[data-no-translate]'));
  }

  function translateTextNode(node) {
    if (skipTextNode(node)) return;
    const current = node.nodeValue || '';
    if (currentLanguage() === 'en') {
      if (hasHangul(current) && !textOriginals.has(node)) textOriginals.set(node, current);
      const source = hasHangul(current) ? current : textOriginals.get(node);
      if (!source) return;
      const translated = translate(source);
      if (translated !== current) node.nodeValue = translated;
    } else {
      const original = textOriginals.get(node);
      if (original && current !== original) node.nodeValue = original;
    }
  }

  function translateElementAttributes(element) {
    if (!(element instanceof HTMLElement)) return;
    const attributes = ['placeholder', 'title', 'aria-label', 'alt'];
    if (element.matches('input[type="button"],input[type="submit"],input[type="reset"]')) attributes.push('value');

    let stored = attrOriginals.get(element);
    if (!stored) {
      stored = {};
      attrOriginals.set(element, stored);
    }

    for (const attr of attributes) {
      const current = element.getAttribute(attr);
      if (!current) continue;
      if (currentLanguage() === 'en') {
        if (hasHangul(current) && !stored[attr]) stored[attr] = current;
        const source = hasHangul(current) ? current : stored[attr];
        if (!source) continue;
        const translated = translate(source);
        if (translated !== current) element.setAttribute(attr, translated);
      } else if (stored[attr] && current !== stored[attr]) {
        element.setAttribute(attr, stored[attr]);
      }
    }
  }

  function apply() {
    if (applying || !document.body) return;
    applying = true;
    try {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) translateTextNode(node);
      document.querySelectorAll('[placeholder],[title],[aria-label],[alt],input[type="button"],input[type="submit"],input[type="reset"]').forEach(translateElementAttributes);
    } finally {
      applying = false;
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  }

  const observer = new MutationObserver(mutations => {
    if (applying) return;
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.target === document.body && mutation.attributeName === 'data-jsd-language') {
        schedule();
        return;
      }
      if (mutation.type === 'characterData' || mutation.type === 'childList') {
        schedule();
        return;
      }
      if (mutation.type === 'attributes') {
        schedule();
        return;
      }
    }
  });

  function initialize() {
    apply();
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-jsd-language', 'placeholder', 'title', 'aria-label', 'alt', 'value']
    });
    window.addEventListener('pageshow', schedule);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, {once:true});
  else initialize();
})();