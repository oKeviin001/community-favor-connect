# Pede pro Kevin

Plataforma digital de conexão entre pessoas que precisam de serviços e colaboradores locais com habilidades e disponibilidade.

## Modelo da plataforma

O Pede pro Kevin organiza a descoberta de profissionais, pedidos, propostas, comunicação e acompanhamento. A contratação e a negociação acontecem diretamente entre cliente e colaborador.

- O cliente contrata diretamente o colaborador.
- O pagamento é feito diretamente ao colaborador.
- O colaborador recebe 100% do valor combinado.
- A plataforma não recebe, retém, custodia ou repassa valores dos serviços.
- Não existe carteira, saldo ou fluxo de pagamento integrado.
- A plataforma não garante contratação, pagamento, execução ou renda.
- A plataforma continua responsável pelas obrigações próprias do serviço digital, segurança e tratamento de dados.

O produto não deve reintroduzir Stripe, split, escrow, retenção, liberação ou reembolso de valores de serviços. A tabela legada `payments`, se ainda existir no banco, não representa uma funcionalidade financeira ativa e deve permanecer sem escrita por usuários autenticados até sua remoção segura após auditoria de dependências.

## Serviços e público

A proposta abrange compras de mercado e farmácia, retiradas e entregas, documentos, pequenos favores e, progressivamente, serviços locais como reparos, limpeza, cuidados com animais, informática e aulas. O início é local e gradual, com foco em confiança, acessibilidade e validação real.

## Regras essenciais

- Cadastro de colaboradores sujeito à avaliação administrativa; aprovação por especialidade.
- Documentos pessoais em armazenamento privado, acesso mínimo e auditável.
- Aceite expresso e versionado de Termos de Uso e Política de Privacidade.
- Propostas preservadas no histórico; seleção de um único colaborador de forma atômica.
- Ocorrências com evidências, contraditório e medidas proporcionais.
- Comprovantes não são prova absoluta; análises automatizadas devem admitir resultado inconclusivo e revisão humana.
- Confirmação de pagamento e conclusão pelas partes, sem a plataforma movimentar dinheiro.
- Localização compartilhada para finalidade definida; sem rastreamento permanente injustificado.

A especificação detalhada está em [docs/DIRETRIZES_FUNCIONAMENTO_SEGURANCA_RESPONSABILIDADE.md](docs/DIRETRIZES_FUNCIONAMENTO_SEGURANCA_RESPONSABILIDADE.md).

## Fase de operação

A fase piloto é gratuita. Uma possível fase comercial poderá oferecer primeiro mês gratuito e mensalidade estimada de R$ 10 por colaborador, ainda sujeita a validação e decisão antes de implementação. A mensalidade remunera acesso e ferramentas, não garante pedidos ou renda.

## Stack e desenvolvimento

Aplicação web mobile-first com React, TanStack Start/Router, TypeScript, Vite e Supabase.

```sh
npm install
npm run dev
```

Verificações:

```sh
npm run typecheck
npm run lint
npm run build
```

Configure as variáveis localmente a partir de `.env.example`. Nunca versione `.env`, tokens, senhas ou chaves administrativas. A chave Supabase service-role deve existir somente no servidor e nunca no frontend.

## Segurança e implantação

Migrações SQL versionadas em `supabase/migrations` descrevem alterações desejadas; sua presença no GitHub não prova que foram aplicadas no projeto Supabase conectado. Antes de aplicar migrações em produção, comparar o histórico real, revisar RLS, buckets, permissões e backups. Não executar migrações destrutivas sem revisão e cópia de segurança.

O repositório contém funcionalidades em diferentes estágios. Código presente não significa que o fluxo foi validado em produção. Use testes automatizados e testes manuais com contas separadas antes de disponibilizar publicamente.


## Sistema Kevin v2

O núcleo compartilhado do protocolo v2 está em `src/lib/kevin-system/`. A aba **Sistema Kevin** foi adicionada ao Modo Deus. O protocolo v1 continua preservado em `/transferencia` durante a migração. O contrato e o schema proposto estão em `docs/sistema-kevin/`; o schema é um draft e ainda precisa ser aplicado/revisado no Supabase antes de ativar sincronização.
