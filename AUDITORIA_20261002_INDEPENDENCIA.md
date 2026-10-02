# AUDITORIA INDEPENDENTE — 2026-10-02

## Objetivo

Registrar uma nova auditoria do projeto independente **Pede pro Kevin**, depois das últimas correções que poderiam ser executadas sem depender do Lovable.

Escopo desta auditoria:
- independência do código em relação ao Lovable;
- integridade do repositório;
- configuração de build;
- autenticação Supabase no cliente;
- vestígios de dependência do Lovable;
- controles de autorização;
- escrita direta em tabelas sensíveis;
- migrations/RPCs preparadas;
- CI;
- itens ainda impossíveis de validar sem acesso ao Supabase remoto ou execução visual/browser.

## Resultado executivo

**Status: projeto independente em consolidação; não declarar equivalência funcional 100% ainda.**

Nesta rodada foram removidos/desacoplados componentes específicos do runtime do Lovable e a configuração de build foi migrada para a configuração padrão do TanStack Start/Vite/Nitro.

A auditoria também registra explicitamente que a migration de hardening do Supabase ainda não foi confirmada como aplicada no projeto Supabase independente, porque o acesso remoto ao Supabase apresentou erro de permissão.

Também não foi possível executar testes visuais/browser do aplicativo nesta auditoria.

## Correções confirmadas nesta rodada

### 1. Autenticação do Supabase
- Removido o storage de sessão específico do preview do Lovable.
- O cliente usa `localStorage` para persistência de sessão no navegador.
- Removido o import do módulo de preview que havia ficado órfão.
- Mantido o uso de `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` para o app independente.

### 2. Runtime de erros
- Removido o relatório de erros específico do Lovable.
- O root error boundary agora usa tratamento/log próprio da aplicação.

### 3. Build
- Removido `@lovable.dev/vite-tanstack-config`.
- `vite.config.ts` agora usa diretamente:
  - `vite-tsconfig-paths`
  - `@tanstack/react-start/plugin/vite`
  - `@vitejs/plugin-react`
  - `@tailwindcss/vite`
  - `nitro/vite`
- A configuração segue a estrutura documentada pelo TanStack Start para Vite/Nitro. citeturn0search2turn0search0

### 4. Ambiente
- Removido `.env` versionado.
- Criado `.env.example`.
- `.gitignore` passou a ignorar `.env` e variantes, mantendo apenas `.env.example`.

### 5. Dependências
- Removidas as dependências específicas do Lovable que não são necessárias para a execução independente:
  - `@lovable.dev/cloud-auth-js`
  - `@lovable.dev/vite-tanstack-config`
- Lockfile sincronizado.

## Segurança já registrada e mantida

As auditorias anteriores encontraram e as correções em GitHub já contemplam:
- remoção do bypass administrativo baseado em email fixo;
- remoção da escrita client-side direta em `payments`;
- proteção da identidade das avaliações;
- proteção das solicitações de exclusão de conta;
- controle de versões de consentimento;
- endurecimento de aplicações de entregador;
- restrições de documentos/storage;
- RPCs para pedidos disponíveis, pedido do entregador, aceitação atômica e perfil da contraparte;
- restrições de acesso a mensagens, eventos, avaliações, disputas e anexos;
- controles de usuário ativo/bloqueado/suspenso.

## Ponto crítico ainda pendente

### Supabase remoto independente

A migration `20261002190000_security_integrity_hardening.sql` está preparada no GitHub, mas **não está comprovada como aplicada no Supabase remoto**.

Ela inclui as RPCs necessárias para o fluxo de pedidos:
- `list_available_orders`
- `get_courier_order`
- `accept_order`
- `get_order_counterparty_profile`

Isso é particularmente importante porque a auditoria anterior confirmou que essas funções não existiam no banco consultado e que a ausência de `get_courier_order` explicava o comportamento de “pedido não encontrado”.

Até que a migration seja aplicada e consultada no banco independente, o backend remoto não deve ser considerado validado.

## CI

Foi criado o workflow `.github/workflows/validate.yml`, executando:
1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run build`

Durante esta auditoria, as execuções disparadas pelas mudanças foram observadas no GitHub. Algumas estavam em andamento; uma execução anterior falhou durante a sequência de alterações. Portanto, **não registrar CI como aprovado até existir uma execução final concluída com sucesso após todas as mudanças atuais**.

## Auditoria de independência

### Sem dependência de runtime do Lovable
- [x] Auth preview específico removido.
- [x] Error reporter específico removido.
- [x] Cloud auth package removido.
- [x] Vite config específica do Lovable removida.
- [x] Configuração TanStack Start/Vite/Nitro própria criada.
- [x] Ambiente próprio documentado.

### Ainda precisa ser validado
- [ ] Build final concluído com sucesso após a troca do Vite config.
- [ ] Typecheck final concluído com sucesso.
- [ ] Execução local real do aplicativo.
- [ ] Fluxos de login/logout.
- [ ] Fluxo completo cliente → pedido → pagamento → entregador → entrega.
- [ ] Chat/realtime.
- [ ] Upload de documentos/comprovantes.
- [ ] Notificações.
- [ ] Disputas.
- [ ] Administração.
- [ ] Bloqueios/suspensões em todos os pontos.
- [ ] Equivalência visual com o aplicativo que hoje está no Lovable.

## Limitações desta auditoria

Esta auditoria é principalmente estática/repositório. Não houve:
- teste visual em navegador;
- clique real em todas as telas;
- execução de fluxo end-to-end contra o Supabase independente;
- confirmação das migrations no Supabase remoto.

O acesso administrativo ao projeto Supabase retornou erro de permissão durante as tentativas anteriores, portanto não seria correto registrar o banco remoto como validado.

## Conclusão

O repositório está mais próximo de uma aplicação realmente independente: os pontos de execução específicos do Lovable foram removidos e o build foi colocado em uma configuração padrão do ecossistema TanStack Start.

**Ainda não é correto declarar que a cópia independente é 100% equivalente ao aplicativo do Lovable.**

Os próximos bloqueios objetivos são:
1. validar o CI final;
2. aplicar/confirmar as migrations no Supabase independente;
3. executar testes reais do aplicativo;
4. comparar todas as funcionalidades e telas com o aplicativo de referência.

---
Registro criado em 2026-10-02.
