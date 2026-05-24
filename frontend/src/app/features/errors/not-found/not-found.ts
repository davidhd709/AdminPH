import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ButtonModule } from "primeng/button";

@Component({
  selector: "app-not-found",
  imports: [RouterLink, ButtonModule],
  templateUrl: "./not-found.html",
})
export class NotFound {}
