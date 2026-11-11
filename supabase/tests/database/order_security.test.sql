begin;

select plan(10);

select ok(
  exists (
    select 1
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'list_available_orders'
  ),
  'available-order RPC exists'
);

select ok(
  exists (
    select 1
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'get_courier_order'
  ),
  'courier-order RPC exists'
);

select ok(
  exists (
    select 1
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'accept_order'
  ),
  'atomic accept RPC exists'
);

select ok(
  exists (
    select 1
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'get_order_counterparty_profile'
  ),
  'counterparty profile RPC exists'
);

select ok(
  exists (
    select 1
    from pg_attribute
    where attrelid = 'public.orders'::regclass
      and attname = 'total'
      and attgenerated = 's'
  ),
  'orders.total is generated'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'orders_select_client'
  ),
  'orders client select policy exists'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'orders_select_assigned_courier'
  ),
  'orders assigned-courier select policy exists'
);

select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and cmd = 'SELECT'
      and (
        lower(coalesce(qual, '')) like '%entregador_id% is null%'
        or lower(coalesce(qual, '')) like '%entregador_id is null%'
      )
  ),
  'no direct SELECT policy exposes unassigned orders'
);


select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.orders'::regclass
      and tgname = 'trg_require_whatsapp_attachment_before_delivery'
      and not tgisinternal
  ),
  'delivery transition requires a WhatsApp attachment at database level'
);

select ok(
  exists (
    select 1 from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'require_whatsapp_attachment_before_delivery'
  ),
  'WhatsApp attachment guard function exists'
);

select * from finish();
rollback;
