import nodemailer from "nodemailer";

const SUPPORT_RECIPIENT = "marc.issan@gmail.com";

type SupportRequestEmail = {
  displayName: string;
  username: string;
  formattedDate: string;
  category: string;
  details: string;
};

export async function sendSupportRequestEmail(request: SupportRequestEmail): Promise<"sent" | "not-configured"> {
  const host = process.env.SMTP_HOST?.trim();
  const username = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  const port = Number(process.env.SMTP_PORT || 465);
  const from = process.env.SMTP_FROM?.trim() || username;

  if (!host || !username || !password || !from || !Number.isInteger(port) || port < 1 || port > 65535) {
    return "not-configured";
  }

  const secureSetting = process.env.SMTP_SECURE?.trim().toLowerCase();
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: secureSetting ? secureSetting === "true" : port === 465,
    auth: { user: username, pass: password },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  await transporter.sendMail({
    from,
    to: SUPPORT_RECIPIENT,
    subject: `[Eliccir CRM] ${request.category}`,
    text: [
      "Nouvelle demande envoyée depuis Eliccir CRM",
      `Utilisateur : ${request.displayName} (${request.username})`,
      `Date/heure : ${request.formattedDate} (Europe/Paris)`,
      `Catégorie : ${request.category}`,
      "",
      request.details,
    ].join("\n"),
  });

  return "sent";
}