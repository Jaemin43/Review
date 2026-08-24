// ---------- Nav ----------
const navBtns = document.querySelectorAll('.side-nav-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

function scrollToTab(name) {
  const target = document.getElementById('tab-' + name);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

navBtns.forEach(btn => btn.addEventListener('click', () => scrollToTab(btn.dataset.tab)));

// 로그인했을 때만 상단에 "맛집주머니" 버튼(mypage.html로 이동)을 보여준다.
// auth.js가 세션 확인/로그인/로그아웃마다 쏘는 misik:auth-change 이벤트를 구독한다.
const bagBtn = document.getElementById('bagBtn');
function updateBagButton() {
  if (!bagBtn) return;
  bagBtn.hidden = !(window.MisikAuth && window.MisikAuth.isLoggedIn());
}
document.addEventListener('misik:auth-change', updateBagButton);
updateBagButton();
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
let selectedStars = 0;
let selectedPhoto = null;

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

function loadArchive() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveArchive(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
  catch { /* storage full — skip photo on next save */ }
}

function renderArchive() {
  const list = loadArchive();
  archiveCards.classList.toggle('has-items', list.length > 0);
  archiveCards.innerHTML = list.length ? list.slice().reverse().map(item => `
    <div class="timeline-item">
      <span class="timeline-dot"></span>
      <div class="timeline-content">
        ${item.photo ? `<img class="ac-thumb" src="${item.photo}" alt="${item.name}" />` : '<div class="ac-thumb"></div>'}
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

document.getElementById('acSubmit').addEventListener('click', () => {
  const name = document.getElementById('acName').value.trim();
  if (!name) { document.getElementById('acName').focus(); return; }
  const item = {
    name,
    date: document.getElementById('acDate').value,
    category: document.getElementById('acCategory').value,
    stars: selectedStars || 3,
    note: document.getElementById('acNote').value.trim(),
    photo: selectedPhoto,
  };
  const list = loadArchive();
  list.push(item);
  saveArchive(list);

  document.getElementById('acName').value = '';
  document.getElementById('acDate').value = '';
  document.getElementById('acNote').value = '';
  acPhoto.value = '';
  selectedPhoto = null;
  selectedStars = 0;
  [...starPicker.children].forEach(b => b.classList.remove('filled'));

  renderArchive();
});

document.getElementById('acClear').addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  renderArchive();
});

// ---------- Personalize ----------
const DEFAULT_CATEGORY_DIST = { '한식': 4, '일식': 2, '카페': 3, '양식': 2, '중식': 1, '분식': 1 };
const DONUT_COLORS = ['#D9730D', '#E03E3E', '#DFAB01', '#0B6E99', '#6940A5', '#64473A'];

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
  const canvas = document.getElementById('wordcloud');
  if (!canvas || !window.MisikWordCloud) return;
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
