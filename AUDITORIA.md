# A. Problemas confirmados

1. **`has_role` não pode ser executada por usuários autenticados, apesar de aparecer em policies para esse público.** A migration cria `public.has_role(_user_id uuid, _role public.app_role)` como `STABLE SECURITY DEFINER`, com `search_path = public`. Inicialmente, concede `EXECUTE` a `authenticated` e `service_role`; a migration seguinte revoga de `PUBLIC`, `anon` e `authenticated`, deixando a função executável apenas por `service_role`. Não encontrei concessão posterior a `authenticated`. [Criação e grants iniciais](/data/data/com.termux/files/home/community-favor-connect/supabase/migrations/20260725221019_337ec1c2-e539-4223-982f-69edb749a6a7.sql:29) · [Revogação](/data/data/com.termux/files/home/community-favor-connect/supabase/migrations/20260725221053_ae1d8a35-0c9d-4a86-8ac3-d956eef01672.sql:1)

   As policies que chamam `has_role` são: leitura administrativa de `courier_application_events`; escrita de `app_settings`; leitura e gestão de `announcements`; escrita de `content_blocks`; e leitura de `admin_audit_log`. A policy de avisos também chama a função para permitir a leitura de avisos inativos por admins. [Policies de eventos](/data/data/com.termux/files/home/community-favor-connect/supabase/migrations/20260902183848_44d08e85-042d-4890-bbd8-6be29c6ec4f7.sql:33) · [Policies de configurações, avisos, conteúdo e auditoria](/data/data/com.termux/files/home/community-favor-connect/supabase/migrations/20260905023533_286eab5c-f482-4774-be03-fd5828b44b32.sql:15) · [Leitura de avisos inativos](/data/data/com.termux/files/home/community-favor-connect/supabase/migrations/20260907125600_d06e9384-a59a-4f73-b82f-8ee29c6ec4f7.sql:46)

   Quando uma dessas policies precisa avaliar a chamada, a falta de `EXECUTE` pode resultar em erro de permissão para o usuário autenticado. O acesso do admin às operações afetadas pode falhar. A página de desenvolvimento também chama `has_role` diretamente. [Chamada no cliente](/data/data/com.termux/files/home/community-favor-connect/src/routes/_authenticated/dev.tsx:40)

2. **A função `is_admin` tem uma interface ampla demais.** Ela aceita o UUID de qualquer usuário e pode ser executada por `authenticated`. Isso permite consultar se UUIDs arbitrários têm papel de admin: uma exposição de informação sobre os papéis, embora não conceda por si só acesso administrativo. [Definição e grants](/data/data/com.termux/files/home/community-favor-connect/supabase/migrations/20260803120150_28f32cb5-0fcc-4475-9881-ed8ad6d58bdc.sql:6)

   Além disso, os fluxos administrativos no servidor aceitam um endereço de e-mail fixo como alternativa a `user_roles`. Isso cria um caminho administrativo que não depende de uma atribuição de papel feita por outro administrador. [Checagem no servidor](/data/data/com.termux/files/home/community-favor-connect/src/lib/admin-central.server.ts:43) · [Checagem de candidaturas](/data/data/com.termux/files/home/community-favor-connect/src/lib/courier-apps.server.ts:45)

3. **O cadastro permite escolher o tipo de perfil.** O trigger `handle_new_user` usa `tipo` dos metadados de cadastro, e o formulário envia a opção escolhida. A tabela permite `cliente` ou `entregador` inicialmente, com `ambos` adicionado depois. Assim, o próprio cadastro pode atribuir condição de entregador sem candidatura aprovada. [Trigger](/data/data/com.termux/files/home/community-favor-connect/supabase/migrations/20260725191740_711b2de8-7d96-4f65-8615-a729a0097f40.sql:35) · [Cadastro](/data/data/com.termux/files/home/community-favor-connect/src/routes/auth.tsx)

