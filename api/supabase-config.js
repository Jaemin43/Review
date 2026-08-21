// Vercel 서버리스 함수 — Supabase 프로젝트 URL/publishable 키를 서버 환경변수에서 읽어
// index.html이 기대하는 원래 스크립트(js/supabase-config.js)와 동일한 내용으로 응답한다.
// 실제 라우팅은 vercel.json의 rewrites가 /js/supabase-config.js -> /api/supabase-config 로 연결한다.
// publishable 키는 브라우저에 공개되는 것이 정상이지만(RLS로 데이터를 보호),
// 다른 API 키들과 동일한 방식으로 관리하기 위해 git 저장소에는 평문으로 남기지 않는다.

module.exports = function handler(req, res) {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || '';
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.status(200).send(
    `window.SUPABASE_URL = ${JSON.stringify(url)};\nwindow.SUPABASE_PUBLISHABLE_KEY = ${JSON.stringify(key)};\n`
  );
};
