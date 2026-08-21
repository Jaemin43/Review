// Vercel 서버리스 함수 — 구글 리뷰 텍스트를 Gemini에 보내 감정 분류/키워드/한줄요약을 받아온다.
// 구글 Places 키와 동일한 이유(유상 API, 키 유출 시 도용 위험)로 서버 환경변수(GEMINI_API_KEY)로만 관리한다.

const MODEL = 'gemini-3.6-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    sentimentCounts: {
      type: 'OBJECT',
      properties: {
        positive: { type: 'INTEGER' },
        neutral: { type: 'INTEGER' },
        negative: { type: 'INTEGER' }
      },
      required: ['positive', 'neutral', 'negative']
    },
    keywords: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          word: { type: 'STRING' },
          score: { type: 'INTEGER' },
          context: { type: 'STRING', enum: ['positive', 'negative'] }
        },
        required: ['word', 'score', 'context']
      }
    },
    summary: { type: 'STRING' }
  },
  required: ['sentimentCounts', 'keywords', 'summary']
};

function buildPrompt(placeName, reviews) {
  const reviewLines = reviews
    .map((r, i) => `${i + 1}. (별점 ${r.rating ?? '?'}) ${r.text || '(내용 없음)'}`)
    .join('\n');

  return `다음은 "${placeName}"이라는 가게에 대한 구글 리뷰 ${reviews.length}건이다. 각 리뷰를 읽고 아래 세 가지 작업을 수행해 JSON으로만 답하라.

1. 각 리뷰의 감정을 긍정/보통/부정 중 하나로 분류하고, 감정별 개수를 세어라(세 개를 합치면 리뷰 총 개수와 같아야 한다).
2. 리뷰들에서 자주 언급되는 핵심 단어를 8~15개 뽑아라. 음식 이름, 맛, 분위기, 서비스 관련 단어 위주로 고르고, 각 단어의 중요도를 1~10점으로 매기고, 그 단어가 리뷰에서 주로 긍정적 맥락으로 쓰였는지 부정적 맥락으로 쓰였는지 표시하라.
3. 전체 리뷰 내용을 한국어 한 문장으로 자연스럽게 요약하라.

리뷰 목록:
${reviewLines}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST 요청만 지원합니다.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }

  const placeName = body && body.placeName;
  const reviews = body && Array.isArray(body.reviews) ? body.reviews : null;

  if (!placeName || !reviews || reviews.length === 0) {
    res.status(400).json({ error: 'placeName과 reviews(1개 이상)가 필요합니다.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[api/gemini-analyze] GEMINI_API_KEY 환경변수가 설정되지 않았습니다.');
    res.status(500).json({ error: '서버에 Gemini API 키가 설정되지 않았습니다.' });
    return;
  }

  let geminiRes;
  try {
    geminiRes = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(placeName, reviews) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA
        }
      })
    });
  } catch (networkErr) {
    console.error('[api/gemini-analyze] Gemini API 호출 실패', networkErr);
    res.status(502).json({ error: 'Gemini API에 연결하지 못했습니다.' });
    return;
  }

  if (!geminiRes.ok) {
    const errBody = await geminiRes.text().catch(() => '');
    console.error('[api/gemini-analyze] Gemini API 오류', geminiRes.status, errBody);
    res.status(502).json({ error: 'AI 분석에 실패했습니다.' });
    return;
  }

  const data = await geminiRes.json();
  const text = data.candidates && data.candidates[0] && data.candidates[0].content &&
    data.candidates[0].content.parts && data.candidates[0].content.parts[0] &&
    data.candidates[0].content.parts[0].text;

  if (!text) {
    console.error('[api/gemini-analyze] Gemini 응답에 content가 없음', JSON.stringify(data));
    res.status(502).json({ error: 'AI 분석 결과를 받지 못했습니다.' });
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (parseErr) {
    console.error('[api/gemini-analyze] JSON 파싱 실패', text);
    res.status(502).json({ error: 'AI 분석 결과를 해석하지 못했습니다.' });
    return;
  }

  res.status(200).json({
    sentimentCounts: {
      positive: Number(parsed.sentimentCounts && parsed.sentimentCounts.positive) || 0,
      neutral: Number(parsed.sentimentCounts && parsed.sentimentCounts.neutral) || 0,
      negative: Number(parsed.sentimentCounts && parsed.sentimentCounts.negative) || 0
    },
    keywords: (parsed.keywords || []).map((k) => ({
      word: String(k.word || ''),
      score: Math.max(1, Math.min(10, Number(k.score) || 1)),
      context: k.context === 'negative' ? 'negative' : 'positive'
    })).filter((k) => k.word),
    summary: String(parsed.summary || '')
  });
};
