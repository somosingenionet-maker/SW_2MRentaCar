/**
 * Texto de WhatsApp y de correo para avisar al cliente de una factura. Esos enlaces solo llevan
 * texto y no pueden adjuntar archivos, así que el mensaje no promete ningún adjunto.
 */
export function mensajeFactura(d: { nombre: string; numero: string; total: string; empresa: string }): string {
  return `Hola ${d.nombre},\n\nTe escribimos sobre la Factura ${d.numero} por importe de ${d.total} €.\n\nSi tienes cualquier duda, respóndenos a este mensaje.\n\nUn saludo,\n${d.empresa}`;
}
