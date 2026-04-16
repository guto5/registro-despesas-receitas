import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    lancamento: {
      findMany: vi.fn(),
    },
    usuario: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../services/emailService.js", () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

// Mock pdfService so we can assert the response without requiring a real PDF
vi.mock("../services/pdfService.js", () => ({
  streamLancamentosPDF: vi.fn((res: import("express").Response) => {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=lancamentos.pdf");
    res.status(200).end(Buffer.from("%PDF-1.4 fake-pdf-content"));
  }),
}));

import { prisma } from "../lib/prisma.js";
import { app } from "../server.js";

const JWT_SECRET = "test-secret";
process.env.JWT_SECRET = JWT_SECRET;

function makeToken() {
  return jwt.sign({ sub: "user-1", login: "augusto" }, JWT_SECRET, { expiresIn: "1h" });
}

const sampleRows = [
  {
    id: "l-1",
    descricao: "Salário",
    data_lancamento: new Date("2026-03-01T10:00:00.000Z"),
    valor: { toNumber: () => 5500 },
    tipo_lancamento: "Receita",
    situacao: "Pago/Recebido",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Test 19: GET /api/lancamentos/pdf — returns content-type application/pdf ──
describe("GET /api/lancamentos/pdf", () => {
  it("returns a response with Content-Type application/pdf when authenticated", async () => {
    (prisma.lancamento.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(sampleRows);

    const token = makeToken();

    const res = await request(app)
      .get("/api/lancamentos/pdf")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
  });

  // ── Test 20: GET /api/lancamentos/pdf — returns 401 without auth ──────────
  it("returns 401 when no Authorization header is provided", async () => {
    const res = await request(app).get("/api/lancamentos/pdf");
    expect(res.status).toBe(401);
  });
});
