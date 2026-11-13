# Migrações pendentes — Protocolo Kevin V2 (Pede pro Kevin)

Este documento descreve a sequência de banco exigida pelo código da PR #10. A presença dos arquivos no GitHub **não significa** que foram aplicados no banco de produção.

## Pré-requisitos

- Confirmar que a migração-base Kevin V2 (0003) já existe no banco.
- Fazer backup antes de qualquer alteração.
- Conferir o histórico real de migrações para evitar executar SQL manualmente em duplicidade.
- Aplicação em produção exige autorização explícita.

## Sequência

| Arquivo | Finalidade |
|---|---|
| `0004_kevin_v2_remote_connection_id.sql` | Adiciona o ID da conexão correspondente na Central. |
| `0005_kevin_v2_remote_connection_id_apply.sql` | Garante a coluna e faz backfill do UUID real da conexão Central já pareada. |
| `0006_kevin_v2_outbox_payload.sql` | Persiste payload e checksum na outbox para permitir reenvio de eventos. |
| `0008_kevin_v2_files.sql` | Cria metadados de arquivos e o bucket privado `kevin-v2-files`. |

As migrações 0004 e 0005 são idempotentes quanto à coluna/índice. A 0005 contém o backfill para a conexão de produção conhecida, usando o UUID da Central `2b5d6e6c-f508-4bd0-ac58-8f4548bd845b` e a origem `https://little-idea-land.lovable.app`. Antes de executar, confirmar que a linha alvo é exatamente a conexão ativa esperada.

## Verificações depois da aplicação

1. `kevin_v2_connections.remote_connection_id` existe e está preenchida para a conexão ativa com a Central.
2. `kevin_v2_outbox.payload` e `kevin_v2_outbox.checksum` existem.
3. `kevin_v2_files` existe com RLS habilitado e acesso restrito ao service role.
4. O bucket `kevin-v2-files` existe e permanece privado, com limite de 10 MB.
5. Só depois de publicar o código compatível nos dois aplicativos, executar teste real de envio/recebimento e conferir SHA-256 nos dois lados.

## Limites conhecidos

- O endpoint de arquivos e o polling de comandos incluídos na PR ainda não são produção até merge, deploy e migrações.
- Não há cron confirmado para retry automático de arquivos/comandos; os endpoints de retry/poll são acionados manualmente.
- Não marcar transferência como concluída apenas porque o upload local foi salvo: exigir ACK remoto autenticado e checksum correspondente.
