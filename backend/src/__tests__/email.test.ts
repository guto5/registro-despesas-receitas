import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSendMail, mockGetTestMessageUrl } = vi.hoisted(() => ({
  mockSendMail: vi.fn(),
  mockGetTestMessageUrl: vi.fn().mockReturnValue("https://ethereal.email/preview/abc123"),
}));

// Mock nodemailer so no real SMTP connections are made
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: mockSendMail })),
    getTestMessageUrl: mockGetTestMessageUrl,
  },
}));

import { sendNotification } from "../services/emailService.js";

beforeEach(() => {
  vi.clearAllMocks();
  // Use Ethereal-like defaults so createTransporter takes the fallback path
  process.env.SMTP_HOST = "";
  process.env.SMTP_USER = "";
  process.env.SMTP_PASS = "";
  process.env.EMAIL_FROM = "financas@test.com";
  process.env.EMAIL_TO = "admin@test.com";
});

// ── Test 17: sendNotification — calls sendMail with correct params ───────────
describe("sendNotification", () => {
  it("calls transporter.sendMail with the correct subject and body", async () => {
    mockSendMail.mockResolvedValue({ messageId: "test-id-123" });

    await sendNotification("Lançamento criado", "Descrição do lançamento criado.");

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const callArgs = mockSendMail.mock.calls[0][0] as {
      subject: string;
      text: string;
      to: string;
    };
    expect(callArgs.subject).toBe("Lançamento criado");
    expect(callArgs.text).toContain("Descrição do lançamento criado.");
    expect(callArgs.to).toBe("admin@test.com");
  });

  // ── Test 18: sendNotification — handles SMTP failure gracefully ───────────
  it("does not throw when sendMail fails (non-fatal error handling)", async () => {
    mockSendMail.mockRejectedValue(new Error("SMTP connection refused"));

    await expect(sendNotification("Erro", "Teste")).resolves.not.toThrow();
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });
});
