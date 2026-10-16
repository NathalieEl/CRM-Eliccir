"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { recordAudit } from "@/lib/audit";
import { convertBudgetAmounts, formatCurrencyAmount } from "@/lib/number-format";
import type { Prisma } from "@/app/generated/prisma/client";

const propertyTypes = ["PROJECT", "VILLA", "HOUSE", "APARTMENT", "LAND", "LOT", "COMMERCIAL", "BUILDING", "WAREHOUSE", "GUESTHOUSE_HOTEL"] as const;
const projectAssetTypes = ["LAND", "LOT", "VILLA", "HOUSE", "APARTMENT", "COMMERCIAL", "BUILDING", "WAREHOUSE", "GUESTHOUSE_HOTEL"] as const;
const propertyStatuses = ["AVAILABLE", "UNDER_OFFER", "SOLD", "RENTED", "WITHDRAWN"] as const;
const propertyConditions = ["NEW", "GOOD", "TO_RENOVATE", "OFF_PLAN"] as const;
const furnishings = ["FURNISHED", "SEMI_FURNISHED", "UNFURNISHED"] as const;
const waterSources = ["PDAM", "WELL", "BOTH", "NONE"] as const;
const zoningTypes = ["RESIDENTIAL", "TOURISM", "COMMERCIAL", "MIXED", "AGRICULTURAL_PROTECTED", "UNKNOWN"] as const;
const buildingPermitStatuses = ["PBG_OBTAINED", "SLF_OBTAINED", "LEGACY_IMB", "NONE", "UNKNOWN"] as const;
const landRightTypes = ["HAK_MILIK", "HGB", "HAK_PAKAI", "HAK_SEWA", "HMSRS", "GIRIK", "UNKNOWN"] as const;
const holdingStructures = ["INDIVIDUAL", "LOCAL_COMPANY", "PT_PMA"] as const;
const documentTypes = ["LAND_CERTIFICATE", "PBG", "SLF", "PBB_RECEIPT", "MANDATE", "PPJB", "AJB", "LEASE_AGREEMENT", "OTHER"] as const;
const budgetCurrencies = ["EUR", "USD", "IDR"] as const;

type LandTitleData = Omit<Prisma.LandTitleUncheckedCreateInput, "id" | "propertyId">;
type PropertyDocumentInput = {
  id: string;
  type: (typeof documentTypes)[number];
  name: string;
  url: string | null;
  issuedAt: Date | null;
  expiresAt: Date | null;
  dealId: string | null;
};

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function optionalNumber(formData: FormData, name: string, integer = false): number | null | undefined {
  const value = field(formData, name);
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) && (!integer || Number.isInteger(number)) ? number : undefined;
}

