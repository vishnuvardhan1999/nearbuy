-- ShopNip: auto-decline orders that stay 'placed' for 15 minutes, and
-- (re)add public.orders to supabase_realtime if it is missing.
-- Safe to re-run. Never changes order totals. Stock is returned the same
-- way as update_order_status. Wallet money is only reversed if the existing
-- orders_wallet_reverse trigger is present (it fires on this status update).

create or replace function public.expire_unaccepted_orders()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_ids uuid[] := '{}';
  v_o record;
  v_reason text := 'Not accepted within 15 minutes';
  v_updated int;
begin
  for v_o in
    select id
      from orders
     where status = 'placed'
       and created_at <= now() - interval '15 minutes'
     for update skip locked
  loop
    update shop_listings l
       set stock = l.stock + i.qty,
           updated_at = now()
      from order_items i
     where i.order_id = v_o.id
       and i.listing_id = l.id;

    update orders
       set status = 'rejected',
           updated_at = now(),
           reject_reason = coalesce(nullif(btrim(reject_reason), ''), v_reason)
     where id = v_o.id
       and status = 'placed';

    get diagnostics v_updated = row_count;
    if v_updated = 1 then
      insert into order_events(order_id, status, note, by_user)
      values (v_o.id, 'rejected', v_reason, null);
      v_count := v_count + 1;
      v_ids := array_append(v_ids, v_o.id);
    end if;
  end loop;

  return jsonb_build_object('expired', v_count, 'ids', to_jsonb(v_ids));
end;
$$;

comment on function public.expire_unaccepted_orders() is
  'Declines placed orders older than 15 minutes. Does not change totals. Call from the customer or seller app, or from pg_cron.';

revoke all on function public.expire_unaccepted_orders() from public, anon;
grant execute on function public.expire_unaccepted_orders() to authenticated;

do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'orders'
  ) then
    execute 'alter publication supabase_realtime add table public.orders';
  end if;
end $$;

do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron not available: %', sqlerrm;
  end;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule(j.jobid)
        from cron.job j
       where j.jobname = 'expire_unaccepted_orders';
    exception when others then
      raise notice 'Could not unschedule previous expire job: %', sqlerrm;
    end;
    begin
      perform cron.schedule(
        'expire_unaccepted_orders',
        '* * * * *',
        'select public.expire_unaccepted_orders()'
      );
    exception when others then
      raise notice 'Could not schedule expire_unaccepted_orders: %', sqlerrm;
    end;
  end if;
end $$;
