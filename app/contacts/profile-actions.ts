"use server";

import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { recordAudit } from "@/lib/audit";

const noteNatures = ["Telephonique", "Email", "WhatsApps", "Presentiel", "Autre"] as const;
type NoteNature = (typeof noteNatures)[number];

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function entries(formData: FormData, name: string) {
  return formData.getAll(name).map((value) => typeof value === "string" ? value.trim() : "");
}

function rows(formData: FormData, keys: string[]) {
  const columns = Object.fromEntries(keys.map((key) => [key, entries(formData, key)]));
  const length = Math.max(0, ...Object.values(columns).map((values) => values.length));
  return Array.from({ length }, (_, index) => Object.fromEntries(keys.map((key) => [key, columns[key][index] ?? ""])));
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function dateValue(value: string) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function refreshContact(contactId: string) {
  for (const path of ["/contacts", `/contacts/${contactId}`, "/search", "/"]) revalidatePath(path);
}

export async function saveContactProfile(formData: FormData) {
  const currentUser = await requirePermission("crm.write");
  const contactId = field(formData, "contactId");
  if (!contactId) redirect("/contacts?error=not-found");

  const titre = field(formData, "titre");
  const prenom = field(formData, "prenom");
  const nom = field(formData, "nom");
  const linkedinInput = field(formData, "linkedin");
  const linkedin = linkedinInput && !/^https?:\/\//i.test(linkedinInput) ? `https://${linkedinInput}` : linkedinInput;
  const secteur = field(formData, "secteur");
  const ville = field(formData, "ville");
  const departement = field(formData, "departement");
  const pays = field(formData, "pays");
  const sourceAcquisition = field(formData, "sourceAcquisition");
  const statut = field(formData, "statut");
  const middleName = field(formData, "deuxiemePrenom");
  const nickname = field(formData, "surnom");
  const email = field(formData, "email").toLowerCase();
  const telephone = field(formData, "telephone");
  const typeEmail = field(formData, "typeEmail");
  const libelleEmail = field(formData, "libelleEmail");
  const typeTelephone = field(formData, "typeTelephone");
  const libelleTelephone = field(formData, "libelleTelephone");
  const birthday = dateValue(field(formData, "dateNaissance"));
  const gender = field(formData, "genre");
  const biography = field(formData, "biographie");
  const occupation = field(formData, "metier");
  const locale = field(formData, "languePreferee");
  const ageRange = field(formData, "trancheAge");
  const projectIds = unique(entries(formData, "projectIds"));
  const organizationRows = rows(formData, ["entrepriseId", "companyPoste", "companyService", "companyStart", "companyEnd", "companyType"])
    .filter((row) => row.entrepriseId);
  const organizationIds = organizationRows.map((row) => row.entrepriseId);
  const nicknames = unique(entries(formData, "nicknameValue"));
  const emails = rows(formData, ["emailAddress", "emailType", "emailLabel"]).filter((row) => row.emailAddress);
  const phones = rows(formData, ["phoneNumber", "phoneType", "phoneLabel"]).filter((row) => row.phoneNumber);
  const addresses = rows(formData, ["addressStreet", "addressExtendedAddress", "addressPoBox", "addressLocality", "addressRegion", "addressPostalCode", "addressCountry", "addressType", "addressLabel"])
    .filter((row) => [row.addressStreet, row.addressLocality, row.addressRegion, row.addressPostalCode, row.addressCountry].some(Boolean));
  const events = rows(formData, ["eventLabel", "eventDate", "eventType"]).filter((row) => row.eventLabel || row.eventDate);
  const relations = rows(formData, ["relationType", "relatedContactId", "relatedName"]).filter((row) => row.relationType || row.relatedContactId || row.relatedName);
  const urls = rows(formData, ["urlValue", "urlType", "urlLabel"]).filter((row) => row.urlValue);
  const imClients = rows(formData, ["imUsername", "imProtocol", "imType", "imLabel"]).filter((row) => row.imUsername);
  const groups = unique(entries(formData, "groupName"));
  const customFields = rows(formData, ["customKey", "customValue"]).filter((row) => row.customKey || row.customValue);
  const interests = unique(entries(formData, "interestValue"));
  const skills = unique(entries(formData, "skillValue"));

  if (
    titre.length > 30 || prenom.length < 1 || prenom.length > 80 || nom.length < 1 || nom.length > 120 ||
    linkedin.length > 254 || (linkedin && !/^https?:\/\/[^\s]+$/i.test(linkedin)) ||
    secteur.length > 80 || ville.length > 80 || departement.length > 20 || pays.length > 80 ||
    sourceAcquisition.length > 120 || statut.length > 80 ||
    middleName.length > 120 || nickname.length > 120 || birthday === undefined ||
    email.length > 254 || (email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || telephone.length > 80 ||
    typeEmail.length > 40 || libelleEmail.length > 80 || typeTelephone.length > 40 || libelleTelephone.length > 80 ||
    gender.length > 80 || biography.length > 20000 || occupation.length > 160 ||
    locale.length > 40 || ageRange.length > 40 ||
    emails.some((row) => row.emailAddress.length > 254 || row.emailType.length > 40 || row.emailLabel.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.emailAddress)) ||
    phones.some((row) => row.phoneNumber.length > 80 || row.phoneType.length > 40 || row.phoneLabel.length > 80) ||
    urls.some((row) => row.urlValue.length > 2048 || row.urlType.length > 40 || row.urlLabel.length > 80 || !/^https?:\/\/[^\s]+$/i.test(row.urlValue)) ||
    events.some((row) => row.eventLabel.length > 160 || row.eventType.length > 40 || dateValue(row.eventDate) === undefined) ||
    relations.some((row) => row.relationType.length > 80 || row.relatedName.length > 160 || row.relatedContactId === contactId) ||
    organizationRows.some((row) => row.companyPoste.length > 120 || row.companyService.length > 120 || dateValue(row.companyStart) === undefined || dateValue(row.companyEnd) === undefined || (row.companyStart && row.companyEnd && row.companyEnd < row.companyStart)) ||
    imClients.some((row) => row.imUsername.length > 160 || row.imProtocol.length > 80 || row.imType.length > 40 || row.imLabel.length > 80) ||
    groups.some((name) => name.length > 120) || nicknames.some((value) => value.length > 120) ||
    interests.some((value) => value.length > 120) || skills.some((value) => value.length > 120) ||
    customFields.some((row) => row.customKey.length > 120 || row.customValue.length > 2000) ||
    addresses.some((row) => Object.values(row).some((value) => value.length > 240)) ||
    organizationRows.some((row) => !["work", "school", "other"].includes(row.companyType || "work"))
  ) {
    redirect(`/contacts/${contactId}?error=invalid`);
  }

  const [contactExists, validProjectCount, validRelatedContactCount, validEntrepriseCount] = await Promise.all([
    prisma.contact.findUnique({ where: { id: contactId }, select: { id: true } }),
    prisma.project.count({ where: { id: { in: projectIds } } }),
    prisma.contact.count({ where: { id: { in: relations.map((row) => row.relatedContactId).filter(Boolean) } } }),
    prisma.entreprise.count({ where: { id: { in: organizationIds } } }),
  ]);
  if (!contactExists) redirect("/contacts?error=not-found");
  if (email && await prisma.contact.findFirst({ where: { email, id: { not: contactId } }, select: { id: true } })) {
    redirect(`/contacts/${contactId}?error=email-exists`);
  }
  if (validProjectCount !== projectIds.length || validEntrepriseCount !== new Set(organizationIds).size || validRelatedContactCount !== new Set(relations.map((row) => row.relatedContactId).filter(Boolean)).size) {
    redirect(`/contacts/${contactId}?error=invalid`);
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.contact.update({
      where: { id: contactId },
      data: {
        titre: titre || null,
        prenom,
        nom,
        linkedin: linkedin || null,
        secteur: secteur || null,
        ville: ville || null,
        departement: departement || null,
        pays: pays || null,
        sourceAcquisition: sourceAcquisition || null,
        statut: statut || null,
        deuxiemePrenom: middleName || null,
        surnom: nickname || null,
        email: email || null,
        telephone: telephone || null,
        typeEmail: typeEmail || null,
        libelleEmail: libelleEmail || null,
        typeTelephone: typeTelephone || null,
        libelleTelephone: libelleTelephone || null,
        dateNaissance: birthday,
        genre: gender || null,
        biographie: biography || null,
        metier: occupation || null,
        languePreferee: locale || null,
        trancheAge: ageRange || null,
      },
    });
    await transaction.entrepriseContact.deleteMany({ where: { contactId } });
    if (organizationRows.length) {
      await transaction.entrepriseContact.createMany({
        data: organizationRows.map((row) => ({
          contactId,
          entrepriseId: row.entrepriseId,
          poste: row.companyPoste || null,
          service: row.companyService || null,
          type: row.companyType || "work",
          dateDebut: dateValue(row.companyStart),
          dateFin: dateValue(row.companyEnd),
        })),
      });
    }

    await transaction.contactNickname.deleteMany({ where: { contactId } });
    if (nicknames.length) await transaction.contactNickname.createMany({ data: nicknames.map((value) => ({ contactId, value })) });

    await transaction.contactEmail.deleteMany({ where: { contactId } });
    if (emails.length) await transaction.contactEmail.createMany({ data: emails.map((row) => ({ contactId, address: row.emailAddress, type: row.emailType || "other", label: row.emailLabel || null })) });

    await transaction.contactPhone.deleteMany({ where: { contactId } });
    if (phones.length) await transaction.contactPhone.createMany({ data: phones.map((row) => ({ contactId, number: row.phoneNumber, type: row.phoneType || "mobile", label: row.phoneLabel || null })) });

    await transaction.contactAddress.deleteMany({ where: { contactId } });
    if (addresses.length) await transaction.contactAddress.createMany({ data: addresses.map((row) => ({ contactId, street: row.addressStreet || null, extendedAddress: row.addressExtendedAddress || null, poBox: row.addressPoBox || null, locality: row.addressLocality || null, region: row.addressRegion || null, postalCode: row.addressPostalCode || null, country: row.addressCountry || null, type: row.addressType || "home", label: row.addressLabel || null })) });

    await transaction.contactEvent.deleteMany({ where: { contactId } });
    if (events.length) await transaction.contactEvent.createMany({ data: events.map((row) => ({ contactId, label: row.eventLabel, date: dateValue(row.eventDate) as Date, type: row.eventType || "other" })) });

    await transaction.contactRelation.deleteMany({ where: { contactId } });
    if (relations.length) await transaction.contactRelation.createMany({ data: relations.map((row) => ({ contactId, type: row.relationType || "other", relatedContactId: row.relatedContactId || null, relatedName: row.relatedName || null })) });

    await transaction.contactUrl.deleteMany({ where: { contactId } });
    if (urls.length) await transaction.contactUrl.createMany({ data: urls.map((row) => ({ contactId, url: row.urlValue, type: row.urlType || "other", label: row.urlLabel || null })) });

    await transaction.contactImClient.deleteMany({ where: { contactId } });
    if (imClients.length) await transaction.contactImClient.createMany({ data: imClients.map((row) => ({ contactId, username: row.imUsername, protocol: row.imProtocol || null, type: row.imType || "other", label: row.imLabel || null })) });

    await transaction.contactGroupMembership.deleteMany({ where: { contactId } });
    for (const nom of groups) {
      const group = await transaction.contactGroup.upsert({ where: { nom }, update: {}, create: { nom } });
      await transaction.contactGroupMembership.create({ data: { contactId, groupId: group.id } });
    }

    await transaction.contactUserDefined.deleteMany({ where: { contactId } });
    if (customFields.length) await transaction.contactUserDefined.createMany({ data: customFields.map((row) => ({ contactId, key: row.customKey, value: row.customValue })) });

    await transaction.contactInterest.deleteMany({ where: { contactId } });
    if (interests.length) await transaction.contactInterest.createMany({ data: interests.map((value) => ({ contactId, value })) });

    await transaction.contactSkill.deleteMany({ where: { contactId } });
    if (skills.length) await transaction.contactSkill.createMany({ data: skills.map((value) => ({ contactId, value })) });

    await transaction.contactProject.deleteMany({ where: { contactId } });
    if (projectIds.length) await transaction.contactProject.createMany({ data: projectIds.map((projectId) => ({ contactId, projectId, interesse: true })) });
  });

  await recordAudit({ actorId: currentUser.id, actorUsername: currentUser.username, action: "updated", entity: "contact_profile", entityId: contactId, details: "Google Contacts fields updated" });
  refreshContact(contactId);
  redirect(`/contacts/${contactId}?notice=updated`);
}