function optionalDate(formData: FormData, name: string): Date | null | undefined {
  const value = field(formData, name);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function optionalBoolean(formData: FormData, name: string): boolean | null | undefined {
  const value = field(formData, name);
  if (!value) return null;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function enumValue<const T extends readonly string[]>(formData: FormData, name: string, values: T, required = false): T[number] | null | undefined {
  const value = field(formData, name);
  if (!value) return required ? undefined : null;
  return values.includes(value) ? value : undefined;
}

function stringList(formData: FormData, name: string, maxLength: number) {
  return field(formData, name)
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 100)
    .map((value) => value.slice(0, maxLength));
}

function parseLandTitle(formData: FormData): LandTitleData | null | undefined {
  if (field(formData, "deleteLandTitle") === "on") return null;
  const rightType = enumValue(formData, "rightType", landRightTypes);
  const hasLandTitleInput = ["landTitleId", "rightType", "certificateNumber", "nib", "holderName", "holdingStructure", "verifiedWithBpn", "verifiedAt", "expiryDate", "remainingYears", "extensionPossible", "extensionCost", "leaseStartDate", "leaseEndDate", "renewalOption", "lessorName", "landTitleNotes"].some((name) => field(formData, name));
  if (!hasLandTitleInput) return null;
  if (!rightType) return undefined;

  const holdingStructure = enumValue(formData, "holdingStructure", holdingStructures);
  const verifiedAt = optionalDate(formData, "verifiedAt");
  const expiryDate = optionalDate(formData, "expiryDate");
  const remainingYears = optionalNumber(formData, "remainingYears");
  const extensionCost = optionalNumber(formData, "extensionCost");
  const extensionPossible = optionalBoolean(formData, "extensionPossible");
  const leaseStartDate = optionalDate(formData, "leaseStartDate");
  const leaseEndDate = optionalDate(formData, "leaseEndDate");
  const renewalOption = optionalBoolean(formData, "renewalOption");
  if ([holdingStructure, verifiedAt, expiryDate, remainingYears, extensionCost, extensionPossible, leaseStartDate, leaseEndDate, renewalOption].includes(undefined)) return undefined;

  return {
    rightType,
    certificateNumber: field(formData, "certificateNumber") || null,
    nib: field(formData, "nib") || null,
    holderName: field(formData, "holderName") || null,
    holdingStructure,
    verifiedWithBpn: field(formData, "verifiedWithBpn") === "on",
    verifiedAt,
    expiryDate,
    remainingYears,
    extensionPossible,
    extensionCost,
    leaseStartDate,
    leaseEndDate,
    renewalOption,
    lessorName: field(formData, "lessorName") || null,
    notes: field(formData, "landTitleNotes") || null,
  };
}

function parseProperty(formData: FormData) {
  const type = enumValue(formData, "type", propertyTypes, true);
  const status = enumValue(formData, "status", propertyStatuses, true);
  const condition = enumValue(formData, "condition", propertyConditions);
  const furnishing = enumValue(formData, "furnishing", furnishings);
  const waterSource = enumValue(formData, "waterSource", waterSources);
  const zoning = enumValue(formData, "zoning", zoningTypes);
  const buildingPermit = enumValue(formData, "buildingPermit", buildingPermitStatuses);
  const numbers = {
    projectProgression: optionalNumber(formData, "projectProgression", true),
    yearBuilt: optionalNumber(formData, "yearBuilt", true),
    yearRenovated: optionalNumber(formData, "yearRenovated", true),
    latitude: optionalNumber(formData, "latitude"),
    longitude: optionalNumber(formData, "longitude"),
    distanceBeachKm: optionalNumber(formData, "distanceBeachKm"),
    distanceAirportKm: optionalNumber(formData, "distanceAirportKm"),
    accessRoadWidthM: optionalNumber(formData, "accessRoadWidthM"),
    landAreaSqm: optionalNumber(formData, "landAreaSqm"),
    buildingAreaSqm: optionalNumber(formData, "buildingAreaSqm"),
    bedrooms: optionalNumber(formData, "bedrooms", true),
    bathrooms: optionalNumber(formData, "bathrooms", true),
    floors: optionalNumber(formData, "floors", true),
    parkingSpaces: optionalNumber(formData, "parkingSpaces", true),
    electricityVA: optionalNumber(formData, "electricityVA", true),
    estimatedYieldPct: optionalNumber(formData, "estimatedYieldPct"),
    occupancyRatePct: optionalNumber(formData, "occupancyRatePct"),
    banjarFeesMonthly: optionalNumber(formData, "banjarFeesMonthly"),
    floodRisk: optionalBoolean(formData, "floodRisk"),
    foreignerEligible: optionalBoolean(formData, "foreignerEligible"),
  };
  const landTitle = parseLandTitle(formData);
  const reference = field(formData, "reference");
  const title = field(formData, "title");
  const ownerId = field(formData, "ownerId");
  const entrepriseId = field(formData, "entrepriseId");
  const landParcelId = field(formData, "landParcelId");
  const country = field(formData, "country");
  const projectStatus = field(formData, "projectStatus");
  const legacyProjectBudget = field(formData, "projectBudget");
  const projectBudgetAmount = optionalNumber(formData, "projectBudgetAmount");
  const projectBudgetCurrency = enumValue(formData, "projectBudgetCurrency", budgetCurrencies);
  const projectBudgetRateEurUsd = optionalNumber(formData, "projectBudgetRateEurUsd");
  const projectBudgetRateEurIdr = optionalNumber(formData, "projectBudgetRateEurIdr");
  const projectBudgetRateUsdIdr = optionalNumber(formData, "projectBudgetRateUsdIdr");
  const projectBudgetRateDate = optionalDate(formData, "projectBudgetRateDate");
  const submittedBudgetRates = [projectBudgetRateEurUsd, projectBudgetRateEurIdr, projectBudgetRateUsdIdr];
  const hasBudgetRates = submittedBudgetRates.some((rate) => rate !== null);
  const completeBudgetRates = submittedBudgetRates.every((rate) => rate !== null && rate !== undefined && rate > 0);

  if (!type || !status || condition === undefined || furnishing === undefined || waterSource === undefined || zoning === undefined || buildingPermit === undefined || landTitle === undefined || Object.values(numbers).includes(undefined)) return null;
  if (projectBudgetAmount === undefined || projectBudgetCurrency === undefined || projectBudgetRateEurUsd === undefined || projectBudgetRateEurIdr === undefined || projectBudgetRateUsdIdr === undefined || projectBudgetRateDate === undefined) return null;
  if (hasBudgetRates && (!completeBudgetRates || !projectBudgetRateDate)) return null;
  if (projectBudgetAmount !== null && (projectBudgetAmount < 0 || !projectBudgetCurrency)) return null;
  if ((numbers.latitude !== null && numbers.latitude !== undefined && Math.abs(numbers.latitude) > 90) || (numbers.longitude !== null && numbers.longitude !== undefined && Math.abs(numbers.longitude) > 180)) return null;
  if (reference.length < 2 || reference.length > 80 || title.length < 2 || title.length > 200 || ownerId.length > 64 || entrepriseId.length > 64 || landParcelId.length > 64 || country.length > 80 || projectStatus.length > 40 || legacyProjectBudget.length > 80 || (numbers.projectProgression !== null && numbers.projectProgression !== undefined && (numbers.projectProgression < 0 || numbers.projectProgression > 100))) return null;

  const ratesForCalculation = completeBudgetRates && projectBudgetRateEurUsd !== null && projectBudgetRateEurIdr !== null && projectBudgetRateUsdIdr !== null
    ? { eurUsd: projectBudgetRateEurUsd, eurIdr: projectBudgetRateEurIdr, usdIdr: projectBudgetRateUsdIdr }
    : null;
  const budgetAmounts = convertBudgetAmounts(projectBudgetAmount, projectBudgetCurrency ?? null, ratesForCalculation);
  const projectBudget = projectBudgetAmount !== null && projectBudgetCurrency
    ? formatCurrencyAmount(projectBudgetAmount, projectBudgetCurrency)
    : legacyProjectBudget;

  const property: Prisma.PropertyUncheckedCreateInput = {
    reference,
    title,
    description: field(formData, "description") || null,
    type,
    status,
    condition,
    ...numbers,
    ownerId: ownerId || null,
    entrepriseId: entrepriseId || null,
    landParcelId: landParcelId || null,
    country: country || null,
    projectStatus: projectStatus || null,
    projectBudget: projectBudget || null,
    projectBudgetAmount,
    projectBudgetCurrency: projectBudgetAmount === null ? null : projectBudgetCurrency,
    projectBudgetEur: budgetAmounts.EUR,
    projectBudgetUsd: budgetAmounts.USD,
    projectBudgetIdr: budgetAmounts.IDR,
    projectBudgetRateEurUsd: projectBudgetAmount !== null ? projectBudgetRateEurUsd : null,
    projectBudgetRateEurIdr: projectBudgetAmount !== null ? projectBudgetRateEurIdr : null,
    projectBudgetRateUsdIdr: projectBudgetAmount !== null ? projectBudgetRateUsdIdr : null,
    projectBudgetRateDate: projectBudgetAmount !== null ? projectBudgetRateDate : null,
    address: field(formData, "address") || null,
    kecamatan: field(formData, "kecamatan") || null,
    kabupaten: field(formData, "kabupaten") || null,
    province: field(formData, "province") || null,
    postalCode: field(formData, "postalCode") || null,
    neighborhood: field(formData, "neighborhood") || null,
    accessRoadType: field(formData, "accessRoadType") || null,
    views: stringList(formData, "views", 120),
    bedrooms: numbers.bedrooms,
    bathrooms: numbers.bathrooms,
    floors: numbers.floors,
    hasPool: field(formData, "hasPool") === "on",
    hasGarden: field(formData, "hasGarden") === "on",
    parkingSpaces: numbers.parkingSpaces,
    furnishing,
    amenities: stringList(formData, "amenities", 120),
    electricityVA: numbers.electricityVA,
    sanitation: field(formData, "sanitation") || null,
    internetProvider: field(formData, "internetProvider") || null,
    staffIncluded: stringList(formData, "staffIncluded", 120),
    managementCompany: field(formData, "managementCompany") || null,
    foreignerEligibleNote: field(formData, "foreignerEligibleNote") || null,
  };

  return { property, landTitle };
}

function parseDocuments(formData: FormData): PropertyDocumentInput[] | null {
  const deletedIds = new Set(formData.getAll("deleteDocumentId").map((value) => typeof value === "string" ? value.trim() : ""));
  const ids = formData.getAll("documentId").map((value) => typeof value === "string" ? value.trim() : "");
  const types = formData.getAll("documentType").map((value) => typeof value === "string" ? value.trim() : "");
  const names = formData.getAll("documentName").map((value) => typeof value === "string" ? value.trim() : "");
  const urls = formData.getAll("documentUrl").map((value) => typeof value === "string" ? value.trim() : "");
  const issuedDates = formData.getAll("documentIssuedAt").map((value) => typeof value === "string" ? value.trim() : "");
  const expiresDates = formData.getAll("documentExpiresAt").map((value) => typeof value === "string" ? value.trim() : "");
  const dealIds = formData.getAll("documentDealId").map((value) => typeof value === "string" ? value.trim() : "");
  const count = Math.max(ids.length, types.length, names.length, urls.length, issuedDates.length, expiresDates.length, dealIds.length);
  if (count > 100) return null;

  const documents: PropertyDocumentInput[] = [];
  for (let index = 0; index < count; index += 1) {
    const id = ids[index] ?? "";
    const name = names[index] ?? "";
    const rawType = types[index] ?? "";
    if (id && deletedIds.has(id)) continue;
    if (!id && !name && !rawType && !(urls[index] ?? "") && !(issuedDates[index] ?? "") && !(expiresDates[index] ?? "") && !(dealIds[index] ?? "")) continue;
    if (!name || name.length > 200 || !documentTypes.includes(rawType as (typeof documentTypes)[number]) || id.length > 64 || (dealIds[index] ?? "").length > 64) return null;
    const issuedAt = issuedDates[index] ? new Date(issuedDates[index]!) : null;
    const expiresAt = expiresDates[index] ? new Date(expiresDates[index]!) : null;
    if ((issuedAt && Number.isNaN(issuedAt.getTime())) || (expiresAt && Number.isNaN(expiresAt.getTime()))) return null;
    documents.push({
      id,
      type: rawType as (typeof documentTypes)[number],
      name,
      url: urls[index] || null,
      issuedAt,
      expiresAt,
      dealId: dealIds[index] || null,
    });
  }
  return documents;
}

export async function createProperty(formData: FormData) {
  const user = await requirePermission("crm.write");
  const parsed = parseProperty(formData);
  const documents = parseDocuments(formData);
  const projectName = field(formData, "projectName");
  if (!parsed || !documents) redirect("/projects/new?error=invalid");
  if (projectName.length < 2 || projectName.length > 200 || parsed.property.type !== "LAND") redirect("/projects/new?error=first-land-required");

  let createdId = "";
  try {
    await prisma.$transaction(async (transaction) => {
      const project = await transaction.project.create({
        data: {
          entrepriseId: parsed.property.entrepriseId,
          nom: projectName,
          pays: parsed.property.country,
          ville: parsed.property.kabupaten,
          statut: parsed.property.projectStatus || "En cours",
          budget: parsed.property.projectBudget,
          progression: parsed.property.projectProgression ?? 0,
        },
      });
      const property = await transaction.property.create({ data: { ...parsed.property, projectId: project.id } });
      createdId = property.id;
      if (parsed.landTitle) await transaction.landTitle.create({ data: { ...parsed.landTitle, propertyId: property.id } });
      for (const document of documents) {
        if (document.id || document.dealId) throw new Error("Related document references are not allowed when creating a property");
        await transaction.propertyDocument.create({
          data: {
            type: document.type,
            name: document.name,
            url: document.url,
            issuedAt: document.issuedAt,
            expiresAt: document.expiresAt,
            dealId: document.dealId,
            propertyId: property.id,
          },
        });
      }
    });
    await recordAudit({ actorId: user.id, actorUsername: user.username, action: "created", entity: "property", entityId: createdId, details: `reference=${parsed.property.reference}` });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") redirect("/projects/new?error=reference-exists");
    throw error;
  }

  revalidatePath("/projects");
  revalidatePath("/");
  redirect(`/projects/${createdId}?notice=created`);
}

export async function createProjectAsset(formData: FormData) {
  const user = await requirePermission("crm.write");
  const projectId = field(formData, "projectId");
  const returnPropertyId = field(formData, "returnPropertyId");
  const reference = field(formData, "reference");
  const title = field(formData, "title");
  const type = enumValue(formData, "type", projectAssetTypes, true);
  const status = enumValue(formData, "status", propertyStatuses, true);
  const requestedLandParcelId = field(formData, "landParcelId");

  if (!projectId || !returnPropertyId || projectId.length > 64 || returnPropertyId.length > 64 || reference.length < 2 || reference.length > 80 || title.length < 2 || title.length > 200 || !type || !status) {
    redirect(`/projects/${returnPropertyId}?error=asset-invalid`);
  }
  if ((type === "LAND" && requestedLandParcelId) || (type !== "LAND" && !requestedLandParcelId)) {
    redirect(`/projects/${returnPropertyId}?error=asset-land-required`);
  }

  const [project, anchor] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { id: true } }),
    prisma.property.findFirst({
      where: { id: returnPropertyId, OR: [{ projectId }, { legacyProjectId: projectId }] },
      select: { id: true },
    }),
  ]);
  if (!project || !anchor) redirect("/projects?error=not-found");

  if (requestedLandParcelId) {
    const landParcel = await prisma.property.findFirst({
      where: {
        id: requestedLandParcelId,
        type: "LAND",
        OR: [{ projectId }, { legacyProjectId: projectId }],
      },
      select: { id: true },
    });
    if (!landParcel) redirect(`/projects/${returnPropertyId}?error=asset-land-required`);
  }

  try {
    const property = await prisma.property.create({
      data: {
        reference,
        title,
        type,
        status,
        projectId,
        landParcelId: requestedLandParcelId || null,
        views: [],
        amenities: [],
        staffIncluded: [],
      },
      select: { id: true },
    });
    await recordAudit({ actorId: user.id, actorUsername: user.username, action: "created", entity: "property", entityId: property.id, details: `projectId=${projectId}; type=${type}; reference=${reference}` });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
      redirect(`/projects/${returnPropertyId}?error=reference-exists`);
    }
    throw error;
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${returnPropertyId}`);
  redirect(`/projects/${returnPropertyId}?notice=asset-created`);
}

export async function updateProjectGroupName(formData: FormData) {
  const user = await requirePermission("crm.write");
  const projectId = field(formData, "projectId");
  const returnPropertyId = field(formData, "returnPropertyId");
  const projectName = field(formData, "projectName");
  if (!projectId || !returnPropertyId || projectName.length < 2 || projectName.length > 200) redirect("/projects?error=invalid");

  const [project, anchor] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { id: true } }),
    prisma.property.findFirst({ where: { id: returnPropertyId, OR: [{ projectId }, { legacyProjectId: projectId }] }, select: { id: true } }),
  ]);
  if (!project || !anchor) redirect("/projects?error=not-found");

  await prisma.project.update({ where: { id: projectId }, data: { nom: projectName } });
  await recordAudit({ actorId: user.id, actorUsername: user.username, action: "updated", entity: "project", entityId: projectId, details: "field=nom" });
  revalidatePath("/projects");
  revalidatePath(`/projects/${returnPropertyId}`);
  redirect(`/projects/${returnPropertyId}?notice=project-name-updated`);
}

export async function updateProperty(formData: FormData) {
  const user = await requirePermission("crm.write");
  const id = field(formData, "id");
  const parsed = parseProperty(formData);
  const documents = parseDocuments(formData);
  const deletedDocumentIds = formData.getAll("deleteDocumentId").map((value) => typeof value === "string" ? value.trim() : "").filter(Boolean);
  if (!id || id.length > 64) redirect("/projects?error=not-found");
  if (!parsed || !documents) redirect(`/projects/${id}?error=invalid`);

  const structure = await prisma.property.findUnique({
    where: { id },
    select: { projectId: true, legacyProjectId: true, landParcelId: true, derivedProperties: { select: { id: true } } },
  });
  if (!structure) redirect("/projects?error=not-found");
  if (parsed.property.type === "LAND" && parsed.property.landParcelId) redirect(`/projects/${id}?error=asset-land-required`);
  if (structure.landParcelId && parsed.property.type !== "LAND" && !parsed.property.landParcelId) redirect(`/projects/${id}?error=asset-land-required`);
  if (structure.landParcelId && parsed.property.type === "LAND") redirect(`/projects/${id}?error=asset-land-required`);
  if (structure.derivedProperties.length && parsed.property.type !== "LAND") redirect(`/projects/${id}?error=land-has-assets`);
  if (parsed.property.landParcelId) {
    const projectId = structure.projectId ?? structure.legacyProjectId;
    const landParcel = projectId ? await prisma.property.findFirst({
      where: {
        id: parsed.property.landParcelId,
        type: "LAND",
        OR: [{ projectId }, { legacyProjectId: projectId }],
      },
      select: { id: true },
    }) : null;
    if (!landParcel) redirect(`/projects/${id}?error=asset-land-required`);
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const current = await transaction.property.findUnique({ where: { id }, select: { legacyProjectId: true, projectId: true } });
      await transaction.property.update({ where: { id }, data: parsed.property });
      const legacyProjectData = {
        entrepriseId: parsed.property.entrepriseId,
        nom: parsed.property.title,
        pays: parsed.property.country,
        ville: parsed.property.kabupaten,
        statut: parsed.property.projectStatus || "En cours",
        budget: parsed.property.projectBudget,
        progression: parsed.property.projectProgression ?? 0,
      };
      if (current?.legacyProjectId) {
        await transaction.project.update({ where: { id: current.legacyProjectId }, data: legacyProjectData });
      } else if (!current?.projectId) {
        const legacyProject = await transaction.project.create({ data: legacyProjectData });
        await transaction.property.update({ where: { id }, data: { legacyProjectId: legacyProject.id } });
      }
      if (parsed.landTitle) {
        await transaction.landTitle.upsert({ where: { propertyId: id }, create: { ...parsed.landTitle, propertyId: id }, update: parsed.landTitle });
      } else {
        await transaction.landTitle.deleteMany({ where: { propertyId: id } });
      }
      if (deletedDocumentIds.length) await transaction.propertyDocument.deleteMany({ where: { id: { in: deletedDocumentIds }, propertyId: id } });

      for (const document of documents) {
        if (document.dealId) {
          const relatedDeal = await transaction.deal.findFirst({ where: { id: document.dealId, propertyId: id }, select: { id: true } });
          if (!relatedDeal) throw new Error("Invalid property deal reference");
        }
        const data = { type: document.type, name: document.name, url: document.url, issuedAt: document.issuedAt, expiresAt: document.expiresAt, dealId: document.dealId };
        if (document.id) {
          const updated = await transaction.propertyDocument.updateMany({ where: { id: document.id, propertyId: id }, data });
          if (updated.count !== 1) throw new Error("Invalid property document reference");
        } else {
          await transaction.propertyDocument.create({ data: { ...data, propertyId: id } });
        }
      }
    });
    await recordAudit({ actorId: user.id, actorUsername: user.username, action: "updated", entity: "property", entityId: id, details: `reference=${parsed.property.reference}` });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2025") redirect("/projects?error=not-found");
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") redirect(`/projects/${id}?error=reference-exists`);
    throw error;
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath("/");
  redirect(`/projects/${id}?notice=updated`);
}

export async function deleteProperty(formData: FormData) {
  const user = await requirePermission("crm.write");
  const id = field(formData, "id");
  if (!id || id.length > 64) redirect("/projects?error=not-found");
  if (field(formData, "confirmed") !== "yes") redirect(`/projects/${id}?error=confirm-delete`);

  try {
    const property = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.property.findUnique({ where: { id }, select: { title: true, reference: true, legacyProjectId: true } });
      if (!existing) return null;
      await transaction.property.delete({ where: { id } });
      if (existing.legacyProjectId) await transaction.project.deleteMany({ where: { id: existing.legacyProjectId } });
      return existing;
    });
    if (!property) redirect("/projects?error=not-found");
    await recordAudit({ actorId: user.id, actorUsername: user.username, action: "deleted", entity: "property", entityId: id, details: `reference=${property.reference}; title=${property.title}` });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2025") redirect("/projects?error=not-found");
    throw error;
  }

  revalidatePath("/projects");
  revalidatePath("/");
  revalidatePath("/search");
  redirect("/projects?notice=deleted");
}