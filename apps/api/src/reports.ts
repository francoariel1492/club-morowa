import { State, days, balance, ensure } from "./domain";
export function reportRows(
  s: State,
  type: string,
  from: string,
  to: string,
  now: string,
) {
  ensure(
    Number.isFinite(Date.parse(from)) &&
      Number.isFinite(Date.parse(to)) &&
      Date.parse(from) <= Date.parse(to),
    "Revisá el período del reporte.",
  );
  from = new Date(from).toISOString();
  to = new Date(to).toISOString();
  const inPeriod = (at?: string) => !!at && at >= from && at <= to;
  const purchases = s.purchases.filter(
    (p) => p.status === "active" && p.createdAt >= from && p.createdAt <= to,
  );
  const customers = s.customers.filter((c) => c.status === "active");
  if (type === "summary")
    return [
      {
        Concepto: "Ventas del período",
        Valor: purchases.reduce((n, p) => n + p.paid, 0),
      },
      { Concepto: "Compras", Valor: purchases.length },
      {
        Concepto: "Clientas que compraron",
        Valor: new Set(purchases.map((p) => p.customerId)).size,
      },
      {
        Concepto: "Puntos acreditados",
        Valor: purchases.reduce((n, p) => n + p.points, 0),
      },
    ];
  if (type === "vouchers") {
    return ["points", "welcome", "birthday", "campaign"].map((kind) => {
      const all = s.vouchers.filter((v) => v.kind === kind);
      const issued = all.filter((v) => inPeriod(v.createdAt));
      return {
        Tipo: kind,
        Emitidos: issued.length,
        "Usados en el período": all.filter(
          (v) => v.status === "redeemed" && inPeriod(v.redeemedAt),
        ).length,
        "Vencidos en el período": all.filter(
          (v) =>
            v.status === "expired" && inPeriod(v.requestExpires || v.expires),
        ).length,
        "Uso de emitidos %": issued.length
          ? Math.round(
              (100 * issued.filter((v) => v.status === "redeemed").length) /
                issued.length,
            )
          : 0,
        "Históricos sin fecha de emisión": all.filter((v) => !v.createdAt)
          .length,
      };
    });
  }
  if (type === "liability")
    return s.customers.map((c) => ({
      Nombre: c.name,
      Email: c.email,
      "Puntos disponibles": balance(s, c.id, now),
      "Puntos reservados": s.vouchers
        .filter((v) => v.customerId === c.id && v.status === "requested")
        .reduce((n, v) => n + v.cost, 0),
      "Regalos vigentes $": s.vouchers
        .filter(
          (v) =>
            v.customerId === c.id &&
            v.cost === 0 &&
            v.status === "available" &&
            v.expires > now,
        )
        .reduce((n, v) => n + v.amount, 0),
    }));
  if (type === "campaigns")
    return s.campaigns
      .filter((c) => c.from <= to && c.to >= from)
      .map((c) => ({
        Campaña: c.name,
        Desde: c.from,
        Hasta: c.to,
        Destinatarias: c.recipients?.length || 0,
        "Beneficios emitidos": s.vouchers.filter((v) => v.campaignId === c.id)
          .length,
        "Beneficios usados": s.vouchers.filter(
          (v) => v.campaignId === c.id && v.status === "redeemed",
        ).length,
        Estado: c.paused
          ? "Pausada"
          : c.to < now
            ? "Finalizada"
            : c.from > now
              ? "Programada"
              : "Activa",
      }));
  if (type === "retention") {
    const buyers = new Set(purchases.map((p) => p.customerId));
    const repeat = [...buyers].filter((id) =>
      s.purchases.some(
        (p) =>
          p.customerId === id && p.status === "active" && p.createdAt < from,
      ),
    );
    return [
      {
        "Clientas compradoras": buyers.size,
        "Clientas con compras anteriores": repeat.length,
        "Recompra %": buyers.size
          ? Math.round((repeat.length / buyers.size) * 100)
          : 0,
      },
    ];
  }
  if (type === "funnel")
    return ["approval", "pending", "active", "blocked", "rejected"].map(
      (status) => ({
        Estado: status,
        Cantidad: s.customers.filter((c) => c.status === status).length,
      }),
    );
  if (type === "control")
    return s.audit
      .filter((e) => e.at >= from && e.at <= to)
      .map((e) => ({
        Fecha: e.at,
        Usuario: s.users.find((u) => u.id === e.actorId)?.name || e.actorId,
        Acción: e.action,
        Referencia: e.target,
      }));
  return customers
    .map((c) => {
      const ps = purchases.filter((p) => p.customerId === c.id);
      const last = s.purchases
        .filter((p) => p.customerId === c.id && p.status === "active")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      return {
        Nombre: c.name,
        Email: c.email,
        Importe: ps.reduce((n, p) => n + p.paid, 0),
        Compras: ps.length,
        "Ticket promedio": ps.length
          ? Math.round(ps.reduce((n, p) => n + p.paid, 0) / ps.length)
          : 0,
        "Última compra": last?.createdAt || "",
        Puntos: balance(s, c.id, now),
        "Puntos por vencer": s.lots
          .filter(
            (l) =>
              l.customerId === c.id &&
              !l.expired &&
              l.expires > now &&
              l.expires <= days(now, type === "expiry60" ? 60 : 30),
          )
          .reduce((n, l) => n + l.remaining, 0),
        Cumpleaños: c.birthday,
        "Cuenta corriente": c.hasAccount ? "Sí" : "No",
        Saldo: c.hasAccount ? c.account.bands.reduce((a, b) => a + b, 0) : 0,
      };
    })
    .filter((r) => {
      if (type === "active") return r.Compras > 0;
      if (type === "inactive60" || type === "inactive90")
        return (
          !r["Última compra"] ||
          r["Última compra"] < days(now, type === "inactive60" ? -60 : -90)
        );
      if (type === "expiry" || type === "expiry60")
        return r["Puntos por vencer"] > 0;
      if (type === "birthday") return r.Cumpleaños.slice(3) === now.slice(5, 7);
      if (type === "account") return r["Cuenta corriente"] === "Sí";
      return true;
    })
    .sort((a, b) => b.Importe - a.Importe);
}
