import React, { useState, useEffect, FormEvent } from "react";
import { api, View, cash, date, labels } from "./api";
type Command = (action: string, input?: any) => Promise<boolean>;
export function Team() {
  const [users, setUsers] = useState<any[]>([]),
    [notice, setNotice] = useState("");
  const load = () =>
    api("team")
      .then(setUsers)
      .catch((e) => setNotice(e.message));
  useEffect(() => {
    void load();
  }, []);
  async function save(b: any) {
    try {
      const r = await api("team", b);
      if (r.link) {
        await navigator.clipboard.writeText(r.link);
        setNotice("Enlace copiado. Vence en 4 horas.");
      } else setNotice("Usuario guardado.");
      await load();
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  return (
    <section className="card">
      <h1>Usuarios del equipo</h1>
      <p>
        Un usuario por persona. Los permisos se validan también en el servidor.
      </p>
      {notice && <p className="note">{notice}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save({
            ...Object.fromEntries(new FormData(e.currentTarget)),
            invite: true,
          });
        }}
      >
        <div className="form-grid">
          <label className="field">
            Nombre
            <input name="name" required />
          </label>
          <label className="field">
            Email
            <input name="email" type="email" required />
          </label>
          <label className="field">
            Rol
            <select name="role">
              <option value="seller">Vendedora</option>
              <option value="admin">Administradora</option>
            </select>
          </label>
        </div>
        <button className="primary">Crear usuario e invitar</button>
      </form>
      {users.map((u) => (
        <div className="line-item" key={u.id}>
          <span>
            {u.name || u.login}
            <small>
              {u.login} · {u.disabled ? "Desactivado" : labels[u.role]}
            </small>
          </span>
          <select
            value={u.role}
            onChange={(e) => void save({ id: u.id, role: e.target.value })}
          >
            <option value="seller">Vendedora</option>
            <option value="admin">Administradora</option>
          </select>
          <button
            onClick={() => void save({ id: u.id, disabled: !u.disabled })}
          >
            {u.disabled ? "Activar" : "Desactivar"}
          </button>
          <button
            disabled={u.disabled}
            onClick={() => void save({ id: u.id, copyOnly: true })}
          >
            Copiar enlace de acceso
          </button>
        </div>
      ))}
    </section>
  );
}
async function compress(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const result = canvas.toDataURL("image/jpeg", 0.75);
  if (result.length > 1500000)
    throw Error(
      "La foto es demasiado grande. Probá con una imagen de menor tamaño.",
    );
  return result;
}
export function TicketRequests({ data, cmd }: { data: View; cmd: Command }) {
  const [photo, setPhoto] = useState(""),
    [notice, setNotice] = useState(""),
    [viewPhoto, setViewPhoto] = useState(""),
    [busy, setBusy] = useState(false);
  const staff = data.actor.role !== "customer";
  const tickets = data.submissions
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return (
    <section className="card">
      <h2>{staff ? "Compras por aprobar" : "Cargá tu ticket"}</h2>
      <p>
        {staff
          ? "Revisá la imagen y los datos antes de acreditar puntos."
          : "Hasta 30 días desde tu compra y 3 solicitudes pendientes. Los puntos se suman cuando el equipo aprueba."}
      </p>
      {notice && <p className="note">{notice}</p>}
      {!staff && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!photo) {
              setNotice("Adjuntá una foto del ticket.");
              return;
            }
            const f = e.currentTarget;
            if (
              await cmd("ticket.submit", {
                ...Object.fromEntries(new FormData(f)),
                photo,
              })
            ) {
              setPhoto("");
              f.reset();
              setNotice("Ticket enviado para revisión.");
            }
          }}
        >
          <div className="form-grid">
            <label className="field">
              Punto de venta
              <select name="pdv">
                {data.config.pdv.map((p: string) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Número de ticket
              <input
                name="number"
                inputMode="numeric"
                required
                pattern="[0-9]{1,8}"
                onBlur={(e) =>
                  (e.target.value = e.target.value.padStart(8, "0"))
                }
              />
            </label>
            <label className="field">
              Importe
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </label>
            <label className="field">
              Fecha
              <input name="date" type="date" required />
            </label>
            <label className="field">
              Foto del ticket
              <input
                type="file"
                accept="image/*"
                required
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setBusy(true);
                  try {
                    setPhoto(await compress(f));
                    setNotice("Foto lista.");
                  } catch (e) {
                    setNotice((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
          </div>
          <button className="primary" disabled={busy}>
            Enviar ticket
          </button>
        </form>
      )}
      {tickets.map((t) => (
        <article key={t.id} className="line-item">
          <div>
            <strong>
              {t.pdv}-{t.number} · {cash(t.amount)}
            </strong>
            <small>
              {staff
                ? data.customers.find((c) => c.id === t.customerId)?.name
                : ""}{" "}
              · {date(t.date)} · {labels[t.status] || t.status}
            </small>
            <p>{t.reason}</p>
          </div>
          {staff && (
            <>
              <button
                onClick={async () => {
                  try {
                    setViewPhoto((await api("ticket/photo?id=" + t.id)).photo);
                  } catch (e) {
                    setNotice((e as Error).message);
                  }
                }}
              >
                Ver foto
              </button>
              {["pending", "more"].includes(t.status) && (
                <>
                  <button
                    onClick={() =>
                      void cmd("ticket.resolve", {
                        id: t.id,
                        resolution: "approved",
                      })
                    }
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt("Motivo del rechazo");
                      if (reason)
                        void cmd("ticket.resolve", {
                          id: t.id,
                          resolution: "rejected",
                          reason,
                        });
                    }}
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt("¿Qué información falta?");
                      if (reason)
                        void cmd("ticket.resolve", {
                          id: t.id,
                          resolution: "more",
                          reason,
                        });
                    }}
                  >
                    Pedir información
                  </button>
                </>
              )}
            </>
          )}
        </article>
      ))}
      {viewPhoto && (
        <div className="overlay">
          <section className="modal">
            <button onClick={() => setViewPhoto("")}>Cerrar foto</button>
            <img
              alt="Ticket privado"
              src={viewPhoto}
              style={{ maxWidth: "100%" }}
            />
          </section>
        </div>
      )}
    </section>
  );
}

