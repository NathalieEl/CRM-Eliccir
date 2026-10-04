-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('VILLA', 'HOUSE', 'APARTMENT', 'LAND', 'COMMERCIAL', 'BUILDING', 'WAREHOUSE', 'GUESTHOUSE_HOTEL');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('AVAILABLE', 'UNDER_OFFER', 'SOLD', 'RENTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PropertyCondition" AS ENUM ('NEW', 'GOOD', 'TO_RENOVATE', 'OFF_PLAN');

-- CreateEnum
CREATE TYPE "Furnishing" AS ENUM ('FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED');

-- CreateEnum
CREATE TYPE "WaterSource" AS ENUM ('PDAM', 'WELL', 'BOTH', 'NONE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SALE', 'SHORT_TERM_RENTAL', 'LONG_TERM_RENTAL', 'PURCHASE_SEARCH');

-- CreateEnum
CREATE TYPE "MandateType" AS ENUM ('EXCLUSIVE', 'SIMPLE', 'CO_AGENCY');

-- CreateEnum
CREATE TYPE "PriceUnit" AS ENUM ('TOTAL', 'PER_SQM', 'PER_ARE', 'PER_MONTH', 'PER_YEAR');

-- CreateEnum
CREATE TYPE "PayerParty" AS ENUM ('BUYER', 'SELLER', 'SPLIT', 'TO_BE_DETERMINED');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('PROSPECT', 'MANDATE_SIGNED', 'LISTED', 'OFFER_RECEIVED', 'PRELIMINARY_AGREEMENT', 'CLOSED', 'LOST');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "FinancingType" AS ENUM ('CASH', 'MORTGAGE', 'MIXED');

-- CreateEnum
CREATE TYPE "LandRightType" AS ENUM ('HAK_MILIK', 'HGB', 'HAK_PAKAI', 'HAK_SEWA', 'HMSRS', 'GIRIK', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "HoldingStructure" AS ENUM ('INDIVIDUAL', 'LOCAL_COMPANY', 'PT_PMA');

-- CreateEnum
CREATE TYPE "BuildingPermitStatus" AS ENUM ('PBG_OBTAINED', 'SLF_OBTAINED', 'LEGACY_IMB', 'NONE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ZoningType" AS ENUM ('RESIDENTIAL', 'TOURISM', 'COMMERCIAL', 'MIXED', 'AGRICULTURAL_PROTECTED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CostType" AS ENUM ('PBB', 'BPHTB', 'SELLER_TAX', 'PPN', 'NOTARY_PPAT_FEE', 'AGENCY_COMMISSION', 'OTHER');

-- CreateEnum
CREATE TYPE "ResidencyStatus" AS ENUM ('CITIZEN', 'KITAS', 'KITAP', 'TOURIST', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('LAND_CERTIFICATE', 'PBG', 'SLF', 'PBB_RECEIPT', 'MANDATE', 'PPJB', 'AJB', 'LEASE_AGREEMENT', 'OTHER');

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactRealEstateProfile" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "nationality" TEXT,
    "residencyStatus" "ResidencyStatus",
    "visaType" TEXT,
    "visaExpiryDate" TIMESTAMP(3),
    "financingType" "FinancingType",
    "leadSource" TEXT,
    "notes" TEXT,

    CONSTRAINT "ContactRealEstateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchCriteria" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "propertyTypes" "PropertyType"[],
    "areas" TEXT[],
    "budgetMin" DECIMAL(20,2),
    "budgetMax" DECIMAL(20,2),
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "minBedrooms" INTEGER,
    "minLandAreaSqm" DECIMAL(12,2),
    "mustHave" TEXT[],
    "niceToHave" TEXT[],
    "targetDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchCriteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "PropertyType" NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "condition" "PropertyCondition",
    "yearBuilt" INTEGER,
    "yearRenovated" INTEGER,
    "ownerId" TEXT,
    "address" TEXT,
    "kecamatan" TEXT,
    "kabupaten" TEXT,
    "province" TEXT,
    "postalCode" TEXT,
    "neighborhood" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "distanceBeachKm" DECIMAL(6,2),
    "distanceAirportKm" DECIMAL(6,2),
    "accessRoadWidthM" DECIMAL(5,2),
    "accessRoadType" TEXT,
    "views" TEXT[],
    "floodRisk" BOOLEAN,
    "landAreaSqm" DECIMAL(12,2),
    "buildingAreaSqm" DECIMAL(12,2),
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "floors" INTEGER,
    "hasPool" BOOLEAN NOT NULL DEFAULT false,
    "hasGarden" BOOLEAN NOT NULL DEFAULT false,
    "parkingSpaces" INTEGER,
    "furnishing" "Furnishing",
    "amenities" TEXT[],
    "electricityVA" INTEGER,
    "waterSource" "WaterSource",
    "sanitation" TEXT,
    "internetProvider" TEXT,
    "staffIncluded" TEXT[],
    "managementCompany" TEXT,
    "estimatedYieldPct" DECIMAL(5,2),
    "occupancyRatePct" DECIMAL(5,2),
    "zoning" "ZoningType",
    "buildingPermit" "BuildingPermitStatus",
    "hasLitigation" BOOLEAN NOT NULL DEFAULT false,
    "hasMortgageLien" BOOLEAN NOT NULL DEFAULT false,
    "banjarFeesMonthly" DECIMAL(14,2),
    "foreignerEligible" BOOLEAN,
    "foreignerEligibleNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandTitle" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "rightType" "LandRightType" NOT NULL,
    "certificateNumber" TEXT,
    "nib" TEXT,
    "holderName" TEXT,
    "holdingStructure" "HoldingStructure",
    "verifiedWithBpn" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "remainingYears" DECIMAL(5,1),
    "extensionPossible" BOOLEAN,
    "extensionCost" DECIMAL(20,2),
    "leaseStartDate" TIMESTAMP(3),
    "leaseEndDate" TIMESTAMP(3),
    "renewalOption" BOOLEAN,
    "lessorName" TEXT,
    "notes" TEXT,

    CONSTRAINT "LandTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mandate" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "agentId" TEXT,
    "transactionType" "TransactionType" NOT NULL,
    "mandateType" "MandateType" NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "commissionPct" DECIMAL(5,2),
    "commissionPaidBy" "PayerParty",
    "askingPrice" DECIMAL(20,2),
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "priceUnit" "PriceUnit" NOT NULL DEFAULT 'TOTAL',
    "exchangeRate" DECIMAL(18,6),
    "exchangeRateDate" TIMESTAMP(3),
    "monthlyRent" DECIMAL(20,2),
    "annualRent" DECIMAL(20,2),
    "minDurationMonths" INTEGER,
    "securityDeposit" DECIMAL(20,2),
    "chargesIncluded" BOOLEAN,
    "publishedOnPortals" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mandate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "mandateId" TEXT,
    "clientId" TEXT NOT NULL,
    "agentId" TEXT,
    "transactionType" "TransactionType" NOT NULL,
    "stage" "DealStage" NOT NULL DEFAULT 'PROSPECT',
    "negotiatedPrice" DECIMAL(20,2),
    "finalPrice" DECIMAL(20,2),
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "expectedClosingDate" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "lostReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "conditions" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Viewing" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "agentId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "feedback" TEXT,
    "interestLevel" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Viewing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionCost" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "type" "CostType" NOT NULL,
    "amount" DECIMAL(20,2),
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "paidBy" "PayerParty" NOT NULL DEFAULT 'TO_BE_DETERMINED',
    "notes" TEXT,

    CONSTRAINT "TransactionCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyDocument" (
    "id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "propertyId" TEXT,
    "dealId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_email_key" ON "Agent"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ContactRealEstateProfile_contactId_key" ON "ContactRealEstateProfile"("contactId");

-- CreateIndex
CREATE INDEX "SearchCriteria_contactId_idx" ON "SearchCriteria"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Property_reference_key" ON "Property"("reference");

-- CreateIndex
CREATE INDEX "Property_status_idx" ON "Property"("status");

-- CreateIndex
CREATE INDEX "Property_type_idx" ON "Property"("type");

-- CreateIndex
CREATE INDEX "Property_province_kabupaten_idx" ON "Property"("province", "kabupaten");

-- CreateIndex
CREATE UNIQUE INDEX "LandTitle_propertyId_key" ON "LandTitle"("propertyId");

-- CreateIndex
CREATE INDEX "Mandate_propertyId_idx" ON "Mandate"("propertyId");

-- CreateIndex
CREATE INDEX "Deal_stage_idx" ON "Deal"("stage");

-- CreateIndex
CREATE INDEX "Deal_clientId_idx" ON "Deal"("clientId");

-- CreateIndex
CREATE INDEX "Viewing_propertyId_idx" ON "Viewing"("propertyId");

-- CreateIndex
CREATE INDEX "Viewing_contactId_idx" ON "Viewing"("contactId");

-- AddForeignKey
ALTER TABLE "ContactRealEstateProfile" ADD CONSTRAINT "ContactRealEstateProfile_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchCriteria" ADD CONSTRAINT "SearchCriteria_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandTitle" ADD CONSTRAINT "LandTitle_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viewing" ADD CONSTRAINT "Viewing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viewing" ADD CONSTRAINT "Viewing_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viewing" ADD CONSTRAINT "Viewing_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionCost" ADD CONSTRAINT "TransactionCost_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyDocument" ADD CONSTRAINT "PropertyDocument_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyDocument" ADD CONSTRAINT "PropertyDocument_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
