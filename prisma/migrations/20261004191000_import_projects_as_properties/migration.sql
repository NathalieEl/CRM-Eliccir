ALTER TABLE "Property"
ADD COLUMN "country" TEXT,
ADD COLUMN "projectStatus" TEXT,
ADD COLUMN "projectBudget" TEXT,
ADD COLUMN "projectProgression" INTEGER,
ADD COLUMN "entrepriseId" TEXT,
ADD COLUMN "legacyProjectId" TEXT;

CREATE UNIQUE INDEX "Property_legacyProjectId_key" ON "Property"("legacyProjectId");
CREATE INDEX "Property_entrepriseId_idx" ON "Property"("entrepriseId");

ALTER TABLE "Property"
ADD CONSTRAINT "Property_entrepriseId_fkey"
FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Property"
ADD CONSTRAINT "Property_legacyProjectId_fkey"
FOREIGN KEY ("legacyProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Property" (
    "id",
    "reference",
    "title",
    "type",
    "status",
    "country",
    "projectStatus",
    "projectBudget",
    "projectProgression",
    "entrepriseId",
    "legacyProjectId",
    "kabupaten",
    "views",
    "hasPool",
    "hasGarden",
    "amenities",
    "staffIncluded",
    "hasLitigation",
    "hasMortgageLien",
    "createdAt",
    "updatedAt"
)
SELECT
    'project-' || project."id",
    'PROJECT-' || project."id",
    project."nom",
    'PROJECT'::"PropertyType",
    'AVAILABLE'::"PropertyStatus",
    project."pays",
    project."statut",
    project."budget",
    project."progression",
    project."entrepriseId",
    project."id",
    project."ville",
    ARRAY[]::TEXT[],
    false,
    false,
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    false,
    false,
    project."createdAt",
    project."updatedAt"
FROM "Project" AS project
WHERE NOT EXISTS (
    SELECT 1 FROM "Property" AS property WHERE property."legacyProjectId" = project."id"
);
