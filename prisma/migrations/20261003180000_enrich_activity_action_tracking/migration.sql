ALTER TABLE "Activity"
  ADD COLUMN "canal" TEXT,
  ADD COLUMN "dureeMinutes" INTEGER,
  ADD COLUMN "resultat" TEXT,
  ADD COLUMN "prochaineAction" TEXT,
  ADD COLUMN "statut" TEXT,
  ADD COLUMN "dateRealisation" DATE,
  ADD COLUMN "responsableId" TEXT;

ALTER TABLE "ActionItem"
  ADD COLUMN "canal" TEXT,
  ADD COLUMN "dureeMinutes" INTEGER,
  ADD COLUMN "resultat" TEXT,
  ADD COLUMN "prochaineAction" TEXT,
  ADD COLUMN "dateRealisation" DATE,
  ADD COLUMN "responsableId" TEXT;

CREATE INDEX "Activity_responsableId_idx" ON "Activity"("responsableId");
CREATE INDEX "Activity_statut_dateRealisation_idx" ON "Activity"("statut", "dateRealisation");
CREATE INDEX "ActionItem_responsableId_idx" ON "ActionItem"("responsableId");
CREATE INDEX "ActionItem_statut_dateRealisation_idx" ON "ActionItem"("statut", "dateRealisation");

ALTER TABLE "Activity"
  ADD CONSTRAINT "Activity_responsableId_fkey"
  FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionItem"
  ADD CONSTRAINT "ActionItem_responsableId_fkey"
  FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