4. **O usuário pode atualizar o próprio `profiles.tipo` e outros campos protegidos.** O grant e a policy de UPDATE permitem atualizar a linha inteira do perfil. A tela de perfil envia `tipo` no próprio update. Campos de bloqueio, suspensão, métricas e marca de teste também não estão isolados por coluna. [Grant e policies de `profiles`](/data/data/com.termux/files/home/community-favor-connect/supabase/migrations/20260725191740_711b2de8-7d96-4f65-8615-a729a0097f40.sql:23) · [Update da tela de perfil](/data/data/com.termux/files/home/community-favor-connect/src/routes/_authenticated/perfil.tsx:131)

5. **Pedidos disponíveis expõem conteúdo e dados pessoais antes da aceitação.** A policy de SELECT permite que qualquer autenticado leia pedidos sem entregador, independentemente de status. A tela de pedidos disponíveis lê `endereco_entrega`, e a página de detalhes faz `select("*")`. [Policy de pedidos](/data/data/com.termux/files/home/community-favor-connect/supabase/migrations/20260725191740_711b2de8-7d96-4f65-8615-a729a0097f40.sql:76) · [Feed de entregadores](/data/data/com.termux/files/home/community-favor-connect/src/routes/_authenticated/entregador.index.tsx:33) · [Detalhes do pedido](/data/data/com.termux/files/home/community-favor-connect/src/routes/_authenticated/entregador.pedido.$id.tsx:72)

   Há também um vazamento independente em `profiles`: a terceira condição da policy de “contraparte de pedido” não exige que o usuário autenticado seja participante. Ela permite consultar o perfil de clientes com pedidos abertos, inclusive nome e telefone. A página de detalhe do entregador faz essa consulta antes de aceitar. [Policy de perfis](/data/data/com.termux/files/home/community-favor-connect/supabase/migrations/20260907125600_d06e9384-a59a-4f73-b82f-8ee29c6ec4f7.sql:12) · [Consulta de contato antes da aceitação](/data/data/com.termux/files/home/community-favor-connect/src/routes/_authenticated/entregador.pedido.$id.tsx:77)

6. **As policies de pedido não limitam adequadamente criação, reivindicação ou edição.**
   - **INSERT:** verifica apenas `cliente_id = auth.uid()`. Não exige estado inicial, ausência de entregador nem perfil ativo/cliente; o usuário pode tentar criar um pedido já em outro estado ou com um entregador associado.
   - **UPDATE:** qualquer autenticado pode satisfazer a condição de um pedido sem entregador em espera. A policy não limita colunas nem transições. Como também não há uma validação mais restrita do novo estado, usuários comuns podem reivindicar pedidos ou alterar estado e conteúdo mantendo a condição de acesso.
   - **DELETE:** a tabela concede `DELETE` a `authenticated`, mas a policy de exclusão encontrada autoriza admins. Para usuários comuns, RLS deve negar a exclusão; para admins, a exclusão física é possível e conflita com preservar o pedido original como registro. [Grants e policies de `orders`](/data/data/com.termux/files/home/community-favor-connect/supabase/migrations/20260725191740_711b2de8-7d96-4f65-8615-a729a0097f40.sql:72) · [Exclusão administrativa](/data/data/com.termux/files/home/community-favor-connect/supabase/migrations/20260803120150_28f32cb5-0fcc-4475-9881-ed8ad6d58bdc.sql:44)

7. **Candidatos podem definir a própria decisão administrativa.** O candidato pode inserir e atualizar toda a linha de `courier_applications`. O INSERT só compara `user_id`, e UPDATE só exige que a candidatura continue sendo dele. Assim, pode definir `status`, `analise_observacao`, `analisado_em` e `analisado_por`, inclusive já no INSERT. [Grants e policies](/data/data/com.termux/files/home/community-favor-connect/supabase/migrations/20260807204736_4a62bfa5-da98-4a54-ba94-327bb8fe01bc.sql:36) · [Campos administrativos adicionados](/data/data/com.termux/files/home/community-favor-connect/supabase/migrations/20260902183848_44d08e85-042d-4890-bbd8-6be29c6ec4f7.sql:1)

