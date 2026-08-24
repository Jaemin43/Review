-- "지금 인기 맛집 TOP 5" 랭킹용 전용 창구 함수. Supabase SQL Editor에 붙여넣고 실행하세요.
--
-- saved_places는 RLS 때문에 일반 select로는 본인이 담은 행만 보인다. 이 함수는
-- SECURITY DEFINER로 만들어 함수 안에서는 전체 테이블을 집계하되, 밖으로는
-- "가게 이름 + 담긴 횟수" 두 컬럼만 내보낸다 — 누가 담았는지(user_id)는 절대 노출되지 않는다.
-- RLS 자체는 saved_places 테이블에서 계속 켜져 있는 상태 그대로 둔다(끄지 않음).

create or replace function public.get_popular_places(result_limit int default 5)
returns table (place_name text, save_count bigint)
language sql
security definer
set search_path = public
as $$
  select place_name, count(*) as save_count
  from public.saved_places
  group by place_id, place_name
  order by save_count desc, place_name asc
  limit greatest(result_limit, 0);
$$;

-- 로그인 여부와 상관없이(비로그인 방문자도 랭킹은 봐야 하므로) 누구나 호출 가능하게 둔다.
grant execute on function public.get_popular_places(int) to anon, authenticated;
