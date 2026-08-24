// ---------- 맛집주머니 (mypage.html) ----------
// 담기 기능(js/kakao-search.js)이 쌓아둔 Supabase의 saved_places 테이블을 그대로 읽어서 보여준다.
// 테이블에는 RLS가 걸려 있어 "내 것만 골라줘" 조건을 직접 걸지 않고 select('*')만 해도
// Supabase가 로그인한 사용자 본인 행만 돌려준다.

(function () {
  'use strict';

  const bagGrid = document.getElementById('bagGrid');
  if (!bagGrid) return;

  const SAVED_TABLE = 'saved_places';

  function escapeHTML(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  const dateFormatter = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });

  function formatDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '날짜 정보 없음';
    return dateFormatter.format(d);
  }

  function googleMapsUrl(row) {
    const query = [row.place_name, row.address].filter(Boolean).join(' ').trim()
      || (row.lat != null && row.lng != null ? `${row.lat},${row.lng}` : row.place_name);
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
  }

  function getSupabaseClient() {
    return window.MisikAuth && window.MisikAuth.getClient ? window.MisikAuth.getClient() : null;
  }

  function renderLoginRequired() {
    bagGrid.className = '';
    bagGrid.innerHTML = `
      <div class="bag-empty">
        <p>로그인하면 담은 맛집을 볼 수 있어요.</p>
        <button type="button" class="btn" id="bagLoginBtn">로그인하기</button>
      </div>
    `;
    const btn = document.getElementById('bagLoginBtn');
    if (btn) {
      btn.addEventListener('click', () => {
        if (window.MisikAuth && window.MisikAuth.promptLogin) window.MisikAuth.promptLogin();
      });
    }
  }

  function renderEmpty() {
    bagGrid.className = '';
    bagGrid.innerHTML = `
      <div class="bag-empty">
        <p>아직 담은 맛집이 없어요. 검색하러 가볼까요?</p>
        <a class="btn" href="index.html">검색하러 가기</a>
      </div>
    `;
  }

  function bagCardHTML(row) {
    return `
      <div class="rcard bag-card" data-row-id="${escapeHTML(row.id)}">
        <button type="button" class="bag-card-remove" data-remove-id="${escapeHTML(row.id)}" aria-label="맛집주머니에서 삭제">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 5 L19 19 M19 5 L5 19" stroke-linecap="round"/></svg>
        </button>
        <div class="rcard-name">${escapeHTML(row.place_name)}</div>
        <div class="rcard-meta">${escapeHTML(row.category || '기타')}</div>
        <div class="rcard-desc">${escapeHTML(row.address || '주소 정보 없음')}</div>
        <div class="rcard-desc">담은 날짜 · ${formatDate(row.created_at)}</div>
        <div class="search-rcard-actions">
          <a class="btn ghost" href="${escapeHTML(googleMapsUrl(row))}" target="_blank" rel="noopener noreferrer">구글맵 보기</a>
        </div>
      </div>
    `;
  }

  let currentBag = [];

  function renderBag(rows) {
    currentBag = rows;
    if (!rows.length) {
      renderEmpty();
      return;
    }
    bagGrid.className = 'card-grid';
    bagGrid.innerHTML = rows.map(bagCardHTML).join('');
  }

  async function loadBag() {
    const loggedIn = window.MisikAuth && window.MisikAuth.isLoggedIn();
    if (!loggedIn) {
      renderLoginRequired();
      return;
    }

    bagGrid.className = '';
    window.MisikEmptyState.render(bagGrid, '담은 맛집을 불러오는 중…', 'loading');

    const client = getSupabaseClient();
    if (!client) return;

    // "내 것만 골라줘" 조건 없이 전체를 요청 — saved_places의 RLS(select 정책)가
    // 로그인한 사용자 본인 행만 돌려준다.
    const { data, error } = await client.from(SAVED_TABLE).select('*');
    if (error) {
      console.error('[mypage] 맛집주머니 조회 실패', error);
      window.MisikEmptyState.render(bagGrid, '맛집주머니를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.', 'error');
      return;
    }

    const sorted = (data || []).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    renderBag(sorted);
  }

  bagGrid.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-remove-id]');
    if (!btn) return;

    if (!window.confirm('맛집주머니에서 삭제할까요? 되돌릴 수 없습니다.')) return;

    const client = getSupabaseClient();
    if (!client) return;

    const rowId = btn.getAttribute('data-remove-id');
    btn.disabled = true;

    const { error } = await client.from(SAVED_TABLE).delete().eq('id', rowId);
    if (error) {
      console.error('[mypage] 맛집주머니 삭제 실패', error);
      if (window.MisikToast) window.MisikToast.show('삭제 중 오류가 발생했습니다.');
      btn.disabled = false;
      return;
    }

    renderBag(currentBag.filter((row) => String(row.id) !== rowId));
  });

  document.addEventListener('misik:auth-change', loadBag);
  loadBag();
})();
