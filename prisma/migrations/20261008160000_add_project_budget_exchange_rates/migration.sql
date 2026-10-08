ALTER TABLE "Property"
ADD COLUMN "projectBudgetAmount" DECIMAL(20, 2),
ADD COLUMN "projectBudgetCurrency" VARCHAR(3),
ADD COLUMN "projectBudgetEur" DECIMAL(20, 2),
ADD COLUMN "projectBudgetUsd" DECIMAL(20, 2),
ADD COLUMN "projectBudgetIdr" DECIMAL(20, 2),
ADD COLUMN "projectBudgetRateEurUsd" DECIMAL(18, 8),
ADD COLUMN "projectBudgetRateEurIdr" DECIMAL(18, 8),
ADD COLUMN "projectBudgetRateUsdIdr" DECIMAL(18, 8),
ADD COLUMN "projectBudgetRateDate" DATE;