export async function addContactNote(formData: FormData) {
  const currentUser = await requirePermission("crm.write");
  const contactId = field(formData, "contactId");
  const date = dateValue(field(formData, "date"));
  const nature = field(formData, "nature");
  const contenu = field(formData, "contenu");
  if (!contactId || !date || !noteNatures.includes(nature as NoteNature) || !contenu || contenu.length > 20000) redirect(`/contacts/${contactId}?error=invalid-note`);

  const note = await prisma.contactNote.create({
    data: { contactId, date, nature: nature as NoteNature, contenu, authorId: currentUser.id, authorUsername: currentUser.username },
  });
  await recordAudit({ actorId: currentUser.id, actorUsername: currentUser.username, action: "created", entity: "contact_note", entityId: note.id, details: `contactId=${contactId};nature=${nature}` });
  refreshContact(contactId);
  redirect(`/contacts/${contactId}?notice=note-created`);
}

export async function deleteContactNote(formData: FormData) {
  const currentUser = await requirePermission("crm.write");
  const contactId = field(formData, "contactId");
  const noteId = field(formData, "noteId");
  if (!contactId || !noteId || field(formData, "confirmed") !== "yes") redirect(`/contacts/${contactId}?error=confirm-note-delete`);

  await prisma.contactNote.delete({ where: { id: noteId, contactId } });
  await recordAudit({ actorId: currentUser.id, actorUsername: currentUser.username, action: "deleted", entity: "contact_note", entityId: noteId, details: `contactId=${contactId}` });
  refreshContact(contactId);
  redirect(`/contacts/${contactId}?notice=note-deleted`);
}

