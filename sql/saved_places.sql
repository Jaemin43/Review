-- "맛집 담기" 기능용 테이블. Supabase 대시보드 SQL Editor에 붙여넣고 실행하세요.
-- 실행 후 js/kakao-search.js가 이 테이블(saved_places)을 그대로 사용합니다.

create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  place_id text not null,          -- 가게 고유번호 (Kakao Local API의 document id)
  place_name text not null,        -- 가게 이름
  category text,                   -- 카테고리 (예: 한식, 카페)
  address text,                    -- 주소
  lat double precision,            -- 위도 (Kakao y)
  lng double precision,            -- 경도 (Kakao x)
  created_at timestamptz not null default now(),  -- 담은 시간, 자동 기록
  unique (user_id, place_id)       -- 같은 사람이 같은 가게를 두 번 담는 것 방지
);

create index if not exists saved_places_user_id_idx on public.saved_places (user_id);

-- ---------- RLS: 본인이 담은 행만 보고/추가하고/지울 수 있게 제한 ----------
alter table public.saved_places enable row level security;

drop policy if exists "saved_places_select_own" on public.saved_places;
create policy "saved_places_select_own"
  on public.saved_places for select
  using (auth.uid() = user_id);

drop policy if exists "saved_places_insert_own" on public.saved_places;
create policy "saved_places_insert_own"
  on public.saved_places for insert
  with check (auth.uid() = user_id);

drop policy if exists "saved_places_delete_own" on public.saved_places;
create policy "saved_places_delete_own"
  on public.saved_places for delete
  using (auth.uid() = user_id);

-- update 정책은 두지 않음: 담기/취소만 하고, 저장된 행을 수정하는 기능은 없음.
