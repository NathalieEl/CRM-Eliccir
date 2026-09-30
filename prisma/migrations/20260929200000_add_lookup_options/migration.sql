ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "titre" TEXT;

CREATE TABLE IF NOT EXISTS "LookupOption" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "LookupOption_category_value_key" ON "LookupOption"("category", "value");
CREATE INDEX IF NOT EXISTS "LookupOption_category_active_sortOrder_idx" ON "LookupOption"("category", "active", "sortOrder");

INSERT INTO "LookupOption" ("id", "category", "label", "value", "sortOrder", "updatedAt") VALUES
  ('title-m', 'contact_title', 'M.', 'M.', 10, CURRENT_TIMESTAMP),
  ('title-mme', 'contact_title', 'Mme', 'Mme', 20, CURRENT_TIMESTAMP),
  ('title-me', 'contact_title', 'Me', 'Me', 30, CURRENT_TIMESTAMP),
  ('title-dr', 'contact_title', 'Dr.', 'Dr.', 40, CURRENT_TIMESTAMP),
  ('title-pr', 'contact_title', 'Pr.', 'Pr.', 50, CURRENT_TIMESTAMP),
  ('title-mlle', 'contact_title', 'Mlle', 'Mlle', 60, CURRENT_TIMESTAMP)
ON CONFLICT ("category", "value") DO NOTHING;
