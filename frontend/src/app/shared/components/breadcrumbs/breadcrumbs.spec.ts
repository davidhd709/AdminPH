import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { Breadcrumb, Breadcrumbs } from "./breadcrumbs";

function resolvedFor(items: Breadcrumb[]) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const ref = TestBed.createComponent(Breadcrumbs);
  ref.componentRef.setInput("items", items);
  ref.detectChanges();
  return ref.componentInstance.resolved();
}

describe("Breadcrumbs", () => {
  it("marca el último item como actual y sin enlace", () => {
    const r = resolvedFor([
      { label: "Finanzas", route: "/app/finance" },
      { label: "Pagos", route: "/app/finance/payments" },
    ]);
    expect(r[0]).toMatchObject({ label: "Finanzas", link: "/app/finance", current: false });
    expect(r[1]).toMatchObject({ label: "Pagos", link: null, current: true });
  });

  it("con un solo item, ese es el actual (sin enlace)", () => {
    const r = resolvedFor([{ label: "Empresas", route: "/app/companies" }]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ link: null, current: true });
  });

  it("un item intermedio sin route no genera enlace", () => {
    const r = resolvedFor([{ label: "Sección" }, { label: "Detalle" }]);
    expect(r[0].link).toBeNull();
    expect(r[0].current).toBe(false);
  });
});
