# Configuration de l’e-mail des signalements

Cette configuration utilise Google Apps Script comme relais HTTPS, compatible avec le plan Railway Trial. Le message est d’abord enregistré dans le journal d’audit de l’environnement cible, puis envoyé à `marc.issan@gmail.com` si le relais est configuré.

## 1. Créer le relais Google

1. Connecte-toi avec le compte Google `marc.issan@gmail.com` et ouvre https://script.google.com.
2. Clique sur **Nouveau projet**.
3. Remplace le contenu de `Code.gs` par le code du fichier [google-apps-script-support.gs](google-apps-script-support.gs), puis enregistre le projet sous un nom comme `Eliccir CRM - signalements`.
4. Dans **Paramètres du projet** → **Propriétés du script**, ajoute la propriété `SUPPORT_WEBHOOK_TOKEN`.
5. Mets comme valeur un jeton aléatoire long d’au moins 32 caractères. Tu peux le générer avec un gestionnaire de mots de passe. Garde-le secret : ne le colle pas dans le chat.
6. Dans la liste des fonctions, sélectionne `authorizeMail`, puis clique sur **Exécuter**. Google va demander l’autorisation d’envoyer des e-mails depuis ton compte; vérifie le compte affiché et accepte.

## 2. Déployer le relais comme application Web

1. Clique sur **Déployer** → **Nouveau déploiement**.
2. Choisis le type **Application Web**.
3. Configure **Exécuter en tant que** : **Moi** (`marc.issan@gmail.com`).
4. Configure **Qui a accès** : **Tout le monde**. L’URL est publique, mais le jeton partagé empêche les appels non autorisés.
5. Clique sur **Déployer**, termine l’autorisation si elle est demandée, puis copie l’URL de l’application Web. Elle se termine normalement par `/exec`.

Ne partage pas l’URL ni le jeton publiquement. Si tu modifies le script Google ultérieurement, crée un nouveau déploiement ou mets à jour le déploiement existant.

## 3. Configurer Railway pour l’environnement cible

Répète cette configuration dans chaque environnement qui doit envoyer des e-mails. Les variables de DEV ne sont pas automatiquement partagées avec PROD.

1. Dans Railway, ouvre le projet `loyal-eagerness`, sélectionne **DEV** ou **PROD**, puis le service **CRM-Eliccir**.
2. Ouvre l’onglet **Variables** et ajoute :

```text
SUPPORT_EMAIL_WEBHOOK_URL=<URL /exec copiée depuis Apps Script>
SUPPORT_WEBHOOK_TOKEN=<le même jeton aléatoire que dans les propriétés du script>
```

3. Enregistre les variables et attends que le redéploiement de l’environnement sélectionné soit marqué **Success**.

Le jeton doit être identique dans Railway et dans les propriétés du script. Ne l’envoie jamais dans une conversation ou une capture d’écran.

## 5. Activer les invitations et réinitialisations de mot de passe

Le même relais peut envoyer aux utilisateurs un lien HTTPS à usage unique pour définir leur mot de passe. Il n’envoie jamais de mot de passe temporaire en clair.

Après avoir mis à jour `docs/google-apps-script-support.gs`, redéploie l’application Web Apps Script :

1. Dans Apps Script, ouvre **Déployer** → **Gérer les déploiements**.
2. Modifie le déploiement de l’application Web existant, sélectionne **Nouvelle version**, puis redéploie-le. L’URL `/exec` reste celle configurée dans Railway.
3. Vérifie que l’accès reste réglé sur **Tout le monde** et que la propriété `SUPPORT_WEBHOOK_TOKEN` n’a pas changé.

Les nouvelles créations et réinitialisations de mot de passe enverront l’identifiant et un lien valable 24 heures. Le compte ne pourra pas ouvrir le CRM tant que le mot de passe n’aura pas été défini depuis ce lien.
Le compte administrateur principal configuré par `ADMIN_USERNAME` et `ADMIN_PASSWORD` reste géré dans Railway ; il n’utilise pas le lien de setup du CRM.

## 4. Tester l’environnement configuré

1. Connecte-toi à l’environnement configuré.
2. Ouvre **Signaler un problème ou poser une question** sous **Recherche globale**.
3. Envoie un message de test avec une des deux catégories.
4. Vérifie sa réception dans `marc.issan@gmail.com` et sa présence dans le **Journal d’audit** de cet environnement.

Si l’envoi échoue, la demande reste enregistrée dans l’audit avec l’état d’envoi. Vérifie l’URL `/exec`, l’égalité des jetons, l’autorisation Gmail et les quotas d’envoi Google Apps Script. Un jeton absent ou incorrect ne déclenche aucun envoi.