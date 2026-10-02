# Auditoria Nova — Pede pro Kevin

Data: 2026-10-02
Escopo: estado atual da branch main no repositório `oKeviin001/community-favor-connect`.
Commit auditado: `8131727aa9ccda7029ed5c1afbc7d86386c11b06` — `Record visual microinteraction rollout across main screens`.

## 1. Resumo executivo

Foi realizada uma nova revisão do código e das migrations de segurança após o hardening anterior.

Vários problemas identificados na auditoria anterior foram efetivamente tratados no repositório, especialmente:
- checks de papel agora avaliam o usuário autenticado;
- campos privilegiados do perfil são protegidos por trigger;
- decisão de candidatura de entregador é protegida contra autoaprovação;
- leitura de pedidos disponíveis foi retirada do SELECT direto e substituída por RPCs com informação operacional limitada;
- aceite de pedido tornou-se atômico;
- transições de execução do entregador passaram a ser validadas no banco;
- acesso à contraparte do pedido passou a exigir participação no pedido.

Entretanto, a revisão atual encontrou **regressões e lacunas novas** que precisam ser tratadas antes de considerar o hardening encerrado.

## 2. Achados prioritários

### CRÍTICO — bypass administrativo por e-mail voltou ao código

Os servidores administrativos ainda aceitam o e-mail fixo definido em `src/lib/dev-constants.ts` como alternativa à existência de `user_roles.role = 'admin'`.

Arquivos:
- `src/lib/admin-central.server.ts`
- `src/lib/courier-apps.server.ts`
- `src/lib/dev-actions.server.ts`
- `src/lib/dev-constants.ts`

Comportamento atual:
`email !== DEV_EMAIL && role?.role !== 'admin'` determina a rejeição.

Isso reintroduz o problema que havia sido removido anteriormente: uma identidade administrativa não deve ser derivada de um endereço de e-mail fixo. A autorização deve depender exclusivamente da atribuição de papel persistida e controlada.

**Ação recomendada:** remover completamente `DEV_EMAIL` dos checks de autorização do servidor. Manter somente `user_roles`/função `is_admin`.

### CRÍTICO — cliente ainda consegue criar registros de pagamento arbitrários

A tabela `payments` concede INSERT a usuários autenticados e a policy permite que o cliente insira um pagamento para qualquer pedido próprio.

Não há, no código auditado, uma validação de que:
- `valor` corresponde ao total legítimo do pedido;
- `status` inicial seja obrigatoriamente `depositado`;
- `ref_externa` seja emitida pelo provedor;
- exista apenas o registro financeiro esperado por pedido;
- a criação seja realizada exclusivamente por uma operação server-side confiável.

Isso permite adulteração da representação interna do pagamento mesmo que não conceda, por si só, acesso direto à conta Stripe.

**Ação recomendada:** retirar INSERT/UPDATE de `authenticated` em `payments` e concentrar criação/alteração financeira em RPC/server/Edge Function privilegiada, com invariantes no banco.

### ALTO — integridade de avaliações depende excessivamente do servidor

`reviews` permite INSERT quando o autor é participante de um pedido entregue, mas a policy não garante que `reviewee_id` seja exatamente a contraparte do pedido.

A implementação server-side atual corrige isso para o fluxo normal: ela exige que o usuário seja o cliente e deriva `reviewee_id` do pedido. Porém, a proteção não está completa no banco para chamadas diretas.

**Ação recomendada:** adicionar trigger ou RPC única para criar avaliações, derivando o avaliado a partir do pedido e impedindo autoavaliação/avaliação de terceiro.

### ALTO — solicitação de exclusão de conta permite campos de estado controláveis pelo usuário

`account_deletion_requests` permite INSERT pelo próprio usuário, mas não há trigger que congele `status` e `atendido_em` nos valores iniciais.

Um cliente pode tentar inserir uma solicitação já com estado administrativo, em vez de somente solicitar a exclusão.

**Ação recomendada:** trigger que force INSERT para `status = 'pendente'` e `atendido_em = null`; alterações posteriores somente por administrador/serviço.

### MÉDIO — consentimento LGPD aceita versões informadas pelo cliente

`user_consents` permite que o usuário insira seu próprio consentimento e informe `termos_versao` e `privacidade_versao`.

