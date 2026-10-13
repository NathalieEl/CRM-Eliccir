"use server";

import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { recordAudit } from "@/lib/audit";
import {
  deleteProjectPhotoObject,
  isProjectPhotoStorageConfigured,
  projectPhotoObjectKey,
  putProjectPhoto,
} from "@/lib/project-photo-storage";

const maxPhotosPerProject = 20;
const maxUploadBytes = 10_000_000;
const maxOptimizedBytes = 2_000_000;
const acceptedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function projectPath(propertyId: string, key: "photoError" | "photoNotice", value: string) {
  return `/projects/${propertyId}?${key}=${value}`;
}

function refreshProject(propertyId: string) {
  revalidatePath("/projects");
  revalidatePath(`/projects/${propertyId}`);
}

export async function uploadProjectPhoto(formData: FormData) {
  const user = await requirePermission("crm.write");
  const propertyId = field(formData, "propertyId");
  const photo = formData.get("photo");
  const caption = field(formData, "caption");
  if (!propertyId) redirect("/projects");
  if (!isProjectPhotoStorageConfigured()) redirect(projectPath(propertyId, "photoError", "storage"));
  if (!(photo instanceof File) || photo.size < 1 || photo.size > maxUploadBytes || !acceptedPhotoTypes.has(photo.type)) {
    redirect(projectPath(propertyId, "photoError", "invalid-file"));
  }
  if (caption.length > 240) redirect(projectPath(propertyId, "photoError", "invalid-caption"));

  const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true, title: true } });
  if (!property) redirect("/projects?error=not-found");

  const [photoCount, lastPhoto] = await Promise.all([
    prisma.propertyPhoto.count({ where: { propertyId } }),
    prisma.propertyPhoto.findFirst({ where: { propertyId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } }),
  ]);
  if (photoCount >= maxPhotosPerProject) redirect(projectPath(propertyId, "photoError", "limit"));

  let optimizedPhoto: Buffer;
  try {
    const source = Buffer.from(await photo.arrayBuffer());
    const metadata = await sharp(source, { limitInputPixels: 40_000_000 }).metadata();
    if (!metadata.width || !metadata.height) redirect(projectPath(propertyId, "photoError", "invalid-file"));
    optimizedPhoto = await sharp(source, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    redirect(projectPath(propertyId, "photoError", "invalid-file"));
  }
  if (optimizedPhoto.length > maxOptimizedBytes) redirect(projectPath(propertyId, "photoError", "too-large"));

  const photoId = randomUUID();
  const objectKey = projectPhotoObjectKey(propertyId, photoId);
  try {
    await putProjectPhoto(objectKey, optimizedPhoto);
    await prisma.propertyPhoto.create({
      data: {
        id: photoId,
        propertyId,
        objectKey,
        caption: caption || null,
        sortOrder: (lastPhoto?.sortOrder ?? -1) + 1,
        isCover: photoCount === 0,
      },
    });
  } catch (error) {
    try {
      await deleteProjectPhotoObject(objectKey);
    } catch (cleanupError) {
      console.error("Unable to clean up an unlisted project photo", cleanupError);
    }
    console.error("Unable to save a project photo", error);
    redirect(projectPath(propertyId, "photoError", "upload-failed"));
  }

  await recordAudit({ actorId: user.id, actorUsername: user.username, action: "uploaded", entity: "property_photo", entityId: photoId, details: `propertyId=${propertyId}` });
  refreshProject(propertyId);
  redirect(projectPath(propertyId, "photoNotice", "added"));
}

export async function updateProjectPhotoCaption(formData: FormData) {
  const user = await requirePermission("crm.write");
  const propertyId = field(formData, "propertyId");
  const photoId = field(formData, "photoId");
  const caption = field(formData, "caption");
  if (!propertyId || !photoId) redirect("/projects");
  if (caption.length > 240) redirect(projectPath(propertyId, "photoError", "invalid-caption"));

  const photo = await prisma.propertyPhoto.findFirst({ where: { id: photoId, propertyId }, select: { id: true } });
  if (!photo) redirect(projectPath(propertyId, "photoError", "not-found"));
  await prisma.propertyPhoto.update({ where: { id: photo.id }, data: { caption: caption || null } });
  await recordAudit({ actorId: user.id, actorUsername: user.username, action: "updated", entity: "property_photo", entityId: photoId, details: `propertyId=${propertyId}; field=caption` });
  refreshProject(propertyId);
  redirect(projectPath(propertyId, "photoNotice", "updated"));
}

