-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('STARTER', 'BUSINESS', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'STOREKEEPER', 'SALESPERSON', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('WASTE_MANAGEMENT', 'SALES_CRM', 'CONSTRUCTION', 'PRODUCTION', 'SERVICE', 'ADVANCED_REPORTS', 'AI_ANALYTICS', 'INTEGRATIONS');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('CUSTOMER', 'SUPPLIER', 'BOTH', 'PARTNER');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'PRODUCTION_IN', 'PRODUCTION_OUT', 'WASTE_IN', 'WASTE_OUT');

-- CreateEnum
CREATE TYPE "EmployeeType" AS ENUM ('PERMANENT', 'DAILY', 'CONTRACT');

-- CreateEnum
CREATE TYPE "DebtType" AS ENUM ('RECEIVABLE', 'PAYABLE');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK', 'STATUS_CHANGE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BudgetCategory" AS ENUM ('LABOR', 'MATERIALS', 'EQUIPMENT', 'SUBCONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ProductionType" AS ENUM ('CONVERSION', 'DISASSEMBLY', 'ASSEMBLY', 'PROCESSING');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "stir" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logo" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "taxRegime" TEXT NOT NULL DEFAULT 'GENERAL',
    "plan" "Plan" NOT NULL DEFAULT 'STARTER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "avatar" TEXT,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_modules" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "moduleType" "ModuleType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "company_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "stir" TEXT,
    "phone" TEXT,
    "phone2" TEXT,
    "email" TEXT,
    "address" TEXT,
    "region" TEXT,
    "notes" TEXT,
    "creditLimit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paymentDays" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'dona',
    "buyPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sellPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "minPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "minStock" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "image" TEXT,
    "isService" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_items" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "avgPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "reason" TEXT,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "position" TEXT,
    "department" TEXT,
    "employeeType" "EmployeeType" NOT NULL DEFAULT 'PERMANENT',
    "baseSalary" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "dailyRate" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "hireDate" DATE,
    "fireDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_records" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "baseSalary" DECIMAL(18,2) NOT NULL,
    "bonus" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "deduction" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "advance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_work_records" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "hoursWorked" DECIMAL(4,1) NOT NULL DEFAULT 8,
    "dailyRate" DECIMAL(18,2) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_work_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_records" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "type" "DebtType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remainAmount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "dueDate" TIMESTAMP(3),
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debt_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldData" JSONB,
    "newData" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste_quality_types" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "expectedLossMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedLossMax" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "buyPricePerKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waste_quality_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste_batches" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "contactId" TEXT,
    "citizenName" TEXT,
    "citizenPhone" TEXT,
    "qualityTypeId" TEXT NOT NULL,
    "inputWeight" DOUBLE PRECISION NOT NULL,
    "pricePerKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "notes" TEXT,
    "invoiceNumber" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "waste_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste_processing" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "processedWeight" DOUBLE PRECISION NOT NULL,
    "outputWeight" DOUBLE PRECISION NOT NULL,
    "lossWeight" DOUBLE PRECISION NOT NULL,
    "lossPercent" DOUBLE PRECISION NOT NULL,
    "outputProductId" TEXT,
    "outputNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "waste_processing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste_loss_analytics" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "processingId" TEXT NOT NULL,
    "qualityTypeName" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "contactId" TEXT,
    "lossPercent" DOUBLE PRECISION NOT NULL,
    "expectedLossMin" DOUBLE PRECISION NOT NULL,
    "expectedLossMax" DOUBLE PRECISION NOT NULL,
    "isAnomaly" BOOLEAN NOT NULL DEFAULT false,
    "anomalyReason" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waste_loss_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste_batch_workers" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "hoursWorked" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "dailyRate" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waste_batch_workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dealNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "stage" "DealStage" NOT NULL DEFAULT 'LEAD',
    "probability" INTEGER NOT NULL DEFAULT 20,
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "finalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "expectedCloseDate" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "assignedToId" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "lostReason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_items" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'dona',
    "price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "deal_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_activities" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "dealId" TEXT,
    "contactId" TEXT NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "paidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'dona',
    "price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL DEFAULT 'CASH',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_configs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMsg" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttempt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "construction_projects" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "clientId" TEXT,
    "managerId" TEXT,
    "contractAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "description" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "construction_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_items" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "BudgetCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'dona',
    "quantity" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_expenses" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "BudgetCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "warehouseId" TEXT,
    "productId" TEXT,
    "contactId" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_logs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "workersCount" INTEGER NOT NULL DEFAULT 0,
    "issues" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tasks" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "assignedToId" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_formulas" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProductionType" NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_formulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formula_inputs" (
    "id" TEXT NOT NULL,
    "formulaId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "formula_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formula_outputs" (
    "id" TEXT NOT NULL,
    "formulaId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "isMainProduct" BOOLEAN NOT NULL DEFAULT false,
    "isWaste" BOOLEAN NOT NULL DEFAULT false,
    "lossPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,

    CONSTRAINT "formula_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_batches" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "formulaId" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'PLANNED',
    "inputMultiplier" DECIMAL(10,3) NOT NULL DEFAULT 1,
    "plannedStart" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "plannedEnd" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "operatorId" TEXT,
    "warehouseId" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_inputs" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "plannedQty" DECIMAL(18,3) NOT NULL,
    "actualQty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "batch_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_outputs" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "plannedQty" DECIMAL(18,3) NOT NULL,
    "actualQty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "isWaste" BOOLEAN NOT NULL DEFAULT false,
    "isMainProduct" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "batch_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_analytics" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "formulaId" TEXT NOT NULL,
    "totalInputQty" DECIMAL(18,3) NOT NULL,
    "totalOutputQty" DECIMAL(18,3) NOT NULL,
    "totalWasteQty" DECIMAL(18,3) NOT NULL,
    "wastePercent" DECIMAL(6,2) NOT NULL,
    "totalInputCost" DECIMAL(18,2) NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL,
    "isAnomaly" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_stir_key" ON "companies"("stir");

-- CreateIndex
CREATE UNIQUE INDEX "users_companyId_email_key" ON "users"("companyId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "company_modules_companyId_moduleType_key" ON "company_modules"("companyId", "moduleType");

-- CreateIndex
CREATE INDEX "contacts_companyId_type_idx" ON "contacts"("companyId", "type");

-- CreateIndex
CREATE INDEX "contacts_companyId_name_idx" ON "contacts"("companyId", "name");

-- CreateIndex
CREATE INDEX "products_companyId_name_idx" ON "products"("companyId", "name");

-- CreateIndex
CREATE INDEX "products_companyId_category_idx" ON "products"("companyId", "category");

-- CreateIndex
CREATE INDEX "warehouses_companyId_idx" ON "warehouses"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_items_warehouseId_productId_key" ON "stock_items"("warehouseId", "productId");

-- CreateIndex
CREATE INDEX "stock_movements_warehouseId_createdAt_idx" ON "stock_movements"("warehouseId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_productId_createdAt_idx" ON "stock_movements"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "employees_companyId_isActive_idx" ON "employees"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "salary_records_employeeId_month_year_key" ON "salary_records"("employeeId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "daily_work_records_employeeId_workDate_key" ON "daily_work_records"("employeeId", "workDate");

-- CreateIndex
CREATE INDEX "debt_records_companyId_type_idx" ON "debt_records"("companyId", "type");

-- CreateIndex
CREATE INDEX "debt_records_companyId_isOverdue_idx" ON "debt_records"("companyId", "isOverdue");

-- CreateIndex
CREATE INDEX "audit_logs_companyId_createdAt_idx" ON "audit_logs"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "waste_quality_types_companyId_name_key" ON "waste_quality_types"("companyId", "name");

-- CreateIndex
CREATE INDEX "waste_batches_companyId_receivedAt_idx" ON "waste_batches"("companyId", "receivedAt");

-- CreateIndex
CREATE INDEX "waste_batches_companyId_status_idx" ON "waste_batches"("companyId", "status");

-- CreateIndex
CREATE INDEX "waste_processing_companyId_processedAt_idx" ON "waste_processing"("companyId", "processedAt");

-- CreateIndex
CREATE INDEX "waste_processing_batchId_idx" ON "waste_processing"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "waste_loss_analytics_processingId_key" ON "waste_loss_analytics"("processingId");

-- CreateIndex
CREATE INDEX "waste_loss_analytics_companyId_processedAt_idx" ON "waste_loss_analytics"("companyId", "processedAt");

-- CreateIndex
CREATE INDEX "waste_loss_analytics_companyId_isAnomaly_idx" ON "waste_loss_analytics"("companyId", "isAnomaly");

-- CreateIndex
CREATE UNIQUE INDEX "waste_batch_workers_batchId_employeeId_workDate_key" ON "waste_batch_workers"("batchId", "employeeId", "workDate");

-- CreateIndex
CREATE INDEX "deals_companyId_stage_idx" ON "deals"("companyId", "stage");

-- CreateIndex
CREATE INDEX "deals_companyId_contactId_idx" ON "deals"("companyId", "contactId");

-- CreateIndex
CREATE INDEX "deal_activities_dealId_createdAt_idx" ON "deal_activities"("dealId", "createdAt");

-- CreateIndex
CREATE INDEX "invoices_companyId_status_idx" ON "invoices"("companyId", "status");

-- CreateIndex
CREATE INDEX "invoices_companyId_contactId_idx" ON "invoices"("companyId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_configs_companyId_type_key" ON "integration_configs"("companyId", "type");

-- CreateIndex
CREATE INDEX "notification_logs_companyId_type_idx" ON "notification_logs"("companyId", "type");

-- CreateIndex
CREATE INDEX "notification_logs_companyId_createdAt_idx" ON "notification_logs"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "webhook_events_companyId_status_idx" ON "webhook_events"("companyId", "status");

-- CreateIndex
CREATE INDEX "construction_projects_companyId_status_idx" ON "construction_projects"("companyId", "status");

-- CreateIndex
CREATE INDEX "budget_items_projectId_idx" ON "budget_items"("projectId");

-- CreateIndex
CREATE INDEX "project_expenses_projectId_expenseDate_idx" ON "project_expenses"("projectId", "expenseDate");

-- CreateIndex
CREATE UNIQUE INDEX "work_logs_projectId_workDate_key" ON "work_logs"("projectId", "workDate");

-- CreateIndex
CREATE INDEX "project_tasks_projectId_status_idx" ON "project_tasks"("projectId", "status");

-- CreateIndex
CREATE INDEX "production_formulas_companyId_isActive_idx" ON "production_formulas"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "production_batches_companyId_status_idx" ON "production_batches"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "production_batches_companyId_batchNumber_key" ON "production_batches"("companyId", "batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "production_analytics_batchId_key" ON "production_analytics"("batchId");

-- CreateIndex
CREATE INDEX "production_analytics_companyId_processedAt_idx" ON "production_analytics"("companyId", "processedAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_modules" ADD CONSTRAINT "company_modules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_records" ADD CONSTRAINT "salary_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_work_records" ADD CONSTRAINT "daily_work_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_records" ADD CONSTRAINT "debt_records_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_records" ADD CONSTRAINT "debt_records_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_batches" ADD CONSTRAINT "waste_batches_qualityTypeId_fkey" FOREIGN KEY ("qualityTypeId") REFERENCES "waste_quality_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_processing" ADD CONSTRAINT "waste_processing_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "waste_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_loss_analytics" ADD CONSTRAINT "waste_loss_analytics_processingId_fkey" FOREIGN KEY ("processingId") REFERENCES "waste_processing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_batch_workers" ADD CONSTRAINT "waste_batch_workers_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "waste_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_items" ADD CONSTRAINT "deal_items_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_items" ADD CONSTRAINT "deal_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_activities" ADD CONSTRAINT "deal_activities_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_projects" ADD CONSTRAINT "construction_projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "construction_projects" ADD CONSTRAINT "construction_projects_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "construction_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_expenses" ADD CONSTRAINT "project_expenses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "construction_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "construction_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "construction_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formula_inputs" ADD CONSTRAINT "formula_inputs_formulaId_fkey" FOREIGN KEY ("formulaId") REFERENCES "production_formulas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formula_inputs" ADD CONSTRAINT "formula_inputs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formula_outputs" ADD CONSTRAINT "formula_outputs_formulaId_fkey" FOREIGN KEY ("formulaId") REFERENCES "production_formulas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formula_outputs" ADD CONSTRAINT "formula_outputs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_formulaId_fkey" FOREIGN KEY ("formulaId") REFERENCES "production_formulas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_inputs" ADD CONSTRAINT "batch_inputs_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_inputs" ADD CONSTRAINT "batch_inputs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_outputs" ADD CONSTRAINT "batch_outputs_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_outputs" ADD CONSTRAINT "batch_outputs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
