CREATE TABLE "PropertyPhoto" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "caption" VARCHAR(240),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyPhoto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PropertyPhoto_objectKey_key" ON "PropertyPhoto"("objectKey");
CREATE INDEX "PropertyPhoto_propertyId_sortOrder_idx" ON "PropertyPhoto"("propertyId", "sortOrder");

ALTER TABLE "PropertyPhoto"
ADD CONSTRAINT "PropertyPhoto_propertyId_fkey"
FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;