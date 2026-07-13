(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  const style = document.createElement('style');
  style.textContent = `
    .product-card.sorijung-card{padding:16px;background:linear-gradient(145deg,color-mix(in srgb,var(--yellow) 22%,var(--surface)),var(--surface) 58%,color-mix(in srgb,var(--navy) 7%,var(--surface)));overflow:hidden;position:relative}
    .product-card.sorijung-card::after{content:"正";position:absolute;right:-8px;top:-22px;font-size:96px;font-weight:900;line-height:1;color:color-mix(in srgb,var(--navy) 6%,transparent);pointer-events:none}
    .sorijung-brand{display:flex;align-items:center;justify-content:space-between;gap:10px;position:relative;z-index:1}
    .sorijung-brand>div{display:flex;flex-direction:column}
    .sorijung-brand strong{font-size:25px;letter-spacing:-.06em;color:var(--navy)}
    body[data-theme="dark"] .sorijung-brand strong{color:var(--yellow)}
    .sorijung-brand span{font-size:9px;font-weight:900;letter-spacing:.12em;color:var(--muted);text-transform:uppercase}
    .sorijung-card>p{position:relative;z-index:1;font-size:11.5px;line-height:1.62;margin-top:8px;max-width:94%}
    .sorijung-models{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:13px;position:relative;z-index:1}
    .sorijung-model{padding:11px;border-radius:14px;border:1px solid var(--line);background:color-mix(in srgb,var(--surface) 86%,transparent)}
    .sorijung-model em{display:block;font-style:normal;font-size:9px;font-weight:900;color:var(--muted2);margin-bottom:4px}
    .sorijung-model b{display:block;font-size:12.5px}
    .sorijung-model small{display:block;font-size:9.5px;line-height:1.45;color:var(--muted);margin-top:4px}
    .sorijung-meaning{margin-top:11px!important;font-size:9.5px!important;color:var(--muted2)!important}
    #screen-news #newsScreenList .news-item{display:block!important}
    #screen-news #newsScreenList .news-item p{display:block;-webkit-line-clamp:unset;overflow:visible}
    .tabbar .tab{font-size:7.8px}
    .tabbar .tab b{font-size:18px}
  `;
  document.head.appendChild(style);

  function updateProductPromotion() {
    const home = $('screen-home');
    if (!home) return;
    const headings = [...home.querySelectorAll('.section-heading')];
    const productHeading = headings.find(el => el.textContent.includes('연구 중인 생활환경 솔루션')) || headings.find(el => el.textContent.includes('소리정'));
    const newsHeading = headings.find(el => el.textContent.includes('최신 소음 소식') || el.textContent.includes('소음 관련 소식'));
    const productCard = home.querySelector('.product-card');

    if (productHeading) productHeading.textContent = '소리정 · 생활형 소음 저감 커튼';
    if (productCard) {
      productCard.classList.add('sorijung-card');
      productCard.innerHTML = `
        <div class="sorijung-brand">
          <div><span>Sori-Jung</span><strong>소리정</strong></div>
          <span>소리를 바르게 정하다</span>
        </div>
        <p>공사 현장에서 버려지는 폴리에스터 소재를 재활용한 방음 원단으로 생활소음을 줄이고, 필요한 공간에는 저주파 제어 기술까지 더합니다.</p>
        <div class="sorijung-models">
          <div class="sorijung-model"><em>BASIC</em><b>소리정 기본형</b><small>방음 원단만 적용한 간결하고 접근성 높은 모델</small></div>
          <div class="sorijung-model"><em>HYBRID</em><b>소리정 하이브리드</b><small>기본형에 저주파 ANC 헤더 모듈을 결합한 모델</small></div>
        </div>
        <p class="sorijung-meaning">소리 + 正(Justice) + 定(Definition) · 소음으로부터 권리를 지키고, 소리의 기준을 다시 정하는 이름</p>`;
    }

    if (newsHeading) {
      const button = newsHeading.querySelector('button');
      if (button) button.textContent = '뉴스 전체 보기';
    }
  }

  function navigateMore() {
    document.querySelectorAll('.screen').forEach(el => el.classList.toggle('active', el.id === 'screen-more'));
    document.querySelectorAll('.tab').forEach(el => el.classList.toggle('active', el.dataset.nav === 'more'));
    window.scrollTo({top:0, behavior:'smooth'});
    document.getElementById('refreshRecords')?.click();
  }

  function separateNewsAndMore() {
    const moreScreen = $('screen-news');
    const tabbar = document.querySelector('.tabbar');
    const newsTab = tabbar?.querySelector('.tab[data-nav="news"]');
    if (!moreScreen || !tabbar || !newsTab || $('screen-more')) return;

    const newsStatus = moreScreen.querySelector('.news-status');
    const newsList = $('newsScreenList');
    if (!newsStatus || !newsList) return;

    const wasActive = moreScreen.classList.contains('active');
    moreScreen.id = 'screen-more';

    const newsScreen = document.createElement('section');
    newsScreen.id = 'screen-news';
    newsScreen.className = 'screen';
    newsScreen.innerHTML = `
      <p class="eyebrow">Live Noise News</p>
      <h1 class="page-title">소음 관련 뉴스</h1>
      <p class="page-subtitle">소음 정책, 생활환경, 건강과 기술에 관한 최신 소식을 한곳에서 확인합니다.</p>`;
    newsScreen.appendChild(newsStatus);
    newsScreen.appendChild(newsList);
    moreScreen.parentNode.insertBefore(newsScreen, moreScreen);

    const mount = $('moreNewsMount');
    const newsHeading = [...moreScreen.querySelectorAll('.section-heading')].find(el => el.textContent.includes('소음 관련 소식'));
    const note = moreScreen.querySelector('.news-compact-note');
    mount?.remove();
    newsHeading?.remove();
    note?.remove();

    const newsIcon = newsTab.querySelector('b');
    const newsLabel = newsTab.querySelector('span');
    if (newsIcon) newsIcon.textContent = '▤';
    if (newsLabel) newsLabel.textContent = '뉴스';
    newsTab.setAttribute('aria-label', '소음 관련 뉴스');

    const moreTab = document.createElement('button');
    moreTab.className = 'tab';
    moreTab.type = 'button';
    moreTab.dataset.nav = 'more';
    moreTab.setAttribute('aria-label', '기록·민원·설정 더보기');
    moreTab.innerHTML = '<b>•••</b><span>더보기</span>';
    moreTab.addEventListener('click', navigateMore);
    tabbar.appendChild(moreTab);

    if (wasActive) {
      newsTab.classList.remove('active');
      moreTab.classList.add('active');
      moreScreen.classList.add('active');
      newsScreen.classList.remove('active');
    }
  }

  updateProductPromotion();
  separateNewsAndMore();
})();
