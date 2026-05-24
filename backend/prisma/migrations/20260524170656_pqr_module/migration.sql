-- CreateEnum
CREATE TYPE "PqrCategory" AS ENUM ('PETITION', 'COMPLAINT', 'CLAIM', 'SUGGESTION', 'OTHER');

-- CreateEnum
CREATE TYPE "PqrStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED');

-- CreateTable
CREATE TABLE "Pqr" (
    "id" TEXT NOT NULL,
    "ticketNumber" SERIAL NOT NULL,
    "companyId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT,
    "createdById" TEXT NOT NULL,
    "category" "PqrCategory" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "PqrStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Pqr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PqrResponse" (
    "id" TEXT NOT NULL,
    "pqrId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PqrResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pqr_ticketNumber_key" ON "Pqr"("ticketNumber");

-- CreateIndex
CREATE INDEX "Pqr_companyId_idx" ON "Pqr"("companyId");

-- CreateIndex
CREATE INDEX "Pqr_propertyId_idx" ON "Pqr"("propertyId");

-- CreateIndex
CREATE INDEX "Pqr_status_idx" ON "Pqr"("status");

-- CreateIndex
CREATE INDEX "PqrResponse_pqrId_idx" ON "PqrResponse"("pqrId");

-- AddForeignKey
ALTER TABLE "Pqr" ADD CONSTRAINT "Pqr_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pqr" ADD CONSTRAINT "Pqr_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pqr" ADD CONSTRAINT "Pqr_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pqr" ADD CONSTRAINT "Pqr_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PqrResponse" ADD CONSTRAINT "PqrResponse_pqrId_fkey" FOREIGN KEY ("pqrId") REFERENCES "Pqr"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PqrResponse" ADD CONSTRAINT "PqrResponse_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

