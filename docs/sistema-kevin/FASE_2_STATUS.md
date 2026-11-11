# Sistema Kevin v2 — Pede pro Kevin

## Integração de pareamento na branch main
- O Pede apresenta uma aba "Sistema Kevin" no Modo Deus para inserir o código temporário emitido pela Central.
- A ação é executada no servidor e protegida pelo middleware de autenticação e pela verificação de papel admin.
- O Pede chama o handshake da Central usando `KEVIN_CENTRAL_ORIGIN`, apresenta sua identidade e recebe o segredo compartilhado.
- O segredo é criptografado em repouso com `KEVIN_MASTER_KEY` antes de ser persistido na conexão local.
- A conexão local começa como `pending`.
- O Pede assina uma confirmação HMAC-SHA256 com timestamp e nonce e chama `/api/public/kevin/v2/confirm` da Central.
- O Pede só altera sua conexão local para `connected` depois de receber confirmação positiva da Central.
- O endpoint de confirmação do Pede também foi adicionado para aceitar conexões iniciadas por outros aplicativos.

## Secrets necessários no servidor do Pede
- `KEVIN_MASTER_KEY`: 64 caracteres hexadecimais (32 bytes), configurada apenas no servidor.
- `KEVIN_CENTRAL_ORIGIN`: origem HTTPS pública da Central Kevin, sem caminho, query ou fragmento.
- `KEVIN_APP_ORIGIN`: origem HTTPS pública do Pede pro Kevin, sem caminho, query ou fragmento.

A Central precisa manter seus próprios secrets `KEVIN_MASTER_KEY` e `KEVIN_ADMIN_TOKEN`, além de `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` conforme a configuração do projeto.

## Dependência de banco — ainda não aplicada
O runtime usa as tabelas `kevin_v2_*` descritas em `SCHEMA_V2_DRAFT.sql`. O schema permanece apenas como documentação nesta etapa. Nenhuma migration foi aplicada e nenhuma tabela ou dado existente do Pede foi alterado.

## Limitações e validação
- O pareamento depende de o schema v2 já existir em ambos os bancos e das variáveis de ambiente acima estarem configuradas.
- O código da Central precisa ser emitido pelo endpoint administrativo da Central; a interface de emissão ainda será conectada ao Modo Deus.
- Não há worker/dispatcher, lease/claim, backoff, dead-letter nem pull incremental.
- O outbox ainda não produz snapshots allowlist; nenhuma linha de pedido, perfil ou outro dado real é enviada nesta fase.
- O teste E2E entre os dois projetos ainda não foi executado.
- O GitHub Actions confirmou TypeScript e build de produção com sucesso no commit `f2fbd274f2f3545091f602571191cd63efda71b6`. A revisão adicional de origem HTTPS pública também passou em TypeScript e build de produção no commit `48dfcb3b59dde16e281c94bf0c17a879d5a1e6ac`.

**Estado:** integração de pareamento bilateral adicionada ao código da branch `main`. Não significa que os aplicativos já estejam conectados. Nenhuma alteração de banco, deploy ou transferência de dados foi realizada.


Última revisão: os tipos locais do adaptador v2 foram ampliados para representar as tabelas do contrato sem usar `any` explícito. A validação do GitHub Actions está sendo repetida.
