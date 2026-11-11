# Finalizar mapa e localização em tempo real — Pede pro Kevin

> Documento de passagem para o agente do Lovable. A implementação está parcialmente preparada na PR #4, mas NÃO está pronta para produção.

## Estado atual

- Repositório: https://github.com/oKeviin001/community-favor-connect
- PR de trabalho: https://github.com/oKeviin001/community-favor-connect/pull/4
- Branch: `codex/propostas-localizacao-colaborador`
- A PR continua em rascunho e NÃO foi incorporada à `main`.
- Último commit verificado: `5635d4cf5d1d4eec2a9c40c5dc489a5cd43dd340`.
- GitHub Actions: TypeScript e build de produção passaram no commit acima.
- A migration ainda NÃO foi aplicada ao banco.
- O teste preliminar da migration foi revertido; não alterou dados nem schema.
- O acesso de consulta ao banco do Lovable atingiu o limite temporário do plano gratuito. A última tentativa de aplicação foi recusada antes da execução. Portanto, não afirmar que o banco foi atualizado.

## O que já existe na branch

1. `supabase/migrations/20261111143000_collaborator_live_location.sql`
   - Cria `public.collaborator_presence`.
   - Cria RPC `set_collaborator_presence` para o colaborador aprovado ligar/desligar disponibilidade e atualizar coordenadas.
   - Cria RPC `list_order_proposal_locations` para o cliente consultar localizações relacionadas às propostas do próprio pedido.
   - Ativa RLS e revoga acesso direto à tabela.

2. `src/components/CollaboratorAvailability.tsx`
   - Botão “Ficar disponível / Ficar offline”.
   - Solicita permissão de geolocalização do navegador.
   - Usa `watchPosition` para atualizar coordenadas enquanto o componente permanece montado.

3. `src/components/CourierShell.tsx`
   - Exibe o controle de disponibilidade no ambiente do colaborador.

4. `src/components/PropostasCliente.tsx`
   - Consulta localizações por pedido.
   - Atualiza a tela por Realtime e polling de 15 segundos.
   - Exibe um mapa incorporado do OpenStreetMap quando há posição válida.
   - O TypeScript e o build passaram no CI.

## Tarefa do Lovable — concluir, auditar e testar

Trabalhe no projeto existente, mantendo React + TypeScript + Vite + Supabase. NÃO migre para Flutter, Firebase ou outro backend. NÃO crie um segundo projeto Supabase. NÃO altere funcionalidades sem relação com localização.

### 1. Auditar o banco real antes de executar a migration

Use o banco Supabase que pertence a ESTE projeto Lovable. Não use um projeto pessoal separado.

Verifique no schema real:
- `orders`: confirmar a coluna que identifica o cliente dono do pedido.
- `order_proposals`: confirmar nomes de colunas de pedido, colaborador e status, e os valores reais dos status.
- `profiles`: confirmar chave e coluna de nome.
- função `is_active_provider`: confirmar existência, assinatura e significado.
- função existente `list_order_proposals` e função `select_proposal`.
- políticas RLS e grants atuais.
- publicação Realtime da tabela de presença, caso o Realtime seja usado.

Não suponha nomes de colunas nem enums. Se os nomes diferirem, adapte a migration e o frontend ao schema real. Não apague nem recrie dados existentes.

### 2. Segurança e privacidade — requisito obrigatório

- Somente colaborador aprovado e autenticado pode ativar a própria disponibilidade.
- Nunca permitir que o usuário envie/atualize presença de outro colaborador.
- A tabela de presença não deve ser legível diretamente por clientes ou usuários anônimos.
- O cliente só pode consultar localização de colaboradores que enviaram proposta para um pedido que pertence a esse cliente.
- Não retornar localização de pedido de outro cliente, mesmo que ele conheça o UUID do pedido.
- Retornar apenas presença ativa e recente; definir e documentar um prazo de expiração adequado.
- Ao desligar disponibilidade, apagar latitude/longitude armazenadas.
- Ao perder permissão GPS, encerrar compartilhamento e informar claramente o colaborador.
- Não expor coordenadas em logs, URLs públicas, analytics ou telas de terceiros.
- Revisar cuidadosamente se a regra correta é mostrar a posição a quem recebeu uma proposta ou somente depois que o cliente selecionou o colaborador. A implementação atual segue a primeira regra. Se a política do produto exigir posição precisa apenas após seleção, restrinja a RPC e a interface a propostas selecionadas. Não ampliar a exposição sem decisão explícita do responsável pelo produto.
- Não confiar apenas em esconder botões no frontend: a autorização deve estar no banco/RPC.

