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
