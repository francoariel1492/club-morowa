import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import {
  emailKey,
  personName,
  argentinaPhone,
  birthdayInput,
} from "./identity";
import {
  ensure,
  normalized,
  digits,
  State,
  newCustomer,
  audit,
  Actor,
} from "./domain";
const headerKey = (s: string) => normalized(s.replace(/\+/g, "mas "));
export interface ImportRow {
  row: number;
  name: string;
  data: any;
  customerId?: string;
  status: string;
  error?: string;
  blocked?: boolean;
}
export async function parseWorkbook(
  base64: string,
  kind: string,
  s: State,
): Promise<ImportRow[]> {
  ensure(
    typeof base64 === "string" && base64.length < 12e6,
    "Archivo demasiado grande (máximo 8 MB).",
  );
  ensure(
    ["master", "balances"].includes(kind),
    "Tipo de importación inválido.",
  );
  const book = new ExcelJS.Workbook();
  const buffer = Buffer.from(base64, "base64");
  if (buffer[0] === 0x50 && buffer[1] === 0x4b)
    await book.xlsx.load(buffer as any);
  else await book.csv.read(Readable.from([buffer]));
  ensure(book.worksheets.length === 1, "Usá una sola hoja en el archivo.");
  const sheet = book.worksheets[0];
  ensure(sheet, "El archivo no tiene hojas.");
  ensure(
    !Object.keys((sheet as any)._merges || {}).length,
    "El archivo no debe contener celdas combinadas.",
  );
  ensure(sheet.rowCount <= 10001, "Máximo 10.000 filas.");
  const headers: Record<string, number> = {};
  sheet.getRow(1).eachCell((cell, n) => {
    headers[headerKey(String(cell.text))] = n;
  });
  const required =
    kind === "master"
      ? ["Apellido", "Nombre", "Email"]
      : [
          "Cliente",
          "Saldo",
          "15 dias",
          "30 dias",
          "60 dias",
          "90 dias",
          "+90 dias",
        ];
  for (const h of required)
    ensure(headers[headerKey(h)], `Falta la columna ${h}.`);
  const rows: ImportRow[] = [];
  const seen = new Set<string>();
  let totals: number[] | undefined;
  const text = (row: ExcelJS.Row, key: string) => {
    const cell = row.getCell(headers[headerKey(key)] || sheet.columnCount + 1);
    return cell.text.trim();
  };
  const amount = (v: string) => {
    const cleaned = v.replace(/[$\s]/g, "");
    if (!cleaned) return 0;
    if (/^-?\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(cleaned))
      return Number(cleaned.replace(/\./g, "").replace(",", "."));
    if (/^-?\d+(\.\d+)?$/.test(cleaned)) return Number(cleaned);
    return Number(cleaned.replace(/\./g, "").replace(",", "."));
  };
  sheet.eachRow((row, i) => {
    if (i === 1) return;
    if (kind === "master") {
      const firstName = personName(text(row, "Nombre")),
        lastName = personName(text(row, "Apellido"));
      const email = emailKey(text(row, "Email")),
        name = lastName + ", " + firstName;
      if (!firstName && !lastName && !email) return;
      const errors: string[] = [];
      const data = {
        firstName,
        lastName,
        name,
        email,
        dni: digits(text(row, "DNI")),
        phone: "",
        birthday: "",
        hasAccount: /^(si|sí)$/i.test(text(row, "Cuenta corriente")),
      };
      if (!firstName || !lastName) errors.push("Completá Nombre y Apellido");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        errors.push("Email inválido");
      if (
        seen.has(email) ||
        s.customers.some((c) => c.email.toLowerCase() === email)
      )
        errors.push("Email duplicado");
      if (
        seen.has(normalized(name)) ||
        s.customers.some((c) => normalized(c.name) === normalized(name))
      )
        errors.push("Nombre y apellido repetidos: revisar");
      if (data.dni && !/^\d{7,9}$/.test(data.dni))
        errors.push("DNI opcional inválido");
      const cc = text(row, "Cuenta corriente");
      if (cc && !/^(si|sí|no)$/i.test(cc))
        errors.push("Cuenta corriente: indicá Sí o No");
      try {
        if (text(row, "Celular"))
          data.phone = argentinaPhone(
            text(row, "Código de área"),
            text(row, "Celular"),
          );
      } catch (e) {
        errors.push((e as Error).message);
      }
      try {
        if (text(row, "Cumpleaños"))
          data.birthday = birthdayInput(text(row, "Cumpleaños"));
      } catch (e) {
        errors.push((e as Error).message);
      }
      seen.add(email);
      seen.add(normalized(name));
      rows.push({
        row: i,
        name,
        data,
        status: errors.length ? "review" : "ready",
        error: errors.join(". "),
      });
    } else {
      const name = text(row, "Cliente");
      if (!name) return;
      const values = [
        "Saldo",
        "15 dias",
        "30 dias",
        "60 dias",
        "90 dias",
        "+90 dias",
      ].map((k) => {
        const cell = row.getCell(headers[headerKey(k)]);
        return typeof cell.value === "number" ? cell.value : amount(cell.text);
      });
      if (normalized(name) === "totales") {
        totals = values;
        return;
      }
      const match = s.customers.filter(
        (c) => normalized(c.ninox || c.name) === normalized(name),
      );
      const invalid =
        values.some((v) => !Number.isFinite(v) || v < 0) ||
        Math.abs(values[0] - values.slice(1).reduce((a, b) => a + b, 0)) > 0.01;
      const data = {
        bands: values.slice(1),
        total: values[0],
        lastDocument: text(row, "Ultimo Comp."),
      };
      rows.push({
        row: i,
        name,
        data,
        customerId: match.length === 1 ? match[0].id : undefined,
        status:
          invalid || match.length !== 1 || !match[0]?.hasAccount
            ? "review"
            : "ready",
        blocked: /bloqueada/i.test(name),
        error: invalid
          ? "Saldo y tramos no coinciden."
          : match.length > 1
            ? "Coincidencia ambigua."
            : match.length === 0
              ? "Sin coincidencia: asigná una clienta o ignorá la fila."
              : !match[0]?.hasAccount
                ? "La clienta no tiene cuenta corriente habilitada."
                : undefined,
      });
    }
  });
  if (totals) {
    const computed = [0, 0, 0, 0, 0, 0];
    for (const r of rows)
      [r.data.total, ...r.data.bands].forEach((v, i) => (computed[i] += v));
    ensure(
      totals.every(
        (v, i) => Number.isFinite(v) && Math.abs(v - computed[i]) < 0.01,
      ),
      "La fila TOTALES no coincide con las filas leídas. Revisá el archivo.",
    );
  }
  return rows;
}
export function applyImport(
  s: State,
  a: Actor,
  rows: ImportRow[],
  kind: string,
  selection: { row: number; customerId?: string }[],
  fileDate: string,
  zeroMissing: boolean,
  now: string,
) {
  ensure(
    /^\d{4}-\d{2}-\d{2}$/.test(fileDate) &&
      Number.isFinite(Date.parse(fileDate)) &&
      fileDate <= now.slice(0, 10),
    "Fecha del archivo inválida.",
  );
  const done = new Set<string>();
  let count = 0;
  for (const pick of selection) {
    const r = rows.find((r) => r.row === pick.row);
    ensure(r, "Fila inexistente.");
    if (kind === "master") {
      ensure(
        r.status === "ready",
        "Corregí los errores del archivo maestro antes de importar.",
      );
      const created = newCustomer(s, r.data, now);
      created.importId = now;
      count++;
    } else {
      ensure(
        !r.error?.includes("tramos"),
        "Corregí saldo y tramos en el archivo.",
      );
      const c = s.customers.find(
        (c) => c.id === (pick.customerId || r.customerId),
      );
      ensure(c, "Elegí una clienta para cada fila seleccionada.");
      ensure(c.hasAccount, "La clienta no tiene cuenta corriente habilitada.");
      ensure(!done.has(c.id), "Dos filas apuntan a la misma clienta.");
      done.add(c.id);
      c.ninox = r.name.replace(/bloqueada/gi, "").trim();
      c.account = {
        bands: r.data.bands,
        updatedAt: fileDate + "T12:00:00.000Z",
      };
      // Los saldos no cambian el estado del Club ni habilitan cuenta corriente.
      count++;
    }
  }
  if (kind === "balances" && zeroMissing)
    for (const c of s.customers)
      if (c.hasAccount && !done.has(c.id)) {
        c.account = {
          bands: [0, 0, 0, 0, 0],
          updatedAt: fileDate + "T12:00:00.000Z",
        };
      }
  audit(s, a, "import.confirmed", kind, { count, fileDate, zeroMissing }, now);
  return { count };
}
