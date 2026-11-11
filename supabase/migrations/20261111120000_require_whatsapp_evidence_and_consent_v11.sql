-- Database enforcement for the required WhatsApp evidence and explicit consent versions.
-- The existing trigger from the security-integrity migration calls this function.
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
      join storage.objects s
        on s.bucket_id = 'comprovantes'
       and s.name = a.path
       and s.name like a.uploader_id::text || '/' || old.id::text || '/%'
      where a.order_id = old.id
        and a.tipo = 'whatsapp'
        and a.uploader_id in (old.cliente_id, old.entregador_id)
    ) then
      raise exception 'É necessário anexar um registro válido da conversa no WhatsApp antes de marcar o pedido como entregue';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.require_whatsapp_attachment_before_delivery() from public, anon, authenticated;

-- Replace the previous behavior that silently rewrote every consent to 1.0.
-- The trigger now accepts only the exact versions shown to and accepted by the user.
create or replace function public.force_current_consent_versions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    if auth.uid() is null or new.user_id is distinct from auth.uid() then
      raise exception 'consent user must match authenticated user';
    end if;
    if new.termos_versao is distinct from '1.1'
       or new.privacidade_versao is distinct from '1.1' then
      raise exception 'É necessário aceitar as versões atuais dos Termos e da Política de Privacidade';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.force_current_consent_versions() from public, anon, authenticated;
