// ---------- Nav ----------
// [data-tab]는 데스크톱 사이드바 버튼(.side-nav-btn)과 모바일 하단 탭바 버튼
// (.bottom-tab-btn, index.html 맨 아래) 둘 다를 가리킨다 — 같은 스크롤 이동/활성 표시 로직을 공유한다.
const navBtns = document.querySelectorAll('[data-tab]');
const tabPanels = document.querySelectorAll('.tab-panel');

function scrollToTab(name) {
  const target = document.getElementById('tab-' + name);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

navBtns.forEach(btn => btn.addEventListener('click', () => scrollToTab(btn.dataset.tab)));

document.getElementById('logoLink').addEventListener('click', (e) => {
  e.preventDefault();
  scrollToTab('search');
});

// Highlight the sidebar item for whichever section is currently in view.
if ('IntersectionObserver' in window) {
  const spyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const name = entry.target.id.replace('tab-', '');
      navBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    });
  }, { threshold: 0.5 });
  tabPanels.forEach(p => spyObserver.observe(p));

  // Fade + slide each section's content in as it scrolls into view.
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => entry.target.classList.toggle('in', entry.isIntersecting));
  }, { threshold: 0.2 });
  document.querySelectorAll('.section-inner').forEach(el => revealObserver.observe(el));
} else {
  document.querySelectorAll('.section-inner').forEach(el => el.classList.add('in'));
}

// 워드클라우드 색은 테마 토큰을 그릴 때 한 번만 읽어오므로, 테마가 바뀌면
// (토글 클릭·OS 설정 변경 모두) 내 취향 탭을 다시 그려서 색이 즉시 반영되게 한다.
document.addEventListener('misik:themechange', () => {
  renderPersonalize();
});

// ---------- Archive ----------
const STORAGE_KEY = 'misikArchiveDemo';
const archiveCards = document.getElementById('archiveCards');
const starPicker = document.getElementById('starPicker');
const acPhoto = document.getElementById('acPhoto');
const acName = document.getElementById('acName');
const acNameError = document.getElementById('acNameError');
const acSubmit = document.getElementById('acSubmit');
const acCategoryChips = document.getElementById('acCategoryChips');
const acSort = document.getElementById('acSort');
const acLoginPrompt = document.getElementById('acLoginPrompt');
let selectedStars = 0;
let selectedPhoto = null;
let selectedCategory = '한식';

starPicker.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  selectedStars = Number(btn.dataset.star);
  [...starPicker.children].forEach(b => b.classList.toggle('filled', Number(b.dataset.star) <= selectedStars));
});

acPhoto.addEventListener('change', () => {
  const file = acPhoto.files[0];
  if (!file) { selectedPhoto = null; return; }
  const reader = new FileReader();
  reader.onload = () => { selectedPhoto = reader.result; };
  reader.readAsDataURL(file);
});

// 카테고리 칩 — <select> 대신 전체 옵션을 한눈에 펼쳐 인지 부담을 줄인다.
acCategoryChips.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  selectedCategory = chip.dataset.category;
  [...acCategoryChips.children].forEach(c => c.classList.toggle('active', c === chip));
});

// 가게명 실시간 유효성 검사 — 2자 미만이면 인라인 에러를 보여주고, 유효해질 때까지 제출을 막는다.
function validateName() {
  const value = acName.value.trim();
  const valid = value.length >= 2;
  acNameError.hidden = valid || value.length === 0;
  acName.setAttribute('aria-invalid', String(!valid && value.length > 0));
  acSubmit.disabled = !valid;
  return valid;
}

acName.addEventListener('input', validateName);
acNameError.textContent = '가게 이름을 2자 이상 입력해주세요.';
validateName();

function loadArchive() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveArchive(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
  catch { /* storage full — skip photo on next save */ }
}

function sortedArchive(list) {
  const sorted = list.slice();
  switch (acSort ? acSort.value : 'recent') {
    case 'oldest': return sorted;
    case 'starsDesc': return sorted.sort((a, b) => b.stars - a.stars);
    case 'starsAsc': return sorted.sort((a, b) => a.stars - b.stars);
    default: return sorted.reverse(); // 최신순
  }
}

function renderArchive() {
  const list = loadArchive();
  archiveCards.classList.toggle('has-items', list.length > 0);
  archiveCards.innerHTML = list.length ? sortedArchive(list).map(item => `
    <div class="timeline-item">
      <span class="timeline-dot"></span>
      <div class="timeline-content">
        ${item.photo ? `<img class="ac-thumb" src="${item.photo}" alt="${item.name}" width="56" height="56" />` : '<div class="ac-thumb"></div>'}
        <div class="ac-body">
          <div class="ac-top">
            <span class="ac-name">${item.name}</span>
            <span class="ac-stars">${'★'.repeat(item.stars)}${'☆'.repeat(5 - item.stars)}</span>
          </div>
          <div class="ac-meta">${item.date || '날짜 미입력'} · ${item.category}</div>
          ${item.note ? `<div class="ac-note">${item.note}</div>` : ''}
        </div>
      </div>
    </div>
  `).join('') : window.MisikEmptyState.html('아직 기록이 없습니다. 왼쪽에서 첫 방문을 기록해보세요.', 'empty');
  renderPersonalize();
}

