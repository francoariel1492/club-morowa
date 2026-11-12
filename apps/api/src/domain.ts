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
  requestedAt?: string;
  requestExpires?: string;
  acceptedAt?: string;
  allocations: { lotId: string; points: number }[];
  purchaseId?: string;
  redeemedBy?: string;
  redeemedAt?: string;
  direct?: boolean;
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
  status: "pending" | "sent" | "failed";
  attempts: number;
  createdAt: string;
  providerId?: string;
  error?: string;
  nextAttempt?: string;
}
export interface User {
  id: string;
  login: string;
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
  per1000: number;
  rounding: "near" | "down" | "up";
  expiryMonths: number;
  warnDays: number;
  requestDays: number;
  annulDays: number;
  staleDays: number;
  reinviteDays: number;
  catalog: { amount: number; points: number; min: number }[];
  welcome: { amount: number; min: number; days: number };
  birthday: { amount: number; min: number; days: number };
  pdv: string[];
  conditions: string;
  terms: string;
  templates: Record<string, { title: string; body: string; enabled: boolean }>;
}
export interface State {
  customers: Customer[];
  lots: Lot[];
  vouchers: Voucher[];
  purchases: Purchase[];
  messages: Message[];
  campaigns: Campaign[];
  audit: Audit[];
  outbox: Outbox[];
  users: User[];
  sessions: { id: string; userId: string; expires: string }[];
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
    welcome: {
      enabled: true,
      title: "¡Bienvenida al Club Morowa!",
      body:
        "Te regalamos un voucher de {monto} por sumarte (compra mínima {minima}). Lo ves en Vouchers y tenés {dias} días para usarlo." +
        footer,
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
      body:
        "Entrá con este link, creá tu contraseña y aceptá las bases: {link}" +
        footer,
    },
  },
};
export const emptyState = (): State => ({
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
  return c.status === "blocked"
    ? "Bloqueada"
    : c.account.bands[4] > 0
      ? "Vencida"
      : "Activa";
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
  if (email && c.emailConsent && c.email)
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
function template(
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
  notify(s, c, fill(t.title), fill(t.body), key, now);
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
    ensure(cat && cat.points > 0 && cat.amount > 0, "Voucher inválido.");
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
    !s.purchases.some((p) => p.ticket === ticket && p.status !== "annulled"),
    "Este ticket ya está registrado.",
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
    ensure(amount >= v.min, "La compra no alcanza el mínimo del voucher.");
    ensure(v.amount < amount, "El descuento debe ser menor al importe.");
    v.direct = v.direct || v.status !== "requested";
  }
  const paid = amount - (v?.amount || 0);
  const mult = Math.max(
    1,
    ...s.campaigns
      .filter((c) => !c.paused && c.from <= now && c.to >= now)
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
  if (lot) {
    const delta = lot.issued;
    if (!lot.expired && lot.expires > now) lot.remaining -= delta;
    else if (lot.remaining < lot.issued) {
      s.lots.push({
        id: id(),
        customerId: p.customerId,
        issued: -(lot.issued - lot.remaining),
        remaining: -(lot.issued - lot.remaining),
        expires: months(now, s.config.expiryMonths),
        createdAt: now,
      });
    }
    lot.issued = 0;
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
  for (const l of s.lots) {
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
      Number(hour) >= 9 &&
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
      campaign.from <= now &&
      campaign.to >= now
    ) {
      for (const c of s.customers.filter((c) => c.status === "active"))
        notify(s, c, campaign.name, campaign.body, "campaign", now);
      campaign.sent = true;
    }
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
  ensure(/^\d{7,9}$/.test(dni), "El DNI debe tener entre 7 y 9 dígitos.");
  ensure(
    !s.customers.some((c) => c.dni === dni),
    "El DNI ya existe. Ingresá o recuperá tu acceso.",
  );
  ensure(
    typeof input.name === "string" && input.name.trim().length >= 3,
    "Completá nombre y apellido.",
  );
  ensure(digits(input.phone).length >= 7, "Completá el celular.");
  if (input.email)
    ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email), "Email inválido.");
  const birthday = String(input.birthday || "");
  validateBirthday(birthday);
  const c: Customer = {
    id: id(),
    name: input.name.trim(),
    dni,
    phone: digits(input.phone),
    email: input.email || "",
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
    "message.send",
    "annul.approve",
    "annul.reject",
  ];
  const staff = [
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
      c.status = "pending";
      break;
    case "registration.reject":
      ensure(c?.status === "approval", "El registro ya se resolvió.");
      c.status = "rejected";
      break;
    case "account.update":
      ensure(c, "Clienta inexistente.");
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
    case "campaign.save":
      ensure(
        input.name &&
          input.body &&
          [2, 3].includes(input.multiplier) &&
          Number.isFinite(Date.parse(input.from)) &&
          Number.isFinite(Date.parse(input.to)) &&
          input.from < input.to,
        "Revisá nombre, mensaje, fechas y multiplicador.",
      );
      {
        const old = s.campaigns.find((x) => x.id === input.id);
        if (old) old.paused = input.paused === true;
        else
          s.campaigns.push({
            id: id(),
            name: String(input.name),
            body: String(input.body),
            from: new Date(input.from).toISOString(),
            to: new Date(input.to).toISOString(),
            multiplier: input.multiplier,
            paused: false,
          });
      }
      break;
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
        stale: days(account.updatedAt, s.config.staleDays) < now,
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
    messages: s.messages.filter(mine),
    campaigns: staff ? s.campaigns : [],
    config: staff
      ? s.config
      : {
          catalog: s.config.catalog,
          conditions: s.config.conditions,
          terms: s.config.terms,
          requestDays: s.config.requestDays,
        },
    audit: a.role === "admin" ? s.audit.slice(-500).reverse() : [],
    outbox: a.role === "admin" ? s.outbox : [],
    now,
  };
}
