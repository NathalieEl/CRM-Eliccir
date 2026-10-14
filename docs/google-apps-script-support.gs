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

  const type = String(payload.type || "support_request").trim();
  if (type === "password_setup") return sendPasswordSetupEmail(payload);
  if (type !== "support_request") return jsonResponse({ ok: false, error: "invalid_request" });

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

function sendPasswordSetupEmail(payload) {
  const recipient = String(payload.recipient || "").trim();
  const displayName = String(payload.displayName || "").trim();
  const username = String(payload.username || "").trim();
  const setupUrl = String(payload.setupUrl || "").trim();
  const railwaySetupUrl = /^https:\/\/[a-z0-9.-]+\.up\.railway\.app\/set-password\?token=[A-Za-z0-9_-]{40,50}$/i;

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) ||
    recipient.length > 254 ||
    !displayName || displayName.length > 160 ||
    !/^[A-Za-z0-9._-]{3,40}$/.test(username) ||
    !railwaySetupUrl.test(setupUrl)
  ) {
    return jsonResponse({ ok: false, error: "invalid_request" });
  }

  const body = [
    `Bonjour ${displayName},`,
    "",
    "Ton accès à Eliccir CRM a été créé ou réinitialisé par un administrateur.",
    `Identifiant : ${username}`,
    "",
    "Choisis ton mot de passe personnel en ouvrant ce lien à usage unique :",
    setupUrl,
    "",
    "Ce lien expire dans 24 heures et ne peut être utilisé qu’une seule fois. Aucun mot de passe temporaire n’est transmis par e-mail.",
    "",
    "Si tu n’es pas à l’origine de cette demande, contacte ton administrateur.",
  ].join("\n");

  try {
    MailApp.sendEmail({
      to: recipient,
      subject: "[Eliccir CRM] Active ton accès",
      body,
      name: "Eliccir CRM",
    });
    return jsonResponse({ ok: true });
  } catch (_error) {
    console.error("User setup email delivery failed");
    return jsonResponse({ ok: false, error: "mail_delivery_failed" });
  }
}

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}