8. **Candidatos podem fabricar eventos de candidatura.** A policy de INSERT em `courier_application_events` exige apenas que a candidatura pertença ao autor autenticado. Não valida `autor_id` nem `status`. O candidato pode inserir um evento com status “aprovado” e atribuí-lo a um UUID de administrador. Além disso, como pode atualizar a candidatura, pode falsificar o status atual, não apenas o histórico. [Policy de eventos](/data/data/com.termux/files/home/community-favor-connect/supabase/migrations/20260902183848_44d08e85-042d-4890-bbd8-6be29c6ec4f7.sql:37)

9. **Bloqueio e suspensão não restringem o acesso ao banco.** As flags aparecem no perfil e na administração, mas não são verificadas pelas policies das operações de negócio. `useUser` calcula capacidade de pedir/entregar sem considerar essas flags; a tela de perfil apenas exibe o estado. Como o próprio usuário pode editar a linha inteira do perfil, também pode tentar remover as flags. [Uso em `useUser`](/data/data/com.termux/files/home/community-favor-connect/src/lib/use-user.ts:55) · [Exibição no perfil](/data/data/com.termux/files/home/community-favor-connect/src/routes/_authenticated/perfil.tsx:149)

   Um usuário bloqueado ou suspenso ainda pode manter sessão e, conforme as policies atuais, consultar e alterar pedidos, criar pedidos, enviar candidatura, inserir mensagens e realizar outras operações permitidas a autenticados. As policies de candidaturas e Storage também não fazem checagem dessas flags.

# B. Pontos que precisam de investigação adicional

- Não consultei o banco remoto. Portanto, não confirmei quais migrations estão aplicadas, se grants ou policies remotas divergem do repositório, nem as permissões efetivas das funções no projeto Supabase.
- A policy de `announcements` combina `ativo = true` com `has_role`. A chamada pode não ser avaliada para um aviso ativo, mas avisos inativos e operações administrativas que usam `has_role` podem falhar. O comportamento remoto precisa ser confirmado após conferir o estado aplicado.
- É preciso definir se `suspenso` significa suspensão global do usuário ou suspensão somente das funções de entregador. O código usa a mesma flag para ações de usuário e de entregador, e o painel exibe o mesmo estado.
- É preciso definir o que um entregador já suspenso pode fazer com entregas em andamento, e se um usuário bloqueado pode consultar histórico, abrir disputa ou pedir revisão.
- A tabela atual tem `bairro` e faixas de valor estimado, mas não encontrei campo próprio de distância. A fonte e o nível de precisão da estimativa devem ser definidos antes de expô-la em uma lista pública para entregadores.
- O candidato pode editar dados e documentos depois da decisão, pois a policy atual não limita período nem status. Deve-se decidir quando alterações são permitidas e se uma reapresentação após reprovação volta à fila como pendente.

# C. Regras de negócio definidas e a preservar

- Todo usuário novo começa como cliente; o cadastro não escolhe papel de entregador nem de administrador.
- Entregador só recebe essa condição após candidatura aprovada por administrador.
- Papel administrativo vem de uma ação administrativa e fica separado de `profiles.tipo`, na tabela `user_roles`.
- O cliente pode atualizar seus dados pessoais autorizados, mas não tipo, flags de moderação, autorização, métricas ou campos do sistema.
- O cliente cria o pedido uma vez; não edita seu conteúdo pelo aplicativo depois do envio.
- O entregador não altera o conteúdo original. Pode aceitar o pedido e avançar somente nas transições permitidas.
- Antes da aceitação, o entregador recebe apenas dados operacionais aproximados; depois da aceitação, pode obter os dados necessários para executar a entrega.
- Aprovação/reprovação e metadados administrativos de candidaturas são exclusivamente administrativos.
- O histórico de pedidos e candidaturas deve representar eventos confiáveis, associados ao autor real.
- O Modo Deus pode administrar decisões, bloqueios, suspensão e correções, com autorização verificada no servidor e registro de auditoria.

