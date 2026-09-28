"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function parseProject(formData: FormData) {
  const nom = field(formData, "nom");
  const pays = field(formData, "pays");
  const ville = field(formData, "ville");
  const statut = field(formData, "statut") || "En cours";
  const budget = field(formData, "budget");
  const progressionRaw = field(formData, "progression");

  const progression = Number(progressionRaw || "0");

  if (
    nom.length < 2 ||
    nom.length > 120 ||
    pays.length > 80 ||
    ville.length > 80 ||
    statut.length > 40 ||
    budget.length > 80 ||
    !Number.isFinite(progression) ||
    progression < 0 ||
    progression > 100
  ) {
    return null;
  }

  return {
    nom,
    pays: pays || null,
    ville: ville || null,
    statut,
    budget: budget || null,
    progression,
  };
}

export async function createProject(formData: FormData) {
  const project = parseProject(formData);
  if (!project) redirect("/projects?error=invalid");

  try {
    await prisma.project.create({ data: project });
  } catch (error) {
    console.error(error);
    throw error;
  }

  revalidatePath("/projects");
  redirect("/projects?notice=created");
}

export async function updateProject(formData: FormData) {
  const id = field(formData, "id");
  const project = parseProject(formData);

  if (!id) redirect("/projects?error=not-found");
  if (!project) redirect("/projects?error=invalid");

  try {
    await prisma.project.update({ where: { id }, data: project });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      redirect("/projects?error=not-found");
    }
    throw error;
  }

  revalidatePath("/projects");
  redirect("/projects?notice=updated");
}

export async function deleteProject(formData: FormData) {
  const id = field(formData, "id");
  if (!id) redirect("/projects?error=not-found");
  if (field(formData, "confirmed") !== "yes") redirect("/projects?error=confirm-delete");

  try {
    await prisma.project.delete({ where: { id } });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2025"
    ) {
      redirect("/projects?error=not-found");
    }
    throw error;
  }

  revalidatePath("/projects");
  redirect("/projects?notice=deleted");
}
