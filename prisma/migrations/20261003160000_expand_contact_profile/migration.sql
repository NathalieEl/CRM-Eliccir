CREATE TYPE "ContactNoteNature" AS ENUM ('Telephonique', 'Email', 'WhatsApps', 'Presentiel', 'Autre');

ALTER TABLE "Contact"
  ADD COLUMN "deuxiemePrenom" TEXT,
  ADD COLUMN "typeEmail" TEXT,
  ADD COLUMN "libelleEmail" TEXT,
  ADD COLUMN "typeTelephone" TEXT,
  ADD COLUMN "libelleTelephone" TEXT,
  ADD COLUMN "surnom" TEXT,
  ADD COLUMN "dateNaissance" DATE,
  ADD COLUMN "genre" TEXT,
  ADD COLUMN "biographie" TEXT,
  ADD COLUMN "metier" TEXT,
  ADD COLUMN "languePreferee" TEXT,
  ADD COLUMN "trancheAge" TEXT,
  ADD COLUMN "photoProfil" BYTEA,
  ADD COLUMN "photoProfilType" TEXT;

ALTER TABLE "EntrepriseContact"
  ADD COLUMN "service" TEXT,
  ADD COLUMN "dateDebut" DATE,
  ADD COLUMN "dateFin" DATE,
  ADD COLUMN "type" TEXT NOT NULL DEFAULT 'work';

CREATE TABLE "ContactNickname" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  CONSTRAINT "ContactNickname_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContactNickname_contactId_value_key" ON "ContactNickname"("contactId", "value");

CREATE TABLE "ContactEmail" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'other',
  "label" TEXT,
  CONSTRAINT "ContactEmail_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContactEmail_contactId_idx" ON "ContactEmail"("contactId");

CREATE TABLE "ContactPhone" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'mobile',
  "label" TEXT,
  CONSTRAINT "ContactPhone_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContactPhone_contactId_idx" ON "ContactPhone"("contactId");

CREATE TABLE "ContactAddress" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "street" TEXT,
  "extendedAddress" TEXT,
  "poBox" TEXT,
  "locality" TEXT,
  "region" TEXT,
  "postalCode" TEXT,
  "country" TEXT,
  "type" TEXT NOT NULL DEFAULT 'home',
  "label" TEXT,
  CONSTRAINT "ContactAddress_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContactAddress_contactId_idx" ON "ContactAddress"("contactId");

CREATE TABLE "ContactEvent" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'other',
  CONSTRAINT "ContactEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContactEvent_contactId_date_idx" ON "ContactEvent"("contactId", "date");

CREATE TABLE "ContactRelation" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "relatedContactId" TEXT,
  "relatedName" TEXT,
  "type" TEXT NOT NULL,
  CONSTRAINT "ContactRelation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContactRelation_contactId_idx" ON "ContactRelation"("contactId");
CREATE INDEX "ContactRelation_relatedContactId_idx" ON "ContactRelation"("relatedContactId");

CREATE TABLE "ContactUrl" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'other',
  "label" TEXT,
  CONSTRAINT "ContactUrl_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContactUrl_contactId_idx" ON "ContactUrl"("contactId");

CREATE TABLE "ContactImClient" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "protocol" TEXT,
  "type" TEXT NOT NULL DEFAULT 'other',
  "label" TEXT,
  CONSTRAINT "ContactImClient_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContactImClient_contactId_idx" ON "ContactImClient"("contactId");

CREATE TABLE "ContactGroup" (
  "id" TEXT NOT NULL,
  "nom" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactGroup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContactGroup_nom_key" ON "ContactGroup"("nom");

CREATE TABLE "ContactGroupMembership" (
  "contactId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  CONSTRAINT "ContactGroupMembership_pkey" PRIMARY KEY ("contactId", "groupId")
);
CREATE INDEX "ContactGroupMembership_groupId_idx" ON "ContactGroupMembership"("groupId");

CREATE TABLE "ContactUserDefined" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  CONSTRAINT "ContactUserDefined_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContactUserDefined_contactId_key_key" ON "ContactUserDefined"("contactId", "key");

CREATE TABLE "ContactInterest" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  CONSTRAINT "ContactInterest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContactInterest_contactId_value_key" ON "ContactInterest"("contactId", "value");

CREATE TABLE "ContactSkill" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  CONSTRAINT "ContactSkill_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContactSkill_contactId_value_key" ON "ContactSkill"("contactId", "value");

CREATE TABLE "ContactProject" (
  "contactId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "interesse" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactProject_pkey" PRIMARY KEY ("contactId", "projectId")
);
CREATE INDEX "ContactProject_projectId_idx" ON "ContactProject"("projectId");

CREATE TABLE "ContactNote" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "date" DATE NOT NULL DEFAULT CURRENT_DATE,
  "nature" "ContactNoteNature" NOT NULL,
  "contenu" TEXT NOT NULL,
  "authorId" TEXT,
  "authorUsername" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContactNote_contactId_date_idx" ON "ContactNote"("contactId", "date");
CREATE INDEX "ContactNote_authorId_createdAt_idx" ON "ContactNote"("authorId", "createdAt");

ALTER TABLE "ContactNote"
  ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (to_tsvector('french'::regconfig, coalesce("contenu", ''))) STORED;
CREATE INDEX "ContactNote_searchVector_idx" ON "ContactNote" USING GIN ("searchVector");

INSERT INTO "ContactUrl" ("id", "contactId", "url", "type", "label")
SELECT 'contact-url-linkedin-' || replace("id", '-', ''), "id", "linkedin", 'profile', 'LinkedIn'
FROM "Contact"
WHERE NULLIF(trim("linkedin"), '') IS NOT NULL;

ALTER TABLE "ContactNickname" ADD CONSTRAINT "ContactNickname_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactEmail" ADD CONSTRAINT "ContactEmail_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactPhone" ADD CONSTRAINT "ContactPhone_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactAddress" ADD CONSTRAINT "ContactAddress_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactEvent" ADD CONSTRAINT "ContactEvent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactRelation" ADD CONSTRAINT "ContactRelation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactRelation" ADD CONSTRAINT "ContactRelation_relatedContactId_fkey" FOREIGN KEY ("relatedContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContactUrl" ADD CONSTRAINT "ContactUrl_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactImClient" ADD CONSTRAINT "ContactImClient_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactGroupMembership" ADD CONSTRAINT "ContactGroupMembership_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactGroupMembership" ADD CONSTRAINT "ContactGroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ContactGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactUserDefined" ADD CONSTRAINT "ContactUserDefined_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactInterest" ADD CONSTRAINT "ContactInterest_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactSkill" ADD CONSTRAINT "ContactSkill_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactProject" ADD CONSTRAINT "ContactProject_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactProject" ADD CONSTRAINT "ContactProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactNote" ADD CONSTRAINT "ContactNote_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactNote" ADD CONSTRAINT "ContactNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
COMMENT ON COLUMN "ContactNote"."searchVector" IS 'French full-text index over contact note content.';
ANALYZE "ContactNote";