# D. Proposta de arquitetura de segurança

## Administração e RLS

Manter `user_roles` como fonte administrativa e trocar as funções com argumento de usuário por um helper sem parâmetro, por exemplo `is_admin()`, que consulta o papel de `auth.uid()` dentro do banco. Implementá-lo como `SECURITY DEFINER`, com `search_path` vazio ou estritamente fixado, referências qualificadas por schema, proprietário controlado e permissões mínimas. Revogar execução de `PUBLIC` e `anon`; concedê-la a `authenticated` para as policies. Isso evita tanto o erro atual de permissão quanto um endpoint que permita consultar papéis de UUIDs arbitrários.

Policies administrativas devem chamar o helper self-bound. Escritas administrativas podem continuar no servidor com `service_role`, desde que cada função confirme papel admin por `user_roles` e não por um e-mail especial. Não restaurar simplesmente `EXECUTE` em `has_role(_user_id, ...)`: isso corrigiria alguns erros, mas manteria a consulta de papéis de terceiros.

## Profiles

As colunas existentes são: `id`, `nome`, `telefone`, `avatar_url`, `tipo`, `bairro`, `nota_media`, `total_avaliacoes`, `criado_em`, `bloqueado`, `suspenso`, `total_entregas` e `teste`. `tipo` tem os valores `cliente`, `entregador` e `ambos`. A autorização de admin está em `user_roles`, não em uma coluna de `profiles`.

- **Editáveis pelo próprio usuário:** `nome`, `telefone`, `avatar_url` e `bairro`, com validações de formato e, para avatar, validação do caminho/objeto de Storage.
- **Controlados pelo sistema/admin:** `id`, `tipo`, `bloqueado`, `suspenso`, `nota_media`, `total_avaliacoes`, `total_entregas`, `criado_em` e `teste`. Papéis administrativos permanecem apenas em `user_roles`.

RLS limita linhas, mas não colunas. Para permitir os quatro campos pessoais sem permitir o resto, revogar o grant de UPDATE à tabela para `authenticated` e conceder UPDATE apenas nessas colunas, mantendo a policy `auth.uid() = id`. Remover INSERT direto de `authenticated`: o trigger de criação já pode criar o perfil. Alterar o trigger para sempre usar `tipo = 'cliente'`, ignorando `tipo` nos metadados.

Como proteção em profundidade, um trigger pode rejeitar alterações de campos controlados pelo sistema por sessões autenticadas. Operações administrativas de tipo e moderação passam por função do servidor ou RPC administrativa com papel verificado. Métricas devem ser atualizadas por lógica de sistema, por exemplo triggers de avaliação/conclusão. A tela de perfil deixa de enviar `tipo`.

## Orders

Colunas atuais incluem: `id`, `cliente_id`, `entregador_id`, `categoria`, `descricao`, `loja`, `endereco_loja`, `endereco_entrega`, `observacoes`, `valor_produto`, `valor_frete`, `taxa_servico`, `total` (gerado), `status`, `criado_em`, `atualizado_em`, `aceito_em`, `bairro`, `referencia`, `valor_estimado_min`, `valor_estimado_max` e `teste`.

| Operação | Regra proposta |
|---|---|
| SELECT | Cliente lê seus pedidos; entregador lê pedidos atribuídos a ele apenas após a aceitação; admin lê todos. Pedidos disponíveis não são lidos diretamente da tabela base por entregadores. |
| INSERT | Somente cliente ativo, ligado por `auth.uid()`. Criar com status inicial fixo, sem entregador, sem timestamps de aceitação e com limites/validação dos campos. |
| UPDATE | Sem UPDATE direto por `authenticated`. Usar RPCs específicas que validam ator, estado atual e campos alteráveis. |
| DELETE | Nenhuma exclusão comum para cliente ou entregador. Preservar registro original; exclusão administrativa física não deve ser o fluxo normal. |
| Transições | Criar como `aguardando_entregador`; aceite atômico para `aceito`; entregador atribuído avança `aceito → indo_loja → em_compra → compra_finalizada → em_entrega → entregue`; cliente confirma `entregue → confirmado` ou abre disputa pelo fluxo controlado; admin pode corrigir/cancelar/reabrir por ação autorizada e auditada. |

