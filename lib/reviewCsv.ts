export type CsvReview = { date: string; rating: number; text: string };

export function parseReviewCsv(input: string): CsvReview[] {
  if (input.length > 256_000) throw new Error("El archivo supera 256 KB.");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const source = input.replace(/^\uFEFF/, "");
  const delimiter = source.split(/\r?\n/, 1)[0]?.trim().toLowerCase() === "fecha;estrellas;texto" ? ";" : ",";
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
  if (rows[0]?.map((cell) => cell.trim().toLowerCase()).join(",") !== "fecha,estrellas,texto") {
    throw new Error("La primera fila debe ser: fecha,estrellas,texto.");
  }
  const data = rows.slice(1).filter((item) => item.some((cell) => cell.trim()));
  if (!data.length || data.length > 100) throw new Error("Incluye entre 1 y 100 reseñas por archivo.");
  return data.map((item, index) => {
    if (item.length !== 3) throw new Error(`La fila ${index + 2} debe tener tres columnas.`);
    return { date: item[0].trim(), rating: Number(item[1].trim()), text: item[2].trim() };
  });
}
