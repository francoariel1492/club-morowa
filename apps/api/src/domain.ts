import { segment } from "./extensions";
import type { Submission } from "./extensions";
import { randomUUID } from "node:crypto";
export type Role = "admin" | "seller" | "customer";
export interface Actor {
  id: string;
  role: Role;
  customerId?: string;
}
export interface Customer {
  id: string;
  name: string;
  dni: string;
  firstName?: string;
  lastName?: string;
  hasAccount?: boolean;
  accountRequested?: boolean;
  registrationKind?: "self" | "preloaded";
  termsVersion?: string;
  privacyVersion?: string;
  importId?: string;
  phone: string;
  email: string;
  birthday: string;
  ninox: string;
  status: "approval" | "pending" | "active" | "blocked" | "rejected";
  joined: string;
  acceptedAt?: string;
  emailConsent: boolean;
  whatsappConsent: boolean;
  preferences: string;
  notes: string;
  account: { bands: number[]; updatedAt: string };
}
export interface Lot {
  id: string;
  customerId: string;
  purchaseId?: string;
  issued: number;
  remaining: number;
  expires: string;
  createdAt: string;
  warned?: boolean;
  warned7?: boolean;
  expired?: boolean;
}
export interface Voucher {
  id: string;
  customerId: string;
  kind: "points" | "birthday" | "welcome" | "campaign";
  amount: number;
  cost: number;
  min: number;
  status: "available" | "requested" | "redeemed" | "cancelled" | "expired";
  code: string;
  expires: string;
  createdAt?: string;
  requestedAt?: string;
  requestExpires?: string;
  acceptedAt?: string;
  allocations: { lotId: string; points: number }[];
  purchaseId?: string;
  redeemedBy?: string;
  redeemedAt?: string;
  direct?: boolean;
  percent?: number;
  campaignId?: string;
  warned?: boolean;
}
export interface Purchase {
  id: string;
  customerId: string;
  ticket: string;
  amount: number;
  paid: number;
  points: number;
  voucherId?: string;
  createdAt: string;
  status: "active" | "annul_pending" | "annulled";
  actorId: string;
  reason?: string;
  pendingPoints?: number;
  deficit?: number;
}
export interface Message {
  id: string;
  customerId: string;
  title: string;
  body: string;
  tag: string;
  createdAt: string;
  readAt?: string;
}
export interface Campaign {
  id: string;
  name: string;
  from: string;
  to: string;
  multiplier: number;
  type?: "multiplier" | "notice" | "voucher" | "bonus";
  segment?: string;
  sendAt?: string;
  amount?: number;
  percent?: number;
  min?: number;
  bonus?: number;
  recipients?: string[];
  manual?: boolean;
  benefitsIssued?: boolean;
  paused: boolean;
  body: string;
  sent?: boolean;
}
export interface Audit {
  id: string;
  actorId: string;
  action: string;
  target: string;
  at: string;
  detail: unknown;
}
export interface Outbox {
  id: string;
  to: string;
  subject: string;
  text: string;
  status: "pending" | "sent" | "delivered" | "bounced" | "failed";
  attempts: number;
  createdAt: string;
  providerId?: string;
  error?: string;
  nextAttempt?: string;
}
export interface User {
  id: string;
  login: string;
  name?: string;
  disabled?: boolean;
  passwordHash: string;
  role: Role;
  customerId?: string;
  mustChange: boolean;
  createdAt: string;
  failures: number;
  lockedUntil?: string;
  tokenHash?: string;
  tokenExpires?: string;
  lastInvite?: string;
  inviteCount?: number;
}
export interface Config {
  privacy?: string;
  termsVersion?: string;
  privacyVersion?: string;
  dailyVoucherLimit?: number;
  voucherWarnDays?: number;
  secondExpiryReminder?: boolean;
  birthdayHour?: number;
  per1000: number;
  rounding: "near" | "down" | "up";
  expiryMonths: number;
  warnDays: number;
  requestDays: number;
  annulDays: number;
  staleDays: number;
  reinviteDays: number;
  catalog: { amount: number; points: number; min: number; enabled?: boolean }[];
  welcome: { amount: number; min: number; days: number };
  birthday: { amount: number; min: number; days: number };
  pdv: string[];
  conditions: string;
  terms: string;
  templates: Record<
    string,
    {
      title: string;
      body: string;
      enabled: boolean;
      channel?: "portal" | "email" | "both";
    }
  >;
}
export interface State {
  submissions: Submission[];
  customers: Customer[];
  lots: Lot[];
  vouchers: Voucher[];
  purchases: Purchase[];
  messages: Message[];
  campaigns: Campaign[];
  audit: Audit[];
  outbox: Outbox[];
  users: User[];
  sessions: {
    id: string;
    userId: string;
    expires: string;
    lastActive?: string;
  }[];
  config: Config;
}
export const id = () => randomUUID();
export const digits = (s: unknown) => String(s ?? "").replace(/\D/g, "");
export const normalized = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/bloqueada/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
export const days = (now: string, n: number) =>
  new Date(Date.parse(now) + n * 86400000).toISOString();
