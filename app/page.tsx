import { prisma } from "@/lib/prisma";

const navigation = ["Vue d’ensemble", "Contacts", "Activités", "Actions", "Projets"];

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

function formatActivityItem(activity: { titre: string; type: string; contact?: string | null; date?: Date | null; details?: string | null }) {
  const time = activity.date ? new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(activity.date)) : "09:00";
  const title = activity.titre;
  const detail = activity.details || (activity.contact ? `Contact · ${activity.contact}` : "Activité CRM");
  const initials = (activity.contact ?? activity.type)
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

function formatActionItem(action: { titre: string; dateEcheance?: Date | null; priorite?: string | null; statut?: string | null }) {
  const due = action.dateEcheance
    ? `Échéance · ${new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(action.dateEcheance))}`
    : "À planifier";

  return {
    title: action.titre,
    due,
    tag: action.priorite || action.statut || "Normale",
  };
}

function formatProjectItem(project: { nom: string; ville?: string | null; pays?: string | null; progression: number }) {
  const location = [project.ville, project.pays].filter(Boolean).join(" · ") || "Localisation non définie";

  return {
    name: project.nom,
    location,
    progress: project.progression || 0,
  };
}

async function getDashboardData() {
  try {
    const [contactsCount, projectsCount, activitiesCount, pendingActionsCount, recentContacts, recentProjects, upcomingActivities, nextActions] = await Promise.all([
      prisma.contact.count(),
      prisma.project.count(),
      prisma.activity.count(),
      prisma.actionItem.count({ where: { statut: { not: "Terminée" } } }),
      prisma.contact.findMany({ take: 4, orderBy: { updatedAt: "desc" } }),
      prisma.project.findMany({ take: 3, orderBy: { updatedAt: "desc" } }),
      prisma.activity.findMany({ take: 3, orderBy: { date: "asc" } }),
      prisma.actionItem.findMany({ take: 3, orderBy: [{ dateEcheance: "asc" }, { updatedAt: "desc" }] }),
    ]);

    return {
      metrics: [
        { label: "Contacts suivis", value: String(contactsCount || 0), change: "+12 ce mois-ci", number: "01" },
        { label: "Projets actifs", value: String(projectsCount || 0), change: "Suivi en direct", number: "02" },
        { label: "Activités à venir", value: String(activitiesCount || 0).padStart(2, "0"), change: "Calendrier mis à jour", number: "03" },
        { label: "Actions en attente", value: String(pendingActionsCount || 0).padStart(2, "0"), change: "À traiter", number: "04", alert: true },
      ],
      activities: upcomingActivities.length > 0 ? upcomingActivities.map(formatActivityItem) : defaultActivities,
      actions: nextActions.length > 0 ? nextActions.map(formatActionItem) : defaultActions,
      contacts: recentContacts.length > 0 ? recentContacts.map((contact) => ({
        name: contact.nom,
        email: contact.email || "Aucun e-mail",
        interest: [contact.entreprise, contact.telephone].filter(Boolean).join(" · ") || "Sans renseignement",
        status: "Actif",
        tone: "active",
        updated: "Actualisé aujourd’hui",
        initials: contact.nom.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "CN",
        color: "blue",
      })) : defaultContacts,
      projects: recentProjects.length > 0 ? recentProjects.map(formatProjectItem) : defaultProjects,
      databaseMode: true,
    };
  } catch {
    return {
      metrics: [
        { label: "Contacts suivis", value: "248", change: "+12 ce mois-ci", number: "01" },
        { label: "Leads à qualifier", value: "18", change: "6 nouveaux cette semaine", number: "02" },
        { label: "Activités à venir", value: "07", change: "3 aujourd’hui", number: "03" },
        { label: "Actions en attente", value: "05", change: "2 en retard", number: "04", alert: true },
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
  const dashboard = await getDashboardData();
  const metrics = dashboard.metrics;
  const activities = dashboard.activities;
  const actions = dashboard.actions;
  const contacts = dashboard.contacts;
  const projects = dashboard.projects;
  return (
    <div className="crm-shell" id="overview">
      <div className="dashboard-layout">
        <main className="main-content">
          <aside className="sidebar">
            <a className="brand" href="#overview" aria-label="Eliccir CRM, accueil"><span className="brand-mark">E</span><span className="brand-name">eliccir<small>CRM</small></span></a>
            <p className="workspace-label">ESPACE DE TRAVAIL</p>
            <nav className="main-nav" aria-label="Navigation principale">
              {navigation.map((label, index) => {
                const href = index === 1 ? "/contacts" : index === 2 ? "/activities" : index === 3 ? "/actions" : index === 4 ? "/projects" : `#${["overview", "contacts", "activities", "actions", "projects"][index]}`;
                return <a className={`nav-link${index === 0 ? " nav-link-active" : ""}`} href={href} key={label}><span>{String(index + 1).padStart(2, "0")}</span>{label}</a>;
              })}
            </nav>
            <div className="sidebar-search-link-wrap">
              <a className="sidebar-search-link" href="/search">Recherche globale</a>
            </div>
            <section className="sidebar-project" id="projects"><p>PROJET EN COURS</p><strong>Lombok</strong><span>Kuta Selatan, Indonésie</span><div className="project-progress"><i /></div><small>Parcelles suivies <b>08 / 12</b></small></section>
            <div className="sidebar-bottom"><span className="online-dot" /> Données de démonstration<div className="profile-row"><span className="profile-avatar">AD</span><span><b>Administrateur</b><small>Accès complet</small></span><i>···</i></div></div>
          </aside>

          <header className="topbar"><div className="breadcrumb"><span>ESPACE</span><i>/</i><b>Vue d’ensemble</b></div><div className="topbar-right"><time>Lundi 28 septembre 2026</time><span className="top-avatar">AD</span></div></header>
          <div className="dashboard-content">
            <section className="welcome-row"><div><p className="eyebrow"><i /> VOTRE ACTIVITÉ, EN UN COUP D’ŒIL</p><h1>Bonjour, <em>bienvenue.</em></h1><p className="welcome-copy">Voici les contacts et les priorités de votre portefeuille aujourd’hui.</p></div><a className="text-link" href="/contacts">Explorer les contacts <span>↗</span></a></section>

            <section className="metric-grid" aria-label="Indicateurs du portefeuille">{metrics.map((metric) => <article className="metric" key={metric.number}><div className="metric-top"><span>{metric.label}</span><small>{metric.number}</small></div><strong>{metric.value}</strong><div className={`metric-foot${metric.alert ? " metric-alert" : ""}`}>{metric.change}</div></article>)}</section>

            <div className="dashboard-columns">
              <section className="panel activity-panel" id="activities"><div className="section-heading"><div><p className="section-index">01 <i>·</i> AGENDA</p><h2>À venir aujourd’hui</h2></div><a href="#activities">Tout voir <span>→</span></a></div><div className="activity-list">{activities.map((activity) => <article className="activity-row" key={activity.time}><time>{activity.time}</time><span className={`avatar avatar-${activity.color}`}>{activity.initials}</span><div><small>{activity.kind}</small><h3>{activity.title}</h3><p>{activity.detail}</p></div><span className="row-arrow">↗</span></article>)}</div><p className="calendar-note"><i /> Synchronisé avec Google Agenda</p></section>

              <section className="panel actions-panel" id="actions"><div className="section-heading"><div><p className="section-index">02 <i>·</i> À SUIVRE</p><h2>Vos prochaines actions</h2></div><span className="count-badge">05</span></div><div className="action-list">{actions.map((action, index) => <article className="action-row" key={action.title}><span className={`action-check${index === 0 ? " action-check-alert" : ""}`} /><div><h3>{action.title}</h3><time>{action.due}</time></div><small className={index === 0 ? "action-tag action-tag-alert" : "action-tag"}>{action.tag}</small></article>)}</div><a className="all-actions-link" href="#actions">Consulter toutes les actions <span>→</span></a></section>
            </div>

              <section className="panel contacts-panel" id="contacts"><div className="section-heading"><div><p className="section-index">03 <i>·</i> PORTEFEUILLE</p><h2>Contacts récemment suivis</h2></div><a href="/contacts">Tous les contacts <span>→</span></a></div><div className="contact-table-wrap"><table><thead><tr><th>CONTACT</th><th>INTÉRÊT</th><th>STATUT</th><th>DERNIÈRE ACTIVITÉ</th><th /></tr></thead><tbody>{contacts.map((contact) => <tr key={contact.email}><td><div className="contact-identity"><span className={`avatar avatar-${contact.color}`}>{contact.initials}</span><span><b>{contact.name}</b><small>{contact.email}</small></span></div></td><td>{contact.interest}</td><td><span className={`status-pill status-${contact.tone}`}><i />{contact.status}</span></td><td>{contact.updated}</td><td className="row-arrow">↗</td></tr>)}</tbody></table></div></section>

            <section className="panel projects-panel" id="projects"><div className="section-heading"><div><p className="section-index">04 <i>·</i> PROJETS</p><h2>Opportunités actives</h2></div><a href="/projects">Tous les projets <span>→</span></a></div><div className="project-summary-list">{projects.map((project) => <div className="project-summary-item" key={project.name}><strong>{project.name}</strong><span>{project.location}</span><em>{project.progress}%</em></div>)}</div></section>
          </div>
          <footer className="dashboard-footer"><b>ELICCIR CRM</b><span>APERÇU AVEC DONNÉES FICTIVES</span><span>LOMBOK · INDONÉSIE</span></footer>
        </main>
      </div>
    </div>
  );
}
