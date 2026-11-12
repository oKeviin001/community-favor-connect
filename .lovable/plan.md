# Auditoria (somente leitura) — Pareamento Kevin V2 com a Central

Nada foi alterado. Nenhum código foi gerado ou usado. Nenhum POST foi feito ao handshake.

## (A) Existe uma tela? SIM — comprovado
- Caminho: `/dev` (Modo Deus), aba **"Sistema Kevin"**, cartão "Conectar à Central Kevin", campo `KVN-XXXX-XXXX-XXXX` e botão "Conectar à Central Kevin".
- Arquivo: `src/routes/_authenticated/dev.tsx` (aba nas linhas 102 e 276-297).
- Atenção: `/transferencia` tem **outro** campo KVN ("Adicionar código" + URL). Ele usa `conectarCodigoKevin`, que é o **protocolo V1**. Não use esse campo para o V2.

## (B) A função está ligada à interface? SIM — comprovado
```text
dev.tsx botão -> connectCentralKevin() (linha 151)
 -> connectCentralKevinV2 (createServerFn POST, src/lib/dev-actions.functions.ts)
 -> connectCentralKevinV2For (src/lib/dev-actions.server.ts:117)
 -> assertDevAccess (verifica admin)
 -> initiateCentralKevinV2Pairing(code) (runtime.server.ts:85)
    1. POST {Central}/api/public/kevin/v2/handshake
    2. grava kevin_v2_connections status=pending (segredo criptografado)
    3. POST {Central}/api/public/kevin/v2/confirm, assinado com HMAC
    4. atualiza para connected
```

## (C) Autorização de administrador — comprovado
- Tela: `beforeLoad` exige sessão e `is_admin`, senão redireciona para outra página. Essa proteção fica no navegador.
- Servidor: middleware `requireSupabaseAuth` + `assertDevAccess` consulta `user_roles` (role=admin) com o cliente do próprio usuário, então o RLS se aplica. Sem admin, dá erro antes de chamar a Central. É uma proteção real no servidor, não só visual.
- O formato do código KVN é validado duas vezes: no validator e no runtime.

## (D) Variáveis — comprovado no código
- `KEVIN_MASTER_KEY`, `KEVIN_CENTRAL_ORIGIN` e `KEVIN_APP_ORIGIN` só são lidas via `process.env`, em arquivos `*.server.ts`. Nenhum `VITE_` as expõe.
- O fluxo depende das três: `requireKevinV2Config` usa a chave mestra, e as duas origens são exigidas explicitamente.
- Não verificado nesta auditoria: se as três existem hoje e com quais valores. Os valores não foram lidos nem revelados.

## (E) Publicação — parcialmente comprovado
- O manifesto publicado do Pede responde HTTP 200.
- O código da tela publicada (`assets/dev-DOnvksXp.js`) contém "Sistema Kevin", "Conectar à Central Kevin" e "KVN-XXXX". Ou seja, a tela de pareamento está publicada.
- Não verificável sem alterar nada: se a mudança mais recente em `crypto.server.ts` (derivação da chave mestra) já foi publicada. O código do servidor não aparece para o público. Se não foi publicada e a chave não tiver o formato hex de 64 caracteres, o pareamento falhará ao criptografar o segredo, **depois** que o código já foi consumido na Central.

## (F) Compatibilidade com a Central — parcial
Comprovado com chamadas só de leitura (GET do manifesto e OPTIONS do handshake, que respondeu 204):
- A Central responde `kevin-protocol/2`, com slug `central-kevin`.
- Os escopos anunciados são idênticos aos `KEVIN_CATEGORIES` do Pede. Isso é compatível.
- `remote_app_id` é TEXT no banco do Pede, então o `app_id` "central-kevin" (que não é UUID) é aceito no insert.
- O runtime só exige que `identity.app_id` seja string. Isso é compatível.

Não verificado (exige o código da Central ou um POST real):
- Se o handshake da Central aceita o corpo enviado (`protocol`, `code`, `remote{app_id, app_name, app_slug, app_version, origin}`).
- Se a resposta traz `connectionId` em formato UUID e `secret` com 64 caracteres hex. O Pede rejeita qualquer outro formato.
- Se o `/confirm` da Central assina e verifica o HMAC com a mesma forma canônica (método, caminho, timestamp, nonce, hash do corpo) e os mesmos cabeçalhos `x-kevin-*`.

## (G) Riscos e bloqueios
1. **Código queimado sem conexão:** o handshake consome o código na Central antes das etapas locais. Se a gravação local ou o confirm falharem, o código se perde e fica um registro `pending` órfão no Pede. Não há rollback nem limpeza.
2. Uma falha no confirm deixa o lado do Pede em `pending` para sempre. A Central pode ficar em um estado inconsistente.
3. O sucesso só aparece em um toast e no console. A aba não mostra o status das conexões existentes.
4. O fluxo V1 em `/transferencia` também pede um código KVN e pode confundir o administrador.

## Próximo passo mínimo (sem gastar créditos)
1. Clicar em **Publicar** para garantir que o servidor publicado tem a versão atual da chave mestra.
2. Do lado da Central, confirmar o formato da resposta do handshake (`connectionId` UUID, `secret` com 64 hex) e a forma canônica do HMAC no `/confirm`.
3. Só então, logado como admin no app publicado, abrir `/dev`, aba "Sistema Kevin", colar **um** código KVN válido e ainda não expirado, e clicar em Conectar.
4. Considerar conectado somente se o toast mostrar sucesso **e** existir uma linha `status=connected` em `kevin_v2_connections`.

Melhoria opcional, se autorizada depois: limpar os registros `pending` em caso de falha e mostrar o status das conexões na aba.
