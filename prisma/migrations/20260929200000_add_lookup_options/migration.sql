ALTER TABLE "Contact" ADD COLUMN "titre" TEXT;

CREATE TABLE "LookupOption" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LookupOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LookupOption_category_value_key" ON "LookupOption"("category", "value");
CREATE INDEX "LookupOption_category_active_sortOrder_idx" ON "LookupOption"("category", "active", "sortOrder");

INSERT INTO "LookupOption" ("id", "category", "label", "value", "sortOrder") VALUES
  ('title-m', 'contact_title', 'M.', 'M.', 10),
  ('title-mme', 'contact_title', 'Mme', 'Mme', 20),
  ('title-me', 'contact_title', 'Me', 'Me', 30),
  ('title-dr', 'contact_title', 'Dr.', 'Dr.', 40),
  ('title-pr', 'contact_title', 'Pr.', 'Pr.', 50),
  ('title-mlle', 'contact_title', 'Mlle', 'Mlle', 60);
