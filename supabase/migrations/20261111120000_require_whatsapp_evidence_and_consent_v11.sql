-- Enforce the required WhatsApp conversation record at the database layer.
-- A frontend-only check can be bypassed by calling the Supabase API directly.
create or replace function public.require_whatsapp_attachment_before_delivery()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status
     and new.status = 'entregue'::public.order_status then
    if not exists (
      select 1
      from public.order_attachments a
      where a.order_id = old.id
        and a.tipo = 'whatsapp'
    ) then
      raise exception 'É necessário anexar o registro da conversa no WhatsApp antes de marcar o pedido como entregue';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_require_whatsapp_attachment_before_delivery on public.orders;
create trigger trg_require_whatsapp_attachment_before_delivery
before update of status on public.orders
for each row
execute function public.require_whatsapp_attachment_before_delivery();

revoke all on function public.require_whatsapp_attachment_before_delivery() from public, anon, authenticated;

-- Keep database-enforced consent versions aligned with the current public documents.
create or replace function public.force_current_consent_versions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    if new.user_id is distinct from auth.uid() then
      raise exception 'consent user must match authenticated user';
    end if;
    new.termos_versao := '1.1';
    new.privacidade_versao := '1.1';
  end if;
  return new;
end;
$$;

revoke all on function public.force_current_consent_versions() from public;
