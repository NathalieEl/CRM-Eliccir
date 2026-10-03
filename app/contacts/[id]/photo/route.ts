import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

type PhotoRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: PhotoRouteContext) {
  await requirePermission("crm.read");
  const { id } = await params;
  const contact = await prisma.contact.findUnique({
    where: { id },
    select: { photoProfil: true, photoProfilType: true },
  });
  if (!contact?.photoProfil || !contact.photoProfilType) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(contact.photoProfil), {
    headers: {
      "Content-Type": contact.photoProfilType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
