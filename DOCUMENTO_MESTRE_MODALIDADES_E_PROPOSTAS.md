# Documento-mestre — Modalidades, grupos e propostas

Projeto: Pede pro Kevin  
Branch de trabalho: feat/servicos-por-categoria  
Status: especificação de implementação para revisão técnica do Amável.  
Regra: não alterar nem remover o acesso total das contas administradoras já testadas; preservar fluxos atuais que funcionam e investigar problemas concretos antes de mudar comportamento.

## Objetivo

Evoluir a área hoje chamada “entregador” para uma área de participantes/prestadores por categoria. A plataforma conecta quem publica uma demanda a participantes aprovados na modalidade correspondente. As categorias funcionam como filas de oportunidades, não como grupos de conversa.

## Vocabulário provisório

- “Participante” ou “prestador”: pessoa aprovada para uma ou mais modalidades.
- “Grupo”: categoria de demandas dentro do aplicativo; não tem chat.
- “Demanda”: pedido de cliente encaminhado à categoria.
- “Candidatura”: manifestação de interesse de um participante numa demanda.
- “Proposta”: valor ou condição comercial apresentada pelo participante.
- Nome público final da área de participantes ainda pode ser ajustado, evitando “funcionário” e evitando limitar a plataforma a “entregadores”.

## Categorias iniciais

1. Entregas e deslocamentos.
2. Compras e tarefas (mercado, farmácia e pequenas necessidades).
3. Serviços domésticos (montagem, instalações e pequenos reparos).
4. Outros favores (sujeito às regras e à análise administrativa).

As categorias devem ser configuráveis e extensíveis, sem precisar reconstruir o fluxo para adicionar uma modalidade. Atividades que exigem habilitação específica devem exigir comprovação apropriada antes da aprovação.

## Cadastro e inscrição

- O cadastro de conta continua sendo o fluxo geral atual.
- No início, a pessoa pode indicar que deseja pedir serviços, prestar serviços ou ambos, mas essa escolha não deve conceder aprovação automaticamente.
- A inscrição de prestador permite selecionar uma ou mais categorias.
- Para cada categoria, registrar motivo do interesse, experiência, habilidades, região e disponibilidade, além de anexos/comprovantes quando exigidos.
- A aprovação é independente por categoria. Aprovação em entregas não libera automaticamente montagem, instalações ou reparos.
- Uma pessoa já aprovada pode pedir para adicionar ou trocar modalidade. Isso cria uma nova solicitação de análise; não altera permissões até aprovação administrativa.
- A tela de “Minhas solicitações” mostra categoria, data e estado (em análise, aprovada ou recusada), com justificativa administrativa quando houver.
- Não exigir diploma indiscriminadamente: definir requisitos de acordo com a natureza da atividade.

## Área do participante: “Meus grupos”

- Aparência inspirada numa lista de conversas, sem conversas nem mensagens.
- Mostrar apenas categorias em que o participante foi aprovado e habilitado.
- Cada cartão mostra ícone/ilustração, nome, descrição curta e contagem de novas demandas.
- Ao abrir um grupo, listar demandas da categoria.
- Não expor endereço completo, telefone ou dados privados do cliente para todos os candidatos. Mostrar região aproximada e os detalhes necessários para avaliar a oportunidade.
- A navegação deve funcionar em celular e desktop, mantendo componentes e padrões visuais existentes.

## Área “Outros grupos”

- Listar todas as categorias disponíveis, inclusive as não habilitadas para o participante.
- Cada cartão inclui nome, imagem/ícone, descrição, exemplos de serviços, requisitos e botão “Solicitar entrada”.
- Categorias não aprovadas ficam bloqueadas para consulta de demandas, mas suas descrições e requisitos podem ser vistos.
- O estado do cartão muda para “Em análise”, “Aprovado” ou “Não aprovado” quando existir solicitação.

## Formulário de categoria

Campos base:
- Categoria pretendida.
- Motivo para entrar.
- Experiência e tempo de experiência.
- Habilidades específicas.
- Região de atendimento.
- Disponibilidade.
- Comprovantes, certificações ou habilitações quando relevantes.
- Campo complementar opcional.

Campos devem variar por categoria. O formulário precisa indicar quais são obrigatórios e por quê. O envio confirma que a solicitação será revisada; não habilita a categoria imediatamente.

## Demandas e candidaturas

- O cliente cria a demanda e seleciona o tipo de necessidade/categoria.
- A demanda é encaminhada apenas para participantes aprovados naquela categoria.
- Participantes elegíveis podem se candidatar.
- O cliente recebe uma lista de propostas/candidatos e pode comparar perfil, experiência, região/distância aproximada e preço/condições.
- O cliente não precisa aceitar a primeira proposta. Novas propostas podem chegar enquanto a demanda continuar aberta.
- Após selecionar um participante, a demanda passa para o fluxo atual de contato e execução, com comunicação pelo WhatsApp conforme o comportamento já previsto.
- Encerrar ou marcar as demais candidaturas como não selecionadas após a escolha, preservando histórico. Não apagar candidaturas silenciosamente.
- Estados sugeridos: aberta/recebendo propostas, prestador selecionado, em andamento, concluída, cancelada. Mapear com cuidado para os estados existentes antes de qualquer migração.