### 3. Robustez da disponibilidade do colaborador

Revise `CollaboratorAvailability.tsx`:
- Ao iniciar, consultar a presença salva e refletir o estado real no botão.
- Ao ativar, pedir permissão e publicar a primeira posição antes de marcar como disponível.
- Continuar atualizando a posição enquanto o colaborador estiver disponível.
- Tratar permission denied, timeout, GPS desligado, navegador sem suporte, perda de conexão e erros RPC.
- Ao desativar, parar o watch e apagar a localização no banco.
- Ao sair da área do colaborador ou encerrar sessão, tentar desligar presença; não depender apenas do unmount, pois o navegador pode ser encerrado abruptamente.
- Manter expiração no servidor para impedir que uma localização antiga continue aparecendo.
- Evitar chamadas concorrentes desnecessárias e limitar frequência de atualização para não consumir quota/bateria.
- A tela deve deixar claro quando a pessoa está online, quando GPS está aguardando e quando houve erro.

### 4. Mapa para o cliente

A tela de propostas deve apresentar mapa legível, com marcador do colaborador e horário da última atualização. Não mostrar mapa vazio ou coordenadas cruas como se fossem um mapa.

A implementação atual usa iframe de mapa do OpenStreetMap. Avalie substituir por Leaflet/React Leaflet se isso for compatível com as dependências e o padrão do projeto:
- manter OpenStreetMap como camada de mapa, respeitando a política de uso dos servidores de tiles;
- não usar Google Maps nem exigir chave paga;
- adaptar o zoom/centro para a posição retornada;
- indicar quando a posição está indisponível ou desatualizada;
- atualizar o marcador sem recarregar toda a tela;
- permitir abrir o mapa em tamanho maior, se fizer sentido no layout mobile.

Não afirmar que o mapa fornece rota, ETA ou distância real enquanto isso não tiver sido implementado e validado. O mapa atual só representa a posição.

### 5. Conferir fluxo e telas

- Controle de disponibilidade aparece apenas para colaboradores aprovados.
- Cliente só vê localização dentro das propostas do próprio pedido.
- Um cliente não vê presença de colaboradores que não enviaram proposta para seu pedido.
- Ao selecionar/retirar proposta, a localização deve seguir a regra de privacidade definida no item 2.
- Verificar layout em tela pequena Android.
- Não alterar permissões, categorias, aprovação de parceiros, valores ou fluxo de pedidos fora do necessário.

### 6. Testes obrigatórios antes de declarar concluído

Executar e registrar:
1. TypeScript e build de produção.
2. Colaborador aprovado ativa disponibilidade e GPS.
3. Coordenadas são atualizadas e o mapa acompanha a atualização.
4. Colaborador desativa; posição deixa de aparecer.
5. Cliente A consulta seu pedido e vê somente colaboradores que enviaram proposta para aquele pedido.
6. Cliente B tenta consultar UUID do pedido de A e recebe bloqueio/nenhum dado.
7. Usuário não aprovado tenta ativar disponibilidade e recebe bloqueio no banco.
8. Localização antiga expira e deixa de aparecer.
9. GPS negado/desligado e perda de conexão não deixam presença falsa como ativa.
10. Confirmar se Realtime funciona no projeto; se não, validar o polling e documentar o comportamento.

Não usar contas reais de clientes sem autorização. Preferir contas de teste e pedidos fictícios.

## Restrições operacionais

- Não publicar nem fazer deploy de produção sem autorização expressa.
- Não fazer merge da PR #4 sem autorização expressa.
- Não gastar créditos pagos nem habilitar serviços pagos.
- Não executar SQL destrutivo.
- Antes de aplicar migration, apresentar qualquer divergência de schema e a migration final. Aplicar somente no Supabase integrado a este projeto Lovable.
- Depois de concluir, informar claramente: arquivos alterados, migration aplicada ou pendente, testes que passaram/falharam, limitações restantes e se houve publicação. Não dizer “funcionando” sem teste real.

## Prompt curto para iniciar no Lovable

Finalize a funcionalidade de disponibilidade e localização em tempo real descrita em `docs/LOVABLE_FINALIZAR_MAPA_LOCALIZACAO.md`. Leia o documento inteiro e revise a PR #4 e os arquivos nela alterados. Continue a implementação existente, não recomece do zero e não migre de stack. Primeiro audite o schema do Supabase integrado a este projeto; adapte a migration aos nomes e regras reais. Corrija robustez, segurança, privacidade e mapa mobile; execute os testes listados e reporte exatamente o que foi validado. Não publique, não faça merge e não use recursos pagos sem autorização.