acSubmit.addEventListener('click', () => {
  if (!validateName()) { acName.focus(); return; }
  const item = {
    name: acName.value.trim(),
    date: document.getElementById('acDate').value,
    category: selectedCategory,
    stars: selectedStars || 3,
    note: document.getElementById('acNote').value.trim(),
    photo: selectedPhoto,
  };
  const list = loadArchive();
  list.push(item);
  saveArchive(list);

  acName.value = '';
  document.getElementById('acDate').value = '';
  document.getElementById('acNote').value = '';
  acPhoto.value = '';
  selectedPhoto = null;
  selectedStars = 0;
  [...starPicker.children].forEach(b => b.classList.remove('filled'));
  validateName();

  renderArchive();
  if (window.MisikToast) window.MisikToast.show('기록이 이 브라우저에 저장되었습니다.');
});

document.getElementById('acClear').addEventListener('click', () => {
  if (!loadArchive().length) return;
  if (!window.confirm('이 브라우저에 저장된 기록을 모두 삭제할까요? 되돌릴 수 없습니다.')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderArchive();
  if (window.MisikToast) window.MisikToast.show('기록을 모두 지웠습니다.');
});

if (acSort) acSort.addEventListener('change', renderArchive);

if (acLoginPrompt) {
  acLoginPrompt.addEventListener('click', () => {
    if (window.MisikAuth && window.MisikAuth.promptLogin) window.MisikAuth.promptLogin();
  });
}

// ---------- Personalize ----------
const DEFAULT_CATEGORY_DIST = { '한식': 4, '일식': 2, '카페': 3, '양식': 2, '중식': 1, '분식': 1 };
// 첨부 팔레트(연한 하늘색 → 진한 네이비) 기준 — 카테고리별로 밝기 차이가 잘 구분되도록
// 6단계를 골고루 뽑았다.
const DONUT_COLORS = ['#C3E7EF', '#8BD6E9', '#45C2DB', '#6090BF', '#0172B0', '#023C85'];

const WORDS = [
  { w: '재방문의사', s: 30 }, { w: '가성비', s: 24 }, { w: '분위기', s: 26 },
  { w: '친절', s: 20 }, { w: '웨이팅', s: 18 }, { w: '데이트', s: 22 },
  { w: '신선한', s: 17 }, { w: '혼밥', s: 15 }, { w: '조용한', s: 16 }, { w: '뷰맛집', s: 14 },
];

// 기록이 없으면 DEFAULT_CATEGORY_DIST로 폴백 — 내 취향 탭의 도넛 차트/통계에서 쓴다.
function categoryDistribution() {
  const list = loadArchive();
  if (!list.length) return { ...DEFAULT_CATEGORY_DIST };
  const dist = {};
  list.forEach(item => { dist[item.category] = (dist[item.category] || 0) + 1; });
  return dist;
}

function topCategory() {
  const dist = categoryDistribution();
  return Object.entries(dist).sort((a, b) => b[1] - a[1])[0][0];
}

window.MisikArchive = { load: loadArchive, categoryDistribution, topCategory };

function renderStats() {
  const list = loadArchive();
  const statRow = document.getElementById('statRow');

  if (!list.length) {
    statRow.innerHTML = `
      <div class="stat-box"><div class="stat-value">0</div><div class="stat-label">총 기록</div></div>
      <div class="stat-box"><div class="stat-value">–</div><div class="stat-label">평균 별점</div></div>
      <div class="stat-box"><div class="stat-value">–</div><div class="stat-label">최다 카테고리</div></div>
    `;
    return;
  }

  const avgStars = (list.reduce((sum, i) => sum + i.stars, 0) / list.length).toFixed(1);

  statRow.innerHTML = `
    <div class="stat-box"><div class="stat-value">${list.length}</div><div class="stat-label">총 기록</div></div>
    <div class="stat-box"><div class="stat-value">★ ${avgStars}</div><div class="stat-label">평균 별점</div></div>
    <div class="stat-box"><div class="stat-value">${topCategory()}</div><div class="stat-label">최다 카테고리</div></div>
  `;
}

function renderDonut() {
  const entries = Object.entries(categoryDistribution());
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  let acc = 0;
  const stops = entries.map(([key, val], i) => {
    const start = (acc / total) * 360;
    acc += val;
    const end = (acc / total) * 360;
    return `${DONUT_COLORS[i % DONUT_COLORS.length]} ${start}deg ${end}deg`;
  }).join(', ');

  const donut = document.getElementById('donut');
  donut.style.background = `conic-gradient(${stops})`;
  donut.innerHTML = '<div style="position:absolute; inset:22%; background:var(--bg); border-radius:50%;"></div>';

  const legend = document.getElementById('donutLegend');
  legend.innerHTML = entries.map(([key, val], i) => `
    <div class="legend-row">
      <span class="legend-dot" style="background:${DONUT_COLORS[i % DONUT_COLORS.length]}"></span>
      ${key} · ${Math.round((val / total) * 100)}%
    </div>
  `).join('');
}

function renderWordcloud() {
  const wrap = document.getElementById('wordcloudWrap');
  if (!wrap || !window.MisikWordCloud) return;

  if (!loadArchive().length) {
    window.MisikEmptyState.render(wrap, '등록된 키워드가 없습니다. 기록을 남기면 자주 쓰는 표현을 모아볼게요.', 'empty');
    return;
  }

  wrap.innerHTML = '<canvas class="wordcloud-canvas" id="wordcloud"></canvas>';
  const canvas = document.getElementById('wordcloud');
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const secondary = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
  window.MisikWordCloud.render(
    canvas,
    WORDS.map(item => ({ word: item.w, score: item.s })),
    { height: 180, colorFn: (item) => (item.score > 22 ? accent : secondary) }
  );
}

function renderPersonalize() { renderStats(); renderDonut(); renderWordcloud(); }

renderArchive();
