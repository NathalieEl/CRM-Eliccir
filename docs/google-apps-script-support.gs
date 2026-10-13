const SUPPORT_RECIPIENT = "marc.issan@gmail.com";
const MINIMUM_TOKEN_LENGTH = 32;

function authorizeMail() {
  MailApp.getRemainingDailyQuota();
  Logger.log("Autorisation d’envoi Gmail accordée.");
}

function doPost(event) {
  const token = PropertiesService.getScriptProperties().getProperty("SUPPORT_WEBHOOK_TOKEN");
  if (!token || token.length < MINIMUM_TOKEN_LENGTH) {
    return jsonResponse({ ok: false, error: "server_not_configured" });
  }

  let payload;
  try {
    payload = JSON.parse(event.postData.contents);
  } catch (_error) {
    return jsonResponse({ ok: false, error: "invalid_json" });
  }

  if (payload.token !== token) {
    return jsonResponse({ ok: false, error: "unauthorized" });
  }

  const displayName = String(payload.displayName || "").trim();
  const username = String(payload.username || "").trim();
  const formattedDate = String(payload.formattedDate || "").trim();
  const category = String(payload.category || "").trim();
  const details = String(payload.details || "").trim();
  const recipient = String(payload.recipient || "").trim();

  if (
    recipient !== SUPPORT_RECIPIENT ||
    !displayName ||
    !username ||
    !formattedDate ||
    !["Problèmes/Bugs", "Modifications/Améliorations"].includes(category) ||
    !details ||
    details.length > 10000
  ) {
    return jsonResponse({ ok: false, error: "invalid_request" });
  }

  const body = [
    "Nouvelle demande envoyée depuis Eliccir CRM",
    `Utilisateur : ${displayName} (${username})`,
    `Date/heure : ${formattedDate} (Europe/Paris)`,
    `Catégorie : ${category}`,
    "",
    details,
  ].join("\n");

  try {
    MailApp.sendEmail({
      to: SUPPORT_RECIPIENT,
      subject: `[Eliccir CRM] ${category}`,
      body,
      name: "Eliccir CRM",
    });
    return jsonResponse({ ok: true });
  } catch (_error) {
    console.error("Gmail delivery failed");
    return jsonResponse({ ok: false, error: "mail_delivery_failed" });
  }
}

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}