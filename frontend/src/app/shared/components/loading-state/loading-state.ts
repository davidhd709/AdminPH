import { Component, input } from "@angular/core";
import { ProgressSpinnerModule } from "primeng/progressspinner";

@Component({
  selector: "app-loading-state",
  imports: [ProgressSpinnerModule],
  templateUrl: "./loading-state.html",
})
export class LoadingState {
  readonly message = input<string>();
}
