# Guide de démarrage — contribuer à MANTA CRM sur DEV

Ce guide explique comment préparer ton ordinateur, ouvrir le projet dans Visual Studio Code et proposer une modification sans intervenir sur la Production.

## 1. Règles importantes

- Travaille uniquement sur la branche **Development** et sur l’instance [MANTA DEV](https://crm-eliccir-development.up.railway.app).
- N’ouvre pas, ne modifie pas et ne déploie pas `main` ou Production.
- Ne vide, ne réinitialise et ne modifie jamais une base de données. Pour les essais, utilise les données déjà présentes en DEV.
- N’utilise pas `npm start`, `npm run clean:production` ou `npm run seed:development` sans consigne explicite de l’administrateur.
- Ne colle jamais de mot de passe, clé API, jeton, secret ou contenu du fichier `.env` dans Claude, un e-mail ou une conversation.

## 2. Demander les accès

Avant l’installation, demande à l’administrateur :

1. Une invitation au dépôt privé GitHub `NathalieEl/CRM-Eliccir`.
2. Un accès à Railway **Development** si tu dois consulter les journaux du déploiement. Ne demande pas d’accès aux variables ni aux bases PROD.
3. Si tu veux lancer le site sur ton ordinateur, les paramètres **Development uniquement** nécessaires au fichier `.env`, transmis par un moyen sécurisé. Ne réutilise jamais les paramètres Production.

Accepte l’invitation GitHub avec ton propre compte. N’utilise pas le compte d’une autre personne.

## 3. Installer les outils

### Visual Studio Code

**Sur macOS :**

1. Télécharge VS Code depuis [code.visualstudio.com](https://code.visualstudio.com/download).
2. Ouvre le fichier `.dmg` téléchargé.
3. Glisse **Visual Studio Code** dans **Applications**.
4. Lance VS Code depuis **Applications**.

**Sur Windows :**

1. Télécharge **User Installer** depuis [code.visualstudio.com](https://code.visualstudio.com/download).
2. Ouvre le fichier téléchargé et garde les options proposées.
3. Lance VS Code depuis le menu Démarrer.

### Node.js 22

Le projet demande Node.js **22.x**. Télécharge la version 22 LTS depuis [nodejs.org](https://nodejs.org/en/download), installe-la, puis redémarre VS Code.

Dans VS Code, ouvre **Terminal → Nouveau terminal**, puis vérifie :

```bash
node --version
npm --version
```

La première commande doit commencer par `v22.`. Si ce n’est pas le cas, demande de l’aide avant de continuer.

### Git

Git sert à récupérer le projet et enregistrer les modifications.

- **macOS :** dans le terminal VS Code, lance `git --version`. Si macOS propose d’installer les outils de développement, accepte.
- **Windows :** installe **Git for Windows** depuis [git-scm.com](https://git-scm.com/download/win), en gardant les options par défaut, puis redémarre VS Code.

Vérifie ensuite :

```bash
git --version
```

### Claude Code dans VS Code

1. Dans VS Code, ouvre **Extensions** (icône en forme de carrés à gauche, ou `Cmd+Shift+X` sur Mac / `Ctrl+Shift+X` sur Windows).
2. Recherche **Claude Code** et installe l’extension publiée par **Anthropic**.
3. Ouvre son panneau, clique sur **Sign in**, puis connecte-toi dans le navigateur avec le compte Claude qui possède déjà la licence payante.
4. Aucune clé API n’est nécessaire pour cette connexion par abonnement. N’en crée pas et n’en demande pas à l’administrateur.

L’extension VS Code suffit pour commencer. Le CLI Claude et le CLI Railway sont facultatifs : ne les installe pas pour ce premier parcours.

## 4. Récupérer le projet

Dans VS Code :

1. Ouvre la palette de commandes avec `Cmd+Shift+P` sur Mac ou `Ctrl+Shift+P` sur Windows.
2. Recherche **Git: Clone**.
3. Saisis l’adresse du dépôt : `https://github.com/NathalieEl/CRM-Eliccir.git`.
4. Connecte-toi à GitHub si VS Code le demande.
5. Choisis un dossier de travail facile à retrouver, puis clique sur **Open**.
6. Si VS Code demande si tu fais confiance aux auteurs, confirme seulement après avoir vérifié que le dépôt est bien `NathalieEl/CRM-Eliccir`.

Dans le terminal intégré, vérifie la branche :

```bash
git status --short --branch
```

La branche de base à récupérer est `development`, jamais `main`.

## 5. Installer les dépendances du projet

Dans le terminal VS Code, à la racine du dépôt (là où se trouve `package.json`), exécute :

```bash
npm ci
```

Cette commande installe les dépendances prévues par le projet. Elle ne déploie rien et ne modifie pas les données métier.

### Lancer le site en local (facultatif)

Pour lancer l’application sur ton ordinateur :

1. Demande à l’administrateur un fichier `.env` configuré uniquement pour Development.
2. Copie `.env.example` sous le nom `.env`, puis reporte les valeurs Development reçues par le canal sécurisé.
3. Ne mets jamais les valeurs Production dans `.env` et ne partage jamais ce fichier.
4. Lance :

```bash
npm run dev
```

5. Ouvre l’adresse indiquée dans le terminal, généralement [http://localhost:3000](http://localhost:3000).

Si tu n’as pas reçu de paramètres Development, ne les invente pas. Tu peux quand même lire et modifier le code, puis utiliser l’instance web DEV pour la vérification après publication.

## 6. Demander une modification à Claude

1. Vérifie que le dossier ouvert dans VS Code est bien `CRM-Eliccir`.
2. Dans Claude Code, commence par demander un **plan** avant toute modification.
3. Choisis le mode **Manual** pour que Claude demande ton accord avant les changements et commandes sensibles.
4. Décris un seul objectif à la fois, par exemple : « Explique-moi ce formulaire, puis propose un changement limité à DEV. Ne touche pas à Production ni aux données. »
5. Lis les fichiers modifiés dans **Source Control** et demande à l’administrateur de relire les changements que tu ne comprends pas.

Ne choisis jamais **Bypass permissions**. N’accepte pas une commande qui efface des données, exécute un script de nettoyage, change des variables Production ou pousse sur `main`.

## 7. Tester et publier uniquement en DEV

Avant de proposer une modification :

```bash
npm run lint
npx prisma validate
npm run build
```

Si une commande échoue, arrête-toi et transmets le message à l’administrateur. Ne lance pas de migration ni de script de données pour essayer de réparer.

Cycle de travail recommandé :

1. Demande à l’administrateur de mettre `development` à jour, puis crée une branche de travail depuis celle-ci.
2. Fais une modification à la fois et teste localement quand les paramètres Development sont disponibles.
3. Dans VS Code, ouvre **Source Control**, relis la liste des fichiers changés et le diff.
4. Enregistre les changements avec un message clair, puis pousse ta branche de travail et demande une revue avant fusion vers `development`.
5. Après la fusion vers `development`, attends que Railway affiche le déploiement DEV comme **Active/Ready**.
6. Ouvre [MANTA DEV](https://crm-eliccir-development.up.railway.app), vérifie le badge **DEV**, puis teste la fonction modifiée.

Une publication sur DEV ne signifie pas une publication en PROD. Seul l’administrateur prépare et autorise une promotion vers Production.

## 8. Railway : ce qu’il faut installer

Railway est d’abord un service web : ouvre le [tableau de bord Railway](https://railway.com) dans ton navigateur et connecte-toi avec l’invitation de l’administrateur. Il n’y a pas d’application de bureau Railway à installer.

Pour ce parcours, utilise seulement le tableau de bord afin de consulter **Development** et l’état de ses déploiements. N’édite pas les variables d’environnement, ne sélectionne pas **Production** pour lancer un déploiement et n’utilise pas le CLI `railway` sans accompagnement.

## 9. En cas de problème

Note le message d’erreur exact, l’étape effectuée et si tu étais sur **DEV** ou en local. Envoie ces informations à l’administrateur, sans mot de passe, jeton, clé, valeur `.env`, adresse privée d’un contact ou capture contenant ces éléments.

Liens officiels :

- [Visual Studio Code — installation macOS](https://code.visualstudio.com/docs/setup/mac)
- [Visual Studio Code — installation Windows](https://code.visualstudio.com/docs/setup/windows)
- [Node.js — téléchargement](https://nodejs.org/en/download)
- [Git for Windows](https://git-scm.com/download/win)
- [Claude Code — intégration VS Code](https://code.claude.com/docs/en/ide-integrations)
- [Railway — documentation CLI](https://docs.railway.com/guides/cli)