export function ReportCenter() {
  const [type, setType] = useState("summary"),
    [from, setFrom] = useState(
      new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    ),
    [to, setTo] = useState(new Date().toISOString().slice(0, 10)),
    [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState("");
  const query = new URLSearchParams({
    type,
    from: from + "T00:00:00-03:00",
    to: to + "T23:59:59-03:00",
  }).toString();
  useEffect(() => {
    api("reports?" + query)
      .then((r) => setRows(r.rows))
      .catch((e) => setError(e.message));
  }, [query]);
  return (
    <section className="card report-print">
      <h1>Reportes</h1>
      <div className="row no-print">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {Object.entries({
            summary: "Resumen",
            best: "Mejores clientas",
            active: "Clientas que compraron",
            inactive60: "Reactivar · 60 días",
            inactive90: "Reactivar · 90 días",
            expiry: "Puntos por vencer · 30 días",
            expiry60: "Puntos por vencer · 60 días",
            birthday: "Cumpleaños del mes",
            vouchers: "Vouchers",
            funnel: "Embudo de activación",
            account: "Cuenta corriente",
            control: "Control interno",
            liability: "Puntos y regalos pendientes",
            campaigns: "Resultados de campañas",
            retention: "Recompra",
          }).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          aria-label="Período"
          onChange={(e) => {
            const n = new Date();
            if (e.target.value !== "last") setTo(n.toISOString().slice(0, 10));
            if (e.target.value === "90")
              setFrom(
                new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10),
              );
            if (e.target.value === "month")
              setFrom(
                new Date(n.getFullYear(), n.getMonth(), 1, 12)
                  .toISOString()
                  .slice(0, 10),
              );
            if (e.target.value === "last") {
              setFrom(
                new Date(n.getFullYear(), n.getMonth() - 1, 1, 12)
                  .toISOString()
                  .slice(0, 10),
              );
              setTo(
                new Date(n.getFullYear(), n.getMonth(), 0, 12)
                  .toISOString()
                  .slice(0, 10),
              );
            }
          }}
        >
          <option value="custom">Personalizado</option>
          <option value="month">Este mes</option>
          <option value="last">Mes pasado</option>
          <option value="90">Últimos 90 días</option>
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <a className="button" href={"/api/reports/excel?" + query}>
          Exportar Excel
        </a>
        <button onClick={() => window.print()}>
          Imprimir / guardar PDF A4
        </button>
      </div>
      <p>
        {from} — {to}. {rows.length} resultados.{" "}
        {type.startsWith("inactive")
          ? "Revisá estas clientas para una campaña de reactivación."
          : type.startsWith("expiry")
            ? "Recordá a estas clientas que aprovechen sus puntos antes del vencimiento."
            : "Compará los resultados con el período anterior antes de planificar nuevas promociones."}
      </p>
      {error && <p>{error}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {Object.keys(rows[0] || {}).map((k) => (
                <th key={k}>{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {Object.entries(r).map(([k, v]: any, j) => (
                  <td key={j}>
                    {typeof v === "number"
                      ? /Importe|Saldo|promedio|\$/.test(k) ||
                        (k === "Valor" && r.Concepto === "Ventas del período")
                        ? cash(v)
                        : v.toLocaleString("es-AR")
                      : /^\d{4}-\d{2}-\d{2}T/.test(String(v))
                        ? date(v)
                        : String(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
export function CampaignCenter({ data, cmd }: { data: View; cmd: Command }) {
  const empty = {
    name: "",
    body: "",
    type: "multiplier",
    multiplier: 2,
    segment: "all",
    from: "",
    to: "",
    sendAt: "",
    amount: 5000,
    min: 50000,
    bonus: 100,
    percent: 0,
  };
  const [draft, setDraft] = useState<any>(() => {
      try {
        return (
          JSON.parse(localStorage.getItem("morowa-campaign-draft") || "null") ||
          empty
        );
      } catch {
        return empty;
      }
    }),
    [open, setOpen] = useState(false);
  useEffect(() => {
    localStorage.setItem("morowa-campaign-draft", JSON.stringify(draft));
  }, [draft]);
  const admin = data.actor.role === "admin",
    set = (key: string, value: any) =>
      setDraft((d: any) => ({ ...d, [key]: value }));
  const status = (c: any) =>
    c.paused
      ? "Pausada"
      : c.to < data.now
        ? "Finalizada"
        : c.from > data.now
          ? "Programada"
          : "Activa";
  const dateOnly = (v: string) => v.slice(0, 10);
  return (
    <>
      <section className="card">
        <h1>Campañas</h1>
        <p>
          Puntos x2 o x3, avisos, vouchers de regalo y bonos de puntos. Fechas
          en hora de Argentina.
        </p>
        {admin && (
          <button onClick={() => setOpen(true)}>
            Nueva campaña / recuperar borrador
          </button>
        )}
      </section>
      {data.campaigns
        .slice()
        .sort(
          (a, b) =>
            ["Activa", "Programada", "Pausada", "Finalizada"].indexOf(
              status(a),
            ) -
            ["Activa", "Programada", "Pausada", "Finalizada"].indexOf(
              status(b),
            ),
        )
        .map((c) => (
          <section className="card" key={c.id}>
            <h2>
              {c.name}{" "}
              <span
                className={"pill " + (status(c) === "Activa" ? "good" : "warn")}
              >
                {status(c)}
              </span>
            </h2>
            <p>{c.body}</p>
            <p>
              {date(c.from)} — {date(c.to)} ·{" "}
              {c.from > data.now ? "Empieza" : "Termina"} en{" "}
              {Math.max(
                0,
                Math.ceil(
                  (Date.parse(c.from > data.now ? c.from : c.to) -
                    Date.parse(data.now)) /
                    86400000,
                ),
              )}{" "}
              días
            </p>
            <p>
              {c.recipients?.length || 0} destinatarias ·{" "}
              {
                new Set(
                  data.purchases
                    .filter(
                      (p) =>
                        p.status === "active" &&
                        p.createdAt >= c.from &&
                        p.createdAt <= c.to &&
                        c.recipients?.includes(p.customerId),
                    )
                    .map((p) => p.customerId),
                ).size
              }{" "}
              compraron durante el período.
            </p>
            {admin && (
              <div className="row">
                <button
                  onClick={() => {
                    setDraft({
                      ...c,
                      from: dateOnly(c.from),
                      to: dateOnly(c.to),
                      sendAt: dateOnly(c.sendAt || c.from),
                    });
                    setOpen(true);
                  }}
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    setDraft({
                      ...c,
                      id: undefined,
                      name: c.name + " (copia)",
                      from: dateOnly(c.from),
                      to: dateOnly(c.to),
                      sendAt: dateOnly(c.sendAt || c.from),
                    });
                    setOpen(true);
                  }}
                >
                  Duplicar
                </button>
                <button
                  onClick={() =>
                    void cmd("campaign.save", { ...c, paused: !c.paused })
                  }
                >
                  {c.paused ? "Reanudar" : "Pausar"}
                </button>
                <button
                  onClick={() =>
                    void cmd("campaign.save", {
                      ...c,
                      to: data.now,
                      paused: true,
                    })
                  }
                >
                  Finalizar
                </button>
              </div>
            )}
          </section>
        ))}
      {open && admin && (
        <div className="overlay">
          <section className="modal">
            <button
              onClick={() => {
                if (
                  confirm(
                    "¿Cerrar? El borrador queda guardado para seguir editando.",
                  )
                )
                  setOpen(false);
              }}
            >
              Cerrar
            </button>
            <h2>Campaña</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await cmd("campaign.save", {
                    ...draft,
                    from: draft.from + "T00:00:00-03:00",
                    to: draft.to + "T23:59:59-03:00",
                    sendAt: draft.sendAt + "T00:00:00-03:00",
                  })
                ) {
                  setOpen(false);
                  setDraft(empty);
                }
              }}
            >
              <label className="field">
                Nombre
                <input
                  required
                  value={draft.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </label>
              <label className="field">
                Tipo
                <select
                  value={draft.type}
                  onChange={(e) => set("type", e.target.value)}
                >
                  <option value="multiplier">Puntos multiplicados</option>
                  <option value="notice">Solo aviso</option>
                  <option value="voucher">Voucher de regalo</option>
                  <option value="bonus">Bono de puntos</option>
                </select>
              </label>
              {draft.type === "multiplier" && (
                <select
                  value={draft.multiplier}
                  onChange={(e) => set("multiplier", Number(e.target.value))}
                >
                  <option value={2}>x2</option>
                  <option value={3}>x3</option>
                </select>
              )}
              {draft.type === "voucher" && (
                <div className="form-grid">
                  {[
                    ["amount", "Monto ($)"],
                    ["percent", "Porcentaje (0 para monto fijo)"],
                    ["min", "Compra mínima ($)"],
                  ].map(([k, l]) => (
                    <label className="field" key={k}>
                      {l}
                      <input
                        type="number"
                        min="0"
                        value={draft[k]}
                        onChange={(e) => set(k, Number(e.target.value))}
                      />
                    </label>
                  ))}
                </div>
              )}
              {draft.type === "bonus" && (
                <label className="field">
                  Puntos
                  <input
                    type="number"
                    min="1"
                    value={draft.bonus}
                    onChange={(e) => set("bonus", Number(e.target.value))}
                  />
                </label>
              )}
              <label className="field">
                Destinatarias
                <select
                  value={draft.segment}
                  onChange={(e) => set("segment", e.target.value)}
                >
                  {Object.entries({
                    all: "Todas las activas",
                    inactive: "Sin compras hace 90 días",
                    birthday: "Cumpleaños del mes",
                    expiry: "Puntos por vencer",
                    best: "Mejores clientas",
                  }).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-grid">
                {[
                  ["sendAt", "Enviar mensaje"],
                  ["from", "Desde"],
                  ["to", "Hasta"],
                ].map(([k, l]) => (
                  <label key={k} className="field">
                    {l}
                    <input
                      type="date"
                      required
                      value={draft[k]}
                      onChange={(e) => set(k, e.target.value)}
                    />
                  </label>
                ))}
              </div>
              <label className="field">
                Mensaje
                <textarea
                  required
                  rows={5}
                  value={draft.body}
                  onChange={(e) => set("body", e.target.value)}
                />
              </label>
              <p>
                Variables: {"{nombre}, {desde}, {hasta}"}. Máximo 4 promociones
                por clienta al mes.
              </p>
              <details>
                <summary>Vista previa</summary>
                <p>
                  {draft.body
                    .replaceAll("{nombre}", "Ana")
                    .replaceAll("{desde}", draft.from)
                    .replaceAll("{hasta}", draft.to)}{" "}
                  Si no querés recibir promociones, desactivalas en Mi perfil.
                </p>
              </details>
              <button className="primary">Guardar campaña</button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

export function MessageComposer({ cmd }: { cmd: Command }) {
  const [d, setD] = useState<any>(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("morowa-message-draft") || "null") || {
          title: "",
          body: "",
          segment: "all",
          sendAt: "",
        }
      );
    } catch {
      return { title: "", body: "", segment: "all", sendAt: "" };
    }
  });
  useEffect(() => {
    localStorage.setItem("morowa-message-draft", JSON.stringify(d));
  }, [d]);
  return (
    <section className="card">
      <h2>Mensaje por grupo</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await cmd("message.schedule", {
              ...d,
              sendAt: d.sendAt ? d.sendAt + "T09:00:00-03:00" : undefined,
            })
          )
            setD({ title: "", body: "", segment: "all", sendAt: "" });
        }}
      >
        <label className="field">
          Título
          <input
            required
            value={d.title}
            onChange={(e) => setD({ ...d, title: e.target.value })}
          />
        </label>
        <label className="field">
          Destinatarias
          <select
            value={d.segment}
            onChange={(e) => setD({ ...d, segment: e.target.value })}
          >
            {Object.entries({
              all: "Todas las activas",
              inactive: "Sin compras hace 90 días",
              birthday: "Cumpleaños del mes",
              expiry: "Puntos por vencer",
              best: "Mejores clientas",
            }).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Mensaje
          <textarea
            required
            value={d.body}
            onChange={(e) => setD({ ...d, body: e.target.value })}
          />
        </label>
        <label className="field">
          Programar (opcional, 09:00 de Argentina)
          <input
            type="date"
            value={d.sendAt}
            onChange={(e) => setD({ ...d, sendAt: e.target.value })}
          />
        </label>
        <details>
          <summary>Vista previa</summary>
          <h3>{d.title}</h3>
          <p>
            {d.body} Si no querés recibir promociones, desactivalas en Mi
            perfil.
          </p>
        </details>
        <button className="primary">Guardar envío</button>
        <small>
          El borrador se guarda en este navegador. Máximo 4 promociones por
          clienta al mes.
        </small>
      </form>
    </section>
  );
}
