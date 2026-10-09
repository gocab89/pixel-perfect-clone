export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    let s = String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s; // évite l'injection de formules Excel
    return /[";\n,]/.test(s) || s !== String(v) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM pour qu'Excel lise les accents; séparateur ";" (Excel en français)
  return "\uFEFF" + [headers, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
}
