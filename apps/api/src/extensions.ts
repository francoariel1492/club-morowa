import {
  State,
  Actor,
  Customer,
  ensure,
  id,
  days,
  months,
  audit,
  purchase,
  notify,
  balance,
  normalized,
  activateCustomer,
} from "./domain";
export interface Submission {
  id: string;
  customerId: string;
  pdv: string;
  number: string;
  amount: number;
  date: string;
  photo: string;
  status: "pending" | "more" | "approved" | "rejected";
  createdAt: string;
  reason?: string;
}
export function segment(s: State, key: string, now: string): Customer[] {
  const active = s.customers.filter((c) => c.status === "active");
  return active.filter((c) => {
    const ps = s.purchases
      .filter((p) => p.customerId === c.id && p.status === "active")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (key === "inactive") return !ps[0] || ps[0].createdAt < days(now, -90);
    if (key === "birthday")
      return (
        c.birthday.slice(3) ===
        new Intl.DateTimeFormat("en-GB", {
          month: "2-digit",
          timeZone: "America/Argentina/Mendoza",
        }).format(new Date(now))
      );
    if (key === "expiry")
      return s.lots.some(
        (l) =>
          l.customerId === c.id &&
          !l.expired &&
          l.remaining > 0 &&
          l.expires > now &&
          l.expires <= days(now, 30),
      );
    if (key === "best")
      return active
        .slice()
        .sort(
          (a, b) =>
            s.purchases
              .filter((p) => p.customerId === b.id && p.status === "active")
              .reduce((n, p) => n + p.paid, 0) -
            s.purchases
              .filter((p) => p.customerId === a.id && p.status === "active")
              .reduce((n, p) => n + p.paid, 0),
        )
        .slice(0, 10)
        .some((x) => x.id === c.id);
    return true;
  });
}
export function extensionCommand(
  s: State,
  a: Actor,
  action: string,
  b: any,
  now: string,
) {
  const subs = s.submissions;
  switch (action) {
    case "message.schedule": {
      ensure(a.role !== "customer", "Solo equipo.");
      ensure(
        String(b.title || "").trim() && String(b.body || "").trim(),
        "Completá título y mensaje.",
      );
      const at = String(b.sendAt || now);
      ensure(Number.isFinite(Date.parse(at)), "Fecha de envío inválida.");
      s.campaigns.push({
        id: id(),
        name: String(b.title),
        body: String(b.body),
        type: "notice",
        manual: true,
        segment: b.segment || "all",
        from: at,
        to: days(at, 1),
        sendAt: at,
        multiplier: 1,
        paused: false,
      });
      break;
    }
    case "ticket.submit": {
      ensure(a.role === "customer", "Solo clientas.");
      const c = s.customers.find((c) => c.id === a.customerId);
      ensure(c?.status === "active", "Cuenta no habilitada.");
      ensure(
        subs.filter(
          (t) =>
            t.customerId === c.id && ["pending", "more"].includes(t.status),
        ).length < 3,
        "Máximo 3 solicitudes pendientes.",
      );
      ensure(
        s.config.pdv.includes(b.pdv) && /^\d{1,8}$/.test(String(b.number)),
        "Punto de venta o ticket inválido.",
      );
      ensure(
        Number.isFinite(Number(b.amount)) && Number(b.amount) > 0,
        "Importe inválido.",
      );
      const date = String(b.date) + "T12:00:00-03:00";
      ensure(
        Number.isFinite(Date.parse(date)) &&
          b.date <= now.slice(0, 10) &&
          date >= days(now, -30),
        "La compra debe ser de los últimos 30 días.",
      );
      const ticket = b.pdv + "-" + String(b.number).padStart(8, "0");
      ensure(
        !s.purchases.some(
          (p) => p.ticket === ticket && p.status !== "annulled",
        ) &&
          !subs.some(
            (t) => t.pdv + "-" + t.number === ticket && t.status !== "rejected",
          ),
        "Este ticket ya está cargado o reservado para revisión.",
      );
      const photo = String(b.photo || "");
      ensure(
        photo.length < 1500000 &&
          /^data:image\/(jpeg|png|webp);base64,/.test(photo),
        "Adjuntá una foto JPG, PNG o WebP de hasta 1 MB.",
      );
      const content = Buffer.from(photo.split(",")[1], "base64");
      ensure(
        content.length > 12 &&
          ((content[0] === 0xff && content[1] === 0xd8) ||
            content
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
            (content.toString("ascii", 0, 4) === "RIFF" &&
              content.toString("ascii", 8, 12) === "WEBP")),
        "La foto no es una imagen válida.",
      );
      subs.push({
        id: id(),
        customerId: c.id,
        pdv: b.pdv,
        number: String(b.number).padStart(8, "0"),
        amount: Number(b.amount),
        date,
        photo,
        status: "pending",
        createdAt: now,
      });
      break;
    }
    case "ticket.resolve": {
      ensure(a.role !== "customer", "Solo equipo.");
      const t = subs.find((t) => t.id === b.id);
      ensure(
        t && ["pending", "more"].includes(t.status),
        "Solicitud ya resuelta.",
      );
      const c = s.customers.find((c) => c.id === t.customerId)!;
      if (b.resolution === "approved") {
        t.status = "approved";
        const p = purchase(
          s,
          a,
          { customerId: c.id, pdv: t.pdv, number: t.number, amount: t.amount },
          now,
        );
        p.createdAt = new Date(t.date).toISOString();
        const lot = s.lots.find((l) => l.purchaseId === p.id);
        if (lot) {
          lot.createdAt = p.createdAt;
          lot.expires = months(p.createdAt, s.config.expiryMonths);
        }
      } else {
        ensure(
          ["rejected", "more"].includes(b.resolution) &&
            String(b.reason || "").trim().length > 2,
          "Ingresá un motivo o la información que falta.",
        );
        t.status = b.resolution;
        t.reason = String(b.reason);
      }
      notify(
        s,
        c,
        b.resolution === "approved"
          ? "Compra aprobada"
          : b.resolution === "more"
            ? "Necesitamos más información"
            : "Compra rechazada",
        `Ticket ${t.pdv}-${t.number}. ${b.reason || "Ya sumaste tus puntos."}`,
        "service",
        now,
      );
      break;
    }
    case "outbox.retry": {
      ensure(a.role === "admin", "Solo administradora.");
      const o = s.outbox.find((o) => o.id === b.id);
      ensure(
        o && ["failed", "bounced", "pending"].includes(o.status),
        "No se puede reintentar este envío.",
      );
      o.status = "pending";
      o.attempts = 0;
      o.nextAttempt = now;
      break;
    }
    case "customer.merge": {
      ensure(a.role === "admin", "Solo administradora.");
      const source = s.customers.find((c) => c.id === b.source),
        target = s.customers.find((c) => c.id === b.target);
      ensure(
        source && target && source.id !== target.id,
        "Elegí dos cuentas distintas.",
      );
      ensure(
        source.status !== "active" && !source.acceptedAt,
        "Solo se unifican duplicados sin activar; las cuentas activas requieren revisión.",
      );
      ensure(
        !s.vouchers.some((v) => v.customerId === source.id),
        "La cuenta tiene vouchers: requiere revisión.",
      );
      ensure(
        !source.hasAccount && source.account.bands.every((n) => n === 0),
        "La cuenta origen tiene cuenta corriente o saldos: requiere conciliación manual.",
      );
      for (const list of [s.purchases, s.lots, s.messages, s.submissions])
        for (const item of list)
          if (item.customerId === source.id) item.customerId = target.id;
      const removed = s.users
        .filter((u) => u.customerId === source.id)
        .map((u) => u.id);
      s.users = s.users.filter((u) => u.customerId !== source.id);
      s.sessions = s.sessions.filter((t) => !removed.includes(t.userId));
      s.customers = s.customers.filter((c) => c.id !== source.id);
      if (target.status === "active") activateCustomer(s, target, now);
      break;
    }
    default:
      return false;
  }
  audit(
    s,
    a,
    action,
    b.id || b.source || a.customerId || "",
    { ...b, photo: b.photo ? "[imagen privada]" : undefined },
    now,
  );
  return true;
}
