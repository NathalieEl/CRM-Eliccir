const minimumWebhookTokenLength = 32;

type ReleaseAnnouncement = {
  recipients: string[];
  version: string;
  changes: { title: string; text: string }[];
};

function webhookConfig() {
  const endpoint = process.env.SUPPORT_EMAIL_WEBHOOK_URL?.trim();
  const token = process.env.SUPPORT_WEBHOOK_TOKEN?.trim();
  if (!endpoint || !token || token.length < minimumWebhookTokenLength) return null;

  try {
    const endpointUrl = new URL(endpoint);
    if (endpointUrl.protocol !== "https:") return null;
    return { endpointUrl, token };
  } catch {
    return null;
  }
}

export async function sendReleaseAnnouncement(request: ReleaseAnnouncement): Promise<"sent" | "not-configured"> {
  const config = webhookConfig();
  if (!config) return "not-configured";

  const response = await fetch(config.endpointUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "release_announcement",
      token: config.token,
      recipients: request.recipients,
      version: request.version,
      changes: request.changes,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => null) as { ok?: boolean } | null;
  if (!response.ok || result?.ok !== true) throw new Error(`Google Apps Script mail failed (${response.status})`);
  return "sent";
}