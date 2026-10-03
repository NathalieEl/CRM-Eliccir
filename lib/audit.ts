import { prisma } from "@/lib/prisma";

type AuditInput = {
  actorId?: string | null;
  actorUsername: string;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
};

export async function recordAudit(input: AuditInput) {
  try {
    await prisma.auditLog.create({ data: input });
  } catch (error) {
    console.error("Unable to record audit event", error);
  }
}