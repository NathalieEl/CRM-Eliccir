# Guide d’utilisation — MANTA CRM PROD {{RELEASE_VERSION}}

**Version du guide :** {{RELEASE_VERSION}}<br>
**Plateforme :** PROD  
**Adresse :** https://crm-eliccir-production.up.railway.app  
**Public concerné :** administrateurs, direction, opérations commerciales et membres de l’équipe

> Ce guide décrit les fonctions présentes dans PROD {{RELEASE_VERSION}}. Les options marquées comme indisponibles ne doivent pas être considérées comme faisant partie du produit.

## Table des matières

1. [Présentation générale du système](#1-présentation-générale-du-système)
2. [Mission et objectifs du CRM](#2-mission-et-objectifs-du-crm)
3. [Accès à la plateforme](#3-accès-à-la-plateforme)
4. [Connexion, mot de passe et double authentification](#4-connexion-mot-de-passe-et-double-authentification)
5. [Rôles et droits des utilisateurs](#5-rôles-et-droits-des-utilisateurs)
6. [Présentation du tableau de bord](#6-présentation-du-tableau-de-bord)
7. [Gestion des contacts](#7-gestion-des-contacts)
8. [Gestion des projets](#8-gestion-des-projets)
9. [Gestion des activités et rendez-vous](#9-gestion-des-activités-et-rendez-vous)
10. [Gestion des actions et échéances](#10-gestion-des-actions-et-échéances)
11. [Recherche et navigation dans l’application](#11-recherche-et-navigation-dans-lapplication)
12. [Lecture des indicateurs et analytics](#12-lecture-des-indicateurs-et-analytics)
13. [Les rapports](#13-les-rapports)
14. [Création, modification et suppression des données](#14-création-modification-et-suppression-des-données)
15. [Règles de qualité et de confidentialité des données](#15-règles-de-qualité-et-de-confidentialité-des-données)
16. [Bonnes pratiques d’utilisation](#16-bonnes-pratiques-dutilisation)
17. [Dépannage et erreurs fréquentes](#17-dépannage-et-erreurs-fréquentes)
18. [Support et procédure de remontée d’incidents](#18-support-et-procédure-de-remontée-dincidents)

## 1. Présentation générale du système

MANTA CRM est une application web sécurisée de gestion de contacts, d’entreprises, de projets immobiliers, d’activités et d’actions commerciales. Les données sont consultées depuis le navigateur et enregistrées dans la base de données PROD.

L’instance PROD est accessible à l’adresse indiquée en tête du guide. Les mises à jour de l’application sont identifiées par une version SemVer et un identifiant de build, visibles à côté du logo. Cette édition du guide correspond à **v{{RELEASE_VERSION}}**.

L’interface est organisée autour d’un tableau de bord et de pages de gestion dédiées. Les données affichées dépendent du contenu réel de la base ; les messages « Aucun… » indiquent qu’aucun enregistrement correspondant n’existe.

## 2. Mission et objectifs du CRM

Le CRM a pour objectif de centraliser le suivi commercial et immobilier :

- conserver les coordonnées et profils des contacts;
- organiser les contacts par entreprise et par projet;
- suivre les projets et leurs informations immobilières, foncières et financières;
- consigner les rendez-vous, appels et autres activités;
- attribuer des actions avec des responsables, des priorités et des échéances;
- retrouver rapidement des informations dans l’ensemble du CRM;
- conserver un journal de certaines opérations d’administration.

Le CRM est un outil de suivi. Il ne remplace pas les documents juridiques, comptables ou les systèmes externes auxquels l’entreprise pourrait recourir.

## 3. Accès à la plateforme

1. Ouvre https://crm-eliccir-production.up.railway.app dans un navigateur récent.
2. La page **Connexion** demande ton nom d’utilisateur et ton mot de passe.
3. Après connexion, le tableau de bord s’affiche. Le menu principal est situé à droite sur ordinateur.
4. Pour terminer ta session, utilise **Se déconnecter** dans le menu.

Le logo MANTA est affiché au-dessus de la colonne du menu; il n’est pas répété dans les en-têtes des pages.

Le badge près du logo indique l’environnement, la version et le build. Avant de saisir des données, vérifie qu’il affiche **PROD**. Si le badge indique **DEV**, tu es sur l’environnement de test : ne l’utilise pas pour enregistrer des données métier de production.

La session expire au bout d’environ huit heures. Il faut alors se reconnecter.

## 4. Connexion, mot de passe et double authentification

### Nom d’utilisateur

Le nom d’utilisateur ne distingue pas les majuscules des minuscules : `Sophie.Martin`, `sophie.martin` et `SOPHIE.MARTIN` désignent le même compte. Cette règle ne s’applique pas au mot de passe.

### Mot de passe

- Utilise le nom d’utilisateur et le mot de passe qui t’ont été communiqués par l’administrateur.
- Le mot de passe reste sensible aux majuscules et aux minuscules; saisis-le exactement comme il a été défini.
- Le CRM ne présente pas de procédure de réinitialisation en libre-service. En cas d’oubli, demande à un administrateur de modifier le mot de passe dans **Utilisateurs**.
- Lors de la création d’un compte, le mot de passe temporaire doit contenir au moins huit caractères. Change-le selon les règles internes de sécurité dès que la procédure de l’équipe le permet.
- Ne partage jamais ton mot de passe avec le support ou dans une capture d’écran.

### Double authentification (2FA)

Dans la configuration PROD de cette release, `TWO_FACTOR_STATUS` n’est pas activé : le 2FA est donc **en sommeil**, et l’écran de connexion demande uniquement le nom d’utilisateur et le mot de passe.

Le code sait demander un code TOTP à six chiffres lorsque `TWO_FACTOR_STATUS` est défini sur `Active` et que les secrets nécessaires sont configurés. Cette activation relève d’une décision et d’une opération d’administration, pas d’un réglage individuel de l’utilisateur.

Si le 2FA est activé ultérieurement, ajoute le secret fourni par l’administrateur à une application d’authentification. Un secret TOTP est confidentiel : ne le partage pas. Si ton code est refusé, vérifie l’heure automatique du téléphone et demande à un administrateur de vérifier la configuration avant toute réinitialisation.

## 5. Rôles et droits des utilisateurs

Les droits sont attribués au compte par un administrateur.

| Profil affiché | Droits dans PROD {{RELEASE_VERSION}} |
|---|---|
| Administrateur (`admin`) | Lecture et écriture du CRM; gestion des utilisateurs; maintenance des options; accès au journal d’audit. |
| Direction (`management`) | Lecture et écriture des données CRM. Pas de gestion des utilisateurs, de la maintenance ou du journal d’audit. |
| Opérations commerciales (`sales`) | Même périmètre applicatif que Direction : lecture et écriture du CRM. |
| Membre (`member`) | Lecture seule des données CRM. Les commandes de création, modification et suppression ne sont pas disponibles. |

Un administrateur crée les comptes et choisit le profil. Il peut aussi désactiver un compte ou modifier son profil. L’administrateur ne peut pas désactiver ni rétrograder son propre compte depuis l’écran Utilisateurs.

Si un menu ou un bouton de modification te manque, il peut s’agir d’une restriction de rôle. Demande à l’administrateur de vérifier ton profil plutôt que d’utiliser le compte d’une autre personne.

## 6. Présentation du tableau de bord

Le tableau de bord est la page **Dashboard**. Il présente :

- quatre indicateurs : contacts suivis, projets actifs, activités à venir et actions en attente;
- les prochaines activités;
- les prochaines actions;
- les contacts récemment modifiés;
- les projets récemment modifiés;
- des liens vers les listes correspondantes.

Les sections vides affichent un message, par exemple **Aucune activité à venir**, **Aucune action en attente**, **Aucun contact enregistré** ou **Aucun projet actif**. Ces messages ne sont pas des données et n’ajoutent aucun enregistrement à la base.

**Google Agenda :** la connexion est disponible en DEV pour les tests. Elle reste désactivée en PROD tant qu’un client OAuth propre à PROD n’a pas été configuré. N’active pas la synchronisation depuis PROD jusque-là.

## 7. Gestion des contacts

Ouvre **Contacts** pour consulter le carnet. La liste comprend une recherche par mot-clé ainsi que des filtres par secteur et par ville. La fiche complète s’ouvre avec **Profil complet**.

### Créer un contact

Dans **Contacts**, utilise **Ajouter un contact**. Le prénom et le nom sont obligatoires. Les autres renseignements peuvent être laissés vides s’ils sont inconnus : titre, profil et type d’investisseur, niveau d’investissement, e-mail, téléphone, entreprise, secteur, ville, pays, date de naissance et genre. Le pays se choisit dans une liste défilante; France et Indonésie sont proposés en premier, puis les autres pays sont classés par ordre alphabétique.

Le contact est créé après validation du formulaire. Une adresse e-mail déjà utilisée par un autre contact est refusée.

### Fiche complète

La fiche permet de compléter, selon les besoins :

- identité, coordonnées principales, biographie, métier, langue, profil d’investissement et liens LinkedIn, Facebook, Instagram et X;
- entreprises, postes, services et dates de rattachement;
- adresses et coordonnées supplémentaires;
- projets intéressants pour le contact;
- dates importantes et relations;
- liens web, messageries, groupes, compétences, centres d’intérêt et champs personnalisés;
- photo de profil;
- notes de rencontre datées et signées par leur auteur.

Les photos acceptées sont au format JPEG, PNG ou WebP et doivent faire moins de 10 Mo. Le système les redimensionne et les convertit avant stockage.

Pour ajouter une note, ouvre la fiche, va à **Notes de rencontre**, indique la date, la nature de l’échange et le compte rendu, puis enregistre. Une note peut ensuite être supprimée avec confirmation.

## 8. Gestion des projets

Dans l’interface, **Projets** correspond au suivi de biens et projets immobiliers. Une fiche réunit plusieurs groupes d’informations :

- référence unique, nom, type, statut, état, propriétaire et entreprise;
- pays, adresse, quartier, district, province, code postal et coordonnées;
- galerie de photos du projet avec photo principale, légendes et ordre d’affichage;
- description, progression, surfaces, chambres, salles de bains, étages et équipements;
- accès, réseaux, services, gestion locative, rendement et occupation;
- budget en EUR, USD ou IDR et taux de conversion;
- zonage, permis, risques, droit foncier et informations du titre;
- documents, mandats, dossiers de transaction et visites associés.

### Créer et modifier un projet

Dans **Projets**, utilise **Ajouter un projet**. La référence, le nom, le type et le statut sont requis. Les champs numériques, dates, listes et coordonnées doivent respecter leur format. Enregistre le formulaire en bas de page.

Le pays se choisit dans une liste défilante. France et Indonésie apparaissent en premier, suivis des autres pays par ordre alphabétique. Le même sélecteur est utilisé pour les pays des contacts, adresses, entreprises et projets.

Pour modifier un projet, ouvre sa fiche, change les champs nécessaires puis **Enregistrer le projet**. Une référence déjà utilisée ne peut pas être réutilisée.

### Photos et localisation sur carte

Dans **Photos du projet**, tu peux ajouter jusqu’à 20 images JPEG, PNG ou WebP de 10 Mo maximum chacune. Le CRM les redimensionne et les convertit en WebP avant de les stocker. Tu peux ensuite modifier leur légende, définir la photo principale, changer leur ordre ou les supprimer.

Le stockage des images utilise un bucket privé Cloudflare R2. Si R2 n’est pas configuré dans l’environnement, la galerie reste visible mais l’ajout de photos est désactivé; contacte l’administrateur pour la configuration.

Dans **Adresse et accès**, renseigne la latitude et la longitude. Lorsque les deux coordonnées sont valides, le lien **Ouvrir ces coordonnées dans Google Maps** ouvre la position dans un nouvel onglet.

### Supprimer un projet

La suppression demande une confirmation. Elle supprime le bien/projet ainsi que les données immobilières et le projet historique liés selon les relations de l’application. Vérifie les titres, documents, mandats, dossiers et visites avant de confirmer : cette action n’a pas de corbeille de restauration dans l’interface.

## 9. Gestion des activités et rendez-vous

Ouvre **Activités** pour planifier ou consigner un rendez-vous, un appel, un suivi ou une autre interaction.

Le formulaire comprend le titre, le type, le contact et l’entreprise associés, la date, le canal, la durée, le responsable, le statut, la date de réalisation, la prochaine action, les détails et le résultat. Le titre et le type sont requis. Les statuts proposés sont **Planifiée**, **En cours**, **Réalisée** et **Annulée**.

Les activités apparaissent dans **Activités enregistrées** et, si leur date est à venir, dans le tableau de bord. Pour corriger une fiche, ouvre **Modifier**, enregistre tes changements puis vérifie le résultat dans la liste. La suppression demande une confirmation.

Une activité associée simultanément à un contact et à une entreprise doit respecter le rattachement du contact à cette entreprise. Sinon, le formulaire est refusé.

## 10. Gestion des actions et échéances

Ouvre **Actions** pour suivre les tâches à effectuer. Chaque action peut contenir un titre, une priorité, un statut, un contact, une entreprise, une échéance, un canal, une durée, un responsable, une date de réalisation, une prochaine action, des détails et un résultat.

- Priorités disponibles : **Prioritaire**, **Importante**, **Normale**.
- Statuts disponibles : **À faire**, **En cours**, **En attente**, **Terminée**, **Annulée**.
- Renseigne une échéance et un responsable lorsque l’action doit être suivie par une personne à une date précise.

Le tableau de bord affiche les actions et échéances à venir. Pour terminer une action, modifie son statut en **Terminée** puis enregistre. Modifier ou supprimer une action est réservé aux profils ayant les droits d’écriture; la suppression nécessite une confirmation.

## 11. Recherche et navigation dans l’application

Le menu principal donne accès à **Dashboard**, **Entreprises**, **Contacts**, **Projets**, **Activités**, **Actions**, **Utilisateurs**, **Maintenance** et **Journal d’audit**. **Recherche globale** et **Signaler un problème ou poser une question** se trouvent sous le menu.

La recherche globale porte sur les contacts, entreprises, projets, activités, actions et notes de contact. Saisis un mot-clé puis clique sur **Rechercher**. Pour revenir à la liste complète, utilise **Réinitialiser** lorsqu’il apparaît.

Certaines listes ont leur propre recherche : les contacts permettent aussi de filtrer par secteur et ville; les projets et entreprises acceptent également une recherche locale.

Si une recherche ne retourne rien, vérifie l’orthographe, retire les filtres et réessaie avec un terme plus court.

## 12. Lecture des indicateurs et analytics

PROD {{RELEASE_VERSION}} ne possède pas de module analytique avancé. Les indicateurs présents sont des compteurs du tableau de bord :

- **Contacts suivis** : nombre total de contacts; le complément indique les nouveaux contacts du mois.
- **Projets actifs** : nombre de fiches immobilières dont le statut n’est pas `SOLD`.
- **Activités à venir** : activités dont la date est maintenant ou dans le futur.
- **Actions en attente** : actions dont le statut n’est pas **Terminée**. Cela peut aussi inclure une action **Annulée**; vérifie la liste détaillée avant d’interpréter le chiffre.
- **En retard** : actions non terminées avec une échéance antérieure à l’heure actuelle.

Les indicateurs se recalculent à partir des données enregistrées. Les compteurs affichant `0` ou `00` signifient qu’aucun enregistrement correspondant n’a été trouvé selon ces règles.

## 13. Les rapports

Il n’existe pas de rubrique **Rapports**, de générateur de rapport ni de fonction d’export PDF/CSV dans PROD {{RELEASE_VERSION}}. Le tableau de bord fournit les compteurs décrits au chapitre précédent; la Recherche globale aide à retrouver les enregistrements, mais ne produit pas de rapport téléchargeable.

Pour transmettre une information, utilise les données visibles dans les fiches et respecte les règles internes de confidentialité. Ne considère pas une capture d’écran comme un rapport officiel ou un export exhaustif.

## 14. Création, modification et suppression des données

### Création

1. Ouvre la rubrique correspondante.
2. Clique sur **Ajouter** ou utilise le formulaire de création affiché dans la page.
3. Complète les champs obligatoires et les associations utiles.
4. Vérifie les noms, dates, références et liens avant de valider.
5. Vérifie le message de confirmation et la présence de la fiche dans la liste.

### Modification

Ouvre la fiche ou la commande **Modifier**, change uniquement les informations nécessaires puis clique sur **Enregistrer**. Si tu quittes une fiche modifiée sans enregistrer, l’application peut afficher un avertissement de modifications non enregistrées.

### Suppression

Les commandes de suppression demandent généralement de cocher une case de confirmation. Lis le message avant de valider. Il n’y a pas de corbeille dans l’application : une suppression peut être définitive et les données liées peuvent être supprimées avec leur parent.

- Supprimer un contact n’est pas la même opération que le détacher d’une entreprise.
- Supprimer un projet peut supprimer les données immobilières, documents et relations associés.
- Ne supprime jamais un compte utilisateur pour retirer seulement ses droits : demande à un administrateur de le désactiver ou de modifier son profil.

En cas de doute, annule l’opération et demande à un administrateur avant de confirmer.

## 15. Règles de qualité et de confidentialité des données

- Crée un seul contact par personne et utilise une adresse e-mail exacte; les e-mails de contact sont uniques.
- Renseigne prénom et nom correctement. Le prénom et le nom sont obligatoires.
- Utilise une référence unique et explicite pour chaque projet.
- Vérifie les unités et devises avant de saisir une surface, un budget, une distance ou un rendement.
- N’invente pas les informations manquantes : laisse les champs facultatifs vides ou utilise **Non renseigné**.
- Ne saisis pas de mots de passe, codes TOTP, coordonnées bancaires ou secrets techniques dans une fiche, une note ou une action.
- Limite les informations personnelles à ce qui est utile au suivi professionnel et respecte les règles internes de conservation et de consentement.
- Vérifie les destinataires avant d’associer un contact, une entreprise, un projet ou un responsable.
- Les pages sont protégées par une session et des permissions. Les mots de passe sont hachés par l’application; le cookie de session est configuré `HttpOnly`, `Secure` en production et limité à huit heures.
- N’envoie jamais `AUTH_SECRET`, `DATABASE_URL`, mot de passe ou secret TOTP au support.

## 16. Bonnes pratiques d’utilisation

- Vérifie le badge **PROD** avant chaque saisie métier.
- Associe les activités et actions au bon contact, à la bonne entreprise et au bon responsable.
- Donne aux actions un titre décrivant une tâche vérifiable, un statut correct et une échéance réaliste.
- Après une rencontre, consigne une activité et, si nécessaire, une note sur la fiche contact.
- Mets à jour une fiche existante plutôt que de créer un doublon.
- Avant une suppression, vérifie les relations et lis le message de confirmation.
- Utilise le journal d’audit pour rechercher les opérations récentes d’administration si tu es administrateur.
- Le menu Maintenance modifie les valeurs proposées dans certains menus déroulants : réserve cette fonction aux administrateurs.
- Google Agenda n’est pas connecté en PROD dans cette release; les options de synchronisation sont indisponibles dans cet environnement.

## 17. Dépannage et erreurs fréquentes

| Symptôme | Vérification / action |
|---|---|
| Identifiants invalides | Le nom d’utilisateur n’est pas sensible à la casse, mais le mot de passe l’est. Après plusieurs échecs, demande à l’administrateur de vérifier que le compte est actif. |
| Code 2FA demandé ou refusé | Le 2FA est en sommeil dans la configuration PROD vérifiée. Si l’écran le demande après un changement de configuration, utilise le code à six chiffres de l’application associée au bon compte; vérifie l’heure automatique du téléphone. Ne partage pas le secret. |
| Page inaccessible ou message base de données inaccessible | Recharge la page une fois. Si l’erreur persiste, note l’heure, la page et le message puis contacte le support. Ne modifie pas la configuration PostgreSQL toi-même. |
| Aucune donnée ou aucun résultat | Vérifie la recherche et les filtres. Les compteurs et listes reflètent la base réelle; un état vide ne signifie pas nécessairement une panne. |
| Adresse e-mail déjà utilisée | Recherche le contact existant et mets sa fiche à jour au lieu de créer un doublon. |
| Projet refusé | Vérifie la référence unique, le nom, le type, le statut, les champs numériques, les dates et la cohérence des informations de budget. |
| Suppression refusée | Coche la case de confirmation demandée. Si tu as un doute sur les données liées, annule et consulte un administrateur. |
| Tu ne vois pas les commandes d’écriture | Ton profil peut être **Membre**, qui est en lecture seule. Demande à un administrateur de vérifier les droits. |
| Le badge ne correspond pas à l’environnement attendu | Vérifie le libellé `PROD` et la version/build près du logo; actualise avec `⌘R` sur Mac ou `Ctrl+R` sur Windows/Linux. |

## 18. Support et procédure de remontée d’incidents

Le bouton **Signaler un problème ou poser une question**, situé sous **Recherche globale**, est accessible à tout utilisateur connecté. Choisis **Problèmes/Bugs** ou **Modifications/Améliorations**, puis décris la demande.

À l’envoi, le CRM ajoute automatiquement ton nom d’utilisateur, la date et l’heure (fuseau Europe/Paris), la catégorie et ton texte au **Journal d’audit**. Si le relais Google Apps Script est configuré dans l’environnement, le même message est envoyé à `marc.issan@gmail.com`. La demande reste enregistrée même si l’e-mail échoue ; l’écran l’indique alors et un administrateur peut vérifier son état dans le journal d’audit.

La configuration du relais et les variables Railway nécessaires sont décrites dans [Configuration de l’e-mail support](configurer-email-support.md). Chaque environnement doit posséder ses propres variables ; la configuration de DEV n’active pas automatiquement les e-mails en PROD.

Si le formulaire est inaccessible ou si l’envoi reste en attente, adresse le problème à l’administrateur CRM ou au responsable technique selon la procédure interne.

Fournis les informations suivantes :

1. Environnement : **PROD**.
2. Version et build affichés près du logo (pour cette release : `v{{RELEASE_VERSION}}`, puis le SHA court du build actif).
3. Date et heure avec fuseau horaire.
4. Page concernée et action effectuée juste avant l’erreur.
5. Message d’erreur exact et étapes permettant de reproduire le problème.
6. Capture d’écran expurgée des données personnelles non nécessaires.
