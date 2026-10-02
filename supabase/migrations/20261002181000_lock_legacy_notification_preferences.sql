-- Individual notification preferences are obsolete: notification policy is global and admin-controlled.
drop policy if exists "users insert own notification preferences" on public.notification_preferences;
drop policy if exists "users update own notification preferences" on public.notification_preferences;
drop policy if exists "users read own notification preferences" on public.notification_preferences;

revoke insert, update, delete on public.notification_preferences from authenticated;
grant select on public.notification_preferences to authenticated;
