# Despesas / receitas

Postgres + API em Node (Express/Prisma) e front em React com Vite. Tem login e lista de lançamentos.

**Rodar:** precisa de PostgreSQL e Node. No `backend`, copia `.env.example` pra `.env`, preenche `DATABASE_URL` e `JWT_SECRET`, depois `npm i`, `npx prisma migrate deploy`, `npx prisma generate`, `npm run prisma:seed`, `npm run dev` (porta 3001). No `frontend`: `npm i` e `npm run dev` (5173).

Login de teste do seed: **augusto** / **augusto123**.
