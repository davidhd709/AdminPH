import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/**
 * Seed enriquecido e idempotente (Fase 6.4).
 *
 * Crea un dataset realista para probar multi-tenancy:
 *   - 1 SUPERADMIN global.
 *   - 2 empresas administradoras.
 *   - 2 copropiedades por empresa.
 *   - 1 PROPERTY_ADMIN por copropiedad.
 *   - 3 torres x 5 unidades por copropiedad.
 *   - 5 conceptos de cobro + LateFeeConfig por copropiedad.
 *   - propietarios/residentes por unidad.
 *   - cuotas de administración para 2 períodos.
 *
 * Re-ejecutable: usa upsert por claves naturales (email, nit, code, etc.).
 *
 * Password de todos los usuarios demo: "AdminPH2026!"
 */

const DEMO_PASSWORD = "AdminPH2026!";

async function main() {
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);

  const superadmin = await prisma.user.upsert({
    where: { email: "admin@adminph.com" },
    update: { password },
    create: {
      email: "admin@adminph.com",
      password,
      fullName: "Super Admin",
      document: "SA-0001",
      globalRole: "SUPERADMIN",
      emailVerifiedAt: new Date(),
    },
  });

  const companiesSpec = [
    { name: "Administraciones Globales S.A.S", nit: "900123456-1", slug: "globales" },
    { name: "Gestión Horizontal del Caribe S.A.S", nit: "901987654-2", slug: "caribe" },
  ];

  const summary: Record<string, number> = {
    companies: 0,
    properties: 0,
    admins: 0,
    towers: 0,
    units: 0,
    concepts: 0,
    owners: 0,
    residents: 0,
    fees: 0,
  };

  for (const c of companiesSpec) {
    const company = await prisma.company.upsert({
      where: { nit: c.nit },
      update: { name: c.name },
      create: { name: c.name, nit: c.nit, status: "ACTIVE" },
    });
    summary.companies++;

    // 1 COMPANY_ADMIN
    await prisma.user.upsert({
      where: { email: `company-admin@${c.slug}.com` },
      update: { password, companyId: company.id },
      create: {
        email: `company-admin@${c.slug}.com`,
        password,
        fullName: `Company Admin ${c.slug}`,
        document: `CA-${c.slug}`,
        globalRole: "COMPANY_ADMIN",
        companyId: company.id,
        emailVerifiedAt: new Date(),
      },
    });
    summary.admins++;

    for (let p = 1; p <= 2; p++) {
      const propNit = `${c.nit}-P${p}`;
      const property = await prisma.property.upsert({
        where: { nit: propNit },
        update: {},
        create: {
          companyId: company.id,
          name: `Conjunto ${c.slug} ${p}`,
          nit: propNit,
          address: `Calle ${10 * p} # ${p}-${p}0`,
          city: c.slug === "caribe" ? "Barranquilla" : "Bogotá",
          department: c.slug === "caribe" ? "Atlántico" : "Cundinamarca",
          coefficientTotal: 100,
          status: "ACTIVE",
        },
      });
      summary.properties++;

      // PROPERTY_ADMIN asignado a la copropiedad
      const padmin = await prisma.user.upsert({
        where: { email: `padmin-${c.slug}-${p}@adminph.com` },
        update: { password, companyId: company.id },
        create: {
          email: `padmin-${c.slug}-${p}@adminph.com`,
          password,
          fullName: `Property Admin ${c.slug}-${p}`,
          document: `PA-${c.slug}-${p}`,
          globalRole: "PROPERTY_ADMIN",
          companyId: company.id,
          emailVerifiedAt: new Date(),
        },
      });
      await prisma.propertyUser.upsert({
        where: { userId_propertyId: { userId: padmin.id, propertyId: property.id } },
        update: { role: "PROPERTY_ADMIN" },
        create: { userId: padmin.id, propertyId: property.id, role: "PROPERTY_ADMIN" },
      });
      summary.admins++;

      // Conceptos de cobro
      const concepts = [
        { name: "Administración", type: "ADMINISTRATION", calc: "FIXED", amount: 350000 },
        { name: "Parqueadero", type: "PARKING", calc: "FIXED", amount: 50000 },
        { name: "Cuota extraordinaria", type: "EXTRAORDINARY", calc: "COEFFICIENT", amount: 0 },
        { name: "Multa", type: "FINE", calc: "FIXED", amount: 100000 },
        { name: "Interés de mora", type: "INTEREST", calc: "FIXED", amount: 0 },
      ] as const;

      let adminConceptId = "";
      for (const concept of concepts) {
        const existing = await prisma.feeConcept.findFirst({
          where: { propertyId: property.id, name: concept.name, deletedAt: null },
        });
        const row =
          existing ??
          (await prisma.feeConcept.create({
            data: {
              companyId: company.id,
              propertyId: property.id,
              name: concept.name,
              type: concept.type,
              calculationType: concept.calc,
              defaultAmount: concept.amount,
              active: true,
            },
          }));
        if (concept.type === "ADMINISTRATION") adminConceptId = row.id;
        if (!existing) summary.concepts++;
      }

      // LateFeeConfig (1 por copropiedad)
      await prisma.lateFeeConfig.upsert({
        where: { propertyId: property.id },
        update: {},
        create: {
          companyId: company.id,
          propertyId: property.id,
          interestRate: 2.5,
          interestType: "MONTHLY",
          graceDays: 5,
          active: true,
        },
      });

      // 3 torres x 5 unidades. Tower no tiene unique natural, así que
      // findFirst + create para idempotencia.
      for (let t = 1; t <= 3; t++) {
        const existingTower = await prisma.tower.findFirst({
          where: { propertyId: property.id, name: `Torre ${t}`, deletedAt: null },
        });
        const tower =
          existingTower ??
          (await prisma.tower.create({
            data: {
              propertyId: property.id,
              name: `Torre ${t}`,
              description: `Torre ${t} de ${property.name}`,
            },
          }));
        if (!existingTower) summary.towers++;

        for (let u = 1; u <= 5; u++) {
          const code = `T${t}-${u}01`;
          const unit = await prisma.unit.upsert({
            where: { propertyId_code: { propertyId: property.id, code } },
            update: {},
            create: {
              propertyId: property.id,
              towerId: tower.id,
              code,
              floor: u,
              number: `${u}01`,
              area: 70 + u,
              coefficient: 1.5,
              status: "OCCUPIED",
            },
          });
          summary.units++;

          // 1 propietario + 1 residente por unidad (sin user vinculado)
          const hasOwner = await prisma.owner.findFirst({
            where: { unitId: unit.id, deletedAt: null },
          });
          if (!hasOwner) {
            await prisma.owner.create({
              data: { unitId: unit.id, isPrimary: true, status: "ACTIVE" },
            });
            summary.owners++;
          }
          const hasResident = await prisma.resident.findFirst({
            where: { unitId: unit.id, deletedAt: null },
          });
          if (!hasResident) {
            await prisma.resident.create({
              data: { unitId: unit.id, status: "ACTIVE" },
            });
            summary.residents++;
          }

          // Cuotas de administración para 2 períodos
          for (const period of ["2026-04", "2026-05"]) {
            const exists = await prisma.fee.findFirst({
              where: { unitId: unit.id, conceptId: adminConceptId, period },
            });
            if (!exists) {
              await prisma.fee.create({
                data: {
                  companyId: company.id,
                  propertyId: property.id,
                  unitId: unit.id,
                  conceptId: adminConceptId,
                  amount: 350000,
                  pendingAmount: 350000,
                  paidAmount: 0,
                  dueDate: new Date(`${period}-15T00:00:00Z`),
                  period,
                  status: "PENDING",
                },
              });
              summary.fees++;
            }
          }
        }
      }
    }
  }

  console.log("Seed completed:", { superadmin: superadmin.email, ...summary });
  console.log(`Demo password for all users: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
