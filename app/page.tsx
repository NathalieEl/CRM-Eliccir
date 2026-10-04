import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

const defaultActivities = [
  { time: "09:30", kind: "RENDEZ-VOUS", title: "Visite du terrain avec Marc Delatour", detail: "Projet Lombok · Kuta Selatan", initials: "MD", color: "coral" },
  { time: "11:00", kind: "APPEL", title: "Point financement · Sophie Laurent", detail: "Acquéreuse potentielle · Villa 04", initials: "SL", color: "blue" },
  { time: "14:15", kind: "SUIVI", title: "Envoyer la présentation du projet", detail: "Thomas et Camille Moreau", initials: "TM", color: "green" },
];

const defaultActions = [
  { title: "Rappeler Sophie Laurent", due: "Aujourd’hui · 11:00", tag: "Prioritaire" },
  { title: "Transmettre le plan des parcelles", due: "Aujourd’hui · 16:00", tag: "Projet Lombok" },
  { title: "Relancer Isabelle Garnier", due: "Demain · 09:00", tag: "À reprendre" },
];

const defaultContacts = [
  { name: "Sophie Laurent", email: "sophie.laurent@example.com", interest: "Villa · Lombok", status: "Actif", tone: "active", updated: "Il y a 24 min", initials: "SL", color: "blue" },
  { name: "Marc Delatour", email: "marc.delatour@example.com", interest: "Investissement foncier", status: "Lead", tone: "lead", updated: "Il y a 2 h", initials: "MD", color: "coral" },
  { name: "Thomas Moreau", email: "thomas.moreau@example.com", interest: "Villa · Lombok", status: "Prospect", tone: "prospect", updated: "Hier", initials: "TM", color: "green" },
  { name: "Isabelle Garnier", email: "isabelle.garnier@example.com", interest: "Partenariat · Indonésie", status: "Dormant", tone: "dormant", updated: "Il y a 3 jours", initials: "IG", color: "yellow" },
];

const defaultProjects = [
  { name: "Lombok", location: "Kuta Selatan · Indonésie", progress: 35 },
  { name: "Bali", location: "Ubud · Indonésie", progress: 68 },
  { name: "Phuket", location: "Patong · Thaïlande", progress: 22 },
];

function formatActivityItem(activity: { titre: string; type: string; contactLabel?: string | null; contact?: { prenom: string | null; nom: string } | null; entreprise?: { nom: string } | null; responsable?: { username: string } | null; resultat?: string | null; dateRealisation?: Date | null; statut?: string | null; date?: Date | null; details?: string | null }) {
  const time = activity.date ? new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(activity.date)) : "09:00";
  const title = activity.titre;
  const fullName = activity.contact ? [activity.contact.prenom, activity.contact.nom].filter(Boolean).join(" ") : activity.contactLabel;
  const detail = activity.resultat || activity.details || [activity.entreprise?.nom, fullName, activity.responsable?.username, activity.statut, activity.dateRealisation ? `Réalisée le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(activity.dateRealisation)}` : ""].filter(Boolean).join(" · ") || "Activité CRM";
  const initials = (fullName || activity.entreprise?.nom || activity.type)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AC";

  return {
    time,
    kind: activity.type.toUpperCase(),
    title,
    detail,
    initials,
    color: initials.length > 1 && initials[0] === "S" ? "blue" : "green",
  };
}

function formatActionItem(action: { titre: string; dateEcheance?: Date | null; priorite?: string | null; statut?: string | null; entreprise?: { nom: string } | null }) {
  const due = action.dateEcheance
    ? `Échéance · ${new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(action.dateEcheance))}`
    : "À planifier";

  return {
    title: action.titre,
    due,
    tag: action.entreprise?.nom || action.priorite || action.statut || "Normale",
  };
}

function formatProjectItem(project: { nom: string; ville?: string | null; pays?: string | null; progression: number; entreprise?: { nom: string } | null }) {
  const location = [project.entreprise?.nom, project.ville, project.pays].filter(Boolean).join(" · ") || "Localisation non définie";

  return {
    name: project.nom,
    location,
    progress: project.progression || 0,
  };
}

