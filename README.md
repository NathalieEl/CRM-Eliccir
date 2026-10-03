Eliccir CRM est une application Next.js avec PostgreSQL. Le 2FA TOTP est en sommeil par défaut et peut être activé explicitement.

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
