import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const superadmin = await prisma.user.upsert({
    where: { email: "admin@adminph.com" },
    update: {},
    create: {
      email: "admin@adminph.com",
      password: "hashed_password_here",
      fullName: "Super Admin",
      document: "123456789",
      globalRole: "SUPERADMIN",
    },
  });

  const company = await prisma.company.create({
    data: {
      name: "Administraciones Globales S.A.S",
      nit: "900123456-1",
      status: "ACTIVE",
    },
  });

  const property = await prisma.property.create({
    data: {
      companyId: company.id,
      name: "Conjunto Residencial El Bosque",
      address: "Calle 100 # 15-20",
      city: "Bogotá",
      department: "Cundinamarca",
      coefficientTotal: 100.0,
      status: "ACTIVE",
    },
  });

  const tower = await prisma.tower.create({
    data: {
      propertyId: property.id,
      name: "Torre 1",
      description: "Torre principal",
    },
  });

  const unit = await prisma.unit.create({
    data: {
      propertyId: property.id,
      towerId: tower.id,
      code: "101",
      floor: 1,
      number: "101",
      area: 75.5,
      coefficient: 1.23456789,
      status: "OCCUPIED",
    },
  });

  console.log("Seed completed successfully", {
    superadmin: superadmin.id,
    company: company.id,
    property: property.id,
    tower: tower.id,
    unit: unit.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
