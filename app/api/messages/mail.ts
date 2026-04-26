import nodemailer from "nodemailer";

function getTransporter() {
  // Prefer explicit SMTP if provided
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  // Fallback (works for Gmail apps passwords)
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: "SSLv3",
    },
  });
}

function getNotifyToEmails() {
  const raw =
    process.env.ADMIN_NOTIFICATION_EMAILS ||
    process.env.EMAIL_NOTIFY_TO ||
    "kl.kinglaundry@gmail.com";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function sendMessageEmail(args: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) return { skipped: true as const };
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `${process.env.EMAIL_FROM_NAME || "ქინგ ლონდრი"} <${process.env.EMAIL_USER}>`,
    to: args.to,
    subject: args.subject,
    replyTo: args.replyTo || process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER,
    text: args.text,
    html: args.html,
  });

  return { skipped: false as const };
}

export function getAdminNotifyTo() {
  return getNotifyToEmails();
}

