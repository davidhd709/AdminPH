import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { Sidebar } from "../sidebar/sidebar";
import { Topbar } from "../topbar/topbar";

/** Layout principal de la app autenticada: sidebar + topbar + contenido. */
@Component({
  selector: "app-shell",
  imports: [RouterOutlet, Sidebar, Topbar],
  templateUrl: "./shell.html",
})
export class Shell {}
