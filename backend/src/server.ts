import "dotenv/config";
import bcrypt from "bcrypt";
import cors from "cors";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import { prisma } from "./lib/prisma.js";
import { requireAuth } from "./middleware/auth.js";
import { sendNotification } from "./services/emailService.js";
import { streamLancamentosPDF } from "./services/pdfService.js";

export const app = express();
const PORT = Number(process.env.PORT) || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// DEMO: descomente a linha abaixo para disparar erro no Quality Assurance (ESLint no-unused-vars)
const variavelDemoQA = "quebra o lint";


app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  })
);
app.use(express.json());

// ── Auth ─────────────────────────────────────────────────────────────────────

app.post("/api/login", async (req, res) => {
  try {
    const { login, senha } = req.body as { login?: string; senha?: string };
    if (!login || !senha) {
      return res.status(400).json({ error: "Login e senha são obrigatórios" });
    }
    const user = await prisma.usuario.findUnique({ where: { login } });
    if (!user || user.situacao !== "Ativo") {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }
    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "JWT_SECRET não configurado" });
    }
    const token = jwt.sign({ sub: user.id, login: user.login }, secret, { expiresIn: "24h" });
    res.json({
      token,
      usuario: { id: user.id, nome: user.nome, login: user.login },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao autenticar" });
  }
});

app.get("/api/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.usuario.findUnique({
      where: { id: req.user!.id },
      select: { id: true, nome: true, login: true, situacao: true },
    });
    if (!user) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }
    res.json({ usuario: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

// ── Lancamentos ───────────────────────────────────────────────────────────────

function buildLancamentoWhere(query: Record<string, unknown>) {
  const where: Record<string, unknown> = {};

  if (typeof query.dataInicio === "string" && query.dataInicio) {
    where.data_lancamento = {
      ...(where.data_lancamento as object | undefined),
      gte: new Date(query.dataInicio as string),
    };
  }
  if (typeof query.dataFim === "string" && query.dataFim) {
    const end = new Date(query.dataFim as string);
    end.setHours(23, 59, 59, 999);
    where.data_lancamento = {
      ...(where.data_lancamento as object | undefined),
      lte: end,
    };
  }
  if (typeof query.situacao === "string" && query.situacao) {
    where.situacao = query.situacao;
  }

  return where;
}

function formatLancamento(l: {
  id: string;
  descricao: string;
  data_lancamento: Date;
  valor: { toNumber(): number } | number;
  tipo_lancamento: string;
  situacao: string;
}) {
  return {
    id: l.id,
    descricao: l.descricao,
    data_lancamento: l.data_lancamento.toISOString(),
    valor: typeof l.valor === "number" ? l.valor : (l.valor as { toNumber(): number }).toNumber(),
    tipo_lancamento: l.tipo_lancamento,
    situacao: l.situacao,
  };
}

// GET /api/lancamentos?dataInicio=&dataFim=&situacao=
app.get("/api/lancamentos", requireAuth, async (req, res) => {
  try {
    const where = buildLancamentoWhere(req.query as Record<string, unknown>);
    const rows = await prisma.lancamento.findMany({
      where,
      orderBy: { data_lancamento: "desc" },
    });
    res.json(rows.map(formatLancamento));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar lançamentos" });
  }
});

// GET /api/lancamentos/pdf
app.get("/api/lancamentos/pdf", requireAuth, async (req, res) => {
  try {
    const where = buildLancamentoWhere(req.query as Record<string, unknown>);
    const rows = await prisma.lancamento.findMany({
      where,
      orderBy: { data_lancamento: "desc" },
    });
    streamLancamentosPDF(res, rows.map(formatLancamento));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar PDF" });
  }
});

// POST /api/lancamentos
app.post("/api/lancamentos", requireAuth, async (req, res) => {
  try {
    const { descricao, valor, data_lancamento, tipo_lancamento, situacao } = req.body as {
      descricao?: string;
      valor?: number;
      data_lancamento?: string;
      tipo_lancamento?: string;
      situacao?: string;
    };

    if (!descricao || valor === undefined || valor === null || !data_lancamento || !tipo_lancamento || !situacao) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }

    const created = await prisma.lancamento.create({
      data: {
        descricao,
        valor,
        data_lancamento: new Date(data_lancamento),
        tipo_lancamento,
        situacao,
      },
    });

    const formatted = formatLancamento(created);

    void sendNotification(
      `Lançamento criado: ${descricao}`,
      `Um novo lançamento foi criado:\n\nDescrição: ${descricao}\nValor: R$ ${valor}\nTipo: ${tipo_lancamento}\nSituação: ${situacao}\nData: ${data_lancamento}`
    );

    res.status(201).json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar lançamento" });
  }
});

// PUT /api/lancamentos/:id
app.put("/api/lancamentos/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { descricao, valor, data_lancamento, tipo_lancamento, situacao } = req.body as {
      descricao?: string;
      valor?: number;
      data_lancamento?: string;
      tipo_lancamento?: string;
      situacao?: string;
    };

    const existing = await prisma.lancamento.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Lançamento não encontrado" });
    }

    const updated = await prisma.lancamento.update({
      where: { id },
      data: {
        ...(descricao !== undefined && { descricao }),
        ...(valor !== undefined && { valor }),
        ...(data_lancamento !== undefined && { data_lancamento: new Date(data_lancamento) }),
        ...(tipo_lancamento !== undefined && { tipo_lancamento }),
        ...(situacao !== undefined && { situacao }),
      },
    });

    const formatted = formatLancamento(updated);

    void sendNotification(
      `Lançamento atualizado: ${updated.descricao}`,
      `Um lançamento foi atualizado:\n\nDescrição: ${updated.descricao}\nValor: R$ ${updated.valor}\nTipo: ${updated.tipo_lancamento}\nSituação: ${updated.situacao}`
    );

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar lançamento" });
  }
});

// DELETE /api/lancamentos/:id
app.delete("/api/lancamentos/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.lancamento.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Lançamento não encontrado" });
    }

    await prisma.lancamento.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao excluir lançamento" });
  }
});

const publicDir = path.join(__dirname, "public");
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get("*", (req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

if (!process.env.VITEST) {
  app.listen(PORT, () => {
    console.log(`Servidor em http://localhost:${PORT}`);
  });
}
