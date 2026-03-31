import "dotenv/config";
import cors from "cors";
import express from "express";
import { prisma } from "./lib/prisma.js";

const app = express();
const PORT = 3001;

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  })
);

app.get("/api/lancamentos", async (_req, res) => {
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
