// ---------- 맛집 담기: Kakao Local API 검색 (owner: MALE) ----------
// Mount point: #searchTabRoot (#tab-search 섹션, index.html 참고).

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

  const SAVED_TABLE = 'saved_places'; // sql/saved_places.sql로 생성하는 Supabase 테이블
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

  // 마크업은 카드 그리드에 쓰이던 기존 공용 클래스(.masthead-filters, .card-grid, .rcard 등)를 재사용한다.
  // .btn-save / .btn-save.saved 는 이 프로젝트에 없던 새 클래스 — 완료 후 Female에게 전달.
  root.innerHTML = `
    <div class="kicker">맛집 담기 · Kakao Local Search</div>
    <h1 class="masthead-title">가고 싶은 곳을 검색해보세요</h1>

    <div class="home-widgets">
      <section class="home-widget">
        <div class="kicker">지금 인기 맛집</div>
        <h2 class="widget-title">가장 많이 담긴 TOP 5</h2>
        <div id="rankingList"></div>
      </section>

      <section class="home-widget" id="recoWidget" hidden>
        <div class="kicker" id="recoKicker">맞춤 추천</div>
        <h2 class="widget-title" id="recoTitle"></h2>
        <div id="recoGrid" class="card-grid"></div>
      </section>
    </div>
    <div class="rule"></div>

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
      ${window.MisikEmptyState.html(INITIAL_MSG, 'empty')}
    </div>
  `;

  const queryInput = document.getElementById('ksQuery');
  const regionSelect = document.getElementById('ksRegion');
  const categorySelect = document.getElementById('ksCategory');
  const resultGrid = document.getElementById('ksResultGrid');
  const rankingList = document.getElementById('rankingList');
  const recoWidget = document.getElementById('recoWidget');
  const recoKicker = document.getElementById('recoKicker');
  const recoTitle = document.getElementById('recoTitle');
  const recoGrid = document.getElementById('recoGrid');

  // ---------- 담은 맛집 (Supabase saved_places, 로그인 사용자별) ----------
  // 실제 담김 여부는 Supabase에 있지만, 카드 렌더링은 동기적으로 일어나야 하므로
  // 로그인한 사용자의 place_id 목록을 이 Set에 캐시해두고 렌더링/버튼 표시에 쓴다.
  let savedPlaceIds = new Set();

  function getSupabaseClient() {
    return window.MisikAuth && window.MisikAuth.getClient ? window.MisikAuth.getClient() : null;
  }

  function isSaved(id) {
    return savedPlaceIds.has(id);
  }

  // 이미 그려져 있는 카드들의 담기 버튼을 savedPlaceIds 기준으로 다시 칠한다.
  // 로그인 상태 확인이나 목록 조회가 카드 렌더링보다 늦게 끝나는 경우를 보정하기 위함.
  function syncSaveButtons() {
    document.querySelectorAll('[data-save-id]').forEach((btn) => {
      const saved = isSaved(btn.getAttribute('data-save-id'));
      btn.textContent = saved ? '담음 ✓' : '담기';
      btn.classList.toggle('saved', saved);
    });
  }

  // 로그인 상태가 바뀔 때마다(최초 세션 확인 포함) 이 사용자가 담아둔 가게 id 목록을 새로 받아온다.
  async function refreshSavedIds() {
    const loggedIn = window.MisikAuth && window.MisikAuth.isLoggedIn();
    if (!loggedIn) {
      savedPlaceIds = new Set();
      syncSaveButtons();
      return;
    }
    const client = getSupabaseClient();
    const user = window.MisikAuth.getUser();
    if (!client || !user) return;

    const { data, error } = await client.from(SAVED_TABLE).select('place_id').eq('user_id', user.id);
    if (error) {
      console.error('[kakao-search] 담은 가게 목록 조회 실패', error);
      return;
    }
    savedPlaceIds = new Set((data || []).map((row) => row.place_id));
    syncSaveButtons();
  }

  document.addEventListener('misik:auth-change', refreshSavedIds);
  refreshSavedIds();

  // 담기/해제 토글. Supabase에 insert/delete 하고, 성공하면 캐시(savedPlaceIds)도 맞춰준다.
  async function toggleSave(place) {
    const client = getSupabaseClient();
    const user = window.MisikAuth.getUser();
    if (!client || !user) return isSaved(place.place_id);

    if (isSaved(place.place_id)) {
      const { error } = await client
        .from(SAVED_TABLE)
        .delete()
        .eq('user_id', user.id)
        .eq('place_id', place.place_id);
      if (error) throw error;
      savedPlaceIds.delete(place.place_id);
      return false;
    }

    const { error } = await client.from(SAVED_TABLE).insert({
      user_id: user.id,
      place_id: place.place_id,
      place_name: place.place_name,
      category: place.category,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
    });
    // 23505 = unique_violation. 이미 담겨 있는데 중복 클릭 등으로 다시 insert된 경우이므로
    // 에러로 취급하지 않고 "담김" 상태로 정리한다.
    if (error && error.code !== '23505') throw error;
    savedPlaceIds.add(place.place_id);
    return true;
  }

  // ---------- 홈 위젯 1: 인기 랭킹 TOP 5 ----------
  // Postgres 함수 get_popular_places(sql/get_popular_places.sql)를 호출한다. saved_places에
  // 걸린 RLS 때문에 일반 select로는 본인 것만 보이지만, 이 함수는 SECURITY DEFINER로
  // 전체를 집계해 "가게 이름 + 담긴 횟수"만 돌려준다(누가 담았는지는 절대 나오지 않음).
  // 로그인 여부와 무관하게 누구나 볼 수 있는 공개 데이터라 로그인 없이도 호출한다.
  function rankingItemHTML(row, idx) {
    return `
      <li class="ranking-item">
        <span class="rank-num">${idx + 1}</span>
        <span class="rank-name">${escapeHTML(row.place_name)}</span>
        <span class="rank-count">${escapeHTML(row.save_count)}번 담김</span>
      </li>
    `;
  }

  async function loadPopularPlaces() {
    if (!rankingList) return;
    window.MisikEmptyState.render(rankingList, '인기 맛집을 불러오는 중…', 'loading');

    const client = getSupabaseClient();
    if (!client) return;

    const { data, error } = await client.rpc('get_popular_places', { result_limit: 5 });
    if (error) {
      console.error('[kakao-search] 인기 랭킹 조회 실패', error);
      window.MisikEmptyState.render(rankingList, '인기 랭킹을 불러오지 못했습니다.', 'error');
      return;
    }
    if (!data || data.length === 0) {
      window.MisikEmptyState.render(rankingList, '아직 담긴 맛집이 없습니다.', 'empty');
      return;
    }
    rankingList.innerHTML = `<ol class="ranking-list">${data.map(rankingItemHTML).join('')}</ol>`;
  }

  // ---------- 홈 위젯 2: 맞춤 추천 (내가 담은 가게 기반) ----------
  // 로그인한 사용자가 담은 가게들(saved_places) 중 가장 잦은 카테고리를 찾아, 그
  // 카테고리로 Kakao 키워드 검색을 해서 보여준다. 이미 담은 가게는 결과에서 뺀다.
  // 여기서도 "내 것만 골라줘" 조건(eq user_id)을 걸지 않고 select만 한다 — RLS가
  // 로그인한 사용자 본인 행만 돌려준다.
  async function loadPersonalRecommendation() {
    if (!recoWidget) return;
    if (!window.MisikAuth || !window.MisikAuth.isLoggedIn()) {
      recoWidget.hidden = true;
      return;
    }

    const client = getSupabaseClient();
    const user = window.MisikAuth.getUser();
    if (!client || !user) {
      recoWidget.hidden = true;
      return;
    }

    const { data, error } = await client.from(SAVED_TABLE).select('category, place_id');
    if (error) {
      console.error('[kakao-search] 맞춤 추천용 담은 가게 조회 실패', error);
      recoWidget.hidden = true;
      return;
    }
    if (!data || data.length === 0) {
      recoWidget.hidden = true;
      return;
    }

    const counts = {};
    data.forEach((row) => {
      if (!row.category) return;
      counts[row.category] = (counts[row.category] || 0) + 1;
    });
    const topEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!topEntry) {
      recoWidget.hidden = true;
      return;
    }
    const categoryName = topEntry[0];
    const excludeIds = new Set(data.map((row) => row.place_id));

    recoWidget.hidden = false;
    const displayName = (user.email || '').split('@')[0];
    recoKicker.textContent = `${displayName}님을 위한 추천`;
    recoTitle.textContent = `${categoryName} 맛집, 이런 곳 어때요?`;
    window.MisikEmptyState.render(recoGrid, '추천 맛집을 불러오는 중…', 'loading');

    try {
      const result = await kakaoFetch(KAKAO_KEYWORD_URL, {
        query: categoryName,
        x: DEFAULT_COORD.x,
        y: DEFAULT_COORD.y,
        radius: DEFAULT_RADIUS_M,
        size: 15,
        sort: 'accuracy'
      });
      const filtered = (result.documents || []).filter((doc) => !excludeIds.has(doc.id)).slice(0, 5);
      renderResults(filtered, recoGrid);
    } catch (err) {
      console.error('[kakao-search] 맞춤 추천 검색 실패', err);
      window.MisikEmptyState.render(recoGrid, '추천을 불러오지 못했습니다.', 'error');
    }
  }

  // 로그인 상태가 처음 확인된 시점(비로그인 포함, misik:auth-change는 항상 한 번은 쏜다)에
  // 랭킹을 한 번 불러오고, 이후 로그인/로그아웃이 바뀔 때마다 맞춤 추천을 다시 계산한다.
  let rankingLoaded = false;
  document.addEventListener('misik:auth-change', () => {
    if (!rankingLoaded) {
      rankingLoaded = true;
      loadPopularPlaces();
    }
    loadPersonalRecommendation();
  });

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
      <div class="rcard rcard--visual" tabindex="0" data-place-id="${escapeHTML(doc.id)}" data-x="${escapeHTML(doc.x)}" data-y="${escapeHTML(doc.y)}">
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

  function renderStatus(message, type, grid) {
    window.MisikEmptyState.render(grid || resultGrid, escapeHTML(message), type || 'empty');
  }

  function renderResults(docs, grid) {
    const target = grid || resultGrid;
    if (!docs || docs.length === 0) {
      renderStatus('검색 결과가 없습니다. 다른 키워드로 시도해보세요.', 'empty', target);
      return;
    }
    target.innerHTML = docs.map(placeCardHTML).join('');
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
      renderStatus(INITIAL_MSG, 'empty');
      return;
    }

    const seq = ++requestSeq;
    renderStatus('검색 중입니다…', 'loading');

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
      renderStatus(err && err.message ? err.message : '알 수 없는 오류가 발생했습니다.', 'error');
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

  // 카드 자체는 담기 버튼/카카오맵 링크를 품고 있어 <button>으로 만들 수 없다(인터랙티브 요소 중첩 불가).
  // 대신 tabindex="0"을 주고, 포커스가 카드 자체(중첩된 버튼/링크가 아님)에 있을 때 Enter/Space를
  // 클릭으로 위임해 키보드로도 열 수 있게 한다.
  // document에 위임해서, 검색 결과 그리드뿐 아니라 맞춤 추천 그리드(#recoGrid)에서도
  // (같은 .rcard 마크업을 재사용하므로) 별도 코드 없이 그대로 동작한다.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.closest('button, a')) return;
    const card = e.target.closest('.rcard');
    if (!card) return;
    e.preventDefault();
    card.click();
  });

  // 담기/해제 버튼 (이벤트 위임, document 기준 — 위와 같은 이유)
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-save-id]');
    if (!btn) return;
    const card = btn.closest('.rcard');
    if (!card) return;

    if (!window.MisikAuth || !window.MisikAuth.isLoggedIn()) {
      if (window.MisikAuth && window.MisikAuth.promptLogin) {
        window.MisikAuth.promptLogin('로그인하면 담을 수 있어요');
      }
      return;
    }

    const descs = card.querySelectorAll('.rcard-desc');
    const place = {
      place_id: btn.getAttribute('data-save-id'),
      place_name: card.querySelector('.rcard-name') ? card.querySelector('.rcard-name').textContent : '',
      category: card.querySelector('.rcard-meta') ? card.querySelector('.rcard-meta').textContent : '',
      address: descs[0] ? descs[0].textContent : '',
      lat: card.getAttribute('data-y') ? Number(card.getAttribute('data-y')) : null,
      lng: card.getAttribute('data-x') ? Number(card.getAttribute('data-x')) : null,
    };

    btn.disabled = true;
    try {
      const nowSaved = await toggleSave(place);
      btn.textContent = nowSaved ? '담음 ✓' : '담기';
      btn.classList.toggle('saved', nowSaved);
    } catch (err) {
      console.error('[kakao-search] 담기 처리 실패', err);
      if (window.MisikToast) window.MisikToast.show('담기 처리 중 오류가 발생했습니다.');
    } finally {
      btn.disabled = false;
    }
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
  // 다른 모달(로그인 등)과 겹치지 않도록 이 파일 전용 id를 쓴다.
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
      <div class="ai-analysis" id="ksAnalysisSection" style="display:none"></div>
    </div>
  `;
  document.body.appendChild(reviewOverlay);

  const reviewHeader = document.getElementById('ksReviewHeader');
  const reviewList = document.getElementById('ksReviewList');
  const analysisSection = document.getElementById('ksAnalysisSection');

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
      window.MisikEmptyState.render(
        reviewList,
        escapeHTML(data && data.error ? data.error : '구글에서 이 가게를 찾지 못했습니다.'),
        data && data.error ? 'error' : 'empty'
      );
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
      window.MisikEmptyState.render(reviewList, '아직 등록된 리뷰가 없습니다.', 'empty');
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
    hideAnalysisSection();

    const cached = getCachedReview(placeId);
    if (cached) {
      renderReview(name, cached);
      maybeStartAnalysis(placeId, cached);
      return;
    }

    reviewHeader.innerHTML = `<div class="kicker">Google Reviews</div><div class="rh-top"><span class="rh-name">${escapeHTML(name)}</span></div>`;
    window.MisikEmptyState.render(reviewList, '리뷰를 불러오는 중…', 'loading');

    try {
      const params = new URLSearchParams({ name, lat: y, lng: x });
      const res = await fetch(`/api/google-review?${params.toString()}`);
      const data = await res.json();
      setCachedReview(placeId, data);
      renderReview(name, data);
      maybeStartAnalysis(placeId, data);
    } catch (networkErr) {
      console.error('[kakao-search] 구글 리뷰 조회 실패', networkErr);
      window.MisikEmptyState.render(reviewList, '리뷰를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.', 'error');
    }
  }

  // ---------- AI 리뷰 분석 (Gemini) ----------
  const AI_CACHE_KEY = 'misikAiAnalysisCache';

  function loadAiCache() {
    try {
      const raw = localStorage.getItem(AI_CACHE_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === 'object' ? obj : {};
    } catch (e) {
      return {};
    }
  }

  function persistAiCache(cache) {
    try {
      localStorage.setItem(AI_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.error('[kakao-search] AI 분석 캐시 저장 실패', e);
    }
  }

  function getCachedAnalysis(placeId) {
    return loadAiCache()[placeId];
  }

  function setCachedAnalysis(placeId, data) {
    const cache = loadAiCache();
    cache[placeId] = data;
    persistAiCache(cache);
  }

  function hideAnalysisSection() {
    analysisSection.style.display = 'none';
    analysisSection.innerHTML = '';
  }

  function showAnalysisLoading() {
    analysisSection.style.display = '';
    analysisSection.innerHTML = `<div class="viz-title">AI 리뷰 분석</div>${window.MisikEmptyState.html('AI가 리뷰를 분석하는 중…', 'loading')}`;
  }

  function showAnalysisError(message) {
    analysisSection.style.display = '';
    analysisSection.innerHTML = `<div class="viz-title">AI 리뷰 분석</div>${window.MisikEmptyState.html(escapeHTML(message), 'error')}`;
  }

  function renderWordCloud(keywords) {
    const canvas = document.getElementById('ksKeywordCanvas');
    if (!canvas || !window.MisikWordCloud) return;

    const rootStyle = getComputedStyle(document.documentElement);
    const posColor = rootStyle.getPropertyValue('--sentiment-pos').trim() || '#0F7B6C';
    const negColor = rootStyle.getPropertyValue('--sentiment-neg').trim() || '#E03E3E';

    window.MisikWordCloud.render(canvas, keywords, {
      height: 200,
      colorFn: (item) => (item.context === 'negative' ? negColor : posColor)
    });
  }

  function renderAnalysis(data) {
    const counts = data.sentimentCounts || { positive: 0, neutral: 0, negative: 0 };
    const total = Math.max(1, (counts.positive || 0) + (counts.neutral || 0) + (counts.negative || 0));
    const posPct = ((counts.positive || 0) / total) * 100;
    const neuPct = ((counts.neutral || 0) / total) * 100;
    const negPct = ((counts.negative || 0) / total) * 100;

    analysisSection.style.display = '';
    analysisSection.innerHTML = `
      <div class="viz-title">AI 리뷰 분석</div>
      <div class="sentiment-bar3">
        <div class="seg pos" style="width:${posPct}%"></div>
        <div class="seg neu" style="width:${neuPct}%"></div>
        <div class="seg neg" style="width:${negPct}%"></div>
      </div>
      <div class="sentiment-labels3">
        <span><span class="dot pos"></span>긍정 ${counts.positive || 0}</span>
        <span><span class="dot neu"></span>보통 ${counts.neutral || 0}</span>
        <span><span class="dot neg"></span>부정 ${counts.negative || 0}</span>
      </div>
      <div class="keyword-cloud-wrap"><canvas id="ksKeywordCanvas"></canvas></div>
      <div class="ai-bubble">${escapeHTML(data.summary || '')}</div>
    `;

    renderWordCloud(data.keywords);
  }

  async function runAnalysis(placeId, placeName, reviews) {
    showAnalysisLoading();
    try {
      const res = await fetch('/api/gemini-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeName,
          reviews: reviews.map((r) => ({ rating: r.rating, text: r.text }))
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showAnalysisError((data && data.error) || 'AI 분석에 실패했습니다.');
        return;
      }
      setCachedAnalysis(placeId, data);
      renderAnalysis(data);
    } catch (networkErr) {
      console.error('[kakao-search] AI 분석 실패', networkErr);
      showAnalysisError('AI 분석 요청에 실패했습니다.');
    }
  }

  // 리뷰가 1개 이상 있을 때만 분석을 시도한다. 캐시가 있으면 즉시 렌더링, 없으면 자동으로 분석을 시작한다.
  function maybeStartAnalysis(placeId, reviewData) {
    if (!reviewData || reviewData.found === false || !reviewData.reviews || reviewData.reviews.length === 0) {
      hideAnalysisSection();
      return;
    }
    const cached = getCachedAnalysis(placeId);
    if (cached) {
      renderAnalysis(cached);
      return;
    }
    runAnalysis(placeId, reviewData.name, reviewData.reviews);
  }

  // 카드 클릭(담기 버튼·카카오맵 링크 클릭은 제외) → 리뷰 열기 (document 위임, 위와 같은 이유)
  document.addEventListener('click', (e) => {
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
