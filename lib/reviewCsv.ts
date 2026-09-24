export type CsvReview = { date: string; rating: number; text: string; id?: string };

export function parseReviewCsv(input: string): CsvReview[] {
  if (input.length > 256_000) throw new Error("El archivo supera 256 KB.");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const source = input.replace(/^\uFEFF/, "");
  const headerLine = source.split(/\r?\n/, 1)[0]?.trim().toLowerCase();
  const delimiter = headerLine === "fecha;estrellas;texto" ||
    headerLine === "fecha;estrellas;texto;id" ? ";" : ",";
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field === "") quoted = true;
    else if (char === delimiter) { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (quoted) throw new Error("Hay comillas sin cerrar en el CSV.");
  if (field || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  const header = rows[0]?.map((cell) => cell.trim().toLowerCase()).join(",");
  const hasId = header === "fecha,estrellas,texto,id";
  if (header !== "fecha,estrellas,texto" && !hasId) {
    throw new Error("La primera fila debe ser: fecha,estrellas,texto (id opcional al final).");
  }
  const data = rows.slice(1).filter((item) => item.some((cell) => cell.trim()));
  if (!data.length || data.length > 100) throw new Error("Incluye entre 1 y 100 reseñas por archivo.");
  return data.map((item, index) => {
    if (item.length !== (hasId ? 4 : 3)) throw new Error(`La fila ${index + 2} no tiene el número esperado de columnas.`);
    return { date: item[0].trim(), rating: Number(item[1].trim()), text: item[2].trim(),
      ...(hasId && item[3].trim() ? { id: item[3].trim() } : {}) };
  });
}
