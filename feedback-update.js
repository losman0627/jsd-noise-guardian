(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const readRows = key => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  };
  const writeRows = (key, rows, limit = 150) => localStorage.setItem(key, JSON.stringify(rows.slice(-limit)));
  const formatDate = value => {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) return '날짜 정보 없음';
    return new Intl.DateTimeFormat('ko-KR', {year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'}).format(date);
  };
  const formatNumber = (value, digits = 1) => Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '--';

  function toast(message) {
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function openModal(id) {
    const modal = $(id);
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(id) {
    const modal = $(id);
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  const style = document.createElement('style');
  style.textContent = `
    #newsList.home-news-compact{padding:8px 14px}
    #newsList.home-news-compact .news-item{padding:10px 0}
    #newsList.home-news-compact .news-item:nth-child(n+3){display:none}
    #newsList.home-news-compact .news-item p{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
    #screen-news .more-hero{margin-bottom:12px}
    #screen-news .more-summary{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:12px 0}
    #screen-news .more-summary>div{background:var(--surface2);border:1px solid var(--line);border-radius:16px;padding:13px}
    #screen-news .more-summary span{display:block;color:var(--muted);font-size:10px;font-weight:750}
    #screen-news .more-summary b{display:block;font-size:24px;margin-top:4px;letter-spacing:-.04em}
    #screen-news .more-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}
    #screen-news .more-actions .button{min-height:46px;font-size:12px;padding:0 10px}
    #screen-news .record-list{display:flex;flex-direction:column;gap:9px}
    #screen-news .record-item{border:1px solid var(--line);background:var(--surface2);border-radius:15px;padding:12px}
    #screen-news .record-item-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
    #screen-news .record-item-head b{font-size:13px;line-height:1.35}
    #screen-news .record-item-head time{font-size:9px;color:var(--muted2);white-space:nowrap}
    #screen-news .record-item p{font-size:10.5px;line-height:1.5;color:var(--muted);margin:5px 0 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    #screen-news .record-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
    #screen-news .record-actions button{border:1px solid var(--line);background:var(--surface);color:var(--text);border-radius:999px;padding:7px 10px;font-size:9.5px;font-weight:800}
    #screen-news .record-actions button.danger-mini{color:var(--bad)}
    #screen-news .empty-state{padding:18px 10px;text-align:center;color:var(--muted);font-size:11px;border:1px dashed var(--line);border-radius:14px}
    #screen-news .privacy-card p{font-size:11px;line-height:1.65;color:var(--muted);margin:0}
    #screen-news .privacy-card ul{margin:10px 0 0;padding-left:18px;color:var(--muted);font-size:10.5px;line-height:1.65}
    #screen-news #newsScreenList .news-item:nth-child(n+5){display:none}
    #screen-news .news-compact-note{font-size:10px;color:var(--muted);margin:8px 2px 0}
    #recordModal .record-modal-text{font-size:12.5px;line-height:1.7;white-space:pre-wrap;word-break:break-word;background:var(--surface2);border:1px solid var(--line);border-radius:14px;padding:13px}
    #recordModal .record-modal-meta{font-size:10.5px;color:var(--muted);line-height:1.6;margin-bottom:10px}
    @media(min-width:740px){#screen-news .more-actions{grid-template-columns:repeat(4,1fr)}}
  `;
  document.head.appendChild(style);

  function updateHomeLayout() {
    const home = $('screen-home');
    const newsList = $('newsList');
    if (!home || !newsList) return;

    newsList.classList.add('home-news-compact');
    const headings = [...home.querySelectorAll('.section-heading')];
    const newsHeading = headings.find(el => el.textContent.includes('소음 관련 소식'));
    const productHeading = headings.find(el => el.textContent.includes('연구 중인 생활환경 솔루션'));
    const productCard = home.querySelector('.product-card');

    if (newsHeading) {
      const button = newsHeading.querySelector('button');
      newsHeading.childNodes[0].textContent = '최신 소음 소식 ';
      if (button) button.textContent = '더보기에서 보기';
    }
    if (productHeading && productCard && newsHeading) {
      home.insertBefore(productHeading, newsHeading);
      home.insertBefore(productCard, newsHeading);
    }
  }

  function createRecordModal() {
    if ($('recordModal')) return;
    const modal = document.createElement('div');
    modal.id = 'recordModal';
    modal.className = 'modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="sheet">
        <div class="sheet-handle"></div>
        <p class="eyebrow">Saved Record</p>
        <h2 id="recordModalTitle">저장 기록</h2>
        <div id="recordModalMeta" class="record-modal-meta"></div>
        <div id="recordModalText" class="record-modal-text"></div>
        <div class="button-row top-gap">
          <button id="recordModalCopy" class="button soft" type="button">문안 복사</button>
          <button id="recordModalEdit" class="button primary" type="button">수정</button>
        </div>
        <button id="recordModalClose" class="button soft full top-gap" type="button">닫기</button>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', event => { if (event.target === modal) closeModal('recordModal'); });
    $('recordModalClose').addEventListener('click', () => closeModal('recordModal'));
  }

  let editingReportId = null;
  let viewingReportId = null;

  function setReportMode(id = null, clear = false) {
    editingReportId = id;
    const modal = $('reportModal');
    const heading = modal?.querySelector('h2');
    const save = $('saveReport');
    if (heading) heading.textContent = id ? '민원 기록 수정' : '민원 기록 도우미';
    if (save) save.textContent = id ? '변경 저장' : '앱에 저장';
    if (clear) {
      if ($('reportType')) $('reportType').selectedIndex = 0;
      if ($('reportAddress')) $('reportAddress').value = '';
      if ($('reportDescription')) $('reportDescription').value = '';
      if ($('reportDraft')) $('reportDraft').value = '';
    }
  }

  function openReportEditor(id) {
    const row = readRows('jsd_reports').find(item => item.id === id);
    if (!row) return toast('민원 기록을 찾지 못했습니다.');
    setReportMode(id);
    if ($('reportType')) $('reportType').value = row.noise_type || $('reportType').options[0]?.value || '';
    if ($('reportAddress')) $('reportAddress').value = row.address || '';
    if ($('reportDescription')) $('reportDescription').value = row.description || '';
    if ($('reportDraft')) $('reportDraft').value = row.draft || '';
    closeModal('recordModal');
    openModal('reportModal');
  }

  function viewReport(id) {
    const row = readRows('jsd_reports').find(item => item.id === id);
    if (!row) return toast('민원 기록을 찾지 못했습니다.');
    viewingReportId = id;
    $('recordModalTitle').textContent = row.noise_type || '민원 기록';
    $('recordModalMeta').textContent = `${formatDate(row.timestamp)}${row.address ? ` · ${row.address}` : ''}`;
    $('recordModalText').textContent = row.draft || row.description || '저장된 문안이 없습니다.';
    $('recordModalCopy').style.display = '';
    $('recordModalEdit').style.display = '';
    openModal('recordModal');
  }

  function renderReports() {
    const target = $('reportHistoryList');
    const count = $('moreReportCount');
    if (!target || !count) return;
    const rows = readRows('jsd_reports').slice().reverse();
    count.textContent = String(rows.length);
    if (!rows.length) {
      target.innerHTML = '<div class="empty-state">저장된 민원 기록이 없습니다.<br>새 민원을 작성하면 이곳에서 다시 확인할 수 있습니다.</div>';
      return;
    }
    target.innerHTML = rows.slice(0, 12).map(row => `
      <article class="record-item" data-report-id="${escapeHtml(row.id)}">
        <div class="record-item-head"><b>${escapeHtml(row.noise_type || '민원 기록')}</b><time>${escapeHtml(formatDate(row.timestamp))}</time></div>
        <p>${escapeHtml(row.address || '장소 미입력')}${row.draft ? ` · ${escapeHtml(row.draft)}` : ''}</p>
        <div class="record-actions">
          <button type="button" data-report-action="view">내용 보기</button>
          <button type="button" data-report-action="edit">수정</button>
          <button type="button" data-report-action="copy">복사</button>
          <button type="button" class="danger-mini" data-report-action="delete">삭제</button>
        </div>
      </article>`).join('');
  }

  function renderMeasurements() {
    const target = $('measurementHistoryList');
    const count = $('moreMeasurementCount');
    if (!target || !count) return;
    const rows = readRows('jsd_measurements').slice().reverse();
    count.textContent = String(rows.length);
    if (!rows.length) {
      target.innerHTML = '<div class="empty-state">저장된 측정 기록이 없습니다.<br>소음을 측정하고 지도에 저장하면 이곳에 표시됩니다.</div>';
      return;
    }
    target.innerHTML = rows.slice(0, 12).map(row => {
      const location = Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.lng))
        ? ` · 위치 ${Number(row.lat).toFixed(2)}, ${Number(row.lng).toFixed(2)}` : '';
      return `
        <article class="record-item" data-measurement-id="${escapeHtml(row.id)}">
          <div class="record-item-head"><b>${escapeHtml(formatNumber(row.db_avg))} dB · ${escapeHtml(row.db_grade || '측정 기록')}</b><time>${escapeHtml(formatDate(row.timestamp))}</time></div>
          <p>최대 ${escapeHtml(formatNumber(row.db_max))} dB · 주요 주파수 ${escapeHtml(formatNumber(row.dominant_freq, 0))} Hz${escapeHtml(location)}</p>
          <div class="record-actions"><button type="button" class="danger-mini" data-measurement-action="delete">기록 삭제</button></div>
        </article>`;
    }).join('');
  }

  function renderAllRecords() {
    renderReports();
    renderMeasurements();
    const stamp = $('moreUpdatedAt');
    if (stamp) stamp.textContent = `기기 저장 기록 · ${new Date().toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit'})} 갱신`;
  }

  function buildMoreScreen() {
    const screen = $('screen-news');
    if (!screen || screen.dataset.moreReady === 'true') return;
    screen.dataset.moreReady = 'true';

    const newsStatus = screen.querySelector('.news-status');
    const newsList = $('newsScreenList');
    newsStatus?.remove();
    newsList?.remove();

    screen.innerHTML = `
      <p class="eyebrow">More</p>
      <h1 class="page-title">기록·민원·설정</h1>
      <p class="page-subtitle">저장한 측정값과 민원 문안을 다시 확인하고 개인정보·연결 상태를 관리합니다.</p>

      <article class="card more-hero">
        <div class="more-summary">
          <div><span>저장된 측정 기록</span><b id="moreMeasurementCount">0</b></div>
          <div><span>저장된 민원 기록</span><b id="moreReportCount">0</b></div>
        </div>
        <div class="more-actions">
          <button id="newReportFromMore" class="button primary" type="button">새 민원 작성</button>
          <button id="refreshRecords" class="button soft" type="button">기록 새로고침</button>
          <button id="openConnectionSettings" class="button soft" type="button">서버·LLM 상태</button>
          <button id="exportLocalData" class="button soft" type="button">내 기록 내보내기</button>
        </div>
        <p id="moreUpdatedAt" class="help">기기 저장 기록을 확인하고 있습니다.</p>
      </article>

      <h2 class="section-heading">민원 기록 <button id="newReportInline" type="button">새로 작성</button></h2>
      <article class="card"><div id="reportHistoryList" class="record-list"></div></article>

      <h2 class="section-heading">측정 기록</h2>
      <article class="card"><div id="measurementHistoryList" class="record-list"></div></article>

      <h2 class="section-heading">개인정보·기기 데이터 관리</h2>
      <article class="card privacy-card">
        <p>민원 문안과 상세 장소는 현재 브라우저의 이 기기에 저장됩니다. 지도용 위치는 약 1km 단위로 줄여 저장되며, 마이크 원음은 저장하지 않습니다.</p>
        <ul><li>브라우저 데이터 삭제 시 기기 저장 기록도 사라질 수 있습니다.</li><li>공용 기기에서는 민원 문안에 이름·전화번호 등 불필요한 개인정보를 적지 않는 것이 좋습니다.</li></ul>
        <div class="button-row top-gap"><button id="removeSavedLocations" class="button soft" type="button">위치값만 삭제</button><button id="clearAllRecords" class="button danger" type="button">모든 기록 삭제</button></div>
      </article>

      <h2 class="section-heading">소음 관련 소식</h2>
      <div id="moreNewsMount"></div>
      <p class="news-compact-note">홈에서는 최신 2개만, 이곳에서는 최신 4개만 간단히 표시합니다.</p>`;

    const mount = $('moreNewsMount');
    if (mount && newsStatus) mount.appendChild(newsStatus);
    if (mount && newsList) mount.appendChild(newsList);
    newsList?.classList.add('card');

    const tab = document.querySelector('.tab[data-nav="news"]');
    if (tab) {
      const icon = tab.querySelector('b');
      const label = tab.querySelector('span');
      if (icon) icon.textContent = '•••';
      if (label) label.textContent = '더보기';
      tab.setAttribute('aria-label', '기록·민원·설정 더보기');
    }
  }

  function exportData() {
    const payload = {
      exported_at: new Date().toISOString(),
      measurements: readRows('jsd_measurements'),
      reports: readRows('jsd_reports'),
      preferences: {
        theme: localStorage.getItem('jsd_theme') || 'light',
        expected_frequency: localStorage.getItem('jsd_expected_freq') || ''
      }
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `JSD_records_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('측정·민원 기록을 파일로 내보냈습니다.');
  }

  function bindActions() {
    $('newReportFromMore')?.addEventListener('click', () => { setReportMode(null, true); openModal('reportModal'); });
    $('newReportInline')?.addEventListener('click', () => { setReportMode(null, true); openModal('reportModal'); });
    $('refreshRecords')?.addEventListener('click', () => { renderAllRecords(); toast('저장 기록을 새로고침했습니다.'); });
    $('openConnectionSettings')?.addEventListener('click', () => $('serverStatus')?.click());
    $('exportLocalData')?.addEventListener('click', exportData);

    $('removeSavedLocations')?.addEventListener('click', () => {
      const rows = readRows('jsd_measurements').map(row => {
        const copy = {...row};
        delete copy.lat;
        delete copy.lng;
        delete copy.accuracy;
        return copy;
      });
      writeRows('jsd_measurements', rows);
      renderMeasurements();
      toast('기기에 저장된 위치값만 삭제했습니다.');
    });

    $('clearAllRecords')?.addEventListener('click', () => {
      if (!confirm('이 기기에 저장된 측정 기록과 민원 기록을 모두 삭제할까요? 삭제 후 복구할 수 없습니다.')) return;
      localStorage.removeItem('jsd_measurements');
      localStorage.removeItem('jsd_reports');
      renderAllRecords();
      toast('기기 저장 기록을 모두 삭제했습니다.');
    });

    $('screen-news')?.addEventListener('click', async event => {
      const reportItem = event.target.closest('[data-report-id]');
      const reportAction = event.target.closest('[data-report-action]')?.dataset.reportAction;
      if (reportItem && reportAction) {
        const id = reportItem.dataset.reportId;
        const rows = readRows('jsd_reports');
        const row = rows.find(item => item.id === id);
        if (!row) return toast('민원 기록을 찾지 못했습니다.');
        if (reportAction === 'view') viewReport(id);
        if (reportAction === 'edit') openReportEditor(id);
        if (reportAction === 'copy') {
          try { await navigator.clipboard.writeText(row.draft || row.description || ''); toast('민원 문안을 복사했습니다.'); }
          catch (_) { toast('복사하지 못했습니다. 내용을 열어 직접 복사해 주세요.'); }
        }
        if (reportAction === 'delete') {
          if (!confirm('이 민원 기록을 삭제할까요?')) return;
          writeRows('jsd_reports', rows.filter(item => item.id !== id), 100);
          renderReports();
          toast('민원 기록을 삭제했습니다.');
        }
        return;
      }

      const measurementItem = event.target.closest('[data-measurement-id]');
      const measurementAction = event.target.closest('[data-measurement-action]')?.dataset.measurementAction;
      if (measurementItem && measurementAction === 'delete') {
        if (!confirm('이 측정 기록을 삭제할까요?')) return;
        const rows = readRows('jsd_measurements').filter(item => item.id !== measurementItem.dataset.measurementId);
        writeRows('jsd_measurements', rows);
        renderMeasurements();
        toast('측정 기록을 삭제했습니다.');
      }
    });

    $('recordModalCopy')?.addEventListener('click', async () => {
      const row = readRows('jsd_reports').find(item => item.id === viewingReportId);
      if (!row) return;
      try { await navigator.clipboard.writeText(row.draft || row.description || ''); toast('민원 문안을 복사했습니다.'); }
      catch (_) { toast('문안을 복사하지 못했습니다.'); }
    });
    $('recordModalEdit')?.addEventListener('click', () => viewingReportId && openReportEditor(viewingReportId));

    $('openReport')?.addEventListener('click', () => setReportMode(null), true);
    $('closeReport')?.addEventListener('click', () => setTimeout(() => setReportMode(null), 0));

    const saveReport = $('saveReport');
    saveReport?.addEventListener('click', event => {
      if (editingReportId) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const rows = readRows('jsd_reports');
        const index = rows.findIndex(item => item.id === editingReportId);
        if (index < 0) {
          setReportMode(null);
          toast('수정할 민원 기록을 찾지 못했습니다.');
          return;
        }
        rows[index] = {
          ...rows[index],
          updated_at: new Date().toISOString(),
          noise_type: $('reportType')?.value || rows[index].noise_type,
          address: $('reportAddress')?.value || '',
          description: $('reportDescription')?.value || '',
          draft: $('reportDraft')?.value || ''
        };
        writeRows('jsd_reports', rows, 100);
        setReportMode(null);
        closeModal('reportModal');
        renderReports();
        toast('민원 기록을 수정했습니다.');
        return;
      }
      setTimeout(renderReports, 80);
    }, true);
  }

  function watchStorageChanges() {
    window.addEventListener('storage', event => {
      if (event.key === 'jsd_reports' || event.key === 'jsd_measurements') renderAllRecords();
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) renderAllRecords(); });
  }

  updateHomeLayout();
  buildMoreScreen();
  createRecordModal();
  bindActions();
  watchStorageChanges();
  renderAllRecords();
})();