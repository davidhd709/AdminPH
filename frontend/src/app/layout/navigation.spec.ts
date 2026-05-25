import { UserRole } from "../core/auth/auth.models";
import { visibleNavSections } from "./navigation";

/** Labels de todos los items visibles para un rol (función pura, sin DOM). */
function labelsFor(role: UserRole): string[] {
  return visibleNavSections(role).flatMap((section) => section.items.map((item) => item.label));
}

describe("visibleNavSections", () => {
  it("OWNER no ve el enlace Documentos (ruta protegida solo para staff)", () => {
    expect(labelsFor("OWNER")).not.toContain("Documentos");
  });

  it("RESIDENT no ve el enlace Documentos", () => {
    expect(labelsFor("RESIDENT")).not.toContain("Documentos");
  });

  it("SUPERADMIN, COMPANY_ADMIN y PROPERTY_ADMIN sí ven Documentos", () => {
    const staff: UserRole[] = ["SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN"];
    for (const role of staff) {
      expect(labelsFor(role)).toContain("Documentos");
    }
  });

  it("sin rol (null) no devuelve secciones", () => {
    expect(visibleNavSections(null)).toEqual([]);
  });

  it("OWNER conserva su sección 'Mi cuenta' (la navegación propia no se rompe)", () => {
    const labels = labelsFor("OWNER");
    expect(labels).toContain("Mi unidad");
    expect(labels).toContain("Mis PQR");
    expect(labels).toContain("Reservar");
  });

  it("no incluye secciones vacías", () => {
    for (const section of visibleNavSections("OWNER")) {
      expect(section.items.length).toBeGreaterThan(0);
    }
  });
});