A RPC de aceite deve validar que o usuário é entregador aprovado e ativo, que o pedido ainda está aguardando e sem entregador e, em uma operação atômica, atribuir `entregador_id`, `aceito_em` e `status = 'aceito'`. Isso impede que qualquer usuário comum reivindique pedido e resolve corridas entre dois entregadores.

Antes da aceitação, uma RPC de listagem (ou endpoint de leitura equivalente) é apropriada. Deve retornar uma projeção pequena e explícita: identificador opaco, categoria, bairro/região aproximada, faixa de valor e campos operacionais aprovados. Deve omitir `cliente_id`, nome, telefone, endereços precisos, referência e observações livres. Descrição livre também pode conter dados pessoais, então deve ser omitida ou transformada/validada antes da exposição. **Não existe campo de distância nas colunas encontradas**; a RPC não deve inventá-lo.

Após a aceitação, uma RPC de detalhes de execução ou uma policy estrita para o pedido atribuído pode fornecer endereço preciso, referência e contato da contraparte. Remover a condição ampla de SELECT para qualquer pedido sem entregador e remover o ramo da policy de profiles que revela clientes com pedidos abertos.

Correções administrativas devem preservar o pedido originalmente enviado. Uma revisão ou log imutável deve registrar valor anterior, valor corrigido, motivo, autor e horário, em vez de apagar o pedido original sem rastro.

## Courier applications e events

O candidato pode editar os campos de candidatura: nome completo, CPF, nascimento, telefone, e-mail, endereço, número, complemento, bairro, cidade, estado, CEP, caminhos dos documentos, transporte, dias, horários, região, observações do candidato, respostas de experiência/equipamento, motivo e informação adicional. Recomendo permitir alterações enquanto pendente e definir uma RPC explícita de reapresentação após reprovação, caso esse fluxo seja desejado.

`id`, `user_id`, status, timestamps de decisão, `analisado_por` e `analise_observacao` são campos protegidos. O candidato não deve inserir esses campos com valores próprios nem atualizá-los. Uma combinação de grants por coluna, policies por proprietário e trigger de validação impede alterações diretas. Aprovação e reprovação são feitas por operação administrativa validada no servidor, atualizando perfil e evento de maneira atômica. Os caminhos dos documentos devem pertencer à pasta do próprio candidato.

Para `courier_application_events`, revogar INSERT direto de `authenticated`. Criar eventos somente pela RPC/fluxo confiável de envio da candidatura ou de decisão administrativa. O banco deriva `autor_id` de `auth.uid()` para ações de candidato e, para decisões administrativas, registra o admin validado; status não deve ser escolhido livremente pelo candidato. Manter eventos append-only e permitir SELECT apenas ao dono da candidatura e admins.

## Bloqueio e suspensão

O código usa as flags para exibição, filtragem e ações do Modo Deus, mas não como autorização no banco. Recomendo uma função confiável que determine se a conta pode realizar cada ação. Policies e RPCs de escrita devem aplicá-la. Bloqueio deve impedir operações de negócio até reativação. A suspensão precisa de definição explícita; se for suspensão de entregador, deve impedir aceite e avanço de entrega sem necessariamente impedir o uso como cliente.

As checagens devem cobrir, conforme a semântica definida, `orders` (INSERT/aceite/UPDATE), `courier_applications` (INSERT/UPDATE), Storage de documentos, mensagens, pagamentos, avaliações, disputas, eventos e anexos. SELECT de histórico próprio pode permanecer disponível. A checagem deve existir no banco/RPC, pois guarda apenas visual na interface é contornável.

