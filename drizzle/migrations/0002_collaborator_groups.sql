alter table public.service_categories add column if not exists icone text not null default '🧩';

drop index if exists public.provider_category_requests_one_pending;

create or replace function public.submit_category_request(_itens jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare caller uuid := auth.uid(); item jsonb; slugs text[] := '{}'; s text; j text; clean jsonb := '[]'::jsonb; rid uuid;
begin
  if caller is null then raise exception 'Faça login'; end if;
  if jsonb_typeof(_itens) <> 'array' or jsonb_array_length(_itens) = 0 then raise exception 'Selecione ao menos um grupo'; end if;
  if jsonb_array_length(_itens) > 20 then raise exception 'Grupos demais'; end if;
  for item in select * from jsonb_array_elements(_itens) loop
    s := item->>'slug'; j := btrim(coalesce(item->>'justificativa', ''));
    if s is null or not exists (select 1 from public.service_categories where slug = s and ativo) then raise exception 'Grupo inválido: %', coalesce(s, '?'); end if;
    if s = any(slugs) then raise exception 'Grupo repetido: %', s; end if;
    if exists (select 1 from public.provider_categories where user_id = caller and categoria_slug = s) then raise exception 'Você já participa deste grupo'; end if;
    if exists (select 1 from public.provider_category_requests r, jsonb_array_elements(r.itens) e
               where r.user_id = caller and r.status = 'pendente' and e->>'slug' = s) then
      raise exception 'Você já tem uma inscrição em análise para este grupo';
    end if;
    if char_length(j) < 10 or char_length(j) > 600 then raise exception 'Conte sua experiência (10 a 600 caracteres)'; end if;
    slugs := slugs || s; clean := clean || jsonb_build_object('slug', s, 'justificativa', j);
  end loop;
  insert into public.provider_category_requests (user_id, itens) values (caller, clean) returning id into rid;
  return rid;
end; $$;

create or replace function public.decide_category_request(_request_id uuid, _aprovadas text[], _observacao text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.provider_category_requests%rowtype; item jsonb; ok text[] := '{}'; total int;
begin
  if not public.is_admin(auth.uid()) then raise exception 'Acesso restrito a administradores'; end if;
  select * into r from public.provider_category_requests where id = _request_id for update;
  if not found or r.status <> 'pendente' then raise exception 'Solicitação não está pendente'; end if;
  total := jsonb_array_length(r.itens);
  for item in select * from jsonb_array_elements(r.itens) loop
    if (item->>'slug') = any(coalesce(_aprovadas, '{}')) then
      insert into public.provider_categories (user_id, categoria_slug, qualificacao, aprovado_por)
      values (r.user_id, item->>'slug', item->>'justificativa', auth.uid())
      on conflict (user_id, categoria_slug) do update set qualificacao = excluded.qualificacao, aprovado_por = excluded.aprovado_por, aprovado_em = now();
      ok := ok || (item->>'slug');
    end if;
  end loop;
  if cardinality(ok) > 0 then
    update public.profiles set tipo = 'ambos' where id = r.user_id and tipo = 'cliente';
  end if;
  update public.provider_category_requests set
    status = case when cardinality(ok) = 0 then 'recusada' when cardinality(ok) = total then 'aprovada' else 'parcial' end,
    categorias_aprovadas = ok, observacao_admin = nullif(btrim(_observacao), ''), analisado_em = now(), analisado_por = auth.uid()
  where id = r.id;
  insert into public.admin_audit_log (autor_id, acao, alvo_tipo, alvo_id, detalhes)
  values (auth.uid(), 'grupo_inscricao_decidir', 'prestador', r.user_id::text, jsonb_build_object('aprovadas', ok, 'solicitacao', r.id));
end; $$;

create or replace function public.admin_remove_provider_category(_user_id uuid, _slug text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'Acesso restrito a administradores'; end if;
  delete from public.provider_categories where user_id = _user_id and categoria_slug = _slug;
  insert into public.admin_audit_log (autor_id, acao, alvo_tipo, alvo_id, detalhes)
  values (auth.uid(), 'grupo_remover_membro', 'prestador', _user_id::text, jsonb_build_object('grupo', _slug));
end; $$;
revoke all on function public.admin_remove_provider_category(uuid, text) from public, anon;
grant execute on function public.admin_remove_provider_category(uuid, text) to authenticated;

create or replace function public.admin_list_group_members()
returns table (user_id uuid, nome text, categoria_slug text, aprovado_em timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'Acesso restrito a administradores'; end if;
  return query select pc.user_id, p.nome, pc.categoria_slug, pc.aprovado_em
    from public.provider_categories pc join public.profiles p on p.id = pc.user_id order by pc.aprovado_em desc;
end; $$;
revoke all on function public.admin_list_group_members() from public, anon;
grant execute on function public.admin_list_group_members() to authenticated;

create or replace function public.require_whatsapp_print()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'entregue' and old.status is distinct from 'entregue'
     and auth.uid() is not null and not public.is_admin(auth.uid())
     and not exists (select 1 from public.order_attachments a
                     where a.order_id = new.id and a.tipo = 'whatsapp' and a.uploader_id = new.entregador_id) then
    raise exception 'Envie o print da conversa no WhatsApp com o cliente antes de finalizar';
  end if;
  return new;
end; $$;
drop trigger if exists trg_require_whatsapp_print on public.orders;
create trigger trg_require_whatsapp_print before update on public.orders
  for each row execute function public.require_whatsapp_print();