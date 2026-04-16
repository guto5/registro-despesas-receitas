import nodemailer from "nodemailer";

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    // Fallback: Ethereal test account (auto-generates a preview URL)
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: {
        user: process.env.ETHEREAL_USER ?? "",
        pass: process.env.ETHEREAL_PASS ?? "",
      },
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendNotification(subject: string, body: string): Promise<void> {
  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? "financas@example.com";
  const to = process.env.EMAIL_TO ?? from;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: body,
      html: `<pre style="font-family:sans-serif;">${body}</pre>`,
    });
    console.log(`[email] Mensagem enviada: ${info.messageId}`);
    // When using Ethereal, log the preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[email] Preview: ${previewUrl}`);
    }
  } catch (err) {
    // Email failure is non-fatal: log and continue
    console.error("[email] Falha ao enviar notificação:", err);
  }
}
