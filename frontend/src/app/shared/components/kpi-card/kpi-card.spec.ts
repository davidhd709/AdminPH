import { TestBed } from "@angular/core/testing";
import { KpiCard } from "./kpi-card";

describe("KpiCard", () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it("muestra un placeholder cuando el valor es null (cargando)", () => {
    const ref = TestBed.createComponent(KpiCard);
    ref.componentRef.setInput("label", "Copropiedades");
    ref.componentRef.setInput("value", null);
    ref.detectChanges();
    expect(ref.componentInstance.displayValue()).toBe("…");
  });

  it("muestra el valor cuando está presente", () => {
    const ref = TestBed.createComponent(KpiCard);
    ref.componentRef.setInput("label", "PQR abiertas");
    ref.componentRef.setInput("value", 4);
    ref.detectChanges();
    expect(ref.componentInstance.displayValue()).toBe("4");
  });

  it("usa el tono azul por defecto", () => {
    const ref = TestBed.createComponent(KpiCard);
    ref.componentRef.setInput("label", "X");
    ref.componentRef.setInput("value", 1);
    ref.detectChanges();
    expect(ref.componentInstance.toneClasses()).toContain("text-blue-600");
  });

  it("aplica las clases del tono indicado", () => {
    const ref = TestBed.createComponent(KpiCard);
    ref.componentRef.setInput("label", "X");
    ref.componentRef.setInput("value", 1);
    ref.componentRef.setInput("tone", "green");
    ref.detectChanges();
    expect(ref.componentInstance.toneClasses()).toContain("text-green-600");
  });
});
