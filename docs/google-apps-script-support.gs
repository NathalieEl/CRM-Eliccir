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
  if (type === "release_announcement") return sendReleaseAnnouncement(payload);
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
    "Nouvelle demande envoyée depuis MANTA CRM",
    `Utilisateur : ${displayName} (${username})`,
    `Date/heure : ${formattedDate} (Europe/Paris)`,
    `Catégorie : ${category}`,
    "",
    details,
  ].join("\n");

  try {
    MailApp.sendEmail({
      to: SUPPORT_RECIPIENT,
      subject: `[MANTA CRM] ${category}`,
      body,
      name: "MANTA CRM",
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
    "Ton accès à MANTA CRM a été créé ou réinitialisé par un administrateur.",
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
      subject: "[MANTA CRM] Active ton accès",
      body,
      name: "MANTA CRM",
    });
    return jsonResponse({ ok: true });
  } catch (_error) {
    console.error("User setup email delivery failed");
    return jsonResponse({ ok: false, error: "mail_delivery_failed" });
  }
}

function sendReleaseAnnouncement(payload) {
  const version = String(payload.version || "").trim();
  const recipients = Array.isArray(payload.recipients)
    ? [...new Set(payload.recipients.map((recipient) => String(recipient || "").trim()))]
    : [];
  const changes = Array.isArray(payload.changes)
    ? payload.changes.map((change) => ({
        title: String(change?.title || "").trim(),
        text: String(change?.text || "").trim(),
      }))
    : [];

  if (
    !/^\d+\.\d+\.\d+$/.test(version) ||
    recipients.length === 0 || recipients.length > 200 ||
    recipients.some((recipient) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || recipient.length > 254) ||
    changes.length === 0 || changes.length > 20 ||
    changes.some((change) => !change.title || change.title.length > 160 || !change.text || change.text.length > 3000)
  ) {
    return jsonResponse({ ok: false, error: "invalid_release_announcement" });
  }

  const body = [
    `Bonjour,`,
    "",
    `MANTA CRM vient d’être mis à jour en version ${version}.`,
    "",
    "Nouveautés :",
    ...changes.flatMap((change, index) => [`${index + 1}. ${change.title}`, change.text, ""]),
    "L’équipe MANTA CRM",
  ].join("\n");

  try {
    const message = {
      to: recipients[0],
      subject: `[MANTA CRM] Nouveautés de la version ${version}`,
      body,
      name: "MANTA CRM",
    };
    if (recipients.length > 1) message.bcc = recipients.slice(1).join(",");
    MailApp.sendEmail(message);
    return jsonResponse({ ok: true, recipientCount: recipients.length });
  } catch (_error) {
    console.error("Release announcement delivery failed");
    return jsonResponse({ ok: false, error: "mail_delivery_failed" });
  }
}

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}