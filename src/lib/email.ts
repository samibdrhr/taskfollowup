import nodemailer from "nodemailer";

/** Sends an email when SMTP is configured; otherwise it's a no-op. */
export async function sendEmail(to: string, subject: string, text: string) {
  const host = process.env.SMTP_HOST;
  if (!host) return false;
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
    });
    return true;
  } catch (error) {
    console.error("Failed to send email", error);
    return false;
  }
}
