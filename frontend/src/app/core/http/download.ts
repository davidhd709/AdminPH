import { HttpErrorResponse } from "@angular/common/http";

/**
 * Dispara la descarga de un Blob en el navegador con un nombre de archivo.
 * Se usa para reportes (PDF/Excel) que vienen autenticados como blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Extrae el mensaje de error real de una descarga fallida. Como la respuesta es
 * `blob`, el cuerpo del error también es un Blob con el JSON del backend.
 */
export async function blobErrorMessage(
  error: unknown,
  fallback = "No se pudo completar la descarga.",
): Promise<string> {
  if (error instanceof HttpErrorResponse && error.error instanceof Blob) {
    try {
      const parsed = JSON.parse(await error.error.text()) as { message?: string };
      if (parsed.message) return parsed.message;
    } catch {
      // cuerpo no-JSON: se usa el fallback.
    }
  }
  return fallback;
}
