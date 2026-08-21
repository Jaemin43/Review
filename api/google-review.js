// Vercel 서버리스 함수 — 구글 Places API(New)를 서버에서 대신 호출하는 프록시.
// 구글 API 키는 여기(서버 환경변수)에만 존재하고 브라우저에는 절대 노출되지 않는다.
// 로컬 실행: .env.local에 GOOGLE_PLACES_API_KEY=... 를 채운 뒤 `npx vercel dev`로 구동.
// 배포본: Vercel 프로젝트 설정 > Environment Variables에 GOOGLE_PLACES_API_KEY를 등록해야 한다.

const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
// 화면에 내려주는 5개 필드 + 거리 검증 전용 places.location(응답에는 포함하지 않음).
const FIELD_MASK = [
  'places.displayName',
  'places.rating',
  'places.userRatingCount',
  'places.reviews',
  'places.googleMapsUri',
  'places.location'
].join(',');
const SEARCH_RADIUS_M = 150; // 도보 약 2분 거리

// Text Search(New)의 locationRestriction은 사각형만 지원해 원형 반경을 못 준다.
// 그래서 locationBias(원형)로 후보를 넉넉히 받은 뒤, 실제 거리(Haversine)로 150m 이내만 걸러낸다.
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ found: false, error: 'GET 요청만 지원합니다.' });
    return;
  }

  const { name, lat, lng } = req.query || {};
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!name || typeof name !== 'string' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    res.status(400).json({ found: false, error: 'name, lat, lng 파라미터가 필요합니다.' });
    return;
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('[api/google-review] GOOGLE_PLACES_API_KEY 환경변수가 설정되지 않았습니다.');
    res.status(500).json({ found: false, error: '서버에 구글 API 키가 설정되지 않았습니다.' });
    return;
  }

  let googleRes;
  try {
    googleRes = await fetch(SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK
      },
      body: JSON.stringify({
        textQuery: name,
        languageCode: 'ko',
        maxResultCount: 5,
        locationBias: {
          circle: {
            center: { latitude, longitude },
            radius: SEARCH_RADIUS_M
          }
        }
      })
    });
  } catch (networkErr) {
    console.error('[api/google-review] 구글 API 호출 실패', networkErr);
    res.status(502).json({ found: false, error: '구글 API에 연결하지 못했습니다.' });
    return;
  }

  if (!googleRes.ok) {
    const errBody = await googleRes.text().catch(() => '');
    console.error('[api/google-review] 구글 API 오류', googleRes.status, errBody);
    res.status(502).json({ found: false, error: '구글 리뷰를 불러오지 못했습니다.' });
    return;
  }

  const data = await googleRes.json();
  const candidates = data.places || [];

  // locationBias는 강제 필터가 아니라 "우선순위"라 반경 밖 결과도 섞여 올 수 있다.
  // 실제 좌표 거리를 계산해 150m 이내인 것만 인정하고, 그중 가장 가까운 곳을 채택한다.
  let place = null;
  let minDist = Infinity;
  for (const p of candidates) {
    if (!p.location || typeof p.location.latitude !== 'number' || typeof p.location.longitude !== 'number') continue;
    const dist = distanceMeters(latitude, longitude, p.location.latitude, p.location.longitude);
    if (dist <= SEARCH_RADIUS_M && dist < minDist) {
      minDist = dist;
      place = p;
    }
  }

  if (!place) {
    res.status(200).json({ found: false });
    return;
  }

  res.status(200).json({
    found: true,
    name: (place.displayName && place.displayName.text) || name,
    rating: typeof place.rating === 'number' ? place.rating : null,
    reviewCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : 0,
    reviews: (place.reviews || []).map((r) => ({
      author: (r.authorAttribution && r.authorAttribution.displayName) || '익명',
      rating: typeof r.rating === 'number' ? r.rating : null,
      relativeTime: r.relativePublishTimeDescription || '',
      text: (r.text && r.text.text) || (r.originalText && r.originalText.text) || ''
    })),
    mapsUri: place.googleMapsUri || null
  });
};
