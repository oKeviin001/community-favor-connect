# Plano: Pede pro Kevin — pronto para primeiros testes

## Diagnóstico atual

O app já tem a base completa: autenticação (email/senha + Google), banco de dados, chat em tempo real, fluxo de status do pedido e painel dev (Modo Deus). O build passa e o app está publicado.

Porém, para abrir para testes reais, ainda faltam **três frentes críticas**:

1. **Pagamentos não estão ativos** — a tabela `payments` existe, mas o app só registra um status "depositado" sem cobrar nenhum cartão. A integração Stripe built-in da Lovable ainda não foi ativada no projeto.
2. **Erro de hidratação na tela de login** — há um runtime error de hydration mismatch em `/auth` que pode causar flashs ou travamentos no primeiro acesso.
3. **Fluxo pós-entrega está incompleto** — falta a tela de avaliação do entregador após o cliente confirmar a entrega, e alguns detalhes de UX ainda estão truncados ou confusos (ex: ícone do menu "Entregar" é um balão de chat).

## O que vamos fazer

````text
┌─────────────────────────────────────────────────────────────┐
│ 1. Ativar Stripe built-in da Lovable                        │
│    └─ Substituir o "depósito fake" por cobrança real          │
│    └─ Guardar payment_intent na tabela payments               │
│    └─ Liberar o pagamento só no confirmar entrega             │
├─────────────────────────────────────────────────────────────┤
│ 2. Corrigir /auth (hydration + UX)                            │
│    └─ Resolver mismatch server/client                         │
│    └─ Adicionar loading decente e tratar erros                │
├─────────────────────────────────────────────────────────────┤
│ 3. Finalizar fluxo de entrega                                 │
│    └─ Garantir que aceitar pedido mantém na tela do pedido    │
│    └─ Criar tela de avaliação após confirmar entrega          │
│    └─ Atualizar nota média do entregador no perfil            │
├─────────────────────────────────────────────────────────────┤
│ 4. Polish mínimo para testes                                  │
│    └─ Ícone correto no menu inferior                          │
│    └─ Estados vazios e mensagens de erro claras                 │
│    └─ Atualização em tempo real dos feeds (home/entregador)   │
└─────────────────────────────────────────────────────────────┘
````

## Detalhes técnicos

### 1. Pagamentos

- Ativar a integração **Stripe built-in** do Lovable (recomendada; sem necessidade de conta Stripe própria).
- Criar uma server function para iniciar o PaymentIntent no momento da criação do pedido.
- Atualizar `novo-pedido.tsx` para chamar essa função e só publicar o pedido após confirmação do pagamento.
- Alterar a confirmação de entrega (`pedidos.$id.tsx`) para chamar a liberação do pagamento via Stripe (capture/hold) ao invés de só mudar o status local.
- Armazenar `ref_externa` (Stripe payment intent id) na tabela `payments`.

### 2. Tela de login (`auth.tsx`)

- A rota já está com `ssr: false`, mas o componente ainda renderiza conteúdo diferente entre server e client. Vamos isolar a parte que depende do navegador (`window.location.origin`, `useNavigate` inicial) ou envolver em `<ClientOnly>` para eliminar o mismatch.
- Adicionar estado de carregamento inicial enquanto verifica se o usuário já está logado.
- Melhorar mensagens de erro do Supabase Auth.

### 3. Fluxo de entrega e avaliação

- Verificar e consolidar a navegação pós-aceite: entregador deve permanecer em `/pedidos/$id`.
- Criar rota `/pedidos/$id/avaliar` (ou modal inline) exibida automaticamente quando o cliente confirma a entrega.
- Server function `submitReview` para inserir a avaliação e recalcular `nota_media`/`total_avaliacoes` do entregador.
- Garantir que apenas clientes do pedido possam avaliar e apenas uma vez (RLS já tem `UNIQUE(order_id, reviewer_id)`).

### 4. Polish

- Trocar o ícone de "Entregar" no `AppShell` de `MessageCircle` para `Bike` ou `Truck`.
- Adicionar realtime subscription em `home.tsx` e `entregador.tsx` para novos pedidos e mudanças de status.
- Melhorar mensagens de empty state e erros de permissão.

## Fora do escopo desta rodada (roadmap)

- Notificações push
- Mapa / geolocalização
- Fluxo formal de disputa
- Dashboard admin avançado
- App nativo / PWA install prompt

## Próxima decisão sua

A integração de pagamentos exige que você preencha um formulário rápido da Lovable (email, nome, nome do negócio). Quer que eu ative o Stripe built-in agora e depois implemente a cobrança no fluxo de pedido?
