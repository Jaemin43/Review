// 화면 하단에 잠깐 떴다 사라지는 완료 알림(토스트). 로그아웃 완료 등 굳이 모달로
// 막을 필요 없는 짧은 확인 메시지에 쓴다.
(function () {
  'use strict';

  const ICON_CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12.5 L10 17.5 L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  let stack = null;
  function ensureStack() {
    if (stack) return stack;
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
    return stack;
  }

  function show(message, options) {
    const opts = options || {};
    const duration = opts.duration || 2600;

    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.innerHTML = `<span class="toast-icon">${ICON_CHECK}</span><span>${message}</span>`;
    ensureStack().appendChild(el);

    requestAnimationFrame(() => el.classList.add('show'));

    window.setTimeout(() => {
      el.classList.remove('show');
      el.addEventListener('transitionend', () => el.remove(), { once: true });
    }, duration);
  }

  window.MisikToast = { show };
})();
