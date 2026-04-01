import "dotenv/config";
import bcrypt from "bcrypt";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "./lib/prisma.js";
import { requireAuth } from "./middleware/auth.js";

const app = express();
const PORT = 3001;

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  })
);
app.use(express.json());

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

app.get("/api/lancamentos", requireAuth, async (_req, res) => {
  try {
    const rows = await prisma.lancamento.findMany({
      orderBy: { data_lancamento: "desc" },
    });
    const payload = rows.map((l) => ({
      id: l.id,
      descricao: l.descricao,
      data_lancamento: l.data_lancamento.toISOString(),
      valor: Number(l.valor),
      tipo_lancamento: l.tipo_lancamento,
      situacao: l.situacao,
    }));
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar lançamentos" });
  }
});

app.listen(PORT, () => {
  console.log(`API em http://localhost:${PORT}`);
});
