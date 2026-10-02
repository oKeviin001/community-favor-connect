# Plano: renovação visual global do Pede pro Kevin

## Direção visual

Evoluir o visual atual “Clean Neighborhood” para uma linguagem de produto mais refinada: superfícies leves, contraste claro, tipografia mais consistente, espaçamento previsível e movimento discreto. A identidade, as cores semânticas e o caráter comunitário serão preservados.

## Implementação

1. **Fundação global**
   - Refinar tokens de cor, borda, raio, sombra, foco, tipografia e duração de movimento.
   - Criar padrões reutilizáveis para superfícies, botões, campos, itens clicáveis, listas, abas, estados e carregamento.
   - Adicionar transição de entrada das páginas e comportamento global de toque/clique.
   - Respeitar `prefers-reduced-motion` e manter foco visível por teclado.

2. **Componentes compartilhados**
   - Atualizar botões, campos, cards, abas, seletores, diálogos e notificações para usar os mesmos estados visuais.
   - Refinar cabeçalhos, indicadores de etapa, estados vazios, badges e skeletons do kit compartilhado.
   - Padronizar as barras inferiores de cliente e entregador, incluindo área ativa, toque e safe area mobile.

3. **Aplicação nas telas existentes**
   - Aplicar a nova linguagem às telas principais: login/cadastro, início, pedidos, entregador, perfil, novo pedido e detalhes.
   - Uniformizar também a Central Administrativa sem alterar nenhuma ação, permissão ou comportamento.
   - Remover inconsistências visuais locais que impedem os padrões globais de aparecerem corretamente.

4. **Validação**
   - Verificar desktop e mobile no preview, incluindo navegação, formulários, listas e painéis.
   - Rodar as verificações disponíveis e corrigir apenas regressões causadas pela renovação.
   - Conferir metadados das rotas e o estado final do preview.

## Limites

- Nenhuma mudança em banco, autenticação, permissões, regras, fluxos ou integrações.
- Nenhuma funcionalidade nova.
- Animações curtas e elegantes, sem bounce, neon, excesso de gradiente ou sombras pesadas.

## Nota técnica

A maior parte do resultado virá da camada global e dos componentes-base, reduzindo alterações repetidas. Onde telas usam controles HTML próprios, serão aplicadas classes reutilizáveis para manter a mesma experiência sem tocar na lógica.