async function getDashboardData() {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [contactsCount, newContactsCount, projectsCount, activitiesCount, pendingActionsCount, overdueActionsCount, recentContacts, recentProjects, upcomingActivities, nextActions] = await Promise.all([
      prisma.contact.count(),
      prisma.contact.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.project.count({ where: { statut: { not: "Terminé" } } }),
      prisma.activity.count({ where: { date: { gte: now } } }),
      prisma.actionItem.count({ where: { statut: { not: "Terminée" } } }),
      prisma.actionItem.count({ where: { statut: { not: "Terminée" }, dateEcheance: { lt: now } } }),
      prisma.contact.findMany({ include: { entreprises: { include: { entreprise: true } } }, take: 4, orderBy: { updatedAt: "desc" } }),
      prisma.project.findMany({ include: { entreprise: true }, take: 3, orderBy: { updatedAt: "desc" } }),
      prisma.activity.findMany({ include: { contact: true, entreprise: true, responsable: true }, where: { date: { gte: now } }, take: 3, orderBy: { date: "asc" } }),
      prisma.actionItem.findMany({ include: { entreprise: true, responsable: true }, where: { statut: { not: "Terminée" } }, take: 3, orderBy: [{ dateEcheance: "asc" }, { updatedAt: "desc" }] }),
    ]);

    return {
      metrics: [
        { label: "Contacts suivis", value: String(contactsCount || 0), change: `+${newContactsCount} ce mois-ci`, number: "01" },
        { label: "Projets actifs", value: String(projectsCount || 0), change: "Suivi en direct", number: "02" },
        { label: "Activités à venir", value: String(activitiesCount || 0).padStart(2, "0"), change: "À partir d’aujourd’hui", number: "03" },
        { label: "Actions en attente", value: String(pendingActionsCount || 0).padStart(2, "0"), change: `${overdueActionsCount} en retard`, number: "04", alert: overdueActionsCount > 0 },
      ],
      activities: upcomingActivities.length > 0 ? upcomingActivities.map(formatActivityItem) : defaultActivities,
      actions: nextActions.length > 0 ? nextActions.map(formatActionItem) : defaultActions,
      contacts: recentContacts.length > 0 ? recentContacts.map((contact) => ({
        name: [contact.prenom, contact.nom].filter(Boolean).join(" "),
        email: contact.email || "Aucun e-mail",
        interest: [...contact.entreprises.map(({ entreprise }) => entreprise.nom), contact.telephone].filter(Boolean).join(" · ") || "Sans renseignement",
        status: "Actif",
        tone: "active",
        updated: "Actualisé aujourd’hui",
        initials: [contact.prenom?.[0], contact.nom[0]].filter(Boolean).join("").toUpperCase() || "CN",
        color: "blue",
      })) : defaultContacts,
      projects: recentProjects.length > 0 ? recentProjects.map(formatProjectItem) : defaultProjects,
      databaseMode: true,
    };
  } catch {
    return {
      metrics: [
        { label: "Contacts suivis", value: "—", change: "Base indisponible", number: "01" },
        { label: "Projets actifs", value: "—", change: "Base indisponible", number: "02" },
        { label: "Activités à venir", value: "—", change: "Base indisponible", number: "03" },
        { label: "Actions en attente", value: "—", change: "Base indisponible", number: "04", alert: true },
      ],
      activities: defaultActivities,
      actions: defaultActions,
      contacts: defaultContacts,
      projects: defaultProjects,
      databaseMode: false,
    };
  }
}

