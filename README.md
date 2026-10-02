# Pede pro Kevin

PEDE PRO KEVIN — ESPECIFICAÇÃO COMPLETA DO APLICATIVO

VISÃO GERAL

O Pede pro Kevin é uma plataforma de entregas comunitárias e favores locais criada para atender regiões onde aplicativos tradicionais possuem baixa cobertura ou não atendem adequadamente as necessidades da população.

O foco principal são:

Idosos.

Pessoas com deficiência (PCD).

Pessoas sem transporte próprio.

Pessoas com mobilidade reduzida.

Moradores de bairros com pouca oferta de delivery.

Pessoas que precisam de ajuda com pequenas tarefas do dia a dia.

Diferente do iFood, o aplicativo não depende de lojas cadastradas nem de cardápios.

O cliente simplesmente informa o que precisa e um entregador local realiza a tarefa.

Exemplos:

Comprar itens de mercado.

Comprar remédios.

Buscar encomendas.

Comprar algo em uma loja específica.

Levar documentos.

Retirar produtos.

Pequenos favores locais.

Serviços de conveniência.

O diferencial do aplicativo é o sistema de pagamento protegido.

O cliente paga antecipadamente.

O dinheiro fica retido pela plataforma.

O entregador somente recebe após a entrega ser concluída e confirmada.

Isso protege os dois lados.

OBJETIVOS DO PROJETO

Para o cliente

Conseguir qualquer produto ou favor local.

Ter segurança financeira.

Acompanhar o pedido em tempo real.

Conversar diretamente com o entregador.

Não depender de lojas cadastradas.

Para o entregador

Encontrar oportunidades de entrega na própria região.

Receber pagamentos garantidos.

Construir reputação.

Trabalhar de forma independente.

Para a plataforma

Intermediar pedidos.

Garantir segurança.

Resolver disputas.

Monetizar através de taxa de serviço.

CONCEITO CENTRAL

O aplicativo funciona como um intermediário de confiança.

O cliente deposita:

Valor do produto.

Valor do frete.

Taxa de serviço.

Esse valor fica protegido.

Fluxo:

Cliente → Plataforma → Entregador

O dinheiro não vai diretamente para o entregador.

O cliente também não pode cancelar após o entregador iniciar a compra.

TIPOS DE PEDIDOS

Mercado

Exemplos:

Arroz.

Feijão.

Leite.

Carnes.

Hortifruti.

Produtos de limpeza.

Farmácia

Exemplos:

Medicamentos permitidos.

Higiene pessoal.

Curativos.

Produtos infantis.

Padaria

Exemplos:

Pães.

Frios.

Café.

Bolos.

Lojas Locais

Exemplos:

Papelaria.

Material de construção.

Loja de ração.

Loja de variedades.

Loja de roupas.

Retirada

Exemplos:

Encomendas.

Documentos.

Produtos já comprados.

Favor

Exemplos:

Buscar uma chave.

Entregar um documento.

Comprar um carregador.

Resolver uma pequena tarefa.

Pedido Livre

O cliente descreve exatamente o que deseja.

Exemplo:

"Preciso que alguém compre um cabo HDMI e entregue no meu endereço."

STACK TECNOLÓGICA

Frontend

Mobile First.

Aplicativo Android e iOS.

Interface otimizada para celulares.

Botões grandes.

Navegação simples.

Foco em acessibilidade.

Backend

Lovable Cloud

Responsável por:

Banco de dados.

Autenticação.

APIs.

Regras de acesso.

Realtime.

Armazenamento.

Autenticação

Métodos:

Email e senha.

Google Login.

Perfis separados:

Cliente.

Entregador.

Pagamentos

Stripe.

Responsável por:

Recebimento.

Custódia do dinheiro.

Liberação de pagamentos.

Reembolsos.

Histórico financeiro.

DESIGN SYSTEM

Conceito Visual

Visual amigável e comunitário.

Inspirado em:

Comércio de bairro.

Proximidade.

Confiança.

Simplicidade.

Diretrizes

Mobile First.

Cores quentes.

Alto contraste.

Letras grandes.

Ícones claros.

Interface amigável para idosos.

Padronização

Todas as cores, fontes e espaçamentos ficam centralizados no:

styles.css

Nenhum componente possui cores fixas.

Tudo utiliza o Design System.

ESTRUTURA DO BANCO DE DADOS

profiles

Representa usuários.

Campos:

id

nome

telefone

avatar

tipo

nota_media

criado_em

Tipo:

cliente

entregador

orders

Representa pedidos.

Campos:

id

cliente_id

entregador_id

descricao

loja

endereco_loja

endereco_entrega

valor_produto

valor_frete

taxa_servico

total

status

criado_em

messages

Mensagens do chat.

Campos:

id

order_id

sender_id

texto

criado_em

Realtime ativo.

reviews

Avaliações.

Campos:

id

order_id

reviewer_id

reviewee_id

nota

comentario

payments

Controle financeiro.

Campos:

id

order_id

valor

status

ref_stripe

Status:

depositado

liberado

reembolsado

cancelado

REGRAS DE SEGURANÇA (RLS)

Cliente

Pode acessar apenas:

Seu perfil.

Seus pedidos.

Suas mensagens.

Suas avaliações.

Entregador

Pode acessar:

Perfil próprio.

Pedidos disponíveis.

Pedidos aceitos.

Mensagens relacionadas.

Chat

Somente:

Cliente do pedido.

Entregador do pedido.

Avaliações

Somente após:

Status = Entregue

STATUS DOS PEDIDOS

Criado

Aguardando Entregador

Aceito

Em Compra

