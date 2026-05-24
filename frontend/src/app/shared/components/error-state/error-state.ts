import { Component, input, output } from "@angular/core";
import { ButtonModule } from "primeng/button";

@Component({
  selector: "app-error-state",
  imports: [ButtonModule],
  templateUrl: "./error-state.html",
})
export class ErrorState {
  readonly message = input<string>("Ocurrió un error al cargar la información.");
  readonly retry = output<void>();
}
