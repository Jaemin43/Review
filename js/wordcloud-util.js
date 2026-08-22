// 내 취향 탭(js/app.js)과 맛집 담기 리뷰 AI 분석(js/kakao-search.js)이 각자 다른 방식으로
// "키워드 워드클라우드"를 구현하던 것을 하나로 통합한 공용 렌더러.
// index.html에서 두 파일보다 먼저 로드되어야 한다.
(function () {
  'use strict';

  const WORDCLOUD_SRC = 'https://cdn.jsdelivr.net/npm/wordcloud@1.2.2/src/wordcloud2.js';
  let loadPromise = null;

  function loadLib() {
    if (window.WordCloud) return Promise.resolve();
    if (loadPromise) return loadPromise;
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = WORDCLOUD_SRC;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('워드클라우드 라이브러리를 불러오지 못했습니다.'));
      document.head.appendChild(script);
    });
    return loadPromise;
  }

  function defaultColor() {
    return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#2383E2';
  }

  // items: [{ word, score, ...임의 필드 }]
  // options.colorFn(item) → 해당 단어의 색상 문자열 (미지정 시 accent 단색)
  // options.height → 캔버스 높이(px), 기본 200
  async function render(canvas, items, options) {
    if (!canvas || !items || items.length === 0) return;
    const opts = options || {};
    const colorFn = opts.colorFn || defaultColor;

    try {
      await loadLib();
    } catch (e) {
      console.error('[wordcloud-util]', e);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(200, Math.round(rect.width));
    canvas.height = opts.height || 200;

    const colorByWord = {};
    items.forEach((item) => { colorByWord[item.word] = colorFn(item); });

    window.WordCloud(canvas, {
      list: items.map((item) => [item.word, item.score]),
      weightFactor: opts.weightFactor || ((size) => 9 + size * 3.4),
      fontFamily: "'Pretendard Variable', -apple-system, sans-serif",
      color: (word) => colorByWord[word] || defaultColor(),
      backgroundColor: 'transparent',
      rotateRatio: 0,
      gridSize: 8,
      shuffle: false
    });
  }

  window.MisikWordCloud = { render };
})();
