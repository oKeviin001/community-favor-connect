# Sistema Kevin v2 — integração no Pede pro Kevin

## Preservação
- A implementação legada \`kevin-protocol/1\` e a rota \`/transferencia\` permanecem disponíveis durante a migração.
- O novo painel aparece como aba no Modo Deus, não substitui as funções do app.
- Não sincronizar dados pessoais por padrão; aplicar allowlist de campos e scopes por conexão.

## Núcleo comum
\`src/lib/kevin-system/protocol.ts\` e \`crypto.server.ts\` são idênticos aos arquivos da Central Kevin. O módulo de criptografia é server-only.

## Banco
O arquivo \`docs/sistema-kevin/SCHEMA_V2_DRAFT.sql\` é uma proposta, não uma migration aplicada. Antes de aplicar:
1. Comparar as tabelas legadas \`kevin_app_identity\`, \`kevin_pairing_codes\`, \`kevin_connections\`, \`kevin_transfer_log\`, \`kevin_backups\`, \`kevin_inbox\` e \`kevin_sync_queue\`.
2. Manter compatibilidade do v1 e migrar conexões gradualmente.
3. Verificar RLS, permissões, triggers e histórico real do Supabase integrado ao Lovable.
4. Anexar os triggers v2 somente após validar as colunas e as regras de privacidade.

## Estado
Esta PR adiciona o núcleo protocolar e a entrada do painel no Modo Deus. Não declara endpoints v2, banco, worker ou sincronização em produção como concluídos. Esses itens dependem da integração backend/schema e de testes E2E.
