Eliccir CRM est une application Next.js avec PostgreSQL. Le 2FA TOTP est en sommeil par défaut et peut être activé explicitement.

## Versions et déploiements

Le numéro SemVer est la propriété `version` de `package.json`. Railway déploie automatiquement `development` dans l’instance DEV et `main` dans l’instance PROD. Une modification commence toujours dans DEV ; PROD n’est mise à jour qu’après validation et autorisation explicite.

### Publier dans DEV

1. Vérifier que la branche de travail est `development` et que l’arbre Git est propre :

```bash
git status --short --branch
git switch development
```

2. Modifier et tester l’application localement. Ne pas vider la base DEV : ses données de démonstration servent aux tests.
3. Ajouter uniquement les fichiers concernés, créer un commit puis pousser sur DEV :

```bash
git add <fichiers-concernés>
git commit -m "Décrire la modification"
git push origin development
```

4. Dans Railway, vérifier que le déploiement de DEV est `SUCCESS`, puis tester le parcours concerné dans l’application DEV.

### Promouvoir vers PROD

5. Après validation de DEV, donner une autorisation explicite de promotion vers PROD. Sans cette autorisation, s’arrêter à DEV.
6. Actualiser les références distantes, puis relever les commits validés qui ne sont pas encore en PROD :

```bash
git fetch origin
git log --oneline origin/main..origin/development
```

Ne pas fusionner toute la branche `development` : elle contient aussi les scripts et le jeu de données de démonstration.

7. Passer sur `main`, la mettre à jour, puis ne cherry-pick que les commits validés :

```bash
git switch main
git pull origin main
git cherry-pick <hash-du-commit-validé>
```

Répéter `git cherry-pick` pour chaque commit autorisé. Ne pas inclure `seed:development`, le jeu de démonstration ou un script de nettoyage de base.

8. Sur `main`, créer le numéro de version PROD. Utiliser `patch` pour une correction, `minor` pour une évolution compatible ou `major` pour une version majeure. Par exemple, depuis `0.2.2`, `major` produit `1.0.0` :

```bash
npm run version:patch
npm run version:minor
npm run version:major
```

Une seule de ces commandes est exécutée pour une release. Elle met à jour `package.json` et `package-lock.json`.

9. Valider, enregistrer le commit de release et pousser sur `main` :

```bash
npx tsc --noEmit
npm run build
git add package.json package-lock.json
git commit -m "Release v<version>"
git push origin main
```

10. Dans Railway, attendre `SUCCESS` pour PROD et vérifier l’application. Le badge affiche la version SemVer et le SHA court du build. Au démarrage, Railway enregistre aussi la version, l’environnement, le commit, l’identifiant du déploiement et la date dans `DeploymentRelease`.

Cette procédure ne vide aucune base. Ne pas exécuter `npm run clean:production` dans le cadre d’une release.

## Configuration d’authentification

Dans Railway, ajoutez ces variables au service `CRM-Eliccir` :

```text
AUTH_SECRET
ADMIN_USERNAME
ADMIN_PASSWORD
ADMIN_FIRST_NAME (facultatif)
TWO_FACTOR_STATUS=Inactive
```

`AUTH_SECRET` doit contenir au moins 32 caractères. `ADMIN_FIRST_NAME` permet de renseigner le prénom affiché à l’accueil pour le compte administrateur provisionné. Le prénom de chaque compte peut aussi être modifié dans **Utilisateurs**. Le 2FA reste inactif tant que `TWO_FACTOR_STATUS` n’est pas défini sur `Active`. Pour le réactiver, définissez `TWO_FACTOR_STATUS=Active` et configurez `ADMIN_TOTP_SECRET` avec un secret Base32 dans une application d’authentification. Le premier accès crée automatiquement le compte administrateur; il exige un code TOTP uniquement lorsque le statut est `Active`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