Isso não dá privilégio de acesso, mas reduz a confiabilidade do registro de qual versão efetivamente foi apresentada/aceita.

**Ação recomendada:** versões devem vir de configuração controlada pelo servidor ou de uma função de registro que derive as versões vigentes.

### MÉDIO — storage de documentos permite upload autenticado sem restrição de tipo/tamanho visível na policy

A policy de INSERT do bucket `documentos` vincula o caminho à pasta do próprio usuário, o que evita escrita na pasta de outro usuário. Porém, a policy não demonstra restrição de MIME, extensão, tamanho ou contexto de candidatura.

**Ação recomendada:** limitar upload a usuários com candidatura ativa/pendente/aprovada, aplicar limites de tamanho/tipo e manter leitura administrativa/da própria candidatura.

### MÉDIO — operações administrativas podem registrar sucesso mesmo quando uma mutação intermediária falha

Em `src/lib/dev-actions.server.ts` e partes de `src/lib/admin-central.server.ts`, algumas chamadas `supabaseAdmin.from(...).update/insert/delete` não têm seus erros verificados antes de registrar a operação como concluída.

Isso pode produzir estado parcialmente alterado acompanhado de mensagem de sucesso e auditoria incorreta.

**Ação recomendada:** tratar cada operação crítica como transação ou verificar cada erro antes de registrar sucesso; quando houver múltiplas tabelas, preferir RPC transacional.

## 3. Pontos confirmados como melhorados desde a auditoria anterior

### Roles
`20261002100000_harden_role_checks.sql` alterou `is_admin` e `has_role` para ignorarem o UUID fornecido e avaliarem `auth.uid()`, além de conceder execução a usuários autenticados.

### Perfis e privilégios
`20261002103000_harden_profiles_and_roles.sql` força usuários comuns a permanecerem como clientes e impede alteração de flags/scores protegidos. A gestão de `user_roles` ficou administrativa.

### Candidaturas
`20261002110000_harden_courier_applications.sql` força candidatura nova para `pendente`, preserva decisão administrativa e impede criação de eventos pelo próprio candidato.

### Pedidos
As migrations `20261002113000`, `20261002150000` e `20261002152000` endureceram imutabilidade, leitura, aceite atômico e transições do entregador.

### Privacidade
A leitura direta de pedidos não atribuídos foi removida. O RPC `list_available_orders()` retorna apenas dados operacionais limitados, e `get_courier_order()` diferencia pedido disponível de pedido já aceito.

### Contraparte
`get_order_counterparty_profile()` exige que o usuário autenticado seja participante de um pedido aceito.

## 4. Notificações

O sistema de notificações foi estruturado com:
- `notifications`;
- `notification_devices`;
- `notification_control`;
- controle centralizado por administrador;
- bloqueio das preferências antigas do usuário.

A policy atual de `notifications` limita leitura ao próprio usuário e inserção administrativa.

**Observação:** a existência das tabelas/migrations no GitHub não comprova que o banco remoto original esteja com todas essas migrations aplicadas. Essa auditoria é de código/repositório.

## 5. Auditoria de CI

Para o commit `8131727aa9ccda7029ed5c1afbc7d86386c11b06`, a consulta de status retornou `statuses: []`.

Portanto, **não há evidência de CI/status checks executados nesse commit** e nenhum teste de CI deve ser declarado como aprovado.

## 6. Limitações

Esta auditoria foi feita sobre o estado do repositório GitHub e suas migrations/fontes.

Não foi feita uma inspeção do banco remoto original da Lovable nesta etapa. Portanto, não é possível concluir que o estado remoto, grants, policies, funções ou migrations aplicadas sejam idênticos ao GitHub.

Também não foram executados testes de penetração contra o ambiente de produção.

## 7. Ordem sugerida para correção

1. Remover o bypass por e-mail de todos os checks administrativos.
2. Fechar INSERT/UPDATE de `payments` para clientes e centralizar o fluxo financeiro.
3. Fortalecer a criação de avaliações no banco.
4. Congelar o estado de `account_deletion_requests`.
5. Centralizar versões de consentimento.
6. Restringir upload de documentos.
7. Tornar operações administrativas transacionais e exigir verificação de erros.
8. Criar testes automatizados para cada regra acima.
9. Executar nova auditoria após as correções.
