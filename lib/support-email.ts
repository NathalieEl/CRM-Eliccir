import "server-only";

const SUPPORT_RECIPIENT = "marc.issan@gmail.com";
const MINIMUM_WEBHOOK_TOKEN_LENGTH = 32;

type SupportRequestEmail = {
  displayName: string;
  username: string;
  formattedDate: string;
  category: string;
  details: string;
};

type PasswordSetupEmail = {
  email: string;
  displayName: string;
  username: string;
  setupUrl: string;
};

function webhookConfig() {
  const endpoint = process.env.SUPPORT_EMAIL_WEBHOOK_URL?.trim();
  const token = process.env.SUPPORT_WEBHOOK_TOKEN?.trim();
  if (!endpoint || !token || token.length < MINIMUM_WEBHOOK_TOKEN_LENGTH) return null;

  try {
    const endpointUrl = new URL(endpoint);
    if (endpointUrl.protocol !== "https:") return null;
    return { endpointUrl, token };
  } catch {
    return null;
  }
}

async function postMailWebhook(endpointUrl: URL, payload: Record<string, string>) {
  const response = await fetch(endpointUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => null) as { ok?: boolean } | null;
  if (!response.ok || result?.ok !== true) throw new Error(`Google Apps Script mail failed (${response.status})`);
}

export async function sendSupportRequestEmail(request: SupportRequestEmail): Promise<"sent" | "not-configured"> {
  const config = webhookConfig();
  if (!config) return "not-configured";

  await postMailWebhook(config.endpointUrl, {
    type: "support_request",
    token: config.token,
    recipient: SUPPORT_RECIPIENT,
    displayName: request.displayName,
    username: request.username,
    formattedDate: request.formattedDate,
    category: request.category,
    details: request.details,
  });
  return "sent";
}

export async function sendPasswordSetupEmail(request: PasswordSetupEmail): Promise<"sent" | "not-configured"> {
  const config = webhookConfig();
  if (!config) return "not-configured";

  await postMailWebhook(config.endpointUrl, {
    type: "password_setup",
    token: config.token,
    recipient: request.email,
    displayName: request.displayName,
    username: request.username,
    setupUrl: request.setupUrl,
    expiresInHours: "24",
  });
  return "sent";
}