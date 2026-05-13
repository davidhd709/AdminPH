-- CreateEnum
CREATE TYPE "FeeConceptType" AS ENUM ('ADMINISTRATION', 'EXTRAORDINARY', 'FINE', 'INTEREST', 'PARKING', 'OTHER');

-- CreateEnum
CREATE TYPE "CalculationType" AS ENUM ('FIXED', 'COEFFICIENT');

-- CreateEnum
CREATE TYPE "InterestType" AS ENUM ('DAILY', 'MONTHLY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'LOGIN';
ALTER TYPE "AuditAction" ADD VALUE 'LOGOUT';
ALTER TYPE "AuditAction" ADD VALUE 'GENERATE';

-- DropForeignKey
ALTER TABLE "Fee" DROP CONSTRAINT "Fee_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_propertyId_fkey";

-- DropIndex
DROP INDEX "Payment_bankReference_key";

-- AlterTable
ALTER TABLE "Fee" ADD COLUMN     "companyId" TEXT NOT NULL,
ALTER COLUMN "propertyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "FeeConcept" DROP COLUMN "defaultValue",
DROP COLUMN "isFixed",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "calculationType" "CalculationType" NOT NULL DEFAULT 'FIXED',
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "defaultAmount" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "type" "FeeConceptType" NOT NULL DEFAULT 'ADMINISTRATION';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ALTER COLUMN "propertyId" SET NOT NULL;

-- CreateTable
CREATE TABLE "LateFeeConfig" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "interestRate" DECIMAL(5,2) NOT NULL,
    "interestType" "InterestType" NOT NULL DEFAULT 'MONTHLY',
    "graceDays" INTEGER NOT NULL DEFAULT 5,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LateFeeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LateFeeConfig_propertyId_key" ON "LateFeeConfig"("propertyId");

-- CreateIndex
CREATE INDEX "LateFeeConfig_propertyId_idx" ON "LateFeeConfig"("propertyId");

-- CreateIndex
CREATE INDEX "Fee_companyId_idx" ON "Fee"("companyId");

-- CreateIndex
CREATE INDEX "Fee_propertyId_idx" ON "Fee"("propertyId");

-- CreateIndex
CREATE INDEX "FeeConcept_companyId_idx" ON "FeeConcept"("companyId");

-- CreateIndex
CREATE INDEX "Payment_companyId_idx" ON "Payment"("companyId");

-- CreateIndex
CREATE INDEX "Payment_propertyId_idx" ON "Payment"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_propertyId_bankReference_key" ON "Payment"("propertyId", "bankReference");

-- AddForeignKey
ALTER TABLE "LateFeeConfig" ADD CONSTRAINT "LateFeeConfig_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeConcept" ADD CONSTRAINT "FeeConcept_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fee" ADD CONSTRAINT "Fee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fee" ADD CONSTRAINT "Fee_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
