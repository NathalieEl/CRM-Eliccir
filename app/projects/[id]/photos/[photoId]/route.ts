import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { getProjectPhoto, isProjectPhotoStorageConfigured } from "@/lib/project-photo-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  await requirePermission("crm.read");
  if (!isProjectPhotoStorageConfigured()) return new Response(null, { status: 503 });

  const { id: propertyId, photoId } = await params;
  const photo = await prisma.propertyPhoto.findFirst({ where: { id: photoId, propertyId }, select: { objectKey: true } });
  if (!photo) return new Response(null, { status: 404 });

  try {
    const body = await getProjectPhoto(photo.objectKey);
    if (!body) return new Response(null, { status: 404 });
    return new Response(body, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    console.error("Unable to retrieve a project photo", error);
    return new Response(null, { status: 503 });
  }
}