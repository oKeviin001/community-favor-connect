# Auditoria do Sistema — revisão pós-hardening

**Data:** 2026-10-02  
**Escopo:** estado atual do repositório oKeviin001/community-favor-connect, migrations de segurança publicadas e interface de Modo Deus.  
**Método:** inspeção somente leitura dos arquivos e migrations disponíveis no branch main. O banco Supabase remoto não foi consultado.

## Resumo

A revisão confirma que várias falhas críticas identificadas na auditoria inicial receberam migrations de hardening no repositório:

- checagens administrativas passaram a usar o usuário autenticado;
- foi removido o caminho de administração baseado em e-mail no Modo Deus;
- campos privilegiados de profiles passaram a ser protegidos por trigger;
- candidatura não pode mais escolher sua própria decisão administrativa;
- eventos de candidatura não aceitam mais autoria forjada por usuários comuns;
- pedidos passaram a ter proteção contra alteração do conteúdo original e contra operações de usuários bloqueados/suspensos;
- exclusão direta de pedidos por usuários autenticados foi revogada.

**A revisão atual confirma que as duas falhas vermelhas de leitura de pedidos/perfis receberam correção no repositório.** O sistema ainda não pode ser considerado integralmente validado porque o banco Supabase remoto não foi consultado e a cobertura global de bloqueio/suspensão permanece pendente.

## Situação dos achados

| ID | Área | Situação | Observação |
|---|---|---|---|
| A1 | has_role / autorização | 🟢 Corrigido no repositório | A função mantém compatibilidade de assinatura, mas ignora UUID arbitrário e usa auth.uid(). |
| A2 | is_admin / enumeração de papel | 🟢 Corrigido no repositório | A verificação usa o usuário autenticado. |
| A3 | Cadastro como entregador | 🟢 Protegido via trigger | Perfil criado por usuário comum é forçado para cliente. |
| A4 | Campos protegidos do perfil | 🟢 Protegido via trigger | Tipo, moderação e métricas não podem ser escolhidos pelo usuário comum. |
| A5 | Exposição de pedidos antes da aceitação | 🟢 Corrigido no repositório | SELECT direto ficou limitado a cliente, entregador atribuído e admin; pedidos disponíveis passaram para RPC sanitizada. |
| A6 | Alteração/reivindicação arbitrária de pedidos | 🟢 Corrigido no repositório | Aceite passou para RPC atômica; conteúdo original continua protegido pelo trigger. |
| A7 | Decisão de candidatura | 🟢 Protegido via trigger | Status e metadados de decisão são preservados contra alterações do candidato. |
| A8 | Histórico de candidatura | 🟢 Protegido contra inserção direta | Eventos exigem fluxo administrativo e autoria derivada. |
| A9 | Bloqueio/suspensão | 🟡 Parcialmente corrigido | Orders verificam as flags; outras áreas ainda precisam de checagem equivalente. |
| A10 | Perfis antes da aceitação | 🟢 Corrigido no repositório | Profiles só ficam visíveis como contraparte quando existe pedido associado/aceito; contato operacional usa RPC específica. |
| A11 | Leitura de reviews | 🟡 Revisado | A policy restringe aos envolvidos/admins, mas precisa de validação remota. |
| A12 | Banco remoto | 🟠 Não verificado | Não foi possível confirmar quais migrations estão aplicadas no projeto Supabase ativo. |

## Correções aplicadas às antigas falhas vermelhas

### 1. Pedidos disponíveis antes da aceitação

A leitura direta de `orders` agora só permite ao usuário autenticado consultar seus próprios pedidos, pedidos já atribuídos a ele ou pedidos como administrador. A lista pública/operacional do entregador foi migrada para `list_available_orders()`, que retorna somente dados operacionais aproximados.

Antes do aceite, o entregador não recebe pela API a descrição completa, endereço de entrega, endereço da loja, observações ou dados pessoais da contraparte.

### 2. Perfil da contraparte antes da aceitação

As policies de `profiles` foram substituídas por regras de próprio perfil, administrador e contraparte de pedido já associado. O contato do outro participante é obtido por `get_order_counterparty_profile()` somente quando o pedido já possui associação legítima.

### 3. Aceite concorrente

O aceite deixou de ser um `UPDATE` direto no cliente. A operação agora passa por `accept_order()`, que verifica o entregador, executa o `UPDATE` condicionado a `entregador_id is null` e ao status de aguardando, grava o evento de aceite na mesma operação e retorna o pedido aceito.

### 4. Coluna gerada `orders.total`

O trigger `protect_order_changes()` deixou de tentar atribuir `new.total := old.total`. O valor gerado permanece sob responsabilidade do banco.

### Pendência que permanece: suspensão/bloqueio global

O bloqueio/suspensão continua protegido no fluxo de orders, mas ainda precisa ser definido e aplicado de forma sistemática a mensagens, candidaturas, Storage/documentos, avaliações, disputas/anexos e outras operações de negócio.

O trigger de pedidos passou a rejeitar INSERT/UPDATE quando o usuário está bloqueado ou suspenso. Porém, a auditoria ainda não encontrou proteção equivalente aplicada de forma sistemática a mensagens, candidaturas, Storage/documentos, avaliações, disputas/anexos e outras operações de negócio.

**Correção necessária:** definir primeiro se suspenso é global ou somente para entregadores e então aplicar a regra em cada operação relevante.

## Verificação adicional de migrations

Foi corrigida no repositório a atribuição indevida a `new.total` dentro de `protect_order_changes()`, pois `orders.total` é uma coluna gerada.

**Status:** 🟢 Corrigido no repositório / 🟠 execução remota ainda não verificada.

A migration e os testes SQL foram publicados, mas não houve execução contra o banco Supabase remoto.

## Regras de negócio preservadas

- cadastro começa como cliente;
- entregador depende de aprovação administrativa;
- admin é controlado por user_roles;
- pedido original não deve ser editado pelo cliente depois do envio;
- entregador não altera o conteúdo original;
- aprovação/reprovação de candidatura é administrativa;
- histórico deve ter autoria confiável;
- Modo Deus continua separado da autorização normal do usuário.

## Pendência de infraestrutura

A auditoria do código não substitui um teste no Supabase ativo.

Para fechar esta auditoria como validada em runtime ainda é necessário:

1. identificar/conectar o projeto Supabase realmente usado pelo aplicativo;
2. aplicar/verificar as migrations;
3. executar testes RLS com usuário cliente, entregador, admin, bloqueado e suspenso;
4. testar especificamente leitura de pedidos disponíveis e leitura de perfis;
5. confirmar que as migrations executam sem erro;
6. executar `supabase test db` e validar os casos negativos de RLS.

## Conclusão

**Resultado atual: 🟡 hardening avançado, com as antigas falhas vermelhas corrigidas no repositório, mas ainda sem validação de runtime.**

As superfícies de leitura de pedidos/perfis agora têm proteção específica e o aceite é atômico. A cobertura global de bloqueio/suspensão e a confirmação no banco Supabase ativo continuam pendentes.

Esta auditoria foi registrada como revisão técnica do estado atual; não representa uma confirmação de segurança do banco remoto.
