-- Allow a star rating without written text (the post-order prompt).
-- Safe if migration_007 already ran with the stricter body check.
alter table shop_reviews drop constraint if exists shop_reviews_body_check;
alter table shop_reviews add constraint shop_reviews_body_check check (char_length(body) <= 400);

create or replace function save_shop_review(p_shop uuid, p_rating int, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Please log in to leave a review'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'Choose a rating from 1 to 5'; end if;
  if char_length(coalesce(p_body,'')) > 400 then raise exception 'Keep the review under 400 characters'; end if;
  if exists (select 1 from shops where id = p_shop and owner_id = v_uid) then
    raise exception 'You can’t review your own shop';
  end if;
  if not exists (select 1 from shops where id = p_shop and active and status = 'approved') then
    raise exception 'This shop is not open for reviews';
  end if;
  insert into shop_reviews(shop_id, customer_id, rating, body)
  values (p_shop, v_uid, p_rating, left(btrim(coalesce(p_body,'')), 400))
  on conflict (shop_id, customer_id) do update
    set rating = excluded.rating, body = excluded.body, hidden = false, updated_at = now();
end $$;
