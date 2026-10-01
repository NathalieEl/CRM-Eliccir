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

export function hasPermission(role: string, permission: Permission) {
  return (rolePermissions[role as UserRole] ?? []).includes(permission);
}

export async function requirePermission(permission: Permission) {
  const user = await getCurrentUser();
  if (!user || !user.active || !hasPermission(user.role, permission)) redirect("/");
  return user;
}