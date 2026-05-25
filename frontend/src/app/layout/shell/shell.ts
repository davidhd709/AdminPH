import { Component, signal } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { Sidebar } from "../sidebar/sidebar";
import { Topbar } from "../topbar/topbar";

/** Layout principal de la app autenticada: sidebar + topbar + contenido. */
@Component({
  selector: "app-shell",
  imports: [RouterOutlet, Sidebar, Topbar],
  templateUrl: "./shell.html",
})
export class Shell {
  /** Estado del drawer del sidebar en móvil (abierto/cerrado). */
  readonly menuOpen = signal(false);
}
