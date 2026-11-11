# Sistema Kevin v2 — Fase 2 (estado do código)

## Implementado nesta etapa
- Runtime server-only no Pede pro Kevin com leitura da identidade v2, geração de código KVN, consumo condicional de uso único, segredo aleatório por conexão e criptografia AES-GCM em repouso.
- Endpoints públicos v2 para manifesto, handshake, recebimento de eventos assinados e ACK.
- Autenticação de requisição por HMAC-SHA256, timestamp, nonce persistido e rejeição de replay.
- Validação do envelope/checksum, escopos por conexão, deduplicação no inbox e aplicação no espelho por versão através de `kevin_v2_apply_storage`.
- Endpoint administrativo de geração de códigos protegido por `KEVIN_ADMIN_TOKEN`.

## Implementado na Central Kevin
- Runtime server-only usando Supabase REST com service-role apenas no servidor.
- Manifesto, handshake e recebimento de eventos assinados.
- Endpoint de emissão de códigos protegido por `KEVIN_ADMIN_TOKEN`.

## Configuração obrigatória antes de testar
Em cada servidor, configurar Secrets (nunca frontend nem Git):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (Central; no Pede a integração server existente usa seu cliente administrativo)
- `KEVIN_MASTER_KEY` (64 caracteres hexadecimais aleatórios, mesma chave mestra apenas se a estratégia de criptografia compartilhada for escolhida; preferir chaves independentes por app)
- `KEVIN_ADMIN_TOKEN` (token forte e exclusivo para endpoint de emissão de códigos)
- `KEVIN_APP_ID` quando aplicável.

Aplicar/revisar o schema de `SCHEMA_V2_DRAFT.sql` pelo fluxo do Lovable, inserir uma identidade em `kevin_v2_app_identity` em cada banco e verificar RLS/grants. Nenhuma alteração de banco foi aplicada por esta PR.

## Limitações ainda abertas — não declarar produção
- O fluxo de emissão/aceitação ainda precisa armazenar o segredo recebido também no app iniciador e concluir a confirmação bilateral; não existe UI de pareamento v2 conectada.
- Não há worker de outbox, lease/claim, backoff, dead-letter, dispatcher nem pull incremental completo.
- O trigger atual do schema gera metadados no outbox, mas não guarda snapshot do registro; a extração de dados reais precisa de projeções allowlist por tabela e categoria antes de enviar qualquer payload.
- ACK está implementado no Pede, mas falta o endpoint equivalente na Central e o dispatcher que o consome.
- Falta autenticação administrativa integrada à sessão/roles real do Modo Deus; os endpoints de código usam segredo de servidor provisório.
- Falta E2E com dois bancos Supabase reais, testes de concorrência/replay, revisão de RLS, validação de CORS/origem e testes de falha.
- A Central não tem ainda integração Lovable/Supabase configurada neste repositório. O runtime depende das variáveis server-side descritas acima.

**Estado:** fundação de API e segurança adicionada em branches de PR. Não há transferência real comprovada, não houve deploy, merge nem alteração de banco.