# Roadmap

## Sistema Kevin — conclusão solicitada
- [ ] Corrigir erros de compilação das rotas V2
- [ ] Exibir identidade, conexões e dependências reais no Modo Deus
- [ ] Conectar controles administrativos de diagnóstico, consulta de comandos e arquivos ao V2 existente
- [ ] Testar contrato criptográfico e acesso real ao painel
- [ ] Ativar armazenamento privado de arquivos e reconciliar migrations pendentes
- [ ] Verificar código e banco reais da Central (bloqueado: projeto inacessível nesta conta)
- [ ] Coordenar assinatura com ID de conexão nos dois aplicativos
- [ ] Implementar comandos administrativos idempotentes e snapshots versionados após verificar a Central
- [ ] Validar comunicação bilateral e publicação autorizada

## Correção de segurança — controle de notificações (somente código)
- [ ] Reconciliar as propostas conflitantes em uma migration canônica Drizzle, sem aplicá-la
- [ ] Preservar leitura autenticada e restringir escrita a administradores reais
- [ ] Reconhecer a identidade master pelo e-mail servidor de `auth.users`, mantendo `user_roles`
- [ ] Preparar testes SQL de acesso e regressão das notificações
- [ ] Executar somente análise estática, typecheck e testes que não escrevam no banco

## Conclusão funcional — colaboradores e grupos
- [ ] Envio obrigatório do print do WhatsApp e conclusão do pedido
- [ ] Cliente compara propostas e escolhe um colaborador
- [ ] Colaborador envia proposta completa e gerencia candidaturas
- [ ] Novo pedido usa todos os grupos ativos
- [ ] Cadastro de colaborador inclui grupos e qualificações
- [ ] Modo Deus gerencia grupos, inscrições e membros
- [ ] Terminologia “Colaborador” aplicada às telas
- [ ] Verificação de código e fluxos principais no preview

## Depois, sem misturar com esta entrega
- [ ] Renovação visual global aprovada
- [ ] Distância e mapas
- [ ] Verificação dos prints por IA
