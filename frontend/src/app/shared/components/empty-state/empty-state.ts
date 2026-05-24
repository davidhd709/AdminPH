import { Component, input } from "@angular/core";

@Component({
  selector: "app-empty-state",
  templateUrl: "./empty-state.html",
})
export class EmptyState {
  readonly icon = input<string>("pi pi-inbox");
  readonly title = input.required<string>();
  readonly message = input<string>();
}
