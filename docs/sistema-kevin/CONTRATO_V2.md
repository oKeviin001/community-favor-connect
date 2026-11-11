# Sistema Kevin v2 — contrato compartilhado

Este contrato deve ser implementado igualmente na Central Kevin e nos aplicativos participantes. A Central é o plano de controle e espelho; cada app continua sendo a fonte autoritativa dos próprios registros.

## Regras obrigatórias
1. Dados reais somente. Seeds são isolados e identificados como teste.
2. Entrega pelo menos uma vez com processamento idempotente.
3. Outbox transacional: evento nasce na mesma transação da alteração de negócio.
4. ACK real: remetente só conclui após confirmação do destino.
5. Cursor incremental e reconciliação para recuperar lacunas.
6. Autoridade por categoria: Central não sobrescreve automaticamente o banco original.
7. Segredos só no servidor; service-role/HMAC/master key nunca no frontend.
8. Código é separado de dados: aprendizado de código usa Git read-only e commit SHA; importação por branch/PR.

## Endpoints
| Método | Endpoint | Objetivo |
|---|---|---|
| GET | /api/public/kevin/manifest | Identidade e manifesto público, sem PII |
| POST | /api/public/kevin/handshake | Resgate atômico do código KVN |
| POST | /api/public/kevin/push | Receber envelopes v2 |
| POST | /api/public/kevin/pull | Buscar mudanças por cursor |
| POST | /api/public/kevin/ack | Confirmar eventos aplicados |
| POST | /api/public/kevin/heartbeat | Presença; não equivale a sincronização |
| GET | /api/public/kevin/learn | Manifesto estrutural autenticado |

## Assinatura HMAC
Headers: x-kevin-connection, x-kevin-timestamp (Unix seconds), x-kevin-nonce (128 bits), x-kevin-signature (HMAC-SHA256 hex).
Mensagem assinada, separada por LF:
METHOD_UPPERCASE, PATH_AND_QUERY, TIMESTAMP, NONCE, SHA256(CANONICAL_JSON_BODY).
Tolerância: 300 segundos. O nonce deve ser inserido com UNIQUE(connection_id, nonce) antes de executar a operação. Requisição repetida recebe REPLAY_DETECTED.

## Envelope
protocol, eventId, sourceAppId, sourceAppName, category, recordId, operation, entityVersion, occurredAt, checksum e payload.
Checksum = SHA-256 do JSON canônico sem checksum. Delete usa payload null e cria tombstone. Categorias: users, customers, couriers, orders, reviews, complaints, settings, reports, statistics e content.

## Pareamento KVN
1. Admin gera código de uso único; somente SHA-256 do código fica no banco.
2. TTL padrão de 15 minutos; consumo via UPDATE condicional atômico.
3. Apps trocam identidade, versão e scopes solicitados.
4. Segredo aleatório de 256 bits; cada app guarda cópia cifrada com AES-256-GCM e chave própria de servidor.
5. Conexão fica pending até confirmação assinada dos dois lados.
6. Revogação invalida segredo; rotação gera outro.

## Sincronização
- Outbox transacional e deliveries por conexão.
- Worker de backend reclama eventos com lease, envia lotes e só conclui após ACK.
- Retry exponencial com jitter; erros permanentes vão para dead-letter.
- Inbox UNIQUE(source_app_id,event_id).
- Storage UNIQUE(source_app_id,category,source_record_id), aplica somente entityVersion maior.
- Tombstones impedem ressurreição de registros excluídos.
- Pull paginado com cursor opaco; full snapshot inicial separado do incremental.
- Heartbeat não indica fila vazia.

## Aprendizado e transferência de código
Learn público expõe somente manifesto. Aprendizado profundo usa GitHub read-only, commit SHA fixo, inventário de arquivos, dependências, rotas, APIs e schemas.
Pacote de módulo contém origem, commit, arquivos permitidos, dependências, licença, compatibilidade e SHA-256. Importação cria branch/PR; exige secret scan, licença, build/teste e aprovação humana. Proibido eval, execução de código recebido, merge/deploy automático ou acesso irrestrito ao repositório.

## Modo Deus
Comandos tipados e allowlisted, com idempotency key, destino, solicitante, aprovador, expiração, scopes e resultado. O app destino valida novamente permissões e regras locais. A Central não executa SQL, shell ou código arbitrário remotamente.

## Ativação
- Aplicar SCHEMA_V2_DRAFT.sql em cada Supabase após comparar schema e migrations.
- Configurar KEVIN_MASTER_KEY (64 hex chars) e credencial privilegiada somente como secrets server-side.
- Configurar worker agendado no backend; a UI não é worker.
- Executar E2E entre dois ambientes reais antes de produção.

Este contrato e os utilitários criptográficos são a base v2; não significam que banco, worker ou E2E estejam ativos.
