import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ButtonModule } from "primeng/button";

@Component({
  selector: "app-forbidden",
  imports: [RouterLink, ButtonModule],
  templateUrl: "./forbidden.html",
})
export class Forbidden {}
