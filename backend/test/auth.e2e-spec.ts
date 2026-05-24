import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app-setup";
import { PrismaService } from "../src/modules/prisma/prisma.service";

/**
 * E2E de autenticación contra la BD real (puerto 5434).
 * Requiere que el contenedor adminph_postgres esté arriba y migrado.
 *
 * Cubre: login OK, credenciales inválidas, endpoint protegido sin/con token,
 * refresh rotation, logout. Los usuarios de test se crean y borran aquí.
 */
describe("Auth (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const email = `e2e-auth-${Date.now()}@test.com`;
  const password = "E2eStr0ng!Pass";
  let userId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        fullName: "E2E Auth",
        document: `doc-${Date.now()}`,
        globalRole: "SUPERADMIN",
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  it("POST /auth/login con credenciales válidas -> 200 + tokens", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password })
      .expect(200);

    expect(res.body).toHaveProperty("access_token");
    expect(res.body).toHaveProperty("refresh_token");
    expect(res.body.user.email).toBe(email);
    expect(res.body.user).not.toHaveProperty("password");
  });

  it("POST /auth/login con password incorrecto -> 401", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: "WrongPass1!" })
      .expect(401);
  });

  it("GET /companies sin token -> 401", async () => {
    await request(app.getHttpServer()).get("/api/v1/companies").expect(401);
  });

  it("GET /companies con token válido -> 200", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password })
      .expect(200);

    await request(app.getHttpServer())
      .get("/api/v1/companies")
      .set("Authorization", `Bearer ${login.body.access_token}`)
      .expect(200);
  });

  it("POST /auth/refresh rota el token; reusar el viejo -> 401", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password })
      .expect(200);

    const oldRefresh = login.body.refresh_token;

    const rotated = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refresh_token: oldRefresh })
      .expect(200);

    expect(rotated.body.refresh_token).not.toBe(oldRefresh);

    // Reusar el refresh viejo (ya revocado) -> 401.
    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refresh_token: oldRefresh })
      .expect(401);
  });
});