export async function setProjectCoverPhoto(formData: FormData) {
  const user = await requirePermission("crm.write");
  const propertyId = field(formData, "propertyId");
  const photoId = field(formData, "photoId");
  if (!propertyId || !photoId) redirect("/projects");
  const photo = await prisma.propertyPhoto.findFirst({ where: { id: photoId, propertyId }, select: { id: true } });
  if (!photo) redirect(projectPath(propertyId, "photoError", "not-found"));

  await prisma.$transaction([
    prisma.propertyPhoto.updateMany({ where: { propertyId }, data: { isCover: false } }),
    prisma.propertyPhoto.update({ where: { id: photo.id }, data: { isCover: true } }),
  ]);
  await recordAudit({ actorId: user.id, actorUsername: user.username, action: "set_cover", entity: "property_photo", entityId: photoId, details: `propertyId=${propertyId}` });
  refreshProject(propertyId);
  redirect(projectPath(propertyId, "photoNotice", "cover-updated"));
}

export async function moveProjectPhoto(formData: FormData) {
  const user = await requirePermission("crm.write");
  const propertyId = field(formData, "propertyId");
  const photoId = field(formData, "photoId");
  const direction = field(formData, "direction");
  if (!propertyId || !photoId) redirect("/projects");
  if (direction !== "up" && direction !== "down") redirect(projectPath(propertyId, "photoError", "invalid-order"));

  const photos = await prisma.propertyPhoto.findMany({ where: { propertyId, isCover: false }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  const index = photos.findIndex((photo) => photo.id === photoId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= photos.length) redirect(projectPath(propertyId, "photoError", "invalid-order"));
  const current = photos[index];
  const target = photos[targetIndex];

  await prisma.$transaction([
    prisma.propertyPhoto.update({ where: { id: current.id }, data: { sortOrder: target.sortOrder } }),
    prisma.propertyPhoto.update({ where: { id: target.id }, data: { sortOrder: current.sortOrder } }),
  ]);
  await recordAudit({ actorId: user.id, actorUsername: user.username, action: "reordered", entity: "property_photo", entityId: photoId, details: `propertyId=${propertyId}` });
  refreshProject(propertyId);
  redirect(projectPath(propertyId, "photoNotice", "order-updated"));
}

export async function deleteProjectPhoto(formData: FormData) {
  const user = await requirePermission("crm.write");
  const propertyId = field(formData, "propertyId");
  const photoId = field(formData, "photoId");
  if (!propertyId || !photoId) redirect("/projects");
  const photo = await prisma.propertyPhoto.findFirst({ where: { id: photoId, propertyId } });
  if (!photo) redirect(projectPath(propertyId, "photoError", "not-found"));

  try {
    await deleteProjectPhotoObject(photo.objectKey);
  } catch (error) {
    console.error("Unable to delete a project photo from storage", error);
    redirect(projectPath(propertyId, "photoError", "delete-failed"));
  }

  const replacement = photo.isCover
    ? await prisma.propertyPhoto.findFirst({ where: { propertyId, id: { not: photoId } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] })
    : null;
  await prisma.$transaction(async (transaction) => {
    await transaction.propertyPhoto.delete({ where: { id: photoId } });
    if (replacement) await transaction.propertyPhoto.update({ where: { id: replacement.id }, data: { isCover: true } });
  });
  await recordAudit({ actorId: user.id, actorUsername: user.username, action: "deleted", entity: "property_photo", entityId: photoId, details: `propertyId=${propertyId}` });
  refreshProject(propertyId);
  redirect(projectPath(propertyId, "photoNotice", "deleted"));
}