## Tela do cliente: “Propostas de prestadores”

- Esta tela aparece depois que o cliente publica a demanda, semelhante à etapa “loja preparando” do iFood, mas intitulada “Propostas de prestadores”.
- Aviso visível: “Novas propostas podem chegar. Você não precisa aceitar a primeira; compare as opções antes de decidir.”
- Mostrar cada proposta em cartão com nome/foto, resumo profissional, categorias aprovadas relevantes, distância aproximada, preço proposto e botão para ver perfil.
- Cliente pode abrir perfil completo e escolher uma proposta.
- A escolha precisa de confirmação explícita.
- Ao confirmar, mostrar próximos passos e disponibilizar contato conforme regras existentes.
- Não exibir dados pessoais completos a candidatos não selecionados.

## Política de preços de entregas

- Mostrar uma estimativa do custo de deslocamento calculada pelo aplicativo.
- O participante pode propor seu próprio valor ou escolher “A combinar”.
- O cartão apresenta o valor proposto e a diferença em relação à estimativa: “R$ X acima”, “R$ X abaixo” ou “igual à estimativa”.
- A estimativa é uma referência transparente, não um limite obrigatório nem uma promessa de preço garantido.
- Antes da confirmação/execução, cliente e participante precisam concordar com o valor final.
- “A combinar” significa que o valor ainda será negociado, não que o serviço seja gratuito.
- A fórmula de estimativa (distância, tarifa-base e fatores adicionais) deve ser definida e explicada antes de ativar o cálculo real. Não inventar distância ou preço quando não houver dados suficientes.
- Para serviços não padronizados, o prestador pode usar “A combinar”, solicitar fotos ou avaliar o local antes de fornecer orçamento final.

## Perfil profissional

- Nome/apresentação, foto quando disponível, modalidades aprovadas, experiência, habilidades, região aproximada e dados relevantes à demanda.
- Exibir comprovantes somente de forma apropriada; não expor documentos sensíveis publicamente.
- Não inventar avaliações, métricas ou selos se não houver dados reais.

## Administração

- Preservar o funcionamento e os privilégios das contas administradoras já testadas; não alterar permissões de administrador como parte cosmética desta mudança.
- Adicionar fila administrativa para inscrições por categoria, incluindo categoria, respostas, documentos, decisão, motivo e histórico.
- Aprovar/recusar cada categoria de forma independente.
- As ações administrativas continuam auditadas e autorizadas pelo mecanismo atual, sem introduzir atalhos client-side.
- Bloqueios e suspensões devem continuar respeitados pelas operações da plataforma.
- Preservar histórico de demandas e candidaturas.

## Dados e integração técnica

Antes de conectar novas telas ao Supabase, revisar as tabelas e funções atuais (profiles, courier_applications, orders, order_events, candidaturas existentes e funções de listagem/aceite). Evitar duplicar dados ou quebrar o fluxo de entregas atual.
- Propor um modelo de categorias e inscrições por categoria que permita múltiplas categorias por usuário.
- Toda autorização deve ser validada no banco/RLS ou em funções server-side, não apenas ocultando botões na interface.
- A candidatura/proposta deve estar ligada a uma demanda e a um participante; preço pode ser numérico ou “a combinar”.
- A estimativa de deslocamento deve ser separada do valor proposto pelo participante.
- Não ativar recursos que dependam de APIs pagas sem autorização; manter solução gratuita quando possível.
- Qualquer migração deve ser aditiva, revisada e acompanhada de política RLS e testes; não apagar nem reescrever dados de produção sem validação.

## Critérios de aceitação

1. Conta comum não ganha acesso a uma categoria por escolher no cadastro.
2. Participante aprovado em uma categoria não acessa demandas de outra categoria sem aprovação.
3. Solicitar nova categoria gera novo pedido administrativo e não muda a autorização atual.
4. Cliente consegue publicar demanda e ver múltiplas propostas, inclusive propostas posteriores.
5. Entrega exibe estimativa, valor proposto, diferença e “A combinar”.
6. Serviços permitem “A combinar” e orçamento após análise de fotos/visita.
7. Cliente pode escolher explicitamente um prestador; outras candidaturas são encerradas sem perder histórico.
8. Dados privados de clientes ficam protegidos antes da seleção.
9. O pedido original do cliente não pode ser editado por ele após publicação; alterações necessárias são combinadas pelo WhatsApp, mantendo o fluxo administrativo já existente.
10. Não quebrar o fluxo atual de pedidos, WhatsApp, contas administradoras, notificações ou telas existentes.
11. Validar lint, typecheck, build, responsividade móvel e desktop.
12. Confirmar o estado real do Supabase antes de declarar as funções de backend prontas.

## Plano de implementação

1. Fazer as mudanças em branch isolada.
2. Rever modelo de dados e regras existentes antes de criar migrações.
3. Construir telas e componentes por etapas: categorias/inscrições, grupos, candidaturas, propostas e administração.
4. Conectar telas ao Supabase com autorização segura e dados reais.
5. Testar casos de cliente, participante pendente, participante aprovado em uma categoria, participante com múltiplas categorias e administrador.
6. Fazer revisão final no Amável somente após o conjunto estar preparado, sem consumir créditos antes da autorização do usuário.
7. Não mesclar em main nem publicar até revisar build e fluxos críticos.
