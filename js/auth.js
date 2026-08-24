// ---------- Auth (Supabase) ----------
// 로그인 여부는 window.MisikAuth로 공개한다. 다른 기능(예: 로그인한 사람만 가능한
// 맛집 담기)에서는 로그인 필요한 동작을 실행하기 전에
// MisikAuth.isLoggedIn() / MisikAuth.getUser()를 확인하면 된다. 상태가 바뀔 때마다
// document에 'misik:auth-change' 이벤트도 함께 발생시키니, 로그인 여부에 따라
// 화면을 다시 그려야 하는 곳에서는 이 이벤트를 구독해도 된다.

const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);

let currentUser = null;
const authListeners = [];

function displayName(user) {
  return user ? (user.email || '').split('@')[0] : '';
}

function setCurrentUser(user) {
  currentUser = user;
  updateAuthUI();
  authListeners.forEach((cb) => cb(currentUser));
  document.dispatchEvent(new CustomEvent('misik:auth-change', { detail: { user: currentUser } }));
}

window.MisikAuth = {
  getUser: () => currentUser,
  isLoggedIn: () => !!currentUser,
  onChange: (cb) => { authListeners.push(cb); },
  signOut: () => supabaseClient.auth.signOut(),
  // 담기 기능 등 다른 기능이 Supabase 쿼리를 직접 날려야 할 때 쓰는 클라이언트 접근자.
  getClient: () => supabaseClient,
  // 로그인이 필요한 동작을 로그인 안 한 사람이 시도했을 때: 안내 문구와 함께 로그인 모달을 연다.
  promptLogin: (message) => openAuthModal(message),
};

// ---------- UI wiring ----------
const authOpenBtn = document.getElementById('authOpenBtn');
const authUserBox = document.getElementById('authUserBox');
const authUserName = document.getElementById('authUserName');
const authLogoutBtn = document.getElementById('authLogoutBtn');

const authModalOverlay = document.getElementById('authModalOverlay');
const authForm = document.getElementById('authForm');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authSignInBtn = document.getElementById('authSignInBtn');
const authSignUpBtn = document.getElementById('authSignUpBtn');
const authMessage = document.getElementById('authMessage');

function updateAuthUI() {
  const loggedIn = !!currentUser;
  authOpenBtn.hidden = loggedIn;
  authUserBox.hidden = !loggedIn;
  if (loggedIn) authUserName.textContent = displayName(currentUser) + '님';
}

function setAuthMessage(text, type) {
  authMessage.textContent = text || '';
  authMessage.className = 'auth-message' + (type ? ' ' + type : '');
}

function setAuthBusy(busy) {
  authSignInBtn.disabled = busy;
  authSignUpBtn.disabled = busy;
}

function openAuthModal(message) {
  authForm.reset();
  setAuthMessage(message || '');
  authModalOverlay.classList.add('open');
  document.body.classList.add('modal-open');
  // 데스크톱에서만 자동 포커스 — 모바일에서는 모달이 뜨자마자 키보드가 올라오는 걸 막는다.
  if (window.matchMedia && window.matchMedia('(min-width: 761px)').matches) {
    authEmail.focus();
  }
}

function closeAuthModal() {
  authModalOverlay.classList.remove('open');
  document.body.classList.remove('modal-open');
}

// Supabase가 돌려주는 영문 오류 메시지를 화면에 보여줄 한국어 안내문으로 바꾼다.
function koreanAuthError(error, context) {
  const msg = ((error && error.message) || '').toLowerCase();

  if (msg.includes('already registered') || msg.includes('already exists')) {
    return '이미 가입된 이메일입니다.';
  }
  if (msg.includes('invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  }
  if (msg.includes('password') && (msg.includes('least') || msg.includes('character'))) {
    return '비밀번호는 6자 이상이어야 합니다.';
  }
  if (msg.includes('invalid') && msg.includes('email')) {
    return '올바른 이메일 형식이 아닙니다.';
  }
  if (msg.includes('email not confirmed')) {
    return '이메일 인증이 완료되지 않았습니다. 관리자에게 문의해주세요.';
  }

  if (error) console.error('[auth:' + context + ']', error);
  return context === 'signup'
    ? '회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    : '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
}

async function handleSignIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: koreanAuthError(error, 'signin') };
  setCurrentUser(data.user);
  return { ok: true };
}

async function handleSignUp(email, password) {
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) return { ok: false, message: koreanAuthError(error, 'signup') };

  if (data.session) {
    setCurrentUser(data.user);
    return { ok: true };
  }

  // 정상적인 설정(Confirm email 끔)이라면 signUp 응답에 세션이 바로 들어있어야 한다.
  // 혹시 세션이 없다면 로그인을 한 번 더 시도해 "가입 즉시 로그인" 요건을 최대한 만족시킨다.
  const retry = await supabaseClient.auth.signInWithPassword({ email, password });
  if (retry.error) {
    return {
      ok: false,
      message: '회원가입은 완료되었지만 자동 로그인에 실패했습니다. Supabase 대시보드 > Authentication > Sign In / Providers > Email에서 "Confirm email"을 꺼주세요.',
    };
  }
  setCurrentUser(retry.data.user);
  return { ok: true };
}

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = authEmail.value.trim();
  const password = authPassword.value;
  if (!email || !password) { setAuthMessage('이메일과 비밀번호를 입력해주세요.', 'error'); return; }

  setAuthBusy(true);
  setAuthMessage('로그인 중…');
  const result = await handleSignIn(email, password);
  setAuthBusy(false);

  if (result.ok) closeAuthModal();
  else setAuthMessage(result.message, 'error');
});

authSignUpBtn.addEventListener('click', async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value;
  if (!email || !password) { setAuthMessage('이메일과 비밀번호를 입력해주세요.', 'error'); return; }
  if (password.length < 6) { setAuthMessage('비밀번호는 6자 이상이어야 합니다.', 'error'); return; }

  setAuthBusy(true);
  setAuthMessage('가입 처리 중…');
  const result = await handleSignUp(email, password);
  setAuthBusy(false);

  if (result.ok) closeAuthModal();
  else setAuthMessage(result.message, 'error');
});

authOpenBtn.addEventListener('click', () => openAuthModal());
document.getElementById('authModalClose').addEventListener('click', closeAuthModal);
authModalOverlay.addEventListener('click', (e) => { if (e.target === authModalOverlay) closeAuthModal(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && authModalOverlay.classList.contains('open')) closeAuthModal();
});

authLogoutBtn.addEventListener('click', async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (!error && window.MisikToast) window.MisikToast.show('로그아웃이 완료되었습니다.');
});

// ---------- Session bootstrap & live sync ----------
// 새로고침해도 로그인 상태가 유지되도록, Supabase 세션(로컬스토리지에 보관됨)을
// 먼저 읽어 초기 화면을 그린 뒤, 이후 로그인/로그아웃은 onAuthStateChange로 반영한다.
supabaseClient.auth.getSession().then(({ data }) => {
  setCurrentUser(data.session ? data.session.user : null);
});

supabaseClient.auth.onAuthStateChange((_event, session) => {
  setCurrentUser(session ? session.user : null);
});
