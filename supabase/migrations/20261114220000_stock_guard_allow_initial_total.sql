-- Allow place_order to set the real total after it inserts the order at 0.
-- Copied from the live database (pg_get_functiondef('shopnip_orders_stock_guard'::regproc)).
-- Already applied live as migration stock_guard_allow_initial_total; do not re-apply there.
-- Function only: no data backfill.

CREATE OR REPLACE FUNCTION public.shopnip_orders_stock_guard()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if tg_op = 'INSERT' then
    if new.total_at_place is null or new.total_at_place = 0 then new.total_at_place := new.total; end if;
    return new;
  end if;
  -- place_order inserts the order at 0 then sets the real total once items exist
  if coalesce(old.total,0) = 0 and coalesce(old.total_at_place,0) = 0 and old.stock_checked_at is null then
    new.total_at_place := new.total;
    return new;
  end if;
  if new.total_at_place is distinct from old.total_at_place
     and new.total_at_place > coalesce(old.total_at_place, old.total) then
    new.total_at_place := coalesce(old.total_at_place, old.total);
  end if;
  if new.subtotal > old.subtotal then new.subtotal := old.subtotal; end if;
  if new.total > old.total then new.total := old.total; end if;
  if new.total_at_place is not null and new.total > new.total_at_place then
    new.total := new.total_at_place;
  end if;
  if old.awaiting_customer is true
     and new.status is distinct from old.status
     and new.status in ('ready','out_for_delivery','completed') then
    raise exception 'This order is waiting for the customer to choose what happens to out-of-stock items';
  end if;
  return new;
end $function$;