# E. Migrations, triggers, RPCs e policies recomendadas

Como o repositório declara integração com Lovable, eu recomendaria **migrations novas e aditivas**, sem reescrever migrations que já possam ter sido aplicadas:

1. **Migration de autorização:** criar helper admin sem UUID arbitrário; revogar grants antigos desnecessários; atualizar todas as policies que chamam `has_role`; revisar as policies que chamam `is_admin(uuid)`.
2. **Migration de profiles:** restringir INSERT/UPDATE de `authenticated`, conceder update apenas das colunas pessoais, proteger campos de sistema com trigger e ajustar o trigger de cadastro para sempre criar cliente.
3. **Migration de orders:** substituir policies abertas; limitar grants; tornar criação e atualizações controladas; adicionar log/revisão para correções administrativas.
4. **RPCs de orders:** listar pedidos disponíveis com projeção sanitizada; criar pedido; aceitar atomicamente; avançar estado; registrar disputa; confirmar entrega; corrigir/reabrir/cancelar como admin.
5. **Migration de candidaturas:** restringir grants/policies aos campos do candidato e proteger os campos de decisão com trigger/RPC.
6. **Migration de eventos de candidatura:** revogar INSERT direto; criar eventos por RPC confiável; atualizar leitura administrativa para o helper de papel seguro; manter histórico imutável.
7. **Migration de bloqueio/suspensão:** adicionar checagem de estado às policies e RPCs de cada operação de negócio, depois que a semântica de cada flag estiver definida.
8. **Ajustes de aplicação:** remover `tipo` do update do perfil, deixar de ler pedidos disponíveis diretamente da tabela, e trocar chamadas administrativas diretas por endpoints de servidor que confirmem papel no banco.

# F. Risco resolvido e efeitos colaterais

| Alteração proposta | Risco que resolve | Possível efeito colateral |
|---|---|---|
| Helper admin self-bound e policies atualizadas | Policies falhando por falta de `EXECUTE`; enumeração de papel por UUID arbitrário | Chamadas atuais a `has_role(uuid, role)` — inclusive no modo de desenvolvimento — precisarão ser substituídas. |
| Perfil com grants por coluna, trigger e cadastro sempre como cliente | Autopromoção, alteração de flags/métricas e escolha de tipo no cadastro | Telas e integrações que atualizam `tipo` diretamente deixarão de funcionar até migrarem para ação administrativa. |
| Remover leitura de pedidos abertos da tabela e usar RPC sanitizada | Exposição prematura de endereço, contato e conteúdo livre | O feed atual precisa migrar para a RPC; filtros e atualizações em tempo real não serão equivalentes sem um mecanismo seguro próprio. |
| UPDATE/INSERT de orders por RPCs específicas | Reivindicação por usuários comuns, alteração de conteúdo e transições arbitrárias | Os fluxos atuais de INSERT/UPDATE direto no cliente deixam de funcionar até serem substituídos; validações precisam cobrir cada ação legítima. |
| Log de revisões administrativas de pedidos | Perda do registro original e correções sem rastreabilidade | Exige interface/consulta para visualizar histórico e política de retenção definida. |
| Campos administrativos de candidatura protegidos; decisão via RPC | Autopromoção de candidatura e edição de metadados decisórios | Candidatos não poderão ajustar candidaturas aprovadas/reprovadas diretamente; será necessário definir o fluxo de reapresentação. |
| Events append-only criados por operações confiáveis | Falsificação de autor, aprovação e análise no histórico | O envio atual da candidatura terá de registrar evento por RPC ou mecanismo de banco autorizado. |
| Políticas de bloqueio/suspensão por ação | Contas sinalizadas continuando a pedir, aceitar ou alterar dados | Pode interromper pedidos ativos; sem definição da semântica de suspensão, uma policy única pode restringir usuários além do esperado. |

Esta etapa foi somente leitura: não alterei arquivos, não executei scripts/testes do projeto e não consultei nem alterei o banco remoto.
