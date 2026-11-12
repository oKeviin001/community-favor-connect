begin;

select plan(5);

select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_control'
      and cmd = 'SELECT'
      and roles @> ARRAY['authenticated']::name[]
      and (
        qual is null
        or lower(regexp_replace(qual, '[()[:space:]]', '', 'g')) in ('true', '(true)')
      )
  ),
  'authenticated users have no unrestricted SELECT policy on notification_control'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_control'
      and policyname = 'admins read notification control'
      and cmd = 'SELECT'
      and qual like '%is_admin%'
  ),
  'notification_control SELECT is limited by the admin check'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_control'
      and policyname = 'admins update notification control'
      and cmd = 'UPDATE'
      and qual like '%is_admin%'
      and with_check like '%is_admin%'
  ),
  'notification_control UPDATE is limited by the admin check'
);

select ok(
  not has_table_privilege('anon', 'public.notification_control', 'SELECT'),
  'anonymous users have no table-level SELECT privilege'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('get_notification_control', 'set_notification_control')
      and p.prosecdef
  ),
  'notification control RPCs execute as invoker, not SECURITY DEFINER'
);

select * from finish();
rollback;
