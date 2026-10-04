"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";

const navigation = [
  { href: "/", label: "Vue d’ensemble", number: "01" },
  { href: "/companies", label: "Entreprises", number: "02" },
  { href: "/projects", label: "Projets", number: "03" },
  { href: "/contacts", label: "Contacts", number: "04" },
  { href: "/activities", label: "Activités", number: "05" },
  { href: "/actions", label: "Actions", number: "06" },
  { href: "/users", label: "Utilisateurs", number: "07" },
  { href: "/maintenance", label: "Maintenance", number: "08" },
  { href: "/audit", label: "Journal d’audit", number: "09" },
];

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") return children;

  return (
    <div className="workspace-layout">
      <div className="workspace-page">{children}</div>
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Eliccir CRM, accueil">
          <span className="brand-mark">E</span>
          <span className="brand-name">eliccir<small>CRM</small></span>
        </Link>
        <p className="workspace-label">ESPACE DE TRAVAIL</p>
        <nav className="main-nav" aria-label="Navigation principale">
          {navigation.map(({ href, label, number }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
            return (
              <Link className={`nav-link${active ? " nav-link-active" : ""}`} href={href} key={href} aria-current={active ? "page" : undefined}>
                <span>{number}</span>{label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-search-link-wrap">
          <Link className={`sidebar-search-link${pathname === "/search" ? " nav-link-active" : ""}`} href="/search" aria-current={pathname === "/search" ? "page" : undefined}>
            Recherche globale
          </Link>
        </div>
        <section className="sidebar-project">
          <p>PROJET EN COURS</p>
          <strong>Lombok</strong>
          <span>Kuta Selatan, Indonésie</span>
          <div className="project-progress"><i /></div>
          <small>Parcelles suivies <b>08 / 12</b></small>
        </section>
        <div className="sidebar-bottom">
          <span className="online-dot" /> Session sécurisée
          <div className="profile-row">
            <span className="profile-avatar">AD</span>
            <span><b>Administrateur</b><small>Accès complet</small></span>
            <form action={logout}><button className="profile-logout" type="submit">Se déconnecter</button></form>
          </div>
        </div>
      </aside>
    </div>
  );
}