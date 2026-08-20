// ---------- Nav ----------
const navBtns = document.querySelectorAll('.side-nav-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

function scrollToTab(name) {
  const target = document.getElementById('tab-' + name);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

navBtns.forEach(btn => btn.addEventListener('click', () => scrollToTab(btn.dataset.tab)));
document.getElementById('logoLink').addEventListener('click', (e) => {
  e.preventDefault();
  closeModal();
  scrollToTab('discover');
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

// ---------- Mock data: restaurants + reviews ----------
const RESTAURANTS = [
  { id: 1, name: "온기당", region: "성수", category: "한식", price: "3만원대", tag: "조용한 분위기" },
  { id: 2, name: "미도리 스시바", region: "연남", category: "일식", price: "5만원대", tag: "혼밥 추천" },
  { id: 3, name: "브리크레인", region: "을지로", category: "양식", price: "4만원대", tag: "데이트 코스" },
  { id: 4, name: "낮잠커피", region: "망원", category: "카페", price: "1만원대", tag: "가성비" },
  { id: 5, name: "홍대짬뽕집", region: "홍대", category: "중식", price: "2만원대", tag: "곱빼기 인기" },
  { id: 6, name: "이태원분식", region: "이태원", category: "분식", price: "1만원대", tag: "매콤한 맛" },
  { id: 7, name: "성수정육식당", region: "성수", category: "한식", price: "4만원대", tag: "재방문의사 높음" },
  { id: 8, name: "연남스텐드", region: "연남", category: "카페", price: "1만원대", tag: "뷰맛집" },
];

const REVIEWS = [
  { restaurantId: 1, rating: 4.8, visited: true, sponsored: false, date: "2026.03.12", content: "직접 방문해서 먹은 냉이된장찌개가 정말 좋았어요. 재료가 신선하고 사장님도 친절했습니다." },
  { restaurantId: 1, rating: 4.5, visited: true, sponsored: false, date: "2026.01.05", content: "조용한 분위기라 혼자 가기 좋았어요. 다만 웨이팅이 좀 길었습니다." },
  { restaurantId: 2, rating: 4.5, visited: true, sponsored: true, date: "2026.02.02", content: "업체 협찬으로 방문했습니다. 사전 제공된 오마카세 코스를 시식했어요." },
  { restaurantId: 3, rating: 4.3, visited: true, sponsored: false, date: "2026.01.20", content: "데이트로 다녀왔는데 분위기와 플레이팅이 훌륭했습니다. 웨이팅은 30분 정도." },
  { restaurantId: 4, rating: 4.6, visited: false, sponsored: true, date: "2026.04.01", content: "브랜드 측 제공 정보를 바탕으로 작성된 소개형 리뷰입니다." },
  { restaurantId: 5, rating: 4.4, visited: true, sponsored: false, date: "2025.11.09", content: "곱빼기를 시켰는데 양이 정말 많았어요. 국물이 진하고 재방문 의사 있습니다." },
  { restaurantId: 5, rating: 3.9, visited: true, sponsored: false, date: "2025.09.14", content: "맛은 괜찮았지만 가격이 살짝 아쉬웠어요. 그래도 곱빼기는 만족스러웠습니다." },
  { restaurantId: 6, rating: 4.1, visited: true, sponsored: false, date: "2025.10.15", content: "떡볶이가 꽤 매웠지만 중독적인 맛이었어요. 웨이팅이 길어서 아쉬웠습니다." },
  { restaurantId: 7, rating: 4.9, visited: true, sponsored: false, date: "2025.12.11", content: "혼자 방문해서 1인분 주문했는데도 정성스럽게 내주셨어요. 재방문 의사 100%." },
  { restaurantId: 7, rating: 4.7, visited: true, sponsored: false, date: "2025.08.22", content: "가족 모임으로 방문했는데 반찬이 신선하고 친절했습니다." },
  { restaurantId: 8, rating: 4.4, visited: true, sponsored: true, date: "2026.03.28", content: "협찬으로 방문했지만 실제로 뷰가 좋았고 커피 맛도 신선했습니다." },
];

function reviewsFor(id) { return REVIEWS.filter(r => r.restaurantId === id); }
function avgRatingNum(id) {
  const list = reviewsFor(id);
  if (!list.length) return 0;
  return list.reduce((sum, r) => sum + r.rating, 0) / list.length;
}
function avgRating(id) {
  const list = reviewsFor(id);
  return list.length ? avgRatingNum(id).toFixed(1) : '-';
}

const searchInput = document.getElementById('searchInput');
const regionSelect = document.getElementById('regionSelect');
const categorySelect = document.getElementById('categorySelect');
const featuredWrap = document.getElementById('featuredWrap');
const restaurantGrid = document.getElementById('restaurantGrid');

[...new Set(RESTAURANTS.map(r => r.region))].forEach(r => {
  const opt = document.createElement('option'); opt.value = r; opt.textContent = r;
  regionSelect.appendChild(opt);
});
[...new Set(RESTAURANTS.map(r => r.category))].forEach(c => {
  const opt = document.createElement('option'); opt.value = c; opt.textContent = c;
  categorySelect.appendChild(opt);
});

const ICON_BOWL = '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 28 h40 a20 16 0 0 1-40 0 z" stroke-linejoin="round"/><path d="M18 28 a14 10 0 0 0 28 0"/><path d="M26 12 q2 5 0 10 M34 12 q2 5 0 10" stroke-linecap="round"/></svg>';
const ICON_CUP = '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 18 h28 v20 a14 14 0 0 1-28 0 z"/><path d="M42 24 h6 a6 6 0 0 1 0 12 h-6"/><path d="M22 10 q2 4 0 8 M30 10 q2 4 0 8" stroke-linecap="round"/></svg>';
const ICON_PLATE = '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="32" cy="32" r="20"/><circle cx="32" cy="32" r="11"/></svg>';
const CATEGORY_ICON = { '한식': ICON_BOWL, '중식': ICON_BOWL, '분식': ICON_BOWL, '일식': ICON_PLATE, '양식': ICON_PLATE, '카페': ICON_CUP };

// Soft "listing photo" tint per category — stands in for a real photo since
// this is mock data. Each pairing gets its own hue so the grid reads as a
// varied set of listings rather than one flat accent color repeated.
const CATEGORY_TONE = {
  '한식': { bg: '#FDE3E9', fg: '#FF385C' },
  '중식': { bg: '#FCEADB', fg: '#D97F3D' },
  '분식': { bg: '#FCF0D6', fg: '#E0A72E' },
  '일식': { bg: '#E1F3F1', fg: '#00A699' },
  '양식': { bg: '#F1E6F0', fg: '#A15C8C' },
  '카페': { bg: '#ECE6DC', fg: '#6B5B45' },
};
function categoryTone(cat) { return CATEGORY_TONE[cat] || { bg: 'var(--bg-soft)', fg: 'var(--accent)' }; }

function rcardPhoto(r, rank, extraClass) {
  const tone = categoryTone(r.category);
  return `
    <div class="rcard-photo${extraClass ? ' ' + extraClass : ''}" style="background:${tone.bg}; color:${tone.fg};">
      ${CATEGORY_ICON[r.category] || ICON_BOWL}
      <span class="rcard-badge">${String(rank).padStart(2, '0')}</span>
    </div>
  `;
}

function rcardHTML(r, rank) {
  const variant = rank % 5 === 0 ? 'medium' : rank % 5 === 2 ? 'visual' : 'compact';
  if (variant === 'medium') {
    return `
      <button class="rcard rcard--medium" data-id="${r.id}">
        ${rcardPhoto(r, rank)}
        <div class="rcard-body">
          <div class="rcard-top"><div class="rcard-name">${r.name}</div><div class="rcard-rating">★ ${avgRating(r.id)}</div></div>
          <div class="rcard-meta">${r.region} · ${r.category}</div>
          <div class="rcard-desc">${r.price} · ${r.tag}</div>
        </div>
      </button>
    `;
  }
  if (variant === 'visual') {
    return `
      <button class="rcard rcard--visual" data-id="${r.id}">
        ${rcardPhoto(r, rank, 'rcard-photo--tall')}
        <div class="rcard-top"><div class="rcard-name">${r.name}</div><div class="rcard-rating">★ ${avgRating(r.id)}</div></div>
        <div class="rcard-meta">${r.region} · ${r.category}</div>
      </button>
    `;
  }
  return `
    <button class="rcard" data-id="${r.id}">
      ${rcardPhoto(r, rank)}
      <div class="rcard-top"><div class="rcard-name">${r.name}</div><div class="rcard-rating">★ ${avgRating(r.id)}</div></div>
      <div class="rcard-meta">${r.region} · ${r.category}</div>
    </button>
  `;
}

function paintRestaurants() {
  const q = searchInput.value.trim().toLowerCase();
  const region = regionSelect.value;
  const category = categorySelect.value;

  const filtered = RESTAURANTS.filter(r => {
    const matchesQ = !q || r.name.toLowerCase().includes(q) || r.tag.toLowerCase().includes(q);
    const matchesRegion = !region || r.region === region;
    const matchesCategory = !category || r.category === category;
    return matchesQ && matchesRegion && matchesCategory;
  });

  if (!filtered.length) {
    featuredWrap.innerHTML = '';
    restaurantGrid.innerHTML = '<div class="empty-state">조건에 맞는 맛집이 없습니다.</div>';
    return;
  }

  const sorted = filtered.slice().sort((a, b) => avgRatingNum(b.id) - avgRatingNum(a.id));
  const featured = sorted[0];
  const rest = sorted.slice(1);
  const featuredTone = categoryTone(featured.category);

  featuredWrap.innerHTML = `
    <button class="featured" data-id="${featured.id}">
      <div class="featured-visual" style="background:${featuredTone.bg};">
        <span class="featured-visual-icon" style="color:${featuredTone.fg};">${CATEGORY_ICON[featured.category] || ICON_BOWL}</span>
        <span class="brand-mark">MISIK</span>
      </div>
      <div class="featured-info">
        <div class="kicker">MISIK SELECTED</div>
        <div class="featured-order">01 / THIS WEEK</div>
        <div class="featured-name">${featured.name}</div>
        <div class="featured-meta">${featured.region} · ${featured.category}</div>
        <div class="featured-rating">★ ${avgRating(featured.id)}</div>
        <div class="featured-desc">${featured.tag}</div>
      </div>
    </button>
  `;

  restaurantGrid.innerHTML = rest.map((r, i) => rcardHTML(r, i + 1)).join('');
}

// Debounce-free crossfade: fade the results out, swap the DOM once the fade
// finishes, then fade back in. Skipped on first paint so the page doesn't
// flash on load.
let restaurantsPainted = false;
function renderRestaurants() {
  if (!restaurantsPainted) {
    paintRestaurants();
    restaurantsPainted = true;
    return;
  }
  featuredWrap.classList.add('is-fading');
  restaurantGrid.classList.add('is-fading');
  window.setTimeout(() => {
    paintRestaurants();
    requestAnimationFrame(() => {
      featuredWrap.classList.remove('is-fading');
      restaurantGrid.classList.remove('is-fading');
    });
  }, 160);
}

[searchInput, regionSelect, categorySelect].forEach(el => el.addEventListener('input', renderRestaurants));
renderRestaurants();

featuredWrap.addEventListener('click', (e) => {
  const card = e.target.closest('.featured');
  if (!card) return;
  openModal(card, Number(card.dataset.id));
});

restaurantGrid.addEventListener('click', (e) => {
  const card = e.target.closest('.rcard');
  if (!card) return;
  openModal(card, Number(card.dataset.id));
});

// ---------- Restaurant modal (GSAP Flip grid → modal morph) ----------
gsap.registerPlugin(Flip);

const modalOverlay = document.getElementById('modalOverlay');
const modalCard = document.getElementById('modalCard');

let currentRestaurantId = null;
let detailTrustFilter = 'all';
let sourceCardEl = null;

function openModal(cardEl, id) {
  currentRestaurantId = id;
  detailTrustFilter = 'all';
  sourceCardEl = cardEl;
  document.querySelectorAll('#modalCard .trust-filter .chip').forEach(c => c.classList.toggle('active', c.dataset.filter === 'all'));
  renderModalReviews();

  const state = Flip.getState(cardEl);
  modalOverlay.classList.add('open');
  document.body.classList.add('modal-open');

  gsap.killTweensOf(modalCard);
  Flip.from(state, {
    targets: modalCard,
    duration: 0.6,
    ease: 'power3.inOut',
    absolute: true,
    scale: true,
  });
}

function closeModal() {
  if (!modalOverlay.classList.contains('open')) return;
  const targetEl = sourceCardEl && sourceCardEl.isConnected ? sourceCardEl : featuredWrap;

  gsap.killTweensOf(modalCard);
  Flip.fit(modalCard, targetEl, {
    duration: 0.5,
    ease: 'power3.inOut',
    scale: true,
    absolute: true,
    onComplete: () => {
      modalOverlay.classList.remove('open');
      document.body.classList.remove('modal-open');
      gsap.set(modalCard, { clearProps: 'all' });
    },
  });
}

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.getElementById('modalClose').addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

function renderModalReviews() {
  const r = RESTAURANTS.find(x => x.id === currentRestaurantId);
  if (!r) return;

  document.getElementById('restaurantHeader').innerHTML = `
    <div class="kicker">${r.region} · ${r.category}</div>
    <div class="rh-top">
      <span class="rh-name">${r.name}</span>
      <span class="rh-rating">★ ${avgRating(r.id)} · 리뷰 ${reviewsFor(r.id).length}개</span>
    </div>
    <div class="rh-meta">${r.price} · ${r.tag}</div>
  `;

  const list = reviewsFor(r.id).filter(rv => {
    if (detailTrustFilter === 'visited') return rv.visited;
    if (detailTrustFilter === 'sponsored') return rv.sponsored;
    return true;
  });

  const detailReviewList = document.getElementById('detailReviewList');
  detailReviewList.innerHTML = list.length ? list.map(rv => `
    <div class="review-card">
      <div class="review-byline">
        <span class="rb-visited">${rv.visited ? '직접 방문' : '미방문 소개'}</span>
        ${rv.sponsored ? '<span>· 협찬</span>' : ''}
        <span>· ${rv.date}</span>
        <span class="rb-rating">★ ${rv.rating}</span>
      </div>
      <p class="review-text">${rv.content}</p>
    </div>
  `).join('') : '<div class="empty-state">조건에 맞는 리뷰가 없습니다.</div>';
}

document.querySelectorAll('#modalCard .trust-filter .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#modalCard .trust-filter .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    detailTrustFilter = chip.dataset.filter;
    renderModalReviews();
  });
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
  `).join('') : '<div class="empty-state">아직 기록이 없습니다. 왼쪽에서 첫 방문을 기록해보세요.</div>';
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
const DONUT_COLORS = ['#FF385C', '#E0A72E', '#00A699', '#A15C8C', '#333333', '#D8CDBA'];

const WORDS = [
  { w: '재방문의사', s: 30 }, { w: '가성비', s: 24 }, { w: '분위기', s: 26 },
  { w: '친절', s: 20 }, { w: '웨이팅', s: 18 }, { w: '데이트', s: 22 },
  { w: '신선한', s: 17 }, { w: '혼밥', s: 15 }, { w: '조용한', s: 16 }, { w: '뷰맛집', s: 14 },
];

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
  const dist = {};
  list.forEach(i => { dist[i.category] = (dist[i.category] || 0) + 1; });
  const topCategory = Object.entries(dist).sort((a, b) => b[1] - a[1])[0][0];

  statRow.innerHTML = `
    <div class="stat-box"><div class="stat-value">${list.length}</div><div class="stat-label">총 기록</div></div>
    <div class="stat-box"><div class="stat-value">★ ${avgStars}</div><div class="stat-label">평균 별점</div></div>
    <div class="stat-box"><div class="stat-value">${topCategory}</div><div class="stat-label">최다 카테고리</div></div>
  `;
}

function renderDonut() {
  const list = loadArchive();
  let dist = {};
  if (list.length) {
    list.forEach(item => { dist[item.category] = (dist[item.category] || 0) + 1; });
  } else {
    dist = DEFAULT_CATEGORY_DIST;
  }

  const entries = Object.entries(dist);
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
  const cloud = document.getElementById('wordcloud');
  cloud.innerHTML = WORDS.map(item => `
    <span style="font-size:${item.s}px; color:${item.s > 22 ? 'var(--accent)' : 'var(--text-secondary)'}; font-weight:${item.s > 22 ? 600 : 500};">${item.w}</span>
  `).join('');
}

function renderPersonalize() { renderStats(); renderDonut(); renderWordcloud(); }

// ---------- Sentiment analysis ----------
const POSITIVE_WORDS = ['신선', '친절', '좋았', '재방문', '맛있', '분위기가 좋', '만족', '추천'];
const NEGATIVE_WORDS = ['불편', '아쉬', '별로', '실망', '비싸', '오래 걸', '길었'];

document.getElementById('aiRun').addEventListener('click', () => {
  const text = document.getElementById('aiInput').value;
  let pos = 0, neg = 0;
  POSITIVE_WORDS.forEach(w => { if (text.includes(w)) pos++; });
  NEGATIVE_WORDS.forEach(w => { if (text.includes(w)) neg++; });

  const total = pos + neg || 1;
  const posPct = Math.round((pos / total) * 100);
  const negPct = 100 - posPct;

  document.getElementById('posBar').style.width = posPct + '%';
  document.getElementById('negBar').style.width = negPct + '%';
  document.getElementById('posLabel').textContent = `긍정 ${posPct}%`;
  document.getElementById('negLabel').textContent = `부정 ${negPct}%`;

  let summary;
  if (posPct >= 70) summary = '전반적으로 만족도가 높은 리뷰입니다. 친절함과 재방문 의사에 대한 긍정 언급이 두드러집니다.';
  else if (posPct >= 40) summary = '긍정과 아쉬운 점이 함께 언급된 리뷰입니다. 맛과 분위기는 좋았지만 일부 불편함도 있었던 것으로 보입니다.';
  else summary = '부정적인 경험이 상대적으로 두드러지는 리뷰입니다. 재방문 전 참고할 만한 지적 사항이 있습니다.';

  document.getElementById('aiSummary').textContent = '요약: ' + summary;
  document.getElementById('aiResult').classList.add('show');
});

renderArchive();
