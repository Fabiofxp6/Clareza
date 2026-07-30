# Clareza — Controle Financeiro Pessoal

Aplicação pessoal para acompanhar receitas, despesas, contas, cartões, orçamentos, metas, dívidas e patrimônio. Foi projetada para substituir uma planilha financeira com segurança, relatórios e backup portátil.

## Tecnologias

Next.js 16 com App Router, React 19, TypeScript, Tailwind CSS 4, componentes shadcn/ui, Lucide, Recharts, React Hook Form, Zod, Drizzle ORM, PostgreSQL Neon, date-fns e Argon2id.

## Pré-requisitos

- Node.js 20.9 ou superior.
- npm 10 ou superior.
- Projeto PostgreSQL no Neon.
- Conta pessoal na Vercel para o deploy.

## Instalação local

```bash
npm install
cp .env.example .env.local
```

Preencha `.env.local`:

```dotenv
DATABASE_URL=postgresql://usuario:senha@endpoint-pooler.regiao.aws.neon.tech/neondb?sslmode=require
AUTH_SECRET=uma-chave-aleatoria-longa-com-pelo-menos-32-bytes
INITIAL_USER_NAME=Seu nome
INITIAL_USER_EMAIL=voce@exemplo.com
INITIAL_USER_PASSWORD=uma-senha-inicial-forte
APP_TIMEZONE=America/Maceio
DEMO_SEED=false
```

Nunca publique `.env.local`. Use preferencialmente a conexão pooled disponibilizada pelo Neon.

## Banco e primeiro usuário

Gere e aplique migrations:

```bash
npm run db:generate
npm run db:migrate
```

Crie o único usuário:

```bash
npm run user:init
```

O comando recusa novos usuários se o banco já possuir um registro. Para instalar categorias e formas de pagamento:

```bash
npm run db:seed
```

Para incluir dados fictícios, defina temporariamente `DEMO_SEED=true`. O seed nunca é executado automaticamente.

## Execução

```bash
npm run dev
```

Acesse `http://localhost:3000`. Para validar a versão de produção:

```bash
npm test
npm run build
npm start
```

## Deploy na Vercel

1. Envie o repositório para uma conta Git pessoal.
2. Importe o projeto na Vercel.
3. Cadastre `DATABASE_URL`, `AUTH_SECRET` e `APP_TIMEZONE` em todas as ambientes necessárias.
4. Execute `npm run db:migrate` localmente contra o banco de produção antes do primeiro acesso.
5. Faça o deploy. Não configure cron jobs nem serviços adicionais.

O projeto usa funções padrão do Next.js e conexão HTTP serverless, adequado a uso pessoal no plano Hobby.

## Backup e restauração

A página **Backup** exporta um JSON versionado. Ela exclui senha, hash, cookies, sessões, tokens e segredos. Na restauração:

- **Substituir** recria todos os dados financeiros dentro de uma transação.
- **Mesclar** adiciona registros por UUID e preserva registros existentes em conflitos.
- O usuário e o e-mail de login atuais não são trocados.
- A senha atual é obrigatória.

Guarde os arquivos em mídia privada e faça um backup antes de atualizações importantes.

## Senha e manutenção

A senha pode ser alterada em Configurações. Sem acesso à interface, use:

```bash
npm run user:reset-password
```

O comando solicita a nova senha de forma interativa e revoga as sessões. Para reconstruir saldos materializados a partir do livro financeiro:

```bash
npm run db:reconcile
```

Ao atualizar o sistema:

1. Exporte um backup.
2. Atualize o código e rode `npm install`.
3. Revise e execute `npm run db:generate` quando o schema mudar.
4. Aplique `npm run db:migrate`.
5. Rode testes e build antes do deploy.

## Segurança

- Não exponha `DATABASE_URL` ou `AUTH_SECRET` ao navegador.
- Use uma senha exclusiva com pelo menos 12 caracteres.
- Mantenha Next.js, React, Drizzle e dependências de segurança atualizados.
- Nunca edite saldos diretamente no banco; use os lançamentos ou a reconciliação.
- Server Actions e rotas privadas revalidam a sessão e o usuário proprietário.
- Ações críticas exigem novamente a senha atual.

## Solução de problemas

- **DATABASE_URL não configurada:** confira `.env.local` e reinicie o servidor.
- **Erro de conexão:** copie novamente a URL pooled no painel do Neon e mantenha `sslmode=require`.
- **Usuário já existe:** use o login ou `npm run user:reset-password`; não execute `user:init` novamente.
- **Dados sem categorias:** execute `npm run db:seed`.
- **Saldo divergente:** faça backup e execute `npm run db:reconcile`.
- **Migration pendente:** execute `npm run db:migrate` com a URL do ambiente correto.
