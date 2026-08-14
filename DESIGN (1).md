# DESIGN.md - JAEMIN'S ARCHIVE (맛집 리뷰 서비스)

## 1. 무드 (Mood)

**핵심 방향: Editorial-clean 구조 + 부분적인 일러스트 악센트**

- 전체 레이아웃/그리드/타이포 시스템은 절제되고 깨끗하게 (Headroom 참고)
- 핵심 루프 다이어그램, 섹션 아이콘 등 기능적인 지점에만 라인 드로잉/미니멀 일러스트를 포인트로 사용 (Nivedha Nirmal의 개성은 가져오되, 레트로/캐주얼한 가벼움은 배제)
- 배너·프로모션 중심의 기존 맛집 서비스와 명확히 구분되는, 조용하고 신뢰감 있는 Food Archive/Editorial 톤
- "신뢰"를 핵심 가치로 다루는 서비스이므로 장식적 캐주얼함보다 절제된 개성을 우선

### 참고 레퍼런스
| 레퍼런스 | 가져올 것 | 배제할 것 |
|---|---|---|
| [Headroom](https://www.lapa.ninja/post/headroom/) | 여백 기반 미니멀 구조 전체 (섹션 구분, 히어로 카피 배치) | 컬러(블루), 무개성한 SaaS 톤 |
| [Nivedha Nirmal](https://www.lapa.ninja/post/nivedhanirmal/) | 그래픽/일러스트적 개성 (라인 드로잉으로 절제) | 레트로 컬러(blue/yellow), 손그림 캐주얼함 |
| [Racepoint](https://www.lapa.ninja/post/racepointglobal/) | (제외) | 전체 — 참고하지 않음 |

---

## 2. 컬러 (Color)

**베이스**: 웜아이보리 + 차콜 텍스트
**포인트**: 슬레이트블루

| 역할 | 컬러 | HEX |
|---|---|---|
| 배경 (Base) | Warm Ivory | `#F5F3EE` |
| 텍스트 (Primary) | Charcoal | `#1E211D` |
| 텍스트 (Secondary) | Warm Gray | `#4C4E48` |
| 포인트 (Accent) | Slate Blue | `#647C8C` |
| 보더/구분선 | Border Gray | `#DAD5CA` |
| 카드/섹션 배경 (약한 틴트) | Light Neutral | `#E9E6DE` |

### 컬러 결정 과정 (참고용)
- Blue 베이스(Headroom 원본) → 기각: 신뢰감은 있으나 "음식" 카테고리와 정서적으로 안 맞고 SaaS/핀테크스러움
- 테라코타(`#B5533C`) → 후보: 음식 연상 강함, 따뜻함
- 딥올리브(`#536B52`) → 후보: 차분하지만 웰니스 쪽 연상이 더 강함
- **슬레이트블루(`#647C8C`) → 최종 채택**: 채도 낮고 그레이 톤이 섞여 SaaS스럽지 않으면서, "차분한 신뢰감"이라는 핵심 가치와 가장 잘 맞음. 다만 "음식" 직접 연상은 셋 중 가장 약함 — 이는 그래픽/사진 콘텐츠로 보완

---

## 3. 타이포그래피 (Typography)

**믹스 조합**: 헤드라인 세리프 + 본문/UI 산세리프 (매거진식 에디토리얼 조합)

| 용도 | 한글 폰트 | 영문 폰트 |
|---|---|---|
| 헤드라인 | Noto Serif KR (또는 Source Han Serif KR) | Fraunces |
| 본문 / UI | Pretendard | Inter |

- 헤드라인 세리프는 "Food Archive"라는 개인적 기록물의 인상과 Editorial 톤을 강화
- 본문/UI는 가독성과 실무적 UI 완성도를 위해 산세리프로 통일
- Nivedha Nirmal의 PP Writer(라틴 전용) 대신 한글 지원되는 세리프로 대체, 무드는 유지
- Headroom의 Inter/SF Pro 계열 산세리프 무드는 Pretendard+Inter 조합으로 계승

---

## 4. 레이아웃 & 인터랙션 구조

### 구조 원칙 (Headroom 참고)
- 넉넉한 여백, 섹션 간 명확한 구분 — 스크롤 시 한 섹션씩 명확히 인지되는 구조
- 히어로: 큰 타이틀 + 짧은 서브텍스트 + CTA 하나의 심플한 배치

### 그래픽 요소 배치 (Nivedha Nirmal 참고, 절제된 형태로)
| 위치 | 요소 | 스타일 |
|---|---|---|
| 히어로 | 핵심 루프 다이어그램 (Discover→Visit→Archive→Understand Taste→Discover) | 크게, 서비스 정체성을 한눈에 전달 |
| 각 여정 섹션 (Discover/Trust/Archive/Personalize) | 섹션별 소형 라인 아이콘 | 단색, 슬레이트블루/차콜 톤 |

> 컬러풀한 손그림 일러스트가 아니라 절제된 라인 드로잉/미니멀 아이콘으로 히어로와 섹션 그래픽의 톤을 통일한다.

---

## 5. 다음 단계 (미정 사항)

- 실제 폰트 서브셋/웨이트 최종 확정 (헤드라인 굵기, 본문 굵기 등)
- 라인 아이콘 세트 소스 확정 (자체 제작 vs 아이콘 라이브러리)
- 핵심 루프 다이어그램의 구체적 비주얼 형태 (원형 순환 다이어그램 vs 선형 플로우 등)
- 인터랙션/애니메이션 스펙(GSAP 커브 스와이프 전환, 그리드 라인, 코너 브래킷 프레이밍, 노이즈/모자이크 배경 등)은 별도 인터랙션 스펙 문서에서 상세화
