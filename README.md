# Registro de Despesas e Receitas (protótipo)

Aplicação de exemplo com **PostgreSQL**, backend **Node.js + Express + TypeScript + Prisma** e frontend **React (Vite) + TypeScript + Tailwind CSS**.

## Pré-requisitos

- [Node.js](https://nodejs.org/) (LTS recomendado)
- [PostgreSQL](https://www.postgresql.org/) em execução localmente (ou acessível pela rede)
- Um **banco de dados vazio** criado no PostgreSQL (ex.: `createdb despesas_receitas` ou via cliente gráfico)

## 1. Configurar o backend e o banco

```bash
cd backend
npm install
```

Crie o arquivo `.env` a partir do exemplo e ajuste usuário, senha, host, porta e nome do banco:

```bash
cp .env.example .env
```

Edite `.env` e defina `DATABASE_URL`, por exemplo:

```env
DATABASE_URL="postgresql://USUARIO:SENHA@localhost:5432/NOME_DO_BANCO?schema=public"
```

### Aplicar migrations (criar tabelas)

Na pasta `backend`:

```bash
npx prisma migrate deploy
npx prisma generate
```

Em desenvolvimento, se preferir criar/ajustar migrations interativamente:

```bash
npx prisma migrate dev
```

(O comando acima aplica as migrations em `prisma/migrations/` e regenera o client quando necessário.)

### Popular o banco (seed)

O arquivo [`backend/prisma/seed.sql`](backend/prisma/seed.sql) insere um usuário administrador e dez lançamentos de exemplo.

**Opção A — com Prisma (recomendado, não exige `psql` no PATH):**

```bash
cd backend
npm run prisma:seed
```

**Opção B — com `psql`:**

```bash
cd backend
psql "$DATABASE_URL" -f prisma/seed.sql
```

> **Aviso:** o seed grava a senha do usuário `admin` em texto (`admin123`). Use apenas em ambiente local de desenvolvimento.

### Iniciar a API

Na pasta `backend`:

```bash
npm run dev
```

A API fica em **http://localhost:3001**. O endpoint de listagem é **GET** `http://localhost:3001/api/lancamentos`.

## 2. Configurar e iniciar o frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

O Vite costuma abrir em **http://localhost:5173**. O `vite.config.ts` faz **proxy** de `/api` para `http://localhost:3001`, então a interface chama `GET /api/lancamentos` sem problemas de CORS no desenvolvimento.

## Resumo rápido

| Etapa        | Comando / URL                          |
| ------------ | -------------------------------------- |
| Migrations   | `cd backend && npx prisma migrate deploy` |
| Gerar client | `cd backend && npx prisma generate`    |
| Seed         | `cd backend && npm run prisma:seed`    |
| Backend      | `cd backend && npm run dev` → porta **3001** |
| Frontend     | `cd frontend && npm run dev` → porta **5173** |

## Estrutura do projeto

- [`backend/`](backend/) — API Express, Prisma e `schema.prisma` / `seed.sql`
- [`frontend/`](frontend/) — SPA React com Vite e Tailwind
