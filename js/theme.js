// 다크 모드 토글 — 실제 테마 값은 index.html 맨 위의 인라인 스크립트가 렌더링 전에
// <html data-theme="..">로 이미 세팅해둔다(깜빡임 방지). 이 파일은 그 이후의 토글
// 버튼 동작, 저장, "시스템 설정 계속 따라가기" 동기화만 담당한다.
(function () {
  'use strict';

  const STORAGE_KEY = 'misikTheme';

  function getSavedTheme() {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === 'light' || v === 'dark' ? v : null;
    } catch (e) {
      return null;
    }
  }

  function get() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function apply(theme, persist) {
    document.documentElement.setAttribute('data-theme', theme);
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
    }
    document.dispatchEvent(new CustomEvent('misik:themechange', { detail: { theme } }));
  }

  function set(theme) {
    apply(theme === 'dark' ? 'dark' : 'light', true);
  }

  function toggle() {
    set(get() === 'dark' ? 'light' : 'dark');
  }

  // 사용자가 토글로 명시적으로 고르기 전까지는 OS 설정이 바뀌면 그대로 따라간다.
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (getSavedTheme()) return;
      apply(e.matches ? 'dark' : 'light', false);
    });
  }

  const btn = document.getElementById('themeToggle');
  if (btn) btn.addEventListener('click', toggle);

  window.MisikTheme = { get, set, toggle };
})();
