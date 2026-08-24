-- 인기 랭킹 / 맞춤 추천 기능을 테스트하기 위한 더미 데이터.
-- 실제 서비스 데이터가 아니라 "여러 명이 각자 다른 가게를 담은 것처럼" 순위 차이를
-- 만들어보기 위한 가짜 시드 데이터다. Supabase SQL Editor에서 실행하세요.
--
-- saved_places는 unique(user_id, place_id)라서, 같은 가게가 여러 번 담긴 걸 보여주려면
-- 서로 다른 user_id(=계정)가 여러 개 있어야 한다. 그래서 아래에서 dummy_user_1@misik.demo ~
-- dummy_user_20@misik.demo 라는 가짜 테스트 계정 20개를 auth.users에 만든 뒤, 그 계정들
-- 이름으로 saved_places에 100건을 나눠 담는다. 이 가짜 계정들은 로그인 용도가 아니라
-- 오직 랭킹 집계용 FK 대상일 뿐이라, 실제 로그인/이메일 인증 절차는 거치지 않는다.
--
-- 다 확인했으면 파일 맨 아래 "정리(삭제)" 블록으로 원상복구할 수 있다.

create extension if not exists pgcrypto;

-- ---------- 1) 가짜 테스트 계정 20개 ----------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  coalesce((select instance_id from auth.users limit 1), '00000000-0000-0000-0000-000000000000'),
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'dummy_user_' || i || '@misik.demo',
  crypt('misik-dummy-seed', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  '', '', '', ''
from generate_series(1, 20) as i
where not exists (
  select 1 from auth.users u
  where u.email = 'dummy_user_' || i || '@misik.demo'
);

-- ---------- 2) 가짜 가게 20곳 + 담긴 횟수(합계 100건) ----------
with dummy_users as (
  select id, row_number() over (order by id) as rn
  from auth.users
  where email like 'dummy_user_%@misik.demo'
),
places(idx, place_id, place_name, category, address, lat, lng, cnt) as (
  values
    (1,  'dummy-001', '계절 한상 다이닝',     '한식', '서울 강남구 테헤란로 123',  37.5010, 127.0396, 15),
    (2,  'dummy-002', '스미레 라멘 하우스',   '일식', '서울 마포구 양화로 45',    37.5563, 126.9220, 12),
    (3,  'dummy-003', '브런치 카페 오후',     '카페', '서울 서초구 서초대로 88',  37.4919, 127.0165, 10),
    (4,  'dummy-004', '화덕 피자 브루노',     '양식', '서울 용산구 이태원로 12',  37.5347, 126.9945, 9),
    (5,  'dummy-005', '훠궈 마라공방',        '중식', '서울 광진구 능동로 30',    37.5397, 127.0793, 8),
    (6,  'dummy-006', '온기당 국밥',          '한식', '서울 종로구 종로 5',       37.5704, 126.9910, 6),
    (7,  'dummy-007', '스시 하나레',          '일식', '서울 성동구 왕십리로 20',  37.5614, 127.0367, 5),
    (8,  'dummy-008', '드립 커피 리스트',     '카페', '서울 마포구 월드컵로 15',  37.5580, 126.9256, 5),
    (9,  'dummy-009', '파스타 소네트',        '양식', '서울 송파구 올림픽로 10',  37.5145, 127.1058, 4),
    (10, 'dummy-010', '짬뽕 명가',            '중식', '서울 중구 명동길 7',       37.5636, 126.9834, 4),
    (11, 'dummy-011', '떡볶이 연구소',        '분식', '서울 동작구 상도로 60',    37.5030, 126.9470, 4),
    (12, 'dummy-012', '삼겹살 화로연',        '한식', '서울 강서구 화곡로 8',     37.5410, 126.8495, 3),
    (13, 'dummy-013', '우동 이자카야 코토',   '일식', '서울 은평구 연서로 22',    37.6027, 126.9296, 3),
    (14, 'dummy-014', '로스터리 헤이즐',      '카페', '서울 성북구 동소문로 33',  37.5894, 127.0167, 3),
    (15, 'dummy-015', '스테이크 하우스 그레인','양식', '서울 영등포구 국제금융로 5',37.5250, 126.9260, 2),
    (16, 'dummy-016', '마라탕 홍콩반점',      '중식', '서울 구로구 디지털로 25',  37.4850, 126.9013, 2),
    (17, 'dummy-017', '김밥천국 옆집',        '분식', '서울 노원구 노원로 9',     37.6542, 127.0568, 2),
    (18, 'dummy-018', '두부 정식 소반',       '한식', '서울 강북구 삼양로 40',    37.6396, 127.0257, 1),
    (19, 'dummy-019', '규동 오니기리',        '일식', '서울 동대문구 왕산로 18',  37.5744, 127.0396, 1),
    (20, 'dummy-020', '크로플 하우스 데이',   '카페', '서울 양천구 목동로 50',    37.5169, 126.8664, 1)
)
insert into public.saved_places (user_id, place_id, place_name, category, address, lat, lng, created_at)
select
  du.id,
  p.place_id, p.place_name, p.category, p.address, p.lat, p.lng,
  now() - (random() * interval '30 days')
from places p
cross join lateral generate_series(0, p.cnt - 1) as k
join dummy_users du on du.rn = ((p.idx * 7 + k) % 20) + 1
on conflict (user_id, place_id) do nothing;

-- ---------- 확인 ----------
-- select place_name, count(*) from public.saved_places where place_id like 'dummy-%' group by 1 order by 2 desc;


-- ============================================================
-- 정리(삭제): 테스트가 끝나면 아래 두 줄의 주석을 풀고 실행해서 더미 데이터를 완전히 지우세요.
-- ============================================================
-- delete from public.saved_places where place_id like 'dummy-%';
-- delete from auth.users where email like 'dummy_user_%@misik.demo';