export function months(now: string, n: number) {
  const d = new Date(now),
    day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString();
}
export function ensure(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
export const money = (n: number) => "$" + n.toLocaleString("es-AR");
const footer =
  " Si no querés recibir más mensajes del Club, desactivalos en Mi perfil > Mensajes o respondé BAJA.";
export const defaultConfig: Config = {
  privacy:
    "Política de privacidad de prueba. Pendiente de revisión y aprobación antes del lanzamiento.",
  termsVersion: "prueba-2026-11-15",
  privacyVersion: "prueba-2026-11-15",
  dailyVoucherLimit: 1,
  voucherWarnDays: 3,
  birthdayHour: 9,
  secondExpiryReminder: false,
  per1000: 1,
  rounding: "near",
  expiryMonths: 6,
  warnDays: 30,
  requestDays: 15,
  annulDays: 7,
  staleDays: 7,
  reinviteDays: 3,
  catalog: [
    { amount: 5000, points: 200, min: 50000 },
    { amount: 10000, points: 400, min: 100000 },
    { amount: 20000, points: 800, min: 200000 },
  ],
  welcome: { amount: 2000, min: 50000, days: 30 },
  birthday: { amount: 10000, min: 100000, days: 15 },
  pdv: ["0001", "0005"],
  conditions:
    "Un voucher por compra. Compra mínima: {min}. Tenés {dias} días para usarlo. Si cancelás o vence la solicitud, los puntos vuelven a sus lotes con su vencimiento original: los que ya vencieron no se recuperan. No se canjea por efectivo ni se descuenta de la cuenta corriente.",
  terms:
    "Bases de prueba — pendientes de aprobación por Morowa. Los puntos vencen a los 6 meses de cada compra. Los vouchers tienen compra mínima y vigencia. Un voucher por ticket. Consultá al local ante cualquier duda.",
  templates: {
    voucherExpiry: {
      enabled: true,
      title: "Tu voucher está por vencer",
      body: "Tu voucher {codigo} vence el {fecha}. Aprovechalo antes." + footer,
    },
    purchaseApproved: {
      enabled: true,
      title: "Compra aprobada",
      body: "Tu ticket {ticket} fue aprobado. Ya podés ver los puntos.",
    },
    purchaseRejected: {
      enabled: true,
      title: "Sobre tu ticket",
      body: "Tu ticket {ticket}: {motivo}",
    },
    recovery: {
      enabled: true,
      title: "Recuperá tu acceso",
      body: "Creá tu contraseña desde {link}. El enlace vence en 4 horas.",
    },
    welcome: {
      enabled: true,
      title: "¡Bienvenida al Club Morowa!",
      body: "Tu cuenta ya está activa. Ingresá con tu email y la contraseña que elegiste. Te regalamos un voucher de {monto} por sumarte (compra mínima {minima}). Lo ves en Vouchers y tenés {dias} días para usarlo.",
    },
    birthday: {
      enabled: true,
      title: "¡Feliz cumpleaños, {nombre}!",
      body:
        "Te regalamos {regalo} para tu próxima compra (compra mínima {minima}). Tenés {dias} días desde hoy para usarlo." +
        footer,
    },
    expiry: {
      enabled: true,
      title: "Tenés puntos por vencer",
      body:
        "{puntos} puntos vencen el {fecha}. Canjealos antes desde Vouchers." +
        footer,
    },
    invite: {
      enabled: true,
      title: "Sumate al Club Morowa",
      body: "Entrá con este link, creá tu contraseña y aceptá las bases: {link}. Revisá spam o promociones.",
    },
  },
};
export const emptyState = (): State => ({
  submissions: [],
  customers: [],
  lots: [],
  vouchers: [],
  purchases: [],
  messages: [],
  campaigns: [],
  audit: [],
  outbox: [],
  users: [],
  sessions: [],
  config: structuredClone(defaultConfig),
});
export function audit(
  s: State,
  a: Actor,
  action: string,
  target: string,
  detail: unknown,
  now: string,
) {
  s.audit.push({ id: id(), actorId: a.id, action, target, detail, at: now });
}
export function balance(s: State, cid: string, now: string) {
  return s.lots
    .filter((l) => l.customerId === cid && l.expires > now && !l.expired)
    .reduce((n, l) => n + l.remaining, 0);
}
export function pendingPoints(s: State, cid: string) {
  return s.vouchers
    .filter((v) => v.customerId === cid && v.status === "requested")
    .reduce((n, v) => n + v.allocations.reduce((a, b) => a + b.points, 0), 0);
}
export function pointsFor(amount: number, cfg: Config, mult = 1) {
  const f =
    cfg.rounding === "down"
      ? Math.floor
      : cfg.rounding === "up"
        ? Math.ceil
        : Math.round;
  return f(amount / 1000) * cfg.per1000 * mult;
}
export function accountStatus(c: Customer) {
  if (!c.hasAccount) return "Sin cuenta corriente";
  return c.account.bands[4] > 0 ? "Vencida" : "Activa";
}
export function notify(
  s: State,
  c: Customer,
  title: string,
  body: string,
  tag: string,
  now: string,
  email = true,
) {
  s.messages.push({
    id: id(),
    customerId: c.id,
    title,
    body,
    tag,
    createdAt: now,
  });
  if (email && (c.emailConsent || tag === "service") && c.email)
    s.outbox.push({
      id: id(),
      to: c.email,
      subject: title,
      text: body,
      status: "pending",
      attempts: 0,
      createdAt: now,
    });
}
export function template(
  s: State,
  c: Customer,
  key: string,
  vars: Record<string, string>,
  now: string,
) {
  const t = s.config.templates[key];
  if (!t?.enabled) return;
  const fill = (text: string) =>
    text.replace(
      /\{(\w+)\}/g,
      (m, k) =>
        (({ nombre: c.name.split(" ")[0], ...vars }) as Record<string, string>)[
          k
        ] ?? m,
    );
  const service = [
    "welcome",
    "purchaseApproved",
    "purchaseRejected",
    "recovery",
    "invite",
  ].includes(key);
  notify(
    s,
    c,
    fill(t.title),
    fill(key === "welcome" ? t.body.replace(footer, "") : t.body),
    service ? "service" : key,
    now,
    t.channel !== "portal",
  );
}
export function gift(
  s: State,
  c: Customer,
  kind: "welcome" | "birthday",
  now: string,
) {
  const cfg = s.config[kind];
  const v: Voucher = {
    id: id(),
    customerId: c.id,
    kind,
    amount: cfg.amount,
    min: cfg.min,
    cost: 0,
    status: "available",
    expires: days(now, cfg.days),
    createdAt: now,
    code: "MOR-" + id().slice(0, 8).toUpperCase(),
    allocations: [],
  };
  s.vouchers.push(v);
  template(
    s,
    c,
    kind,
    {
      monto: money(cfg.amount),
      regalo: money(cfg.amount),
      minima: money(cfg.min),
      dias: String(cfg.days),
    },
    now,
  );
  return v;
}
function take(s: State, cid: string, points: number, now: string) {
  ensure(balance(s, cid, now) >= points, "No tenés puntos suficientes.");
  let left = points;
  const allocations: { lotId: string; points: number }[] = [];
  for (const l of s.lots
    .filter(
      (l) =>
        l.customerId === cid &&
        l.expires > now &&
        !l.expired &&
        l.remaining > 0,
    )
    .sort((a, b) => a.expires.localeCompare(b.expires))) {
    const n = Math.min(left, l.remaining);
    if (n) {
      l.remaining -= n;
      allocations.push({ lotId: l.id, points: n });
      left -= n;
    }
    if (!left) break;
  }
  return allocations;
}
export function cancel(s: State, v: Voucher, now: string, penalty = false) {
  ensure(v.status === "requested", "La solicitud ya fue resuelta.");
  for (const a of v.allocations) {
    const l = s.lots.find((l) => l.id === a.lotId);
    if (l && l.expires > now && !l.expired && !penalty) l.remaining += a.points;
  }
  v.allocations = [];
  v.status =
    v.expires <= now
      ? "expired"
      : v.kind === "points"
        ? "cancelled"
        : "available";
  v.requestExpires = undefined;
}
export function request(
  s: State,
  c: Customer,
  input: { catalogIndex?: number; voucherId?: string; accepted: boolean },
  now: string,
) {
  ensure(c.status === "active", "La cuenta no está habilitada para canjear.");
  ensure(input.accepted === true, "Aceptá las condiciones del canje.");
  const old = s.vouchers.find(
    (v) => v.customerId === c.id && v.status === "requested",
  );
  let v: Voucher;
  if (input.voucherId) {
    const found = s.vouchers.find(
      (v) => v.id === input.voucherId && v.customerId === c.id,
    );
    ensure(
      found &&
        found.expires > now &&
        ["available", "requested"].includes(found.status),
      "Voucher no disponible.",
    );
    if (found === old) return found;
    v = found;
  } else {
    ensure(Number.isInteger(input.catalogIndex), "Elegí un voucher.");
    const cat = s.config.catalog[input.catalogIndex!];
    ensure(
      cat && cat.enabled !== false && cat.points > 0 && cat.amount > 0,
      "Voucher inválido.",
    );
    const refundable =
      old?.allocations.reduce(
        (n, a) =>
          n +
          (s.lots.some((l) => l.id === a.lotId && l.expires > now && !l.expired)
            ? a.points
            : 0),
        0,
      ) || 0;
    ensure(
      balance(s, c.id, now) + refundable >= cat.points,
      "No tenés puntos suficientes.",
    );
    v = {
      id: id(),
      customerId: c.id,
      kind: "points",
      amount: cat.amount,
      min: cat.min,
      cost: cat.points,
      status: "available",
      expires: days(now, s.config.requestDays),
      createdAt: now,
      code: "MOR-" + id().slice(0, 8).toUpperCase(),
      allocations: [],
    };
    s.vouchers.push(v);
  }
  if (old) cancel(s, old, now);
  if (
    v.kind === "points" &&
    !v.allocations.length &&
    v.cost > 0 &&
    input.catalogIndex !== undefined
  )
    v.allocations = take(s, c.id, v.cost, now);
  v.status = "requested";
  v.requestedAt = now;
  v.acceptedAt = now;
  v.requestExpires = [v.expires, days(now, s.config.requestDays)].sort()[0];
  return v;
}
export function purchase(s: State, a: Actor, input: any, now: string) {
  const c = s.customers.find((c) => c.id === input.customerId);
  ensure(c, "Clienta inexistente.");
  ensure(
    s.config.pdv.includes(input.pdv) && /^\d{1,8}$/.test(input.number),
    "Ticket inválido: elegí el punto de venta y hasta 8 dígitos.",
  );
  const ticket = input.pdv + "-" + input.number.padStart(8, "0");
  ensure(
    !s.submissions.some(
      (t) =>
        ["pending", "more"].includes(t.status) &&
        t.pdv + "-" + t.number === ticket,
    ),
    "Este ticket está reservado para revisión.",
  );
  const duplicate = s.purchases.find(
    (p) => p.ticket === ticket && p.status !== "annulled",
  );
  ensure(
    !duplicate,
    duplicate
      ? `Este ticket ya fue cargado el ${new Date(duplicate.createdAt).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Mendoza" })} para ${s.customers.find((x) => x.id === duplicate.customerId)?.name || "una clienta"}.`
      : "Ticket duplicado.",
  );
  const amount = Number(input.amount);
  ensure(
    Number.isFinite(amount) &&
      amount > 0 &&
      amount <= 1e10 &&
      Math.round(amount * 100) === amount * 100,
    "Importe inválido (máximo dos decimales).",
  );
  let v: Voucher | undefined;
  if (input.catalogIndex !== undefined) {
    ensure(
      input.accepted === true,
      "Confirmá la aceptación de condiciones para el canje directo.",
    );
    v = request(
      s,
      c,
      { catalogIndex: input.catalogIndex, accepted: true },
      now,
    );
    v.direct = true;
  } else if (input.voucherId) {
    v = s.vouchers.find(
      (v) => v.id === input.voucherId && v.customerId === c.id,
    );
    ensure(
      v &&
        ["available", "requested"].includes(v.status) &&
        v.expires > now &&
        (!v.requestExpires || v.requestExpires > now),
      "Voucher no disponible.",
    );
  }
  if (v) {
    ensure(c.status === "active", "Esta cuenta no puede canjear.");
    const day = (d: string) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Argentina/Mendoza",
      }).format(new Date(d));
    ensure(
      s.vouchers.filter(
        (x) =>
          x.customerId === c.id &&
          x.status === "redeemed" &&
          x.redeemedAt &&
          day(x.redeemedAt) === day(now),
      ).length < (s.config.dailyVoucherLimit ?? 1),
      "Ya se usó el máximo de vouchers permitido hoy.",
    );
    ensure(amount >= v.min, "La compra no alcanza el mínimo del voucher.");
    ensure(
      v.percent ? v.percent > 0 && v.percent < 100 : v.amount < amount,
      "El descuento debe ser menor al importe.",
    );
    v.direct = v.direct || v.status !== "requested";
  }
  const discount = v?.percent
    ? Math.round(amount * v.percent) / 100
    : v?.amount || 0;
  const paid = amount - discount;
  const mult = Math.max(
    1,
    ...s.campaigns
      .filter(
        (campaign) =>
          !campaign.paused &&
          campaign.from <= now &&
          campaign.to >= now &&
          segment(s, campaign.segment || "all", now).some((x) => x.id === c.id),
      )
      .map((c) => c.multiplier),
  );
  const points = c.status === "active" ? pointsFor(paid, s.config, mult) : 0;
  const p: Purchase = {
    id: id(),
    customerId: c.id,
    ticket,
    amount,
    paid,
    points,
    pendingPoints: ["pending", "approval"].includes(c.status)
      ? pointsFor(paid, s.config, mult)
      : undefined,
    voucherId: v?.id,
    createdAt: now,
    status: "active",
    actorId: a.id,
  };
  s.purchases.push(p);
  if (points)
    s.lots.push({
      id: id(),
      customerId: c.id,
      purchaseId: p.id,
      issued: points,
      remaining: points,
      createdAt: now,
      expires: months(now, s.config.expiryMonths),
    });
  if (v) {
    v.status = "redeemed";
    v.purchaseId = p.id;
    v.redeemedBy = a.id;
    v.redeemedAt = now;
  }
  return p;
}
export function annul(
  s: State,
  a: Actor,
  p: Purchase,
  reason: string,
  now: string,
  approve = false,
) {
  ensure(reason.trim().length >= 3, "Ingresá el motivo.");
  ensure(p.status !== "annulled", "La compra ya está anulada.");
  ensure(
    approve ||
      Date.parse(now) - Date.parse(p.createdAt) <=
        s.config.annulDays * 86400000,
    "Fuera del plazo: corresponde un ajuste manual.",
  );
  const lot = s.lots.find((l) => l.purchaseId === p.id);
  p.reason = reason;
  if (
    a.role !== "admin" &&
    (p.voucherId || (lot && lot.remaining < lot.issued))
  ) {
    p.status = "annul_pending";
    return;
  }
  if (lot)
    for (const v of s.vouchers.filter(
      (v) =>
        v.status === "requested" &&
        v.allocations.some((a) => a.lotId === lot.id),
    ))
      cancel(s, v, now);
  if (lot) {
    let missing = Math.max(0, lot.issued - Math.max(0, lot.remaining));
    lot.remaining = 0;
    lot.issued = 0;
    for (const other of s.lots
      .filter(
        (x) =>
          x.customerId === p.customerId &&
          x.id !== lot.id &&
          !x.expired &&
          x.expires > now,
      )
      .sort((a, b) => a.expires.localeCompare(b.expires))) {
      const n = Math.min(missing, Math.max(0, other.remaining));
      other.remaining -= n;
      missing -= n;
    }
    p.deficit = missing;
    if (missing) audit(s, a, "annul.deficit", p.id, { points: missing }, now);
  }
  p.status = "annulled";
  const v = s.vouchers.find((v) => v.id === p.voucherId);
  if (v) {
    v.status = v.expires > now ? "available" : "expired";
    v.requestExpires = undefined;
    v.allocations = [];
  }
}
export function daily(s: State, now: string) {
  for (const v of s.vouchers) {
    if (v.status === "requested" && (v.requestExpires || v.expires) <= now)
      cancel(s, v, now);
    if (v.expires <= now && v.status === "available") v.status = "expired";
  }
  for (const v of s.vouchers.filter(
    (v) =>
      !v.warned &&
      ["available", "requested"].includes(v.status) &&
      v.expires > now &&
      v.expires <= days(now, s.config.voucherWarnDays ?? 3),
  )) {
    const c = s.customers.find((c) => c.id === v.customerId);
    if (c?.status === "active") {
      template(
        s,
        c,
        "voucherExpiry",
        {
          codigo: v.code,
          fecha: new Date(v.expires).toLocaleDateString("es-AR", {
            timeZone: "America/Argentina/Mendoza",
          }),
        },
        now,
      );
      v.warned = true;
    }
  }
  for (const l of s.lots) {
    if (
      s.config.secondExpiryReminder &&
      !l.warned7 &&
      l.warned &&
      l.remaining > 0 &&
      l.expires > now &&
      l.expires <= days(now, 7)
    ) {
      const c = s.customers.find((c) => c.id === l.customerId);
      if (c?.status === "active") {
        template(
          s,
          c,
          "expiry",
          {
            puntos: String(l.remaining),
            fecha: new Date(l.expires).toLocaleDateString("es-AR", {
              timeZone: "America/Argentina/Mendoza",
            }),
          },
          now,
        );
        l.warned7 = true;
      }
    }
    if (l.expires <= now && !l.expired) {
      audit(
        s,
        { id: "system", role: "admin" },
        "points.expired",
        l.customerId,
        { lotId: l.id, points: l.remaining },
        now,
      );
      l.expired = true;
    }
    if (
      !l.warned &&
      l.remaining > 0 &&
      l.expires > now &&
      l.expires <= days(now, s.config.warnDays)
    ) {
      const c = s.customers.find((c) => c.id === l.customerId);
      if (c?.status === "active") {
        template(
          s,
          c,
          "expiry",
          {
            puntos: String(l.remaining),
            fecha: new Date(l.expires).toLocaleDateString("es-AR"),
          },
          now,
        );
        l.warned = true;
      }
    }
  }
  const local = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Argentina/Mendoza",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date(now));
  const [date, hour] = local.split(", ");
  const dm = date.slice(0, 5);
  const year = date.slice(-4);
  for (const c of s.customers.filter(
    (c) => c.status === "active" && c.birthday === dm,
  )) {
    if (
      Number(hour) >= (s.config.birthdayHour ?? 9) &&
      !s.audit.some(
        (e) =>
          e.action === "birthday.generated" &&
          e.target === c.id &&
          (e.detail as any)?.year === year,
      )
    ) {
      gift(s, c, "birthday", now);
      audit(
        s,
        { id: "system", role: "admin" },
        "birthday.generated",
        c.id,
        { year },
        now,
      );
    }
  }
  for (const campaign of s.campaigns) {
    if (
      !campaign.sent &&
      !campaign.paused &&
      (campaign.sendAt || campaign.from) <= now &&
      campaign.to >= now
    ) {
      campaign.recipients = [];
      for (const c of segment(s, campaign.segment || "all", now)) {
        if (
          s.messages.filter(
            (m) =>
              m.customerId === c.id &&
              ["campaign", "notice"].includes(m.tag) &&
              m.createdAt.slice(0, 7) === now.slice(0, 7),
          ).length >= 4
        )
          continue;
        const body = campaign.body
          .replace(/\{nombre\}/g, c.firstName || c.name)
          .replace(
            /\{desde\}/g,
            new Date(campaign.from).toLocaleDateString("es-AR", {
              timeZone: "America/Argentina/Mendoza",
            }),
          )
          .replace(
            /\{hasta\}/g,
            new Date(campaign.to).toLocaleDateString("es-AR", {
              timeZone: "America/Argentina/Mendoza",
            }),
          );
        notify(
          s,
          c,
          campaign.name,
          body + footer,
          campaign.manual ? "notice" : "campaign",
          now,
        );
        campaign.recipients.push(c.id);
      }
      campaign.sent = true;
    }
  }
  for (const campaign of s.campaigns.filter(
    (c) => !c.benefitsIssued && !c.paused && c.from <= now && c.to >= now,
  )) {
    for (const c of segment(s, campaign.segment || "all", now)) {
      if (campaign.type === "voucher")
        s.vouchers.push({
          id: id(),
          customerId: c.id,
          kind: "campaign",
          campaignId: campaign.id,
          amount: campaign.amount || 0,
          percent: campaign.percent,
          cost: 0,
          min: campaign.min || 0,
          status: "available",
          code: "MOR-" + id().slice(0, 8).toUpperCase(),
          expires: campaign.to,
          createdAt: now,
          allocations: [],
        });
      if (campaign.type === "bonus")
        s.lots.push({
          id: id(),
          customerId: c.id,
          issued: campaign.bonus!,
          remaining: campaign.bonus!,
          createdAt: now,
          expires: months(now, s.config.expiryMonths),
        });
    }
    campaign.benefitsIssued = true;
  }
  s.sessions = s.sessions.filter((x) => x.expires > now);
}
export function newCustomer(
  s: State,
  input: any,
  now: string,
  status: Customer["status"] = "pending",
) {
  const dni = digits(input.dni);
  ensure(
    !dni || /^\d{7,9}$/.test(dni),
    "El DNI opcional debe tener entre 7 y 9 dígitos.",
  );
  ensure(
    !dni || !s.customers.some((c) => c.dni === dni),
    "El DNI ya existe. Ingresá o recuperá tu acceso.",
  );
  ensure(
    typeof input.name === "string" && input.name.trim().length >= 3,
    "Completá nombre y apellido.",
  );
  ensure(!input.phone || digits(input.phone).length >= 7, "Revisá el celular.");
  const email = String(input.email || "")
    .trim()
    .toLowerCase();
  ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "Ingresá un email válido.");
  ensure(
    !s.customers.some((c) => c.email.toLowerCase() === email) &&
      !s.users.some((u) => u.login.toLowerCase() === email),
    "El email ya existe en el Club.",
  );
  const birthday = String(input.birthday || "");
  validateBirthday(birthday);
  const c: Customer = {
    id: id(),
    name: input.name.trim(),
    dni,
    phone: digits(input.phone),
    email,
    firstName: input.firstName,
    lastName: input.lastName,
    hasAccount: input.hasAccount === true || input.hasAccount === "true",
    registrationKind: status === "approval" ? "self" : "preloaded",
    birthday,
    ninox: input.ninox || "",
    status,
    joined: now,
    emailConsent: false,
    whatsappConsent: false,
    preferences: "",
    notes: "",
    account: { bands: [0, 0, 0, 0, 0], updatedAt: now },
  };
  s.customers.push(c);
  return c;
}
export function validateBirthday(value: string) {
  if (!value) return;
  ensure(/^\d{2}\/\d{2}$/.test(value), "Cumpleaños: usá DD/MM.");
  const [d, m] = value.split("/").map(Number);
  const test = new Date(Date.UTC(2000, m - 1, d));
  ensure(
    test.getUTCMonth() === m - 1 && test.getUTCDate() === d,
    "Fecha de cumpleaños inválida.",
  );
}
export function execute(
  s: State,
  a: Actor,
  action: string,
  input: any,
  now: string,
) {
  const admin = [
    "customer.block",
    "points.adjust",
    "config.save",
    "campaign.save",
    "registration.approve",
    "registration.reject",
    "account.update",
    "account.toggle",
    "customer.email",
    "annul.approve",
    "annul.reject",
  ];
  const staff = [
    "message.send",
    "account.requested",
    "purchase.create",
    "purchase.annul",
    "customer.create",
    "registration.approve",
    "registration.reject",
    "account.update",
    "voucher.cancel",
  ];
  ensure(
    a.role !== "customer" || ![...admin, ...staff].includes(action),
    "No tenés permiso para esta operación.",
  );
  ensure(
    !admin.includes(action) || a.role === "admin",
    "Solo la administradora puede hacer esto.",
  );
  const cid = a.role === "customer" ? a.customerId : input.customerId;
  const c = s.customers.find((c) => c.id === cid);
  let result: any = { ok: true };
  switch (action) {
    case "voucher.request":
      ensure(c, "Clienta inexistente.");
      result = request(s, c, input, now);
      if (a.role !== "customer")
        notify(
          s,
          c,
          "Canje realizado en el local",
          `Se canjearon ${result.cost} puntos por un voucher de ${money(result.amount)} en el local.`,
          "service",
          now,
        );
      break;
    case "voucher.cancel":
    case "portal.cancel": {
      const v = s.vouchers.find(
        (v) =>
          v.id === input.id && (a.role !== "customer" || v.customerId === cid),
      );
      ensure(v, "Voucher inexistente.");
      cancel(s, v, now);
      break;
    }
    case "purchase.create":
      result = purchase(s, a, input, now);
      break;
    case "purchase.annul":
    case "annul.approve": {
      const p = s.purchases.find((p) => p.id === input.id);
      ensure(p, "Compra inexistente.");
      if (action === "annul.approve")
        ensure(p.status === "annul_pending", "La solicitud ya se resolvió.");
      annul(
        s,
        a,
        p,
        String(input.reason || p.reason || ""),
        now,
        action === "annul.approve",
      );
      break;
    }
    case "annul.reject": {
      const p = s.purchases.find((p) => p.id === input.id);
      ensure(p?.status === "annul_pending", "La solicitud ya se resolvió.");
      p.status = "active";
      break;
    }
    case "customer.create":
      result = newCustomer(s, input, now);
      break;
    case "registration.approve":
      ensure(c?.status === "approval", "El registro ya se resolvió.");
      c.hasAccount = input.hasAccount === true;
      if (c.registrationKind === "self" && c.acceptedAt)
        activateCustomer(s, c, now);
      else c.status = "pending";
      break;
    case "registration.reject":
      ensure(c?.status === "approval", "El registro ya se resolvió.");
      c.status = "rejected";
      notify(
        s,
        c,
        "Sobre tu solicitud al Club",
        "Gracias por tu interés. Por el momento no pudimos aceptar tu solicitud. " +
          String(input.reason || "Podés consultar al local."),
        "service",
        now,
      );
      break;
    case "account.toggle":
      ensure(c, "Clienta inexistente.");
      c.hasAccount = input.enabled === true;
      break;
    case "account.requested":
      ensure(c, "Clienta inexistente.");
      c.accountRequested = input.enabled === true;
      break;
    case "customer.email": {
      ensure(c, "Clienta inexistente.");
      const email = String(input.email || "")
        .trim()
        .toLowerCase();
      ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "Email inválido.");
      ensure(
        !s.customers.some(
          (x) => x.id !== c.id && x.email.toLowerCase() === email,
        ) && !s.users.some((u) => u.customerId !== c.id && u.login === email),
        "El email ya está en uso.",
      );
      c.email = email;
      const u = s.users.find((u) => u.customerId === c.id);
      if (u) {
        u.login = email;
        u.tokenHash = undefined;
        u.tokenExpires = undefined;
        s.sessions = s.sessions.filter((t) => t.userId !== u.id);
      }
      break;
    }
    case "account.update":
      ensure(c, "Clienta inexistente.");
      ensure(c.hasAccount, "La clienta no tiene cuenta corriente habilitada.");
      ensure(
        Array.isArray(input.bands) &&
          input.bands.length === 5 &&
          input.bands.every((x: any) => Number.isFinite(x) && x >= 0),
        "Tramos inválidos.",
      );
      c.account = { bands: input.bands, updatedAt: now };
      break;
    case "customer.block":
      ensure(
        c && ["active", "blocked"].includes(c.status),
        "La clienta debe haber activado su cuenta.",
      );
      ensure(
        String(input.reason || "").trim().length >= 3,
        "Ingresá el motivo.",
      );
      c.status = input.blocked ? "blocked" : "active";
      if (input.blocked)
        for (const v of s.vouchers.filter(
          (v) => v.customerId === cid && v.status === "requested",
        ))
          cancel(s, v, now);
      if (input.blocked && input.penalty) {
        for (const v of s.vouchers.filter(
          (v) => v.customerId === cid && v.status === "requested",
        ))
          cancel(s, v, now, true);
        for (const l of s.lots.filter((l) => l.customerId === cid))
          l.remaining = Math.min(0, l.remaining);
      }
      break;
    case "points.adjust":
      ensure(c, "Clienta inexistente.");
      ensure(
        Number.isInteger(input.points) &&
          input.points !== 0 &&
          Math.abs(input.points) <= 1e7 &&
          String(input.reason || "").trim().length >= 3,
        "Ingresá puntos enteros y motivo.",
      );
      s.lots.push({
        id: id(),
        customerId: c.id,
        issued: input.points,
        remaining: input.points,
        createdAt: now,
        expires: months(now, s.config.expiryMonths),
      });
      break;
    case "profile.save":
      ensure(c, "Clienta inexistente.");
      validateBirthday(String(input.birthday || ""));
      c.birthday = String(input.birthday || "");
      c.preferences = String(input.preferences || "").slice(0, 1000);
      c.emailConsent = input.emailConsent === true;
      c.whatsappConsent = input.whatsappConsent === true;
      break;
    case "message.read": {
      const m = s.messages.find(
        (m) => m.id === input.id && m.customerId === cid,
      );
      ensure(m, "Mensaje inexistente.");
      m.readAt ??= now;
      break;
    }
    case "message.send":
      ensure(
        String(input.title || "").trim() && String(input.body || "").trim(),
        "Completá título y mensaje.",
      );
      for (const recipient of s.customers.filter(
        (c) =>
          c.status === "active" &&
          (!input.customerId || c.id === input.customerId),
      ))
        if (
          s.messages.filter(
            (m) =>
              m.customerId === recipient.id &&
              ["notice", "campaign"].includes(m.tag) &&
              m.createdAt.slice(0, 7) === now.slice(0, 7),
          ).length < 4
        )
          notify(
            s,
            recipient,
            input.title,
            input.body,
            "notice",
            now,
            input.email === true,
          );
      break;
    case "campaign.save": {
      const type = input.type || "multiplier",
        old = s.campaigns.find((x) => x.id === input.id);
      ensure(
        ["multiplier", "notice", "voucher", "bonus"].includes(type),
        "Tipo de campaña inválido.",
      );
      ensure(
        input.name &&
          input.body &&
          Number.isFinite(Date.parse(input.from)) &&
          Number.isFinite(Date.parse(input.to)) &&
          input.from < input.to,
        "Revisá nombre, mensaje y fechas.",
      );
      ensure(
        !input.sendAt || Number.isFinite(Date.parse(input.sendAt)),
        "Fecha de envío inválida.",
      );
      if (type === "multiplier")
        ensure(
          [2, 3].includes(Number(input.multiplier)),
          "Elegí puntos x2 o x3.",
        );
      if (type === "voucher")
        ensure(
          (Number(input.amount) > 0 ||
            (Number(input.percent) > 0 && Number(input.percent) < 100)) &&
            Number(input.min) >= (Number(input.amount) || 0),
          "Revisá el valor y mínimo del voucher.",
        );
      if (type === "bonus")
        ensure(
          Number.isInteger(Number(input.bonus)) && Number(input.bonus) > 0,
          "Ingresá el bono de puntos.",
        );
      const patch = {
        name: String(input.name),
        body: String(input.body),
        type,
        segment: input.segment || "all",
        from: new Date(input.from).toISOString(),
        to: new Date(input.to).toISOString(),
        sendAt: input.sendAt ? new Date(input.sendAt).toISOString() : undefined,
        multiplier: type === "multiplier" ? Number(input.multiplier) : 1,
        amount: Number(input.amount) || 0,
        percent: Number(input.percent) || undefined,
        min: Number(input.min) || 0,
        bonus: Number(input.bonus) || 0,
        paused: input.paused === true,
        manual: input.manual === true,
      };
      if (old) Object.assign(old, patch);
      else s.campaigns.push({ id: id(), ...patch } as Campaign);
      break;
    }
    case "config.save": {
      const cfg = input as Config;
      for (const k of [
        "per1000",
        "expiryMonths",
        "warnDays",
        "requestDays",
        "annulDays",
        "staleDays",
        "reinviteDays",
      ] as const)
        ensure(
          Number.isInteger(cfg[k]) && cfg[k] > 0 && cfg[k] < 10000,
          `Parámetro inválido: ${k}`,
        );
      ensure(
        ["near", "up", "down"].includes(cfg.rounding),
        "Redondeo inválido.",
      );
      ensure(
        Array.isArray(cfg.catalog) &&
          cfg.catalog.length > 0 &&
          cfg.catalog.every(
            (x) =>
              Number.isInteger(x.points) &&
              x.points > 0 &&
              Number.isFinite(x.amount) &&
              x.amount > 0 &&
              x.min > x.amount,
          ),
        "Catálogo inválido.",
      );
      ensure(
        Array.isArray(cfg.pdv) &&
          cfg.pdv.length > 0 &&
          cfg.pdv.every((x) => /^\d{4}$/.test(x)),
        "Puntos de venta inválidos.",
      );
      for (const k of ["welcome", "birthday"] as const)
        ensure(
          cfg[k] &&
            Number.isFinite(cfg[k].amount) &&
            cfg[k].amount > 0 &&
            cfg[k].min > cfg[k].amount &&
            Number.isInteger(cfg[k].days) &&
            cfg[k].days > 0,
          "Regalo inválido.",
        );
      ensure(
        typeof cfg.conditions === "string" &&
          typeof cfg.terms === "string" &&
          cfg.conditions.length > 0 &&
          cfg.terms.length > 0,
        "Completá las condiciones.",
      );
      for (const k of ["welcome", "birthday", "expiry", "invite"])
        ensure(
          cfg.templates?.[k] &&
            typeof cfg.templates[k].title === "string" &&
            typeof cfg.templates[k].body === "string" &&
            typeof cfg.templates[k].enabled === "boolean",
          "Plantillas inválidas.",
        );
      ensure(
        Number.isInteger(cfg.dailyVoucherLimit ?? 1) &&
          (cfg.dailyVoucherLimit ?? 1) > 0,
        "Límite diario inválido.",
      );
      if (cfg.terms !== s.config.terms) cfg.termsVersion = now;
      if (cfg.privacy !== s.config.privacy) cfg.privacyVersion = now;
      s.config = structuredClone(cfg);
      break;
    }
    default:
      throw new Error("Operación desconocida.");
  }
  audit(s, a, action, cid || input.id || "", input, now);
  return result;
}
export function publicView(s: State, a: Actor, now: string) {
  const staff = a.role !== "customer";
  const customers = s.customers
    .filter((c) => staff || c.id === a.customerId)
    .map((c) => {
      const { dni, account, notes, ...rest } = c;
      return {
        ...rest,
        ...(staff ? { notes } : {}),
        account: staff ? account : { updatedAt: account.updatedAt },
        accountStatus: accountStatus(c),
        points: balance(s, c.id, now),
        pendingPoints: pendingPoints(s, c.id),
        stale:
          !!c.hasAccount && days(account.updatedAt, s.config.staleDays) < now,
        lastInvite: staff
          ? s.users.find((u) => u.customerId === c.id)?.lastInvite
          : undefined,
        invitationStatus: staff
          ? s.outbox.filter((o) => o.to === c.email).slice(-1)[0]?.status
          : undefined,
        duplicate:
          staff &&
          s.customers.some(
            (x) =>
              x.id !== c.id &&
              ((c.phone && x.phone === c.phone) ||
                normalized(x.name) === normalized(c.name)),
          ),
      };
    });
  const mine = (x: { customerId: string }) =>
    staff || x.customerId === a.customerId;
  return {
    actor: a,
    customers,
    lots: s.lots.filter(mine),
    purchases: s.purchases.filter(mine),
    vouchers: s.vouchers.filter(mine),
    messages: s.messages.filter(mine).map((message) => ({
      ...message,
      body: message.body.replace(
        /\/#activar\/[a-f0-9]{64}/gi,
        "/#activar/[enlace privado]",
      ),
    })),
    campaigns: staff ? s.campaigns : [],
    config: staff
      ? s.config
      : {
          pdv: s.config.pdv,
          catalog: s.config.catalog,
          conditions: s.config.conditions,
          terms: s.config.terms,
          requestDays: s.config.requestDays,
        },
    audit: a.role === "admin" ? s.audit.slice(-500).reverse() : [],
    outbox:
      a.role === "admin"
        ? s.outbox.map(({ text, ...o }) => ({ ...o, text: o.subject }))
        : [],
    submissions: s.submissions
      .filter((t) => staff || t.customerId === a.customerId)
      .map(({ photo, ...t }) => t),
    now,
  };
}

export function activateCustomer(s: State, c: Customer, now: string) {
  c.status = "active";
  const u = s.users.find((u) => u.customerId === c.id);
  if (u) u.mustChange = false;
  if (!s.vouchers.some((v) => v.customerId === c.id && v.kind === "welcome"))
    gift(s, c, "welcome", now);
  for (const p of s.purchases.filter(
    (p) => p.customerId === c.id && p.pendingPoints && p.status === "active",
  )) {
    if (days(p.createdAt, 30) >= now) {
      p.points = p.pendingPoints!;
      s.lots.push({
        id: id(),
        customerId: c.id,
        purchaseId: p.id,
        issued: p.points,
        remaining: p.points,
        createdAt: p.createdAt,
        expires: months(p.createdAt, s.config.expiryMonths),
      });
    }
    p.pendingPoints = 0;
  }
}
