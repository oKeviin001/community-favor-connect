alter table public.notification_preferences
  add column if not exists pagamentos boolean not null default true,
  add column if not exists disputas boolean not null default true,
  add column if not exists seguranca boolean not null default true;

alter table public.notifications
  drop constraint if exists notifications_tipo_check;

alter table public.notifications
  add constraint notifications_tipo_check
  check (tipo in ('pedido','mensagem','entrega','avaliacao','candidatura','pagamento','disputa','seguranca','sistema'));
