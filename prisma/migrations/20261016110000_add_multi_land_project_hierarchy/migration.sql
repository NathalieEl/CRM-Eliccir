ALTER TYPE "PropertyType" ADD VALUE 'LOT';

ALTER TABLE "Property"
ADD COLUMN "projectId" TEXT,
ADD COLUMN "landParcelId" TEXT;

CREATE INDEX "Property_projectId_idx" ON "Property"("projectId");
CREATE INDEX "Property_landParcelId_idx" ON "Property"("landParcelId");

ALTER TABLE "Property"
ADD CONSTRAINT "Property_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "Property_landParcelId_fkey"
FOREIGN KEY ("landParcelId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;