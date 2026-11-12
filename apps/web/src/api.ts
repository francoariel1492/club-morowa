import type { publicView } from "../../api/src/domain";
export type View = ReturnType<typeof publicView> & {
  shopWhatsapp: string;
  demo: boolean;
};
export async function api<T = any>(path: string, body?: unknown): Promise<T> {
  const response = await fetch("/api/" + path, {
    credentials: "include",
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let result: any;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      "No se pudo conectar con el servidor. Verificá que la API y MySQL estén iniciados.",
    );
  }
  if (!response.ok)
    throw new Error(result.message || "No se pudo completar la operación.");
  return result;
}
export const cash = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
export const date = (s?: string) =>
  s ? new Date(s).toLocaleDateString("es-AR") : "—";
export const labels: Record<string, string> = {
  active: "Activa",
  pending: "Pendiente de aceptación",
  approval: "Registro por revisar",
  blocked: "Bloqueada",
  rejected: "Rechazada",
  available: "Disponible",
  requested: "Solicitado",
  redeemed: "Canjeado",
  cancelled: "Cancelado",
  expired: "Vencido",
  annul_pending: "Anulación pendiente",
  annulled: "Anulada",
  points: "Puntos",
  birthday: "Cumpleaños",
  welcome: "Bienvenida",
  campaign: "Campaña",
  notice: "Aviso",
  expiry: "Vencimiento",
  sent: "Enviado",
  failed: "Error",
  admin: "Administradora",
  seller: "Vendedora",
  customer: "Clienta",
};
