import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    usuario: {
      findUnique: vi.fn(),
    },
    lancamento: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock("../services/emailService.js", () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../services/pdfService.js", () => ({
  streamLancamentosPDF: vi.fn(),
}));

import { prisma } from "../lib/prisma.js";
import { app } from "../server.js";

const JWT_SECRET = "test-secret";
process.env.JWT_SECRET = JWT_SECRET;

const hashedPassword = bcrypt.hashSync("augusto123", 10);

const activeUser = {
  id: "user-1",
  nome: "Augusto",
  login: "augusto",
  senha: hashedPassword,
  situacao: "Ativo",
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Test 10: POST /api/login — returns token with valid credentials ──────────
describe("POST /api/login", () => {
  it("returns a JWT token when credentials are valid", async () => {
    (prisma.usuario.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(activeUser);

    const res = await request(app)
      .post("/api/login")
      .send({ login: "augusto", senha: "augusto123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe("string");
    expect(res.body.usuario.login).toBe("augusto");
  });

  // ── Test 11: POST /api/login — returns 400 when login/senha missing ───────
  it("returns 400 when login or senha is missing", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ login: "augusto" }); // missing senha

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  // ── Test 12: POST /api/login — returns 401 with wrong password ────────────
  it("returns 401 when password is incorrect", async () => {
    (prisma.usuario.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(activeUser);

    const res = await request(app)
      .post("/api/login")
      .send({ login: "augusto", senha: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  // ── Test 13: POST /api/login — returns 401 for inactive user ─────────────
  it("returns 401 when user is inactive", async () => {
    (prisma.usuario.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...activeUser,
      situacao: "Inativo",
    });

    const res = await request(app)
      .post("/api/login")
      .send({ login: "augusto", senha: "augusto123" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });
});

// ── Test 14: requireAuth — rejects request without token ─────────────────────
describe("requireAuth middleware", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const res = await request(app).get("/api/lancamentos");
    expect(res.status).toBe(401);
  });
});

// ── Test 15: GET /api/me — returns user data with valid token ─────────────────
describe("GET /api/me", () => {
  it("returns current user when token is valid", async () => {
    (prisma.usuario.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      nome: "Augusto",
      login: "augusto",
      situacao: "Ativo",
    });

    const token = jwt.sign({ sub: "user-1", login: "augusto" }, JWT_SECRET, { expiresIn: "1h" });

    const res = await request(app)
      .get("/api/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.usuario.login).toBe("augusto");
    expect(res.body.usuario.nome).toBe("Augusto");
  });

  // ── Test 16: GET /api/me — returns 401 with expired/invalid token ─────────
  it("returns 401 when token is invalid", async () => {
    const res = await request(app)
      .get("/api/me")
      .set("Authorization", "Bearer invalid-token-string");

    expect(res.status).toBe(401);
  });
});
