// ---------- 맛집 담기: Kakao Local API 검색 (owner: MALE) ----------
// Mount point: #searchTabRoot (see index.html, #tab-search section)
// Do not edit index.html / css/styles.css / js/app.js — render everything into #searchTabRoot.

(function () {
  'use strict';

  // 실제 키는 js/kakao-config.js(.gitignore 처리됨, git에 커밋되지 않음)에서 window.KAKAO_REST_API_KEY로 주입된다.
  // index.html이 kakao-config.js를 kakao-search.js보다 먼저 로드한다. 새로 클론했다면
  // js/kakao-config.example.js를 js/kakao-config.js로 복사해 실제 키를 채워야 동작한다.
  // NOTE: 그래도 이 프로젝트는 정적 사이트(빌드/서버 없음)라, 배포된 페이지의 브라우저 코드에는
  // 키가 그대로 노출된다(깃 저장소에만 안 남을 뿐). 실서비스라면 서버(프록시)로 옮겨야 한다.
  const KAKAO_REST_API_KEY = window.KAKAO_REST_API_KEY || '';
  if (!KAKAO_REST_API_KEY) {
    console.error('[kakao-search] KAKAO_REST_API_KEY가 설정되지 않았습니다. js/kakao-config.example.js를 js/kakao-config.js로 복사하고 키를 채워주세요.');
  }

  const KAKAO_KEYWORD_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';
  const KAKAO_CATEGORY_URL = 'https://dapi.kakao.com/v2/local/search/category.json';

  // 카테고리 검색(category.json)은 좌표가 필수라, 좌표가 없을 때 쓸 기본 좌표: 서울시청.
  const DEFAULT_COORD = { x: '127.0246', y: '37.5662' };
  const DEFAULT_RADIUS_M = 20000; // 20km (지역 미선택 시 서울 전역 느낌으로 넓게)
  const REGION_RADIUS_M = 6000; // 6km (구 단위라 동네보다 범위가 넓어 기존 4km보다 넉넉하게)

  // ---------- 지역(자치구) 필터 ----------
  // 서울특별시 25개 자치구, 좌표는 구청/중심가 기준 근사치.
  const REGIONS = [
    { name: '강남구', x: '127.0473', y: '37.5172' },
    { name: '강동구', x: '127.1238', y: '37.5301' },
    { name: '강북구', x: '127.0257', y: '37.6396' },
    { name: '강서구', x: '126.8495', y: '37.5509' },
    { name: '관악구', x: '126.9516', y: '37.4784' },
    { name: '광진구', x: '127.0822', y: '37.5384' },
    { name: '구로구', x: '126.8874', y: '37.4954' },
    { name: '금천구', x: '126.9020', y: '37.4568' },
    { name: '노원구', x: '127.0568', y: '37.6542' },
    { name: '도봉구', x: '127.0471', y: '37.6688' },
    { name: '동대문구', x: '127.0396', y: '37.5744' },
    { name: '동작구', x: '126.9393', y: '37.5124' },
    { name: '마포구', x: '126.9086', y: '37.5663' },
    { name: '서대문구', x: '126.9368', y: '37.5791' },
    { name: '서초구', x: '127.0324', y: '37.4837' },
    { name: '성동구', x: '127.0364', y: '37.5634' },
    { name: '성북구', x: '127.0167', y: '37.5894' },
    { name: '송파구', x: '127.1058', y: '37.5145' },
    { name: '양천구', x: '126.8664', y: '37.5169' },
    { name: '영등포구', x: '126.8956', y: '37.5264' },
    { name: '용산구', x: '126.9654', y: '37.5324' },
    { name: '은평구', x: '126.9296', y: '37.6027' },
    { name: '종로구', x: '126.9790', y: '37.5730' },
    { name: '중구', x: '126.9979', y: '37.5641' },
    { name: '중랑구', x: '127.0927', y: '37.6063' }
  ];
  const REGION_COORD = REGIONS.reduce((acc, r) => { acc[r.name] = { x: r.x, y: r.y }; return acc; }, {});

  const SAVE_KEY = 'misikSavedPlaces'; // 기존 misikArchiveDemo와 별개의 저장소
  const DEBOUNCE_MS = 300;

  // ---------- 카테고리 아이콘 (대표 썸네일 대체) ----------
  // Kakao Local API 응답에는 가게 사진 필드가 없어서, js/app.js의 CATEGORY_ICON 패턴을 그대로 옮겨와
  // 카테고리별 아이콘을 "대표 이미지"처럼 카드 상단(.rcard-icon)에 보여준다. (app.js는 읽기만 하고 수정하지 않음)
  const ICON_BOWL = '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 28 h40 a20 16 0 0 1-40 0 z" stroke-linejoin="round"/><path d="M18 28 a14 10 0 0 0 28 0"/><path d="M26 12 q2 5 0 10 M34 12 q2 5 0 10" stroke-linecap="round"/></svg>';
  const ICON_CUP = '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 18 h28 v20 a14 14 0 0 1-28 0 z"/><path d="M42 24 h6 a6 6 0 0 1 0 12 h-6"/><path d="M22 10 q2 4 0 8 M30 10 q2 4 0 8" stroke-linecap="round"/></svg>';
  const ICON_PLATE = '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="32" cy="32" r="20"/><circle cx="32" cy="32" r="11"/></svg>';
  const CATEGORY_ICON = { '한식': ICON_BOWL, '중식': ICON_BOWL, '분식': ICON_BOWL, '일식': ICON_PLATE, '양식': ICON_PLATE, '카페': ICON_CUP };

  // Kakao의 category_name(예: "음식점 > 한식 > 국밥")을 세그먼트별로 확인해 CATEGORY_ICON과 매칭하고,
  // 못 찾으면 category_group_code(FD6=음식점, CE7=카페)로 대략 분류, 그래도 없으면 ICON_BOWL로 폴백.
  function pickIcon(doc) {
    const segments = (doc.category_name || '').split('>').map((s) => s.trim());
    for (const seg of segments) {
      if (CATEGORY_ICON[seg]) return CATEGORY_ICON[seg];
    }
    if (doc.category_group_code === 'CE7') return ICON_CUP;
    if (doc.category_group_code === 'FD6') return ICON_BOWL;
    return ICON_BOWL;
  }

  const root = document.getElementById('searchTabRoot');
  if (!root) return;

  const INITIAL_MSG = '검색어를 입력하거나 지역/카테고리를 선택하면 카카오 로컬 검색 결과가 여기에 표시됩니다.';

  // 마크업은 discover 탭(#tab-discover)의 기존 클래스만 재사용한다.
  // .btn-save / .btn-save.saved 는 이 프로젝트에 없던 새 클래스 — 완료 후 Female에게 전달.
  root.innerHTML = `
    <div class="kicker">맛집 담기 · Kakao Local Search</div>
    <h1 class="masthead-title">가고 싶은 곳을 검색해보세요</h1>
    <div class="masthead-filters">
      <span class="mf-item">
        <label for="ksQuery">검색어</label>
        <input type="text" id="ksQuery" placeholder="가게 이름, 지역, 음식 종류" autocomplete="off" />
      </span>
      <span class="mf-sep">·</span>
      <span class="mf-item">
        <label for="ksRegion">지역</label>
        <select id="ksRegion">
          <option value="">전체</option>
          ${REGIONS.map((r) => `<option value="${escapeHTML(r.name)}">${escapeHTML(r.name)}</option>`).join('')}
        </select>
      </span>
      <span class="mf-sep">·</span>
      <span class="mf-item">
        <label for="ksCategory">카테고리</label>
        <select id="ksCategory">
          <option value="">전체</option>
          <option value="FD6">음식점</option>
          <option value="CE7">카페</option>
        </select>
      </span>
    </div>
    <div class="rule"></div>
    <div id="ksResultGrid" class="card-grid">
      <div class="empty-state">${INITIAL_MSG}</div>
    </div>
  `;

  const queryInput = document.getElementById('ksQuery');
  const regionSelect = document.getElementById('ksRegion');
  const categorySelect = document.getElementById('ksCategory');
  const resultGrid = document.getElementById('ksResultGrid');

  // ---------- localStorage: 담은 맛집 ----------
  function loadSaved() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function persistSaved(list) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('[kakao-search] localStorage 저장 실패', e);
    }
  }

  function isSaved(id) {
    return loadSaved().some((p) => p.id === id);
  }

  // 담기/해제 토글. 반환값: true = 방금 저장됨, false = 방금 해제됨.
  function toggleSave(place) {
    const list = loadSaved();
    const idx = list.findIndex((p) => p.id === place.id);
    if (idx >= 0) {
      list.splice(idx, 1);
      persistSaved(list);
      return false;
    }
    list.push(place);
    persistSaved(list);
    return true;
  }

  // ---------- 렌더링 유틸 ----------
  function escapeHTML(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function placeCardHTML(doc) {
    const saved = isSaved(doc.id);
    const category = (doc.category_name || '').split(' > ').pop() || '기타';
    const address = doc.road_address_name || doc.address_name || '주소 정보 없음';
    const phone = doc.phone || '전화번호 정보 없음';
    return `
      <div class="rcard rcard--visual" data-place-id="${escapeHTML(doc.id)}" data-x="${escapeHTML(doc.x)}" data-y="${escapeHTML(doc.y)}">
        <div class="rcard-icon">${pickIcon(doc)}</div>
        <div class="rcard-name">${escapeHTML(doc.place_name)}</div>
        <div class="rcard-meta">${escapeHTML(category)}</div>
        <div class="rcard-desc">${escapeHTML(address)}</div>
        <div class="rcard-desc">${escapeHTML(phone)}</div>
        <div class="search-rcard-actions" style="display:flex; align-items:center; gap:10px; margin-top:16px;">
          <a class="btn ghost" href="${escapeHTML(doc.place_url)}" target="_blank" rel="noopener noreferrer">카카오맵에서 보기</a>
          <button type="button" class="btn-save${saved ? ' saved' : ''}" data-save-id="${escapeHTML(doc.id)}">${saved ? '담음 ✓' : '담기'}</button>
        </div>
      </div>
    `;
  }

  function renderStatus(message) {
    resultGrid.innerHTML = `<div class="empty-state">${escapeHTML(message)}</div>`;
  }

  function renderResults(docs) {
    if (!docs || docs.length === 0) {
      renderStatus('검색 결과가 없습니다. 다른 키워드로 시도해보세요.');
      return;
    }
    resultGrid.innerHTML = docs.map(placeCardHTML).join('');
  }

  // ---------- Kakao Local API ----------
  async function kakaoFetch(url, params) {
    const usp = new URLSearchParams(params);
    let res;
    try {
      res = await fetch(`${url}?${usp.toString()}`, {
        headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` }
      });
    } catch (networkErr) {
      throw new Error('네트워크 오류로 카카오 API에 연결하지 못했습니다. 인터넷 연결 또는 CORS(플랫폼 Web 도메인 등록)를 확인하세요.');
    }

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Kakao API 인증 실패 (401). REST API 키가 올바른지, Kakao Developers 콘솔의 플랫폼(Web)에 현재 도메인이 등록되어 있는지 확인하세요.');
      }
      throw new Error(`Kakao API 오류 (HTTP ${res.status})`);
    }
    return res.json();
  }

  let requestSeq = 0;

  async function runSearch() {
    const query = queryInput.value.trim();
    const regionName = regionSelect.value;
    const categoryCode = categorySelect.value;

    if (!query && !categoryCode && !regionName) {
      renderStatus(INITIAL_MSG);
      return;
    }

    const seq = ++requestSeq;
    renderStatus('검색 중입니다…');

    try {
      let data;
      if (query) {
        // 키워드 검색: 지역이 선택돼 있으면 검색어 앞에 지역명을 붙여 그 동네 위주로 검색
        // (+ 선택적으로 category_group_code 로 필터링)
        const combinedQuery = regionName ? `${regionName} ${query}` : query;
        const params = { query: combinedQuery, size: 15 };
        if (categoryCode) params.category_group_code = categoryCode;
        data = await kakaoFetch(KAKAO_KEYWORD_URL, params);
      } else if (categoryCode) {
        // 검색어 없이 카테고리(+ 지역)만 선택한 경우 → 카테고리 검색 API 사용
        // 지역이 선택돼 있으면 그 동네 좌표 + 좁은 반경(4km), 없으면 기본 좌표(서울시청) + 넓은 반경(20km)
        const coord = regionName ? REGION_COORD[regionName] : null;
        const params = {
          category_group_code: categoryCode,
          x: coord ? coord.x : DEFAULT_COORD.x,
          y: coord ? coord.y : DEFAULT_COORD.y,
          radius: coord ? REGION_RADIUS_M : DEFAULT_RADIUS_M,
          size: 15,
          sort: 'accuracy'
        };
        data = await kakaoFetch(KAKAO_CATEGORY_URL, params);
      } else {
        // 검색어도 카테고리도 없이 지역만 선택한 경우 → 지역명 자체를 키워드로 검색
        data = await kakaoFetch(KAKAO_KEYWORD_URL, { query: regionName, size: 15 });
      }

      if (seq !== requestSeq) return; // 이후 요청이 이미 나간 상태면 stale 응답은 무시
      renderResults(data.documents);
    } catch (err) {
      if (seq !== requestSeq) return;
      renderStatus(err && err.message ? err.message : '알 수 없는 오류가 발생했습니다.');
      console.error('[kakao-search]', err);
    }
  }

  function debounce(fn, ms) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  const debouncedSearch = debounce(runSearch, DEBOUNCE_MS);

  queryInput.addEventListener('input', debouncedSearch);
  regionSelect.addEventListener('change', runSearch);
  categorySelect.addEventListener('change', runSearch);

  // 담기/해제 버튼 (이벤트 위임)
  resultGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-save-id]');
    if (!btn) return;
    const card = btn.closest('.rcard');
    if (!card) return;

    const descs = card.querySelectorAll('.rcard-desc');
    const place = {
      id: btn.getAttribute('data-save-id'),
      name: card.querySelector('.rcard-name') ? card.querySelector('.rcard-name').textContent : '',
      category: card.querySelector('.rcard-meta') ? card.querySelector('.rcard-meta').textContent : '',
      address: descs[0] ? descs[0].textContent : '',
      phone: descs[1] ? descs[1].textContent : '',
      place_url: card.querySelector('a.btn.ghost') ? card.querySelector('a.btn.ghost').getAttribute('href') : ''
    };

    const nowSaved = toggleSave(place);
    btn.textContent = nowSaved ? '담음 ✓' : '담기';
    btn.classList.toggle('saved', nowSaved);
  });

  // ---------- 구글 리뷰 보기 ----------
  const REVIEW_CACHE_KEY = 'misikGoogleReviewCache';

  function loadReviewCache() {
    try {
      const raw = localStorage.getItem(REVIEW_CACHE_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === 'object' ? obj : {};
    } catch (e) {
      return {};
    }
  }

  function persistReviewCache(cache) {
    try {
      localStorage.setItem(REVIEW_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.error('[kakao-search] 리뷰 캐시 저장 실패', e);
    }
  }

  function getCachedReview(placeId) {
    const cache = loadReviewCache();
    return cache[placeId];
  }

  function setCachedReview(placeId, data) {
    const cache = loadReviewCache();
    cache[placeId] = data;
    persistReviewCache(cache);
  }

  // 오버레이 DOM은 index.html을 건드리지 않고 런타임에 1회 생성해 body에 붙인다.
  // discover 탭 모달(#modalOverlay)과는 완전히 별개의 id를 쓴다.
  const reviewOverlay = document.createElement('div');
  reviewOverlay.className = 'modal-overlay';
  reviewOverlay.id = 'ksReviewOverlay';
  reviewOverlay.innerHTML = `
    <div class="modal-card" id="ksReviewCard">
      <button class="modal-close" id="ksReviewClose" aria-label="닫기">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 5 L19 19 M19 5 L5 19" stroke-linecap="round"/></svg>
      </button>
      <div class="restaurant-header" id="ksReviewHeader"></div>
      <div class="review-list" id="ksReviewList"></div>
    </div>
  `;
  document.body.appendChild(reviewOverlay);

  const reviewHeader = document.getElementById('ksReviewHeader');
  const reviewList = document.getElementById('ksReviewList');

  function openReviewOverlay() {
    reviewOverlay.classList.add('open');
    document.body.classList.add('modal-open');
  }

  function closeReviewOverlay() {
    reviewOverlay.classList.remove('open');
    document.body.classList.remove('modal-open');
  }

  reviewOverlay.addEventListener('click', (e) => {
    if (e.target === reviewOverlay) closeReviewOverlay();
  });
  document.getElementById('ksReviewClose').addEventListener('click', closeReviewOverlay);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && reviewOverlay.classList.contains('open')) closeReviewOverlay();
  });

  function starLine(rating) {
    return `⭐ ${typeof rating === 'number' ? rating.toFixed(1) : '-'}`;
  }

  function renderReview(name, data) {
    if (!data || data.found === false) {
      reviewHeader.innerHTML = `
        <div class="kicker">Google Reviews</div>
        <div class="rh-top"><span class="rh-name">${escapeHTML(name)}</span></div>
      `;
      reviewList.innerHTML = `<div class="empty-state">${escapeHTML(data && data.error ? data.error : '구글에서 이 가게를 찾지 못했습니다.')}</div>`;
      return;
    }

    reviewHeader.innerHTML = `
      <div class="kicker">Google Reviews</div>
      <div class="rh-top">
        <span class="rh-name">${escapeHTML(data.name || name)}</span>
        <span class="rh-rating">${starLine(data.rating)} · 리뷰 ${data.reviewCount || 0}개</span>
      </div>
      ${data.mapsUri ? `<div class="rh-meta"><a class="btn ghost" href="${escapeHTML(data.mapsUri)}" target="_blank" rel="noopener noreferrer">구글 맵에서 전체 리뷰 보기</a></div>` : ''}
    `;

    if (!data.reviews || data.reviews.length === 0) {
      reviewList.innerHTML = `<div class="empty-state">아직 등록된 리뷰가 없습니다.</div>`;
      return;
    }

    reviewList.innerHTML = data.reviews.map((r) => `
      <div class="review-card">
        <div class="review-byline">
          <span>${escapeHTML(r.author)}</span>
          <span class="rb-rating">${starLine(r.rating)}</span>
          <span>${escapeHTML(r.relativeTime)}</span>
        </div>
        <div class="review-text">${escapeHTML(r.text)}</div>
      </div>
    `).join('');
  }

  async function openReview(placeId, name, x, y) {
    openReviewOverlay();

    const cached = getCachedReview(placeId);
    if (cached) {
      renderReview(name, cached);
      return;
    }

    reviewHeader.innerHTML = `<div class="kicker">Google Reviews</div><div class="rh-top"><span class="rh-name">${escapeHTML(name)}</span></div>`;
    reviewList.innerHTML = `<div class="empty-state">리뷰를 불러오는 중…</div>`;

    try {
      const params = new URLSearchParams({ name, lat: y, lng: x });
      const res = await fetch(`/api/google-review?${params.toString()}`);
      const data = await res.json();
      setCachedReview(placeId, data);
      renderReview(name, data);
    } catch (networkErr) {
      console.error('[kakao-search] 구글 리뷰 조회 실패', networkErr);
      reviewList.innerHTML = `<div class="empty-state">리뷰를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</div>`;
    }
  }

  // 카드 클릭(담기 버튼·카카오맵 링크 클릭은 제외) → 리뷰 열기
  resultGrid.addEventListener('click', (e) => {
    if (e.target.closest('[data-save-id]') || e.target.closest('a.btn.ghost')) return;
    const card = e.target.closest('.rcard');
    if (!card) return;

    const placeId = card.getAttribute('data-place-id');
    const name = card.querySelector('.rcard-name') ? card.querySelector('.rcard-name').textContent : '';
    const x = card.getAttribute('data-x');
    const y = card.getAttribute('data-y');
    if (!placeId || !name || !x || !y) return;

    openReview(placeId, name, x, y);
  });
})();
