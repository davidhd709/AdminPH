import { TestBed } from "@angular/core/testing";
import { SectionCard } from "./section-card";

describe("SectionCard", () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it("renderiza el header con el título cuando se provee", () => {
    const ref = TestBed.createComponent(SectionCard);
    ref.componentRef.setInput("title", "Cuotas de la unidad");
    ref.detectChanges();
    const h2 = ref.nativeElement.querySelector("h2");
    expect(h2?.textContent).toContain("Cuotas de la unidad");
  });

  it("sin título no renderiza el header", () => {
    const ref = TestBed.createComponent(SectionCard);
    ref.detectChanges();
    expect(ref.nativeElement.querySelector("h2")).toBeNull();
  });
});
