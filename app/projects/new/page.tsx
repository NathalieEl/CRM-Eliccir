import Link from "next/link";
import { createProperty } from "@/app/properties/actions";
import { PropertyForm } from "@/app/properties/property-form";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

type NewProjectPageProps = {
	searchParams: Promise<{ error?: string }>;
};

export default async function NewProjectPage({ searchParams }: NewProjectPageProps) {
	await requirePermission("crm.write");
	const params = await searchParams;
	const [contacts, entreprises] = await Promise.all([
		prisma.contact.findMany({ select: { id: true, prenom: true, nom: true }, orderBy: [{ nom: "asc" }, { prenom: "asc" }] }),
		prisma.entreprise.findMany({ select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
	]);

	return (
		<main className="contacts-screen">
			<header className="contacts-topbar">
				<Link className="contacts-brand" href="/" aria-label="Eliccir CRM, tableau de bord"><span className="brand-mark">E</span><span className="brand-name">eliccir<small>CRM</small></span></Link>
				<Link className="contacts-back" href="/projects">← Projets</Link>
			</header>
			<div className="contacts-content property-profile-page">
				<section className="contacts-title-row"><div><p className="section-index">ESPACE DE TRAVAIL · NOUVEAU PROJET</p><h1>Ajouter un projet</h1><p className="contacts-intro">Renseigne ses informations immobilières, foncières et financières.</p></div></section>
				{params.error === "invalid" ? <p className="contacts-message contacts-message-error" role="alert">Vérifie les champs, les dates et les valeurs numériques.</p> : null}
				{params.error === "reference-exists" ? <p className="contacts-message contacts-message-error" role="alert">Cette référence de projet existe déjà.</p> : null}
				<PropertyForm action={createProperty} contacts={contacts} entreprises={entreprises} submitLabel="Créer le projet" cancelHref="/projects" />
			</div>
		</main>
	);
}