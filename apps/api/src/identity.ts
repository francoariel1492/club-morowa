import { ensure, digits, State, Customer, validateBirthday } from "./domain";
export const emailKey = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase();
export function personName(value: unknown) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("es-AR")
    .replace(/(^|[\s'-])\p{L}/gu, (c) => c.toLocaleUpperCase("es-AR"));
}
export function birthdayInput(value: unknown) {
  const v = String(value || "").trim();
  const parts = v.includes("/")
    ? v.split("/")
    : v.length === 4
      ? [v.slice(0, 2), v.slice(2)]
      : [];
  ensure(
    parts.length === 2 && parts.every((p) => /^\d{1,2}$/.test(p)),
    "Completá tu cumpleaños con día y mes (DD/MM).",
  );
  const result = parts.map((p) => p.padStart(2, "0")).join("/");
  validateBirthday(result);
  return result;
}
export function argentinaPhone(area: unknown, number: unknown) {
  let a = digits(area).replace(/^0/, "");
  let n = digits(number).replace(/^15/, "");
  ensure(
    a.length >= 2 && a.length <= 4 && (a + n).length === 10,
    "El código de área y celular deben sumar 10 dígitos, sin 0 ni 15.",
  );
  return "549" + a + n;
}
export function acceptTerms(s: State, c: Customer, input: any, now: string) {
  ensure(
    input.accepted === true,
    "Aceptá las bases y la política de privacidad.",
  );
  c.acceptedAt = now;
  c.termsVersion = s.config.termsVersion || "prueba-2026-11-15";
  c.privacyVersion = s.config.privacyVersion || "prueba-2026-11-15";
  c.emailConsent = input.emailConsent === true;
  c.whatsappConsent = input.whatsappConsent === true;
}
