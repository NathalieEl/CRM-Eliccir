CREATE TABLE "Entreprise" (
  "id" TEXT NOT NULL,
  "nom" TEXT NOT NULL,
  "email" TEXT,
  "telephone" TEXT,
  "siteWeb" TEXT,
  "secteur" TEXT,
  "adresse" TEXT,
  "ville" TEXT,
  "departement" TEXT,
  "pays" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Entreprise_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Entreprise_nom_key" ON "Entreprise"("nom");
CREATE UNIQUE INDEX "Entreprise_nom_normalized_key" ON "Entreprise"(lower(trim("nom")));

CREATE TABLE "EntrepriseContact" (
  "entrepriseId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "poste" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EntrepriseContact_pkey" PRIMARY KEY ("entrepriseId", "contactId")
);

CREATE INDEX "EntrepriseContact_contactId_idx" ON "EntrepriseContact"("contactId");

ALTER TABLE "Project" ADD COLUMN "entrepriseId" TEXT;
ALTER TABLE "Activity" ADD COLUMN "contactId" TEXT;
ALTER TABLE "Activity" ADD COLUMN "entrepriseId" TEXT;
ALTER TABLE "ActionItem" ADD COLUMN "contactId" TEXT;
ALTER TABLE "ActionItem" ADD COLUMN "entrepriseId" TEXT;

CREATE INDEX "Project_entrepriseId_idx" ON "Project"("entrepriseId");
CREATE INDEX "Activity_contactId_idx" ON "Activity"("contactId");
CREATE INDEX "Activity_entrepriseId_idx" ON "Activity"("entrepriseId");
CREATE INDEX "ActionItem_contactId_idx" ON "ActionItem"("contactId");
CREATE INDEX "ActionItem_entrepriseId_idx" ON "ActionItem"("entrepriseId");

INSERT INTO "Entreprise" ("id", "nom", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, min(trim("entreprise")), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Contact"
WHERE NULLIF(trim("entreprise"), '') IS NOT NULL
GROUP BY lower(trim("entreprise"));

INSERT INTO "EntrepriseContact" ("entrepriseId", "contactId", "poste")
SELECT e."id", c."id", c."poste"
FROM "Contact" c
JOIN "Entreprise" e ON lower(trim(c."entreprise")) = lower(e."nom")
WHERE NULLIF(trim(c."entreprise"), '') IS NOT NULL;

WITH contact_names AS (
  SELECT
    "id",
    lower(trim(concat_ws(' ', NULLIF(trim("prenom"), ''), "nom"))) AS "fullName"
  FROM "Contact"
), unique_names AS (
  SELECT "fullName", min("id") AS "contactId"
  FROM contact_names
  GROUP BY "fullName"
  HAVING count(*) = 1
)
UPDATE "Activity" a
SET "contactId" = u."contactId"
FROM unique_names u
WHERE a."contactId" IS NULL
  AND NULLIF(trim(a."contact"), '') IS NOT NULL
  AND lower(trim(a."contact")) = u."fullName";

WITH contact_names AS (
  SELECT
    "id",
    lower(trim(concat_ws(' ', NULLIF(trim("prenom"), ''), "nom"))) AS "fullName"
  FROM "Contact"
), unique_names AS (
  SELECT "fullName", min("id") AS "contactId"
  FROM contact_names
  GROUP BY "fullName"
  HAVING count(*) = 1
)
UPDATE "ActionItem" a
SET "contactId" = u."contactId"
FROM unique_names u
WHERE a."contactId" IS NULL
  AND NULLIF(trim(a."contact"), '') IS NOT NULL
  AND lower(trim(a."contact")) = u."fullName";

WITH single_company_contacts AS (
  SELECT "contactId", min("entrepriseId") AS "entrepriseId"
  FROM "EntrepriseContact"
  GROUP BY "contactId"
  HAVING count(*) = 1
)
UPDATE "Activity" a
SET "entrepriseId" = s."entrepriseId"
FROM single_company_contacts s
WHERE a."contactId" = s."contactId";

WITH single_company_contacts AS (
  SELECT "contactId", min("entrepriseId") AS "entrepriseId"
  FROM "EntrepriseContact"
  GROUP BY "contactId"
  HAVING count(*) = 1
)
UPDATE "ActionItem" a
SET "entrepriseId" = s."entrepriseId"
FROM single_company_contacts s
WHERE a."contactId" = s."contactId";

UPDATE "Activity" a
SET "entrepriseId" = e."id"
FROM "Entreprise" e
WHERE a."contactId" IS NULL
  AND a."entrepriseId" IS NULL
  AND NULLIF(trim(a."contact"), '') IS NOT NULL
  AND lower(trim(a."contact")) = lower(e."nom");

UPDATE "ActionItem" a
SET "entrepriseId" = e."id"
FROM "Entreprise" e
WHERE a."contactId" IS NULL
  AND a."entrepriseId" IS NULL
  AND NULLIF(trim(a."contact"), '') IS NOT NULL
  AND lower(trim(a."contact")) = lower(e."nom");

ALTER TABLE "Contact" DROP COLUMN "entreprise";
ALTER TABLE "Contact" DROP COLUMN "poste";

ALTER TABLE "EntrepriseContact"
  ADD CONSTRAINT "EntrepriseContact_entrepriseId_fkey"
  FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntrepriseContact"
  ADD CONSTRAINT "EntrepriseContact_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project"
  ADD CONSTRAINT "Project_entrepriseId_fkey"
  FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Activity"
  ADD CONSTRAINT "Activity_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Activity"
  ADD CONSTRAINT "Activity_entrepriseId_fkey"
  FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionItem"
  ADD CONSTRAINT "ActionItem_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionItem"
  ADD CONSTRAINT "ActionItem_entrepriseId_fkey"
  FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
