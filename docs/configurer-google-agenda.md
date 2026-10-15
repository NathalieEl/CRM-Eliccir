# Connecter Google Agenda

## Google Cloud

1. Crée un projet Google Cloud et active l’API Google Calendar.
2. Configure l’écran de consentement OAuth et ajoute les utilisateurs de test si l’application reste en mode test.
3. Crée un identifiant OAuth de type **Application Web**.
4. Ajoute comme URI de redirection autorisée :

```text
https://crm-eliccir-development.up.railway.app/api/google-calendar/callback
http://localhost:3000/api/google-calendar/callback
```

Pour Production, ajoute son domaine Railway uniquement lors de la mise en service autorisée.

## Variables Railway

Sur le service `CRM-Eliccir`, dans l’environnement **Development**, configure :

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_TOKEN_ENCRYPTION_KEY
GOOGLE_CALENDAR_REDIRECT_URI=https://crm-eliccir-development.up.railway.app/api/google-calendar/callback
```

Génère la clé de chiffrement avec `openssl rand -base64 32`. Ne la réutilise pas dans un autre environnement et ne la communique pas dans le chat. Conserve séparément le secret OAuth Google.

`GOOGLE_CALENDAR_REDIRECT_URI` doit correspondre exactement à l’URI déclarée dans Google Cloud. Pour le développement local, utilise l’URI localhost ci-dessus et les identifiants OAuth adaptés.

## Connexion utilisateur

Chaque utilisateur relie son propre compte dans la rubrique **Activités**. Les événements cochés sont créés dans l’agenda du responsable choisi ; sans responsable, ils sont envoyés dans l’agenda de la personne qui a créé ou modifié l’activité. Une activité synchronisée doit avoir une date, une heure et une durée ; la prochaine action nécessite aussi son texte. Décocher l’option retire l’événement lié, et supprimer l’activité tente de retirer ses événements Google.

Les jetons de renouvellement sont chiffrés en base avec `GOOGLE_TOKEN_ENCRYPTION_KEY`. L’application demande uniquement l’accès aux événements du calendrier et à l’adresse e-mail Google du compte connecté.