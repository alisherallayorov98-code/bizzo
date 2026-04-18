-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('SALE', 'PURCHASE', 'SERVICE', 'RENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELED');

-- CreateTable
CREATE TABLE "contract_templates" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ContractType" NOT NULL,
    "content" JSONB NOT NULL,
    "fields" JSONB NOT NULL DEFAULT '[]',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "templateId" TEXT,
    "contactId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ContractType" NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "data" JSONB NOT NULL DEFAULT '{}',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "totalAmount" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "pdfUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_reminders" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "reminderDate" TIMESTAMP(3) NOT NULL,
    "message" TEXT NOT NULL,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contract_templates_companyId_type_idx" ON "contract_templates"("companyId", "type");

-- CreateIndex
CREATE INDEX "contract_templates_companyId_isActive_idx" ON "contract_templates"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "contracts_companyId_status_idx" ON "contracts"("companyId", "status");

-- CreateIndex
CREATE INDEX "contracts_companyId_type_idx" ON "contracts"("companyId", "type");

-- CreateIndex
CREATE INDEX "contracts_contactId_idx" ON "contracts"("contactId");

-- CreateIndex
CREATE INDEX "contracts_endDate_idx" ON "contracts"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_companyId_contractNumber_key" ON "contracts"("companyId", "contractNumber");

-- CreateIndex
CREATE INDEX "contract_reminders_contractId_idx" ON "contract_reminders"("contractId");

-- CreateIndex
CREATE INDEX "contract_reminders_reminderDate_isSent_idx" ON "contract_reminders"("reminderDate", "isSent");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "contract_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_reminders" ADD CONSTRAINT "contract_reminders_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
