const SUPPORT_RECIPIENT = "marc.issan@gmail.com";
const MINIMUM_WEBHOOK_TOKEN_LENGTH = 32;

type SupportRequestEmail = {
  displayName: string;
  username: string;
  formattedDate: string;
  category: string;
  details: string;
};

export async function sendSupportRequestEmail(request: SupportRequestEmail): Promise<"sent" | "not-configured"> {
  const endpoint = process.env.SUPPORT_EMAIL_WEBHOOK_URL?.trim();
  const token = process.env.SUPPORT_WEBHOOK_TOKEN?.trim();

  if (!endpoint || !token || token.length < MINIMUM_WEBHOOK_TOKEN_LENGTH) {
    return "not-configured";
  }

  let endpointUrl: URL;
  try {
    endpointUrl = new URL(endpoint);
  } catch {
    return "not-configured";
  }
  if (endpointUrl.protocol !== "https:") return "not-configured";

  const response = await fetch(endpointUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      recipient: SUPPORT_RECIPIENT,
      displayName: request.displayName,
      username: request.username,
      formattedDate: request.formattedDate,
      category: request.category,
      details: request.details,
    }),
    signal: AbortSignal.timeout(15000),
  });

  const result = await response.json().catch(() => null) as { ok?: boolean } | null;
  if (!response.ok || result?.ok !== true) {
    throw new Error(`Google Apps Script support mail failed (${response.status})`);
  }

  return "sent";
}