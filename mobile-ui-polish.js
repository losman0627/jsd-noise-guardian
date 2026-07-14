(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const SESSION_KEY = 'jsd_product_promo_collapsed';
  const isEnglish = () => document.documentElement.lang === 'en';

  const style = document.createElement('style');
  style.id = 'jsd-mobile-ui-polish-style';
  style.textContent = `
    .sorijung-card.product-swipe-card{
      max-height:920px;
      transform:translate3d(0,0,0);
      opacity:1;
      transition:max-height .34s cubic-bezier(.2,.8,.2,1),opacity .24s ease,transform .34s cubic-bezier(.2,.8,.2,1),margin .34s ease,padding .34s ease,border-width .34s ease;
      will-change:transform,max-height,opacity;
      touch-action:pan-y;
    }
    .product-swipe-controls{
      position:relative;z-index:4;display:flex;align-items:center;justify-content:center;
      min-height:27px;margin:-7px -4px 7px;padding:3px 34px 4px;cursor:grab;user-select:none;
      -webkit-user-select:none;touch-action:none;
    }
    .product-swipe-controls:active{cursor:grabbing}
    .product-swipe-handle{width:46px;height:5px;border-radius:999px;background:color-mix(in srgb,var(--muted2) 52%,transparent)}
    .product-swipe-label{position:absolute;left:50%;top:17px;transform:translateX(-50%);font-size:8px;font-weight:850;color:var(--muted2);white-space:nowrap;opacity:.82}
    .product-swipe-close{
      position:absolute;right:0;top:0;width:29px;height:29px;border:1px solid var(--line);border-radius:50%;
      background:color-mix(in srgb,var(--surface) 90%,transparent);color:var(--muted);font:inherit;font-size:17px;line-height:1;cursor:pointer;
    }
    .sorijung-card.product-swipe-card.is-collapsed{
      max-height:0!important;opacity:0;transform:translate3d(0,-20px,0) scale(.985);margin-top:0!important;margin-bottom:0!important;
      padding-top:0!important;padding-bottom:0!important;border-width:0!important;pointer-events:none;
    }
    .product-reopen-button{
      display:none;width:100%;min-height:48px;margin:8px 0 4px;border:1px dashed color-mix(in srgb,var(--navy) 30%,var(--line));
      border-radius:16px;background:color-mix(in srgb,var(--surface) 92%,var(--navy) 3%);color:var(--navy);
      font:inherit;font-size:11px;font-weight:900;cursor:pointer;
    }
    body[data-theme="dark"] .product-reopen-button{color:var(--yellow)}
    .product-reopen-button.show{display:block;animation:jsdReopenIn .25s ease}
    @keyframes jsdReopenIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}

    #screen-more,#screen-more *{box-sizing:border-box}
    #screen-more{width:100%;min-width:0;max-width:100%;overflow-x:clip}
    #screen-more>*,#screen-more .card,#screen-more .more-hero,#screen-more .privacy-card{min-width:0;max-width:100%;width:100%}
    #screen-more .more-summary{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}
    #screen-more .more-summary>div{min-width:0;overflow:hidden}
    #screen-more .more-summary span,#screen-more .more-summary b{overflow-wrap:anywhere;word-break:keep-all}
    #screen-more .more-actions{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}
    #screen-more .more-actions .button,#screen-more .button-row .button{
      width:100%;min-width:0;max-width:100%;height:auto;min-height:46px;padding:10px 8px!important;
      white-space:normal!important;overflow-wrap:anywhere;word-break:keep-all;line-height:1.3;text-align:center;
    }
    #screen-more .section-heading{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;min-width:0}
    #screen-more .section-heading button{max-width:100%;white-space:normal}
    #screen-more .record-list{width:100%;min-width:0}
    #screen-more .record-item{width:100%;min-width:0;overflow:hidden}
    #screen-more .record-item-head{display:flex!important;align-items:flex-start;flex-wrap:wrap;min-width:0;gap:5px 8px!important}
    #screen-more .record-item-head b{flex:1 1 150px;min-width:0;overflow-wrap:anywhere;word-break:break-word}
    #screen-more .record-item-head time{flex:0 1 auto;max-width:100%;margin-left:auto;white-space:normal!important;text-align:right}
    #screen-more .record-item p{max-width:100%;overflow-wrap:anywhere;word-break:break-word}
    #screen-more .record-actions{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px!important;width:100%}
    #screen-more .record-actions button{width:100%;min-width:0;white-space:normal;overflow-wrap:anywhere;line-height:1.25}
    #screen-more .record-actions button:only-child{grid-column:1/-1}
    #screen-more .privacy-card .button-row{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px!important;width:100%}
    #screen-more .privacy-card p,#screen-more .privacy-card li{overflow-wrap:anywhere;word-break:keep-all}
    #screen-more .jsd-settings-card,#screen-more .jsd-pref-group,#screen-more .jsd-segmented{min-width:0;max-width:100%}
    #screen-more .jsd-segmented button{min-width:0;padding-left:5px;padding-right:5px;white-space:normal;overflow-wrap:anywhere}

    @media(min-width:740px){
      #screen-more .more-actions{grid-template-columns:repeat(4,minmax(0,1fr))!important}
    }
    @media(max-width:520px){
      .sorijung-card.product-swipe-card{max-height:1100px}
      .product-swipe-controls{display:flex}
      #screen-more{padding-left:0!important;padding-right:0!important}
      #screen-more .page-title,#screen-more .page-subtitle,#screen-more>.eyebrow{max-width:100%;overflow-wrap:anywhere}
      #screen-more .card{padding:13px!important}
      #screen-more .more-summary b{font-size:21px!important}
      #screen-more .more-actions .button{font-size:10.5px!important}
      #screen-more .record-actions button{padding:8px 5px!important;font-size:9.5px!important}
    }
    @media(max-width:380px){
      #screen-more .more-actions,#screen-more .privacy-card .button-row{grid-template-columns:1fr!important}
      #screen-more .more-summary{gap:6px!important}
      #screen-more .more-summary>div{padding:10px!important}
      #screen-more .more-summary span{font-size:8.7px!important}
      #screen-more .record-actions{grid-template-columns:1fr!important}
      #screen-more .record-actions button:only-child{grid-column:auto}
      #screen-more .jsd-pref-group:nth-of-type(2) .jsd-segmented{grid-template-columns:1fr!important}
    }
    @media(min-width:760px){
      .product-swipe-label{display:none}
    }
  `;
  document.head.appendChild(style);

  function toast(ko, en) {
    const target = document.getElementById('toast');
    if (!target) return;
    target.textContent = isEnglish() ? en : ko;
    target.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => target.classList.remove('show'), 2200);
  }

  function setupProductSwipe() {
    const card = $('#screen-home .product-card.sorijung-card');
    if (!card || card.dataset.swipeReady === 'true') return;
    card.dataset.swipeReady = 'true';
    card.classList.add('product-swipe-card');

    const controls = document.createElement('div');
    controls.className = 'product-swipe-controls';
    controls.setAttribute('role', 'button');
    controls.setAttribute('tabindex', '0');
    controls.innerHTML = `
      <span class="product-swipe-handle" aria-hidden="true"></span>
      <span class="product-swipe-label"></span>
      <button class="product-swipe-close" type="button" aria-label="제품 설명 닫기">×</button>`;
    card.insertBefore(controls, card.firstChild);

    const reopen = document.createElement('button');
    reopen.type = 'button';
    reopen.className = 'product-reopen-button';
    reopen.setAttribute('aria-expanded', 'true');
    card.insertAdjacentElement('afterend', reopen);

    const updateLabels = () => {
      const en = isEnglish();
      const label = controls.querySelector('.product-swipe-label');
      const close = controls.querySelector('.product-swipe-close');
      if (label) label.textContent = en ? 'Swipe down to close' : '아래로 밀어 닫기';
      if (close) close.setAttribute('aria-label', en ? 'Close product description' : '제품 설명 닫기');
      controls.setAttribute('aria-label', en ? 'Swipe down to close product description' : '아래로 밀어 제품 설명 닫기');
      reopen.textContent = en ? 'Open Sori-Jung product description' : '소리정 제품 설명 다시 열기';
      reopen.setAttribute('aria-label', reopen.textContent);
    };

    let startX = 0;
    let startY = 0;
    let dragging = false;
    let moved = false;

    const collapse = () => {
      if (card.classList.contains('is-collapsed')) return;
      card.style.transform = '';
      card.style.opacity = '';
      card.classList.add('is-collapsed');
      reopen.classList.add('show');
      reopen.setAttribute('aria-expanded', 'false');
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (_) {}
      toast('제품 설명을 접었습니다.', 'Product description closed.');
      window.setTimeout(() => reopen.focus({preventScroll:true}), 330);
    };

    const expand = () => {
      card.classList.remove('is-collapsed');
      reopen.classList.remove('show');
      reopen.setAttribute('aria-expanded', 'true');
      try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
      toast('제품 설명을 다시 열었습니다.', 'Product description opened.');
      window.setTimeout(() => controls.focus({preventScroll:true}), 180);
    };

    const begin = (x, y) => {
      startX = x;
      startY = y;
      dragging = true;
      moved = false;
      card.style.transition = 'none';
    };

    const move = (x, y) => {
      if (!dragging) return;
      const dx = x - startX;
      const dy = y - startY;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved = true;
      if (dy > 0 && Math.abs(dy) >= Math.abs(dx)) {
        const offset = Math.min(110, dy * .72);
        card.style.transform = `translate3d(0,${offset}px,0)`;
        card.style.opacity = String(Math.max(.45, 1 - offset / 180));
      }
    };

    const finish = (x, y) => {
      if (!dragging) return;
      dragging = false;
      card.style.transition = '';
      const dx = x - startX;
      const dy = y - startY;
      card.style.transform = '';
      card.style.opacity = '';
      if ((dy > 52 && Math.abs(dy) > Math.abs(dx)) || Math.abs(dx) > 105) collapse();
    };

    controls.addEventListener('touchstart', event => {
      const touch = event.touches[0];
      if (touch) begin(touch.clientX, touch.clientY);
    }, {passive:true});
    controls.addEventListener('touchmove', event => {
      const touch = event.touches[0];
      if (!touch) return;
      move(touch.clientX, touch.clientY);
      if (moved) event.preventDefault();
    }, {passive:false});
    controls.addEventListener('touchend', event => {
      const touch = event.changedTouches[0];
      if (touch) finish(touch.clientX, touch.clientY);
    }, {passive:true});

    controls.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch' || event.target.closest('.product-swipe-close')) return;
      begin(event.clientX, event.clientY);
      controls.setPointerCapture?.(event.pointerId);
    });
    controls.addEventListener('pointermove', event => move(event.clientX, event.clientY));
    controls.addEventListener('pointerup', event => finish(event.clientX, event.clientY));
    controls.addEventListener('pointercancel', event => finish(event.clientX, event.clientY));
    controls.addEventListener('keydown', event => {
      if (event.key === 'Escape' || event.key === 'ArrowDown') {
        event.preventDefault();
        collapse();
      }
    });
    controls.querySelector('.product-swipe-close')?.addEventListener('click', event => {
      event.stopPropagation();
      collapse();
    });
    reopen.addEventListener('click', expand);

    updateLabels();
    new MutationObserver(updateLabels).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});

    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') {
        card.classList.add('is-collapsed');
        reopen.classList.add('show');
        reopen.setAttribute('aria-expanded', 'false');
      }
    } catch (_) {}
  }

  function normalizeMoreLayout() {
    const more = document.getElementById('screen-more');
    if (!more) return;
    more.querySelectorAll('.card,.record-item,.more-summary>div,.more-actions>*').forEach(element => {
      element.style.minWidth = '0';
      element.style.maxWidth = '100%';
    });
  }

  function init() {
    setupProductSwipe();
    normalizeMoreLayout();
    const observer = new MutationObserver(() => {
      setupProductSwipe();
      normalizeMoreLayout();
    });
    observer.observe(document.body, {subtree:true, childList:true});
    window.addEventListener('resize', normalizeMoreLayout, {passive:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();