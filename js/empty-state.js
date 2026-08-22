// 빈 결과 / 로딩 중 / 에러를 전부 텍스트만 다른 동일한 .empty-state로 보여주던 것을
// 상태별로 시각적으로 구분해주는 공용 헬퍼. js/app.js와 js/kakao-search.js가 함께 쓴다.
// index.html에서 두 파일보다 먼저 로드되어야 한다.
(function () {
  'use strict';

  const ICONS = {
    loading: '<span class="es-spinner" aria-hidden="true"></span>',
    error: '<svg class="es-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 7.5v6" stroke-linecap="round"/><circle cx="12" cy="16.7" r="0.7" fill="currentColor" stroke="none"/></svg>',
    empty: '<svg class="es-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 L21 21" stroke-linecap="round"/></svg>'
  };

  // message는 호출부에서 이미 이스케이프된 문자열이어야 한다(기존 관례 유지).
  function html(message, type) {
    const kind = type && ICONS[type] ? type : 'empty';
    return `<div class="empty-state empty-state--${kind}">${ICONS[kind]}<span>${message}</span></div>`;
  }

  function render(el, message, type) {
    if (!el) return;
    el.innerHTML = html(message, type);
  }

  window.MisikEmptyState = { html, render };
})();
