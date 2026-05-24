-- CreateEnum
CREATE TYPE "AssemblyType" AS ENUM ('ORDINARY', 'EXTRAORDINARY');

-- CreateEnum
CREATE TYPE "AssemblyStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "VotingType" AS ENUM ('SIMPLE', 'COEFFICIENT');

-- CreateEnum
CREATE TYPE "VotingStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "VoteChoice" AS ENUM ('YES', 'NO', 'ABSTAIN', 'BLANK');

-- CreateTable
CREATE TABLE "Assembly" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "AssemblyType" NOT NULL DEFAULT 'ORDINARY',
    "agenda" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "quorumPercent" DECIMAL(5,2),
    "status" "AssemblyStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Assembly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssemblyAttendance" (
    "id" TEXT NOT NULL,
    "assemblyId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "coefficient" DECIMAL(18,8) NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT true,
    "proxyUserId" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssemblyAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voting" (
    "id" TEXT NOT NULL,
    "assemblyId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "type" "VotingType" NOT NULL DEFAULT 'COEFFICIENT',
    "status" "VotingStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Voting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "votingId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "castById" TEXT NOT NULL,
    "choice" "VoteChoice" NOT NULL,
    "coefficient" DECIMAL(18,8) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Assembly_companyId_idx" ON "Assembly"("companyId");

-- CreateIndex
CREATE INDEX "Assembly_propertyId_idx" ON "Assembly"("propertyId");

-- CreateIndex
CREATE INDEX "AssemblyAttendance_assemblyId_idx" ON "AssemblyAttendance"("assemblyId");

-- CreateIndex
CREATE UNIQUE INDEX "AssemblyAttendance_assemblyId_unitId_key" ON "AssemblyAttendance"("assemblyId", "unitId");

-- CreateIndex
CREATE INDEX "Voting_assemblyId_idx" ON "Voting"("assemblyId");

-- CreateIndex
CREATE INDEX "Vote_votingId_idx" ON "Vote"("votingId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_votingId_unitId_key" ON "Vote"("votingId", "unitId");

-- AddForeignKey
ALTER TABLE "Assembly" ADD CONSTRAINT "Assembly_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assembly" ADD CONSTRAINT "Assembly_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assembly" ADD CONSTRAINT "Assembly_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssemblyAttendance" ADD CONSTRAINT "AssemblyAttendance_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "Assembly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssemblyAttendance" ADD CONSTRAINT "AssemblyAttendance_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssemblyAttendance" ADD CONSTRAINT "AssemblyAttendance_proxyUserId_fkey" FOREIGN KEY ("proxyUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voting" ADD CONSTRAINT "Voting_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "Assembly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_votingId_fkey" FOREIGN KEY ("votingId") REFERENCES "Voting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_castById_fkey" FOREIGN KEY ("castById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