export default async function Home() {
  const [dashboard, currentUser] = await Promise.all([getDashboardData(), getCurrentUser()]);
  const greetingName = currentUser?.prenom?.trim() || currentUser?.username || "bienvenue";
  const metrics = dashboard.metrics;
  const activities = dashboard.activities;
  const actions = dashboard.actions;
  const contacts = dashboard.contacts;
  const projects = dashboard.projects;
  const databaseMode = dashboard.databaseMode;
  return (
    <div className="crm-shell" id="overview">
      <main className="main-content">
          <header className="topbar"><div className="breadcrumb"><span>ESPACE</span><i>/</i><b>Vue d’ensemble</b></div><div className="topbar-right"><time>Lundi 28 septembre 2026</time><span className="top-avatar">AD</span></div></header>
          <div className="dashboard-content">
            <section className="welcome-row"><div><p className="eyebrow"><i /> TON ACTIVITÉ, EN UN COUP D’ŒIL</p><h1>Bonjour, <em>{greetingName}.</em></h1><p className="welcome-copy">Voici les contacts et les priorités de ton portefeuille aujourd’hui.</p></div><Link className="text-link" href="/contacts">Voir mes contacts <span>↗</span></Link></section>

            <section className="metric-grid" aria-label="Indicateurs du portefeuille">{metrics.map((metric) => <article className="metric" key={metric.number}><div className="metric-top"><span>{metric.label}</span><small>{metric.number}</small></div><strong>{metric.value}</strong><div className={`metric-foot${metric.alert ? " metric-alert" : ""}`}>{metric.change}</div></article>)}</section>

            <div className="dashboard-columns">
              <section className="panel activity-panel" id="activities"><div className="section-heading"><div><p className="section-index">01 <i>·</i> AGENDA</p><h2>À venir aujourd’hui</h2></div><a href="#activities">Tout voir <span>→</span></a></div><div className="activity-list">{activities.map((activity) => <article className="activity-row" key={activity.time}><time>{activity.time}</time><span className={`avatar avatar-${activity.color}`}>{activity.initials}</span><div><small>{activity.kind}</small><h3>{activity.title}</h3><p>{activity.detail}</p></div><span className="row-arrow">↗</span></article>)}</div><p className="calendar-note"><i /> Synchronisé avec Google Agenda</p></section>

              <section className="panel actions-panel" id="actions"><div className="section-heading"><div><p className="section-index">02 <i>·</i> À SUIVRE</p><h2>Tes prochaines actions</h2></div><span className="count-badge">{metrics[3].value}</span></div><div className="action-list">{actions.map((action, index) => <article className="action-row" key={action.title}><span className={`action-check${index === 0 ? " action-check-alert" : ""}`} /><div><h3>{action.title}</h3><time>{action.due}</time></div><small className={index === 0 ? "action-tag action-tag-alert" : "action-tag"}>{action.tag}</small></article>)}</div><a className="all-actions-link" href="#actions">Voir toutes les actions <span>→</span></a></section>
            </div>

              <section className="panel contacts-panel" id="contacts"><div className="section-heading"><div><p className="section-index">03 <i>·</i> PORTEFEUILLE</p><h2>Contacts récemment suivis</h2></div><Link href="/contacts">Tous les contacts <span>→</span></Link></div><div className="contact-table-wrap"><table><thead><tr><th>CONTACT</th><th>INTÉRÊT</th><th>STATUT</th><th>DERNIÈRE ACTIVITÉ</th><th /></tr></thead><tbody>{contacts.map((contact) => <tr key={contact.email}><td data-label="Contact"><div className="contact-identity"><span className={`avatar avatar-${contact.color}`}>{contact.initials}</span><span><b>{contact.name}</b><small>{contact.email}</small></span></div></td><td data-label="Intérêt">{contact.interest}</td><td data-label="Statut"><span className={`status-pill status-${contact.tone}`}><i />{contact.status}</span></td><td data-label="Dernière activité">{contact.updated}</td><td className="row-arrow" aria-hidden="true">↗</td></tr>)}</tbody></table></div></section>

            <section className="panel projects-panel" id="projects"><div className="section-heading"><div><p className="section-index">04 <i>·</i> PROJETS</p><h2>Opportunités actives</h2></div><a href="/projects">Tous les projets <span>→</span></a></div><div className="project-summary-list">{projects.map((project) => <div className="project-summary-item" key={project.name}><strong>{project.name}</strong><span>{project.location}</span><em>{project.progress}%</em></div>)}</div></section>
          </div>
          <footer className="dashboard-footer"><b>ELICCIR CRM</b><span>{databaseMode ? "DONNÉES SYNCHRONISÉES" : "BASE DE DONNÉES INDISPONIBLE"}</span><span>LOMBOK · INDONÉSIE</span></footer>
      </main>
    </div>
  );
}
