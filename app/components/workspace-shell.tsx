"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";
import type { DeploymentInfo } from "@/lib/deployment-info";

const navigation = [
  { href: "/", label: "Dashboard", number: "01" },
  { href: "/companies", label: "Entreprises", number: "02" },
  { href: "/contacts", label: "Contacts", number: "03" },
  { href: "/projects", label: "Projets", number: "04" },
  { href: "/activities", label: "Activités", number: "05" },
  { href: "/actions", label: "Actions", number: "06" },
  { href: "/users", label: "Utilisateurs", number: "07" },
  { href: "/maintenance", label: "Maintenance", number: "08" },
  { href: "/audit", label: "Journal d’audit", number: "09" },
];

export function WorkspaceShell({
  children,
  deploymentInfo,
}: {
  children: React.ReactNode;
  deploymentInfo: DeploymentInfo;
}) {
  const pathname = usePathname();

  if (pathname === "/login") return children;

  return (
    <div className="workspace-layout">
      <div className="workspace-page">{children}</div>
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Eliccir CRM, accueil">
          <span className="brand-mark">E</span>
          <span className="brand-copy">
            <span className="brand-name">Eliccir<small>CRM</small></span>
            <span
              className="brand-release"
              title={`${deploymentInfo.environment} · version ${deploymentInfo.version} · build ${deploymentInfo.buildId}${deploymentInfo.commitMessage ? ` · ${deploymentInfo.commitMessage}` : ""}`}
            >
              v{deploymentInfo.version} · {deploymentInfo.environmentLabel} · {deploymentInfo.buildId}
            </span>
          </span>
        </Link>
        <Link className="guide-link" href="/guide-utilisateur-prod.html" target="_blank" rel="noreferrer">
          Guide d’utilisation
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
        <div className="sidebar-support-link-wrap">
          <Link className={`sidebar-support-link${pathname === "/support" ? " nav-link-active" : ""}`} href="/support" aria-current={pathname === "/support" ? "page" : undefined}>
            Signaler un problème ou poser une question
          </Link>
        </div>
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