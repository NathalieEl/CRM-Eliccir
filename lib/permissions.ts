import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export type UserRole = "admin" | "management" | "sales" | "member";
export type Permission = "users.manage" | "maintenance.manage" | "crm.read" | "crm.write";

const rolePermissions: Record<UserRole, Permission[]> = {
  admin: ["users.manage", "maintenance.manage", "crm.read", "crm.write"],
  management: ["crm.read", "crm.write"],
  sales: ["crm.read", "crm.write"],
  member: ["crm.read"],
};

export const roleLabels: Record<UserRole, string> = {
  admin: "Administrateur",
  management: "Direction",
  sales: "Opérations commerciales",
  member: "Membre",
};

export const roleDefinitions: Record<UserRole, string> = {
  admin: "Accès complet au CRM, gestion des comptes utilisateurs et configuration des options de maintenance.",
  management: "Consultation et modification de toutes les fiches CRM. Pas de gestion des comptes utilisateurs ni des options de maintenance.",
  sales: "Consultation et modification de toutes les fiches CRM. Pas de gestion des comptes utilisateurs ni des options de maintenance.",
  member: "Consultation des fiches CRM uniquement. Aucune création, modification, suppression ou gestion administrative.",
};

export function hasPermission(role: string, permission: Permission) {
  return (rolePermissions[role as UserRole] ?? []).includes(permission);
}

export async function requirePermission(permission: Permission) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?error=session-expired");
  if (user.mustChangePassword) redirect("/login?error=password-setup-required");
  if (!user.active || !hasPermission(user.role, permission)) redirect("/");
  return user;
}