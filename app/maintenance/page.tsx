import Link from "next/link";
import { createLookupOption, deleteLookupOption, toggleLookupOption } from "@/app/maintenance/actions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const categoryLabels: Record<string, string> = { contact_title: "Titres des contacts" };

type MaintenancePageProps = {
  searchParams: Promise<{ error?: string; notice?: string }>;
};

export default async function MaintenancePage({ searchParams }: MaintenancePageProps) {
  await requireAdmin();
  const params = await searchParams;
  const options = await prisma.lookupOption.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { label: "asc" }] });
  const categories = [...new Set(options.map((option) => option.category))];

  return (
    <main className="contacts-screen">
      <header className="contacts-topbar">
        <Link className="contacts-brand" href="/" aria-label="Eliccir CRM, tableau de bord"><span className="brand-mark">E</span><span className="brand-name">eliccir<small>CRM</small></span></Link>
        <Link className="contacts-back" href="/">← Tableau de bord</Link>
      </header>
      <div className="contacts-content">
        <section className="contacts-title-row"><div><p className="section-index">ESPACE DE TRAVAIL <i>·</i> ADMINISTRATION</p><h1>Maintenance des tables</h1><p className="contacts-intro">Gère les options utilisées dans les menus déroulants du CRM.</p></div><span className="contacts-total">{options.length}<small>OPTIONS</small></span></section>
        {params.error === "invalid" && <p className="auth-error" role="alert">Renseigne une catégorie et un libellé valides.</p>}
        {params.error === "exists" && <p className="auth-error" role="alert">Cette option existe déjà dans cette table.</p>}
        {params.notice === "created" && <p className="contacts-message" role="status">L’option a été ajoutée.</p>}
        <section className="contacts-create-section"><div className="contacts-section-heading"><div><p className="section-index">01 <i>·</i> NOUVELLE OPTION</p><h2>Ajouter une valeur de menu</h2></div></div><form action={createLookupOption} className="contact-form maintenance-form"><label>Catégorie<input name="category" required placeholder="ex. contact_title" /></label><label>Libellé<input name="label" required placeholder="ex. Mme" /></label><label>Valeur technique<input name="value" placeholder="Identique au libellé par défaut" /></label><label>Ordre<input name="sortOrder" type="number" defaultValue={100} /></label><button className="contact-primary-button" type="submit">Ajouter <span>+</span></button></form></section>
        {categories.map((category) => <section className="contacts-list-section" key={category}><div className="contacts-section-heading"><div><p className="section-index">02 <i>·</i> TABLE DE RÉFÉRENCE</p><h2>{categoryLabels[category] ?? category}</h2></div></div><div className="users-table-wrap"><table className="contacts-records maintenance-table"><thead><tr><th>LIBELLÉ</th><th>VALEUR</th><th>ORDRE</th><th>ÉTAT</th><th>GESTION</th></tr></thead><tbody>{options.filter((option) => option.category === category).map((option) => <tr key={option.id}><td><b>{option.label}</b></td><td>{option.value}</td><td>{option.sortOrder}</td><td>{option.active ? "Active" : "Désactivée"}</td><td><div className="user-row-actions"><form action={toggleLookupOption}><input type="hidden" name="id" value={option.id} /><input type="hidden" name="active" value={String(option.active)} /><button className="maintenance-action" type="submit">{option.active ? "Désactiver" : "Activer"}</button></form><form action={deleteLookupOption}><input type="hidden" name="id" value={option.id} /><button className="user-delete-button" type="submit">Supprimer</button></form></div></td></tr>)}</tbody></table></div></section>)}
      </div>
    </main>
  );
}
