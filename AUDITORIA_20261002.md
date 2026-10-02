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

**Entretanto, a auditoria não considera o sistema integralmente seguro ainda.** Permanecem pontos de leitura/RLS que não foram resolvidos pelas migrations recentes e existe uma pendência de validação no banco remoto.

## Situação dos achados

| ID | Área | Situação | Observação |
|---|---|---|---|
| A1 | has_role / autorização | 🟢 Corrigido no repositório | A função mantém compatibilidade de assinatura, mas ignora UUID arbitrário e usa auth.uid(). |
| A2 | is_admin / enumeração de papel | 🟢 Corrigido no repositório | A verificação usa o usuário autenticado. |
| A3 | Cadastro como entregador | 🟢 Protegido via trigger | Perfil criado por usuário comum é forçado para cliente. |
| A4 | Campos protegidos do perfil | 🟢 Protegido via trigger | Tipo, moderação e métricas não podem ser escolhidos pelo usuário comum. |
| A5 | Exposição de pedidos antes da aceitação | 🔴 Ainda pendente | O hardening protege INSERT/UPDATE, mas não substitui as policies de SELECT amplas existentes. |
| A6 | Alteração/reivindicação arbitrária de pedidos | 🟡 Parcialmente corrigido | O trigger restringe mudanças, porém SELECT/UPDATE ainda precisam de operações/RPCs específicas. |
| A7 | Decisão de candidatura | 🟢 Protegido via trigger | Status e metadados de decisão são preservados contra alterações do candidato. |
| A8 | Histórico de candidatura | 🟢 Protegido contra inserção direta | Eventos exigem fluxo administrativo e autoria derivada. |
| A9 | Bloqueio/suspensão | 🟡 Parcialmente corrigido | Orders verificam as flags; outras áreas ainda precisam de checagem equivalente. |
| A10 | Perfis antes da aceitação | 🔴 Ainda pendente | A policy de contraparte ainda possui uma condição que pode revelar perfil de cliente em pedido aberto. |
| A11 | Leitura de reviews | 🟡 Revisado | A policy restringe aos envolvidos/admins, mas precisa de validação remota. |
| A12 | Banco remoto | 🟠 Não verificado | Não foi possível confirmar quais migrations estão aplicadas no projeto Supabase ativo. |

## Achados críticos que permanecem

### 1. Pedidos disponíveis ainda podem expor dados antes da aceitação

A migration original de orders contém uma policy de SELECT que permite leitura de pedidos sem entregador. As migrations de hardening recentes protegem alterações, mas não removem essa policy nem criam ainda uma projeção sanitizada para a lista de pedidos disponíveis.

Isso significa que a regra de negócio desejada — entregar ao candidato somente informação operacional aproximada antes da aceitação — ainda não está garantida apenas pelo RLS atual.

**Correção necessária:** substituir a leitura direta da tabela por uma RPC/view segura que retorne somente os campos autorizados antes da aceitação, e remover a leitura ampla da tabela base.

### 2. Perfil da contraparte ainda tem uma condição ampla

A policy de contraparte possui uma condição para pedidos aguardando entregador que verifica o cliente do pedido, mas não exige que o usuário autenticado seja participante.

Essa condição pode permitir descoberta de dados do perfil do cliente antes da aceitação.

**Correção necessária:** remover essa condição para leitura direta de perfil e fornecer contato somente após a associação/aceitação legítima do pedido.

### 3. Suspensão/bloqueio ainda não é uma política global

O trigger de pedidos passou a rejeitar INSERT/UPDATE quando o usuário está bloqueado ou suspenso. Porém, a auditoria ainda não encontrou proteção equivalente aplicada de forma sistemática a mensagens, candidaturas, Storage/documentos, avaliações, disputas/anexos e outras operações de negócio.

**Correção necessária:** definir primeiro se suspenso é global ou somente para entregadores e então aplicar a regra em cada operação relevante.

## Verificação adicional de migrations

A revisão encontrou uma implementação que merece teste SQL antes de considerar a migration de pedidos validada em produção: o trigger protect_order_changes() tenta preservar new.total := old.total, enquanto orders.total é uma coluna gerada.

**Status:** 🟠 precisa de validação no banco/ambiente de migration antes de afirmar que a migration executa sem erro.

Não foi marcado como falha de produção porque o banco remoto não foi executado/testado.

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
5. confirmar que as migrations executam sem erro.

## Conclusão

**Resultado atual: 🟡 hardening avançado, porém ainda não concluído.**

As principais superfícies de privilégio de escrita receberam proteção no repositório, mas as superfícies de leitura de pedidos/perfis e a cobertura global de bloqueio/suspensão ainda precisam de correção. A validação final depende também do banco Supabase ativo.

Esta auditoria foi registrada como revisão técnica do estado atual; não representa uma confirmação de segurança do banco remoto.
