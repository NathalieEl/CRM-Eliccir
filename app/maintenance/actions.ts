"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function createLookupOption(formData: FormData) {
  await requireAdmin();
  const category = field(formData, "category");
  const label = field(formData, "label");
  const value = field(formData, "value") || label;
  const sortOrder = Number(formData.get("sortOrder") ?? 0);

  if (!category || !label || !value || !Number.isInteger(sortOrder)) redirect("/maintenance?error=invalid");

  try {
    await prisma.lookupOption.create({ data: { category, label, value, sortOrder } });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") redirect("/maintenance?error=exists");
    throw error;
  }

  redirect("/maintenance?notice=created");
}

export async function toggleLookupOption(formData: FormData) {
  await requireAdmin();
  const id = field(formData, "id");
  const active = formData.get("active") === "true";
  if (id) await prisma.lookupOption.update({ where: { id }, data: { active: !active } });
  redirect("/maintenance");
}

export async function deleteLookupOption(formData: FormData) {
  await requireAdmin();
  const id = field(formData, "id");
  if (id) await prisma.lookupOption.delete({ where: { id } });
  redirect("/maintenance");
}