Compra Finalizada

Em Entrega

Entregue

Confirmado

Cancelado

Em Disputa

FLUXO DO CLIENTE

Cadastro

Nome.

Telefone.

Email.

Senha.

Criar Pedido

Campos:

Descrição.

Loja.

Endereço da loja.

Valor estimado.

Endereço de entrega.

Observações.

Pagamento

Cliente deposita:

Valor do produto + Valor do frete + Taxa da plataforma

Acompanhamento

Visualiza:

Status.

Entregador.

Chat.

Atualizações.

Recebimento

Cliente recebe os produtos.

Confirma a entrega.

Avaliação

Avalia:

Educação.

Rapidez.

Confiabilidade.

Nota:

1 a 5 estrelas.

Histórico

Lista completa de pedidos anteriores.

FLUXO DO ENTREGADOR

Cadastro

Nome.

CPF.

RG.

Selfie.

Comprovante de residência.

Chave Pix.

Aprovação manual.

Pedidos Disponíveis

Feed com:

Distância.

Valor.

Descrição.

Endereço.

Aceitar Pedido

Ao aceitar:

Pedido sai do feed.

Chat é liberado.

Compra

Entregador:

Vai ao local.

Compra os itens.

Envia comprovantes.

Status:

Em Compra.

Compra Finalizada

Envia:

Nota fiscal.

Foto dos produtos.

Entrega

Vai ao endereço do cliente.

Status:

Em Entrega.

Entregue

Marca como entregue.

Aguarda confirmação do cliente.

Recebimento

Pagamento é liberado.

Saldo atualizado.

CHAT EM TEMPO REAL

Funcionalidades:

Texto.

Fotos.

Áudios.

Compartilhamento de localização.

Tecnologia:

Realtime.

Objetivo:

Permitir alinhamento durante toda a compra.

COMPROVANTES

O entregador pode enviar:

Nota fiscal.

Fotos.

Recibos.

Tudo fica registrado.

GEOLOCALIZAÇÃO

Cliente acompanha:

Aceito.

Indo à loja.

Comprando.

Em rota.

Entregue.

Mapa em tempo real.

SISTEMA DE REPUTAÇÃO

Cada usuário possui:

Nota média.

Quantidade de entregas.

Histórico.

Quanto maior a reputação:

Mais visibilidade.

Mais confiança.

SISTEMA DE DISPUTAS

Se houver problema:

Pedido muda para:

Em Disputa

Administrador analisa:

Chat.

GPS.

Fotos.

Comprovantes.

Histórico.

Decisão possível:

Liberar pagamento.

Reembolsar cliente.

Reembolso parcial.

FLUXO FINANCEIRO

Exemplo

Valor dos produtos:

R$ 100,00

Frete:

R$ 15,00

Taxa da plataforma:

R$ 5,00

Total pago:

R$ 120,00

Fluxo:

Cliente paga → Stripe retém

↓

Entregador compra e entrega

↓

Cliente confirma

↓

Stripe libera

R$ 115,00 para o entregador

R$ 5,00 para a plataforma

PROTEÇÃO CONTRA GOLPES

Cliente

Não pode simplesmente receber e não pagar.

O valor já está depositado.

Entregador

Não recebe antes da entrega.

Plataforma

Possui provas registradas:

Chat.

GPS.

Fotos.

Comprovantes.

Histórico.

PAINEL ADMINISTRATIVO

Funções:

Aprovar entregadores.

Suspender contas.

Resolver disputas.

Gerenciar pagamentos.

Visualizar métricas.

Ver pedidos em andamento.

DASHBOARD

Indicadores:

Pedidos por dia.

Pedidos concluídos.

Entregadores ativos.

Faturamento.

Taxas arrecadadas.

Avaliação média.

ROADMAP DE CONSTRUÇÃO

Fase 1

Design System

Layout base.

Navegação.

Estrutura Mobile First.

Fase 2

Banco de Dados

Migração completa.

RLS.

Perfis.

Fase 3

Autenticação

Email.

Senha.

Google.

Fase 4

Fluxo do Cliente

Criar pedido.

Depositar valor.

Acompanhar.

Confirmar.

Avaliar.

Fase 5

Fluxo do Entregador

Feed.

Aceitar pedido.

Atualizar status.

Receber.

Fase 6

Chat Realtime

Conversas em tempo real.

Fotos.

Localização.

Fase 7

Pagamentos Stripe

Custódia.

Liberação automática.

Reembolsos.

Fase 8

Geolocalização

Rastreamento.

Mapa.

Fase 9

Disputas

Moderação.

Histórico.

Auditoria.

DIFERENCIAL COMPETITIVO

Enquanto aplicativos tradicionais dependem de restaurantes e lojas cadastradas, o Pede pro Kevin permite que qualquer pessoa peça praticamente qualquer item ou favor local de forma segura.

O aplicativo funciona como um "vizinho de confiança digital", conectando moradores e entregadores da própria comunidade através de um sistema protegido de pagamento, comunicação e entrega.

O objetivo não é apenas entregar produtos.

O objetivo é conectar pessoas que precisam de ajuda com pessoas dispostas a ajudar, de forma segura, organizada e escalável.

## Projeto independente

Este repositório é a base do aplicativo independente **Pede pro Kevin**. O objetivo é manter aqui o código da aplicação e conectá-lo ao seu próprio projeto Supabase, sem depender do ambiente de execução do Lovable.

O projeto pode continuar sendo desenvolvido localmente e implantado em uma infraestrutura escolhida por você. O Lovable pode permanecer apenas como ferramenta de desenvolvimento enquanto a migração estiver sendo concluída.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