export async function uploadContactPhoto(formData: FormData) {
  await requirePermission("crm.write");
  const contactId = field(formData, "contactId");
  const photo = formData.get("photo");
  if (!contactId || !(photo instanceof File) || photo.size < 1 || photo.size > 10_000_000) redirect(`/contacts/${contactId}?error=invalid-photo`);
  if (!/^(image\/jpeg|image\/png|image\/webp)$/.test(photo.type)) redirect(`/contacts/${contactId}?error=invalid-photo`);

  const source = Buffer.from(await photo.arrayBuffer());
  const metadata = await sharp(source, { limitInputPixels: 40_000_000 }).metadata();
  if (!metadata.width || !metadata.height) redirect(`/contacts/${contactId}?error=invalid-photo`);
  const optimizedPhoto = await sharp(source)
    .rotate()
    .resize(512, 512, { fit: "cover", position: "centre" })
    .webp({ quality: 78 })
    .toBuffer();
  if (optimizedPhoto.length > 600_000) redirect(`/contacts/${contactId}?error=photo-too-large`);

  await prisma.contact.update({ where: { id: contactId }, data: { photoProfil: optimizedPhoto, photoProfilType: "image/webp" } });
  refreshContact(contactId);
  redirect(`/contacts/${contactId}?notice=photo-updated`);
}

export async function deleteContactPhoto(formData: FormData) {
  await requirePermission("crm.write");
  const contactId = field(formData, "contactId");
  if (!contactId) redirect("/contacts?error=not-found");
  await prisma.contact.update({ where: { id: contactId }, data: { photoProfil: null, photoProfilType: null } });
  refreshContact(contactId);
  redirect(`/contacts/${contactId}?notice=photo-deleted`);
}
