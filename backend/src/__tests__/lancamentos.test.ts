import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

// Mock Prisma
vi.mock("../lib/prisma.js", () => ({
  prisma: {
    lancamento: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    usuario: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock email service so tests don't attempt real SMTP calls
vi.mock("../services/emailService.js", () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

// Mock PDF service so tests don't generate real PDFs
vi.mock("../services/pdfService.js", () => ({
  streamLancamentosPDF: vi.fn((_res: unknown, _items: unknown) => {
    // no-op — avoids PDFKit side-effects in tests
  }),
}));

import { prisma } from "../lib/prisma.js";
import { app } from "../server.js";

const JWT_SECRET = "test-secret";
process.env.JWT_SECRET = JWT_SECRET;

function makeToken(userId = "user-1") {
  return jwt.sign({ sub: userId, login: "augusto" }, JWT_SECRET, { expiresIn: "1h" });
}

const TOKEN = makeToken();

const sampleLancamento = {
  id: "lancamento-1",
  descricao: "Salário",
  data_lancamento: new Date("2026-03-01T10:00:00.000Z"),
  valor: { toNumber: () => 5500 },
  tipo_lancamento: "Receita",
  situacao: "Pago/Recebido",
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: user exists and is active for auth checks
  (prisma.usuario.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: "user-1",
    nome: "Augusto",
    login: "augusto",
    senha: "$2b$10$rvDV15Y2zt4V30sVWGr7G.McGoGdUSGRAEYltoGFGl4dZNn1M74Gy",
    situacao: "Ativo",
  });
});

// ── Test 1: GET /api/lancamentos — returns all lancamentos ──────────────────
describe("GET /api/lancamentos", () => {
  it("returns all lancamentos when authenticated", async () => {
    (prisma.lancamento.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([sampleLancamento]);

    const res = await request(app)
      .get("/api/lancamentos")
      .set("Authorization", `Bearer ${TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].descricao).toBe("Salário");
  });

  // ── Test 2: GET /api/lancamentos — returns 401 without auth header ────────
  it("returns 401 when no Authorization header is provided", async () => {
    const res = await request(app).get("/api/lancamentos");
    expect(res.status).toBe(401);
  });

  // ── Test 3: GET /api/lancamentos — filters by date range ─────────────────
  it("applies date range filter when dataInicio and dataFim are provided", async () => {
    (prisma.lancamento.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([sampleLancamento]);

    const res = await request(app)
      .get("/api/lancamentos?dataInicio=2026-03-01&dataFim=2026-03-31")
      .set("Authorization", `Bearer ${TOKEN}`);

    expect(res.status).toBe(200);
    const call = (prisma.lancamento.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.data_lancamento).toBeDefined();
    expect(call.where.data_lancamento.gte).toBeInstanceOf(Date);
    expect(call.where.data_lancamento.lte).toBeInstanceOf(Date);
  });

  // ── Test 4: GET /api/lancamentos — filters by situacao ───────────────────
  it("applies situacao filter when situacao query param is provided", async () => {
    (prisma.lancamento.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const res = await request(app)
      .get("/api/lancamentos?situacao=Pendente")
      .set("Authorization", `Bearer ${TOKEN}`);

    expect(res.status).toBe(200);
    const call = (prisma.lancamento.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.situacao).toBe("Pendente");
  });
});

// ── Test 5: POST /api/lancamentos — creates successfully ─────────────────────
describe("POST /api/lancamentos", () => {
  it("creates a lancamento with valid data and returns 201", async () => {
    (prisma.lancamento.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...sampleLancamento,
      id: "new-id",
    });

    const res = await request(app)
      .post("/api/lancamentos")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({
        descricao: "Salário",
        valor: 5500,
        data_lancamento: "2026-03-01T10:00:00.000Z",
        tipo_lancamento: "Receita",
        situacao: "Pago/Recebido",
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("new-id");
    expect(res.body.descricao).toBe("Salário");
  });

  // ── Test 6: POST /api/lancamentos — returns 400 when fields are missing ──
  it("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/lancamentos")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ descricao: "Teste" }); // missing valor, data_lancamento, etc.

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

// ── Test 7: PUT /api/lancamentos/:id — updates successfully ──────────────────
describe("PUT /api/lancamentos/:id", () => {
  it("updates a lancamento and returns the updated record", async () => {
    (prisma.lancamento.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(sampleLancamento);
    (prisma.lancamento.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...sampleLancamento,
      descricao: "Salário atualizado",
    });

    const res = await request(app)
      .put("/api/lancamentos/lancamento-1")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ descricao: "Salário atualizado" });

    expect(res.status).toBe(200);
    expect(res.body.descricao).toBe("Salário atualizado");
  });

  // ── Test 8: PUT /api/lancamentos/:id — returns 404 for non-existent ID ───
  it("returns 404 when updating a non-existent lancamento", async () => {
    (prisma.lancamento.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await request(app)
      .put("/api/lancamentos/non-existent-id")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ descricao: "Qualquer" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

// ── Test 9: DELETE /api/lancamentos/:id — deletes successfully ────────────────
describe("DELETE /api/lancamentos/:id", () => {
  it("deletes an existing lancamento and returns 204", async () => {
    (prisma.lancamento.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(sampleLancamento);
    (prisma.lancamento.delete as ReturnType<typeof vi.fn>).mockResolvedValue(sampleLancamento);

    const res = await request(app)
      .delete("/api/lancamentos/lancamento-1")
      .set("Authorization", `Bearer ${TOKEN}`);

    expect(res.status).toBe(204);
  });
});
