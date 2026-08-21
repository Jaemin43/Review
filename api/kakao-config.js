// Vercel 서버리스 함수 — 카카오 REST API 키를 서버 환경변수(KAKAO_REST_API_KEY)에서 읽어
// index.html이 기대하는 원래 스크립트(js/kakao-config.js)와 동일한 내용으로 응답한다.
// 실제 라우팅은 vercel.json의 rewrites가 /js/kakao-config.js -> /api/kakao-config 로 연결한다.
// 이 방식으로 실제 키 값은 git 저장소(공개 저장소)에 평문으로 남지 않는다.

module.exports = function handler(req, res) {
  const key = process.env.KAKAO_REST_API_KEY || '';
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.status(200).send(`window.KAKAO_REST_API_KEY = ${JSON.stringify(key)};\n`);
};
