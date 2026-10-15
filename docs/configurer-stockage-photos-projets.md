# Configurer le stockage des photos de projets

Les images sont stockées dans un bucket Cloudflare R2 privé. PostgreSQL ne conserve que les légendes, l’ordre et la clé de chaque objet. Le service n’est activé que lorsque les quatre variables ci-dessous existent.

## Préparer Cloudflare R2

1. Crée un bucket privé pour DEV et un autre pour PROD. Par exemple : `manta-crm-dev-photos` et `manta-crm-prod-photos`.
2. Crée un jeton API R2 limité à la lecture, l’écriture et la suppression d’objets dans ces buckets. Ne rends pas les buckets publics.
3. Dans Railway, ouvre le service `CRM-Eliccir`, sélectionne l’environnement **Development**, puis ajoute ces variables :

```text
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
```

`R2_BUCKET_NAME` doit être le nom du bucket DEV. Saisis les valeurs secrètes directement dans Railway, jamais dans le dépôt, un ticket ou cette conversation. Le chemin des objets inclut aussi le nom d’environnement Railway.

## Vérifier DEV

Après l’ajout des variables, Railway redémarre le service. Sur une fiche projet DEV, ajoute une image JPEG, PNG ou WebP (10 Mo maximum). Le CRM la convertit en WebP, puis tu peux modifier sa légende, choisir la photo principale, changer l’ordre ou la supprimer.

Les images restent privées : leur route de lecture exige une permission CRM. Une photo optimisée ne peut pas dépasser 2 Mo. Chaque projet accepte jusqu’à 20 photos.

## Configurer PROD

N’ajoute ces variables et ne déploie cette fonctionnalité en PROD qu’après validation de DEV et autorisation explicite. Utilise le bucket PROD et un jeton limité à ce bucket. Ne réutilise pas la clé DEV.