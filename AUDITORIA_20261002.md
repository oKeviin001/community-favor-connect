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


## Sistema de notificações — implementação inicial

Foi adicionada a base do sistema de notificações:

- preferências individuais por categoria;
- registros persistidos de notificações;
- Realtime para receber novos avisos enquanto o app está aberto;
- som de notificação dentro do app;
- permissão de notificações do navegador;
- Service Worker para suportar Web Push;
- armazenamento das assinaturas de dispositivos;
- função backend send-push preparada para entrega Web Push;
- laboratório no Modo Deus para testar individualmente ou em bateria todos os cenários.

**Catálogo atual:** pedido, mensagem, entrega, avaliação, candidatura, pagamento, disputa, segurança e sistema.

**Status:** 🟡 implementado no repositório, com entrega push condicionada à configuração das chaves VAPID no ambiente Supabase e à validação remota da migration/função.

O laboratório não deve ser interpretado como confirmação de push com o aplicativo fechado até que um dispositivo esteja inscrito e o serviço VAPID esteja configurado.


## Controle centralizado de notificações — 2026-10-02

Status: 🟡 implementação em repositório; validação remota do Supabase ainda necessária.

- A tela comum de Configurações → Notificações não altera mais categorias individuais.
- Foi criada a tabela `notification_control`, com leitura autenticada e alteração exclusivamente por administrador via RPC.
- O Modo Deus controla pedidos, mensagens, entregas, avaliações, candidatura, pagamentos, disputas, segurança, sistema e som.
- Foi criado o painel de envio livre com três públicos: clientes, entregadores ou todos.
- O envio livre registra a notificação e tenta entregar Web Push aos dispositivos cadastrados.
- O Modo Deus mantém laboratório para testar cada categoria, todas as categorias e o som.
- O aplicativo consulta o controle global no momento da entrega para que alterações administrativas tenham efeito imediato.
- O comportamento de push com aplicativo fechado continua condicionado à configuração das chaves VAPID e da função `send-push` no ambiente remoto.


## Renovação visual e microinterações — 2026-10-02

Status: 🟡 aplicado no código independente; aplicação pelo agente do Amável/Lovable ficou bloqueada nesta rodada por falta de créditos do workspace.

Objetivo:
- linguagem visual minimalista e moderna;
- microinterações discretas em toque/clique;
- transições suaves;
- estados de foco e interação mais claros;
- respeito a `prefers-reduced-motion`;
- melhoria da experiência mobile/touch.

Alterações aplicadas no repositório:
- `src/styles.css`: adicionados padrões globais de interação, `motion-interactive`, `motion-lift`, `motion-fade-in`, resposta de toque e redução de movimento.
- `src/components/ui/button.tsx`: botões passaram a usar o padrão global de microinteração e foco mais claro.
- `src/components/ui/card.tsx`: transições visuais mais suaves.
- `src/components/ui/input.tsx`: estados de foco/interação refinados.

Nenhuma migration, tabela, RLS, autenticação ou regra de negócio foi alterada nesta etapa.

Commits independentes gerados:
- `22a38cb65820d8f6ff40de550b3a873687ba0507`
- `b924a94beaf2622923e9b26926ead6a2947d4833`
- `178867f96e460c4f6795ec244e620c8fb6c2a4d5`
- `7268e369d3aa8fdb4a6397daa79ea840176a8ed4`

Pendência:
- o agente do Amável/Lovable iniciou a análise visual e criou o plano de renovação, mas não concluiu a aplicação visual porque o workspace ficou sem créditos.
- o erro de typecheck reportado em `src/routes/_authenticated/dev.tsx` também precisa ser corrigido antes da validação final do preview.


### Correção de fluxo — edição visual

As alterações visuais desta rodada devem ser tratadas como alterações do código independente via GitHub. O Amável/Lovable não deve ser usado como canal de edição para consumir créditos quando a alteração puder ser feita diretamente no repositório.

Commits visuais adicionais:
- `3055092590e83ea355df6867a1cf3ab2cde70b82` — shell/navegação com microinterações.
- `0bc83f8d00ad539acfa3270b56ce273e38c5a20d` — microinterações na lista de pedidos.

A implementação visual segue sem alterações de banco, RLS, autenticação ou regras de negócio.
