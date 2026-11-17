import React, { useState, useEffect, FormEvent, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronRight,
  Gift,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  Search,
  Settings,
  ShoppingBag,
  Ticket,
  Upload,
  Users,
  X,
  Calendar,
  BarChart3,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  UserRound,
  Monitor,
  Download,
} from "lucide-react";
import { api, View, cash, date, labels } from "./api";
import type { Config, Customer } from "../../api/src/domain";
import "./styles.css";
import {
  Team,
  TicketRequests,
  ReportCenter,
  CampaignCenter,
  MessageComposer,
} from "./Changes";
type Command = (action: string, input?: any) => Promise<boolean>;
function Brand() {
  return (
    <div className="brand">
      <img src="/logo.png" alt="Morowa Indumentaria" />
    </div>
  );
}
function Pill({ value }: { value: string }) {
  return (
    <span
      className={
        "pill " +
        (["active", "available", "sent", "Activa"].includes(value)
          ? "good"
          : ["blocked", "expired", "rejected", "Bloqueada", "failed"].includes(
                value,
              )
            ? "bad"
            : [
                  "requested",
                  "pending",
                  "approval",
                  "Vencida",
                  "annul_pending",
                ].includes(value)
              ? "warn"
              : "")
      }
    >
      {labels[value] || value}
    </span>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <CheckCircle2 size={28} />
      <p>{children}</p>
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const [dirty, setDirty] = useState(false);
  const safeClose = () => {
    if (
      !dirty ||
      confirm("¿Descartar los cambios? Cancelar para seguir editando.")
    )
      close();
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.stopPropagation();
    };
    document.addEventListener("keydown", key);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = old;
    };
  }, [close]);
  return (
    <div
      className="overlay"
      onClick={(e) => {
        // Forms stay open until explicitly dismissed.
      }}
    >
      <section
        onChangeCapture={() => setDirty(true)}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon" onClick={safeClose} aria-label="Cerrar">
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function CheckBox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}
function Auth({ onSession }: { onSession: (s: any) => void }) {
  const token = location.hash.startsWith("#activar/")
    ? location.hash.slice(9)
    : "";
  const [mode, setMode] = useState(token ? "activate" : "login"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [show, setShow] = useState(false),
    [legal, setLegal] = useState<any>(null),
    [info, setInfo] = useState<any>(null);
  useEffect(() => {
    api("public-config")
      .then(setLegal)
      .catch(() => {});
    if (token)
      api("activation-info", { token })
        .then(setInfo)
        .catch((e) => setError(e.message));
  }, [token]);
  const consents = (
    <>
      <details>
        <summary>Bases del Club y política de privacidad</summary>
        <h3>Bases del Club · {legal?.termsVersion}</h3>
        <p className="pre">{legal?.terms}</p>
        <h3>Privacidad · {legal?.privacyVersion}</h3>
        <p className="pre">{legal?.privacy}</p>
      </details>
      <label className="check">
        <input name="accepted" type="checkbox" required />
        Acepto las bases del Club y la política de privacidad.
      </label>
      <label className="check">
        <input name="emailConsent" type="checkbox" />
        Quiero recibir promociones por email.
      </label>
      <label className="check">
        <input name="whatsappConsent" type="checkbox" />
        Quiero recibir promociones por WhatsApp.
      </label>
    </>
  );
  const phone = (
    <div className="form-grid">
      <Field label="Código de área (+54 9)">
        <input
          name="area"
          inputMode="numeric"
          list="areas"
          required
          placeholder="261"
        />
        <datalist id="areas">
          <option value="261" />
          <option value="263" />
        </datalist>
      </Field>
      <Field label="Celular (sin 0 ni 15)">
        <input name="phone" type="tel" required placeholder="Número local" />
      </Field>
    </div>
  );
  const birthday = (
    <Field label="Cumpleaños (día/mes, para tu regalo)">
      <input
        name="birthday"
        inputMode="numeric"
        placeholder="DD/MM"
        required
        maxLength={5}
        onChange={(e) => {
          const v = e.target.value;
          if (!v.includes("/") && v.length === 4)
            e.target.value = v.slice(0, 2) + "/" + v.slice(2);
        }}
        onBlur={(e) => {
          const p = e.target.value.split("/");
          if (p.length === 2)
            e.target.value = p.map((x) => x.padStart(2, "0")).join("/");
        }}
      />
    </Field>
  );
  return (
    <div className="auth">
      <section className="auth-story">
        <Brand />
        <div>
          <h1>Club Morowa</h1>
        </div>
      </section>
      <section className="auth-form auth-card">
        <div className="auth-mobile">
          <Brand />
        </div>
        <span className="eyebrow">BIENVENIDA AL CLUB</span>
        <h2>
          {mode === "login"
            ? "Ingresá a tu cuenta"
            : mode === "register"
              ? "Empezá a ser parte"
              : mode === "recover"
                ? "Recuperá tu acceso"
                : "Creá tu contraseña"}
        </h2>
        {mode === "recover" && (
          <p>
            Te enviamos un enlace a tu email para crear una nueva contraseña.
          </p>
        )}
        {notice ? (
          <div className="note good">
            {notice}
            <button
              onClick={() => {
                setNotice("");
                setMode("login");
              }}
            >
              Volver al ingreso
            </button>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setBusy(true);
              const f = Object.fromEntries(new FormData(e.currentTarget));
              try {
                const body = {
                  ...f,
                  accepted: f.accepted === "on",
                  emailConsent: f.emailConsent === "on",
                  whatsappConsent: f.whatsappConsent === "on",
                };
                if (mode === "login")
                  onSession(
                    await api("login", {
                      login: f.email,
                      password: f.password,
                    }),
                  );
                else if (mode === "activate") {
                  onSession(await api("activate", { ...body, token }));
                  history.replaceState(null, "", location.pathname);
                } else {
                  const r = await api(
                    mode === "recover" ? "recover" : "register",
                    body,
                  );
                  setNotice(r.message);
                }
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {mode === "register" && (
              <div className="form-grid">
                <Field label="Nombre">
                  <input name="firstName" required autoComplete="given-name" />
                </Field>
                <Field label="Apellido">
                  <input name="lastName" required autoComplete="family-name" />
                </Field>
              </div>
            )}
            {mode !== "activate" && (
              <Field label="Email">
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </Field>
            )}
            {mode === "register" && (
              <>
                {phone}
                {birthday}
              </>
            )}
            {mode !== "recover" && (
              <Field label="Contraseña">
                <div className="row">
                  <input
                    name="password"
                    type={show ? "text" : "password"}
                    minLength={mode === "login" ? undefined : 8}
                    maxLength={72}
                    required
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                  />
                  <button type="button" onClick={() => setShow(!show)}>
                    {show ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </Field>
            )}
            {mode === "activate" && info?.needsPhone && phone}
            {mode === "activate" && info?.needsBirthday && birthday}
            {(mode === "register" ||
              (mode === "activate" && info?.needsActivation)) &&
              consents}
            {error && (
              <div className="note bad" role="alert">
                {error}
              </div>
            )}
            <button
              className="primary"
              disabled={busy || (mode === "activate" && !info)}
            >
              {busy
                ? "Procesando…"
                : mode === "login"
                  ? "Ingresar"
                  : mode === "register"
                    ? "Solicitar registro"
                    : mode === "recover"
                      ? "Enviar enlace"
                      : "Crear contraseña y continuar"}
            </button>
          </form>
        )}
        {mode === "login" ? (
          <>
            <button
              className="text"
              onClick={() => {
                setMode("recover");
                setError("");
              }}
            >
              Olvidé mi contraseña
            </button>
            <p>
              ¿Todavía no sos parte?{" "}
              <button
                className="text"
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
              >
                Sumate al Club
              </button>
            </p>
          </>
        ) : (
          <button
            className="text"
            onClick={() => {
              setMode("login");
              setError("");
              setNotice("");
            }}
          >
            Volver al ingreso
          </button>
        )}
      </section>
    </div>
  );
}
function ApproveRegistration({ cid, cmd }: { cid: string; cmd: Command }) {
  const [open, setOpen] = useState(false),
    [hasAccount, setHasAccount] = useState(false),
    [busy, setBusy] = useState(false);
  return (
    <>
      <button
        onClick={() => {
          setHasAccount(false);
          setOpen(true);
        }}
      >
        Aceptar registro
      </button>
      {open && (
        <Modal title="Aprobar registro" close={() => setOpen(false)}>
          <p>
            La clienta podrá ingresar con el email y la contraseña que eligió al
            registrarse.
          </p>
          <Field label="¿Tiene cuenta corriente?">
            <select
              value={hasAccount ? "yes" : "no"}
              onChange={(e) => setHasAccount(e.target.value === "yes")}
            >
              <option value="no">No</option>
              <option value="yes">Sí</option>
            </select>
          </Field>
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                if (
                  await cmd("registration.approve", {
                    customerId: cid,
                    hasAccount,
                  })
                )
                  setOpen(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            Confirmar aprobación
          </button>
        </Modal>
      )}
    </>
  );
}
function App() {
  const [session, setSession] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [data, setData] = useState<View | null>(null),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [working, setWorking] = useState(false);
  async function load() {
    try {
      setData(await api<View>("state"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (!session) return;
    let last = Date.now(),
      sent = 0;
    const touch = () => {
      last = Date.now();
      if (last - sent > 60000) {
        sent = last;
        void api("activity", {}).catch(() => {
          setSession(null);
          setData(null);
        });
      }
    };
    const timer = setInterval(() => {
      if (Date.now() - last > 30 * 60000) {
        void api("logout", {});
        setSession(null);
        setData(null);
      }
    }, 15000);
    window.addEventListener("pointerdown", touch);
    window.addEventListener("keydown", touch);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("keydown", touch);
    };
  }, [session]);
  useEffect(() => {
    api("session")
      .then(setSession)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (session && !session.mustChange) {
      void load();
      const t = setInterval(() => void load(), 30000);
      return () => clearInterval(t);
    }
  }, [session]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const cmd: Command = async (action, input = {}) => {
    if (working) return false;
    setWorking(true);
    try {
      await api("command", { action, input });
      await load();
      setToast("Cambios guardados.");
      return true;
    } catch (e) {
      setToast((e as Error).message);
      return false;
    } finally {
      setWorking(false);
    }
  };
  const logout = async () => {
    await api("logout", {});
    setSession(null);
    setData(null);
  };
  if (loading) return <div className="loading">Preparando tu espacio…</div>;
  if (!session) return <Auth onSession={setSession} />;
  if (session.mustChange)
    return (
      <section className="card">
        <Brand />
        <h1>Activá tu cuenta desde el enlace</h1>
        <p>Pedí un nuevo enlace desde «Olvidé mi contraseña».</p>
        <button onClick={logout}>Volver al ingreso</button>
      </section>
    );
  return (
    <>
      {data?.demo && (
        <div className="demo-banner">
          DEMOSTRACIÓN · Datos ficticios en memoria. Se reinician al apagar el
          servidor.
        </div>
      )}
      {data ? (
        session.actor.role === "customer" ? (
          <Portal data={data} cmd={cmd} logout={logout} />
        ) : (
          <Panel data={data} cmd={cmd} refresh={load} logout={logout} />
        )
      ) : (
        <div className="loading">
          {error || "Cargando…"}
          <button onClick={() => void load()}>Reintentar</button>
          <button onClick={() => void logout()}>Salir</button>
        </div>
      )}
      {error && data && (
        <div className="connection" role="alert">
          {error}
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {working && (
        <div className="saving" role="status">
          Guardando…
        </div>
      )}
    </>
  );
}
function Portal({
  data,
  cmd,
  logout,
}: {
  data: View;
  cmd: Command;
  logout: () => void;
}) {
  const [tab, setTab] = useState("home"),
    [choice, setChoice] = useState<any>(null),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false);
  const c = data.customers[0];
  if (!c) return <Empty>No encontramos tu cuenta.</Empty>;
  const vouchers = data.vouchers,
    requested = vouchers.find((v) => v.status === "requested"),
    unread = data.messages.filter((m) => !m.readAt).length;
  const next =
    data.config.catalog.find((v) => v.points > c.points) ||
    data.config.catalog.at(-1)!;
  const upcoming = data.lots
    .filter((l) => l.remaining > 0 && !l.expired && l.expires > data.now)
    .sort((a, b) => a.expires.localeCompare(b.expires));
  const tabs = [
    ["home", "Mi inicio", Home],
    ["vouchers", "Mis vouchers", Ticket],
    ...(c.hasAccount ? [["account", "Mi cuenta", ShieldCheck] as const] : []),
    ["tickets", "Mis compras", ShoppingBag],
    ["profile", "Mi perfil", UserRound],
  ] as const;
  const select = (v: any) => {
    setAccepted(false);
    setChoice(v);
  };
  return (
    <div className="portal-shell">
      <header className="portal-header">
        <Brand />
        <div className="row">
          <button
            className="icon mail"
            onClick={() => setTab("messages")}
            aria-label={`Mensajes, ${unread} sin leer`}
          >
            <Mail size={22} />
            {unread > 0 && <b>{unread}</b>}
          </button>
          <button className="icon" onClick={logout} aria-label="Cerrar sesión">
            <LogOut size={20} />
          </button>
        </div>
      </header>
      <nav className="portal-tabs">
        {tabs.map(([key, title, Icon]) => (
          <button
            key={key}
            className={tab === key ? "selected" : ""}
            onClick={() => setTab(key)}
          >
            <Icon size={18} />
            {title}
          </button>
        ))}
      </nav>
      <main className="portal-content">
        {tab === "tickets" && <TicketRequests data={data} cmd={cmd} />}
        {tab === "home" && (
          <>
            <div className="greeting">
              <div>
                <span className="eyebrow">TU ESPACIO MOROWA</span>
                <h1>
                  Hola, {c.firstName || c.name.split(" ")[0]}{" "}
                  <span className="hello">♡</span>
                </h1>
                <p className="muted">Cada compra te acerca a algo lindo.</p>
              </div>
              <span className="member">
                <Heart size={15} />
                Socia del Club
              </span>
            </div>
            <div className="portal-grid">
              <section className="points-card">
                <div className="row between">
                  <span>TUS PUNTOS DISPONIBLES</span>
                  <span className="point-star">✧</span>
                </div>
                <div className="points-number">
                  {c.points.toLocaleString("es-AR")}
                  <small>puntos</small>
                </div>
                <div className="progress">
                  <i
                    style={{
                      width:
                        Math.min(
                          100,
                          Math.max(0, (c.points / next.points) * 100),
                        ) + "%",
                    }}
                  />
                </div>
                <div className="row between">
                  <small>
                    {c.points >= next.points
                      ? "¡Ya podés disfrutar tu próximo beneficio!"
                      : `Te faltan ${next.points - c.points} puntos para ${cash(next.amount)}`}
                  </small>
                  <ArrowUpRight size={20} />
                </div>
                <button onClick={() => setTab("vouchers")}>
                  Ver mis beneficios <ArrowRight size={17} />
                </button>
              </section>
              <section className="card next-benefit">
                <span className="eyebrow">UN REGALO PARA VOS</span>
                <div className="gift-illustration">
                  <Gift size={62} strokeWidth={1} />
                  <span>✧</span>
                </div>
                <h2>Más razones para volver.</h2>
                <p className="muted">
                  Tus puntos se convierten en vouchers para tu próxima compra en
                  Morowa.
                </p>
                <button className="text" onClick={() => setTab("vouchers")}>
                  Descubrí tus vouchers <ChevronRight size={16} />
                </button>
              </section>
            </div>
            {c.status === "blocked" && (
              <div className="note bad">
                Tu cuenta está bloqueada. Podés consultar tu historial, pero no
                acumular ni canjear beneficios.
              </div>
            )}
            {requested && (
              <section className="request-banner">
                <div className="round-icon">
                  <Ticket />
                </div>
                <div>
                  <span className="eyebrow">LISTO PARA TU PRÓXIMA VISITA</span>
                  <h3>Tenés {cash(requested.amount)} esperando en el local.</h3>
                  <p>
                    Mostrá el código <strong>{requested.code}</strong> · Hasta
                    el {date(requested.requestExpires)}
                  </p>
                </div>
                <button onClick={() => setTab("vouchers")}>
                  Ver voucher <ArrowRight size={16} />
                </button>
              </section>
            )}
            <div className="two-col">
              <section className="card">
                <header>
                  <h2>Tus últimos movimientos</h2>
                  <ShoppingBag size={20} />
                </header>
                {data.purchases.length ? (
                  data.purchases
                    .slice(-4)
                    .reverse()
                    .map((p) => (
                      <div className="movement" key={p.id}>
                        <div className="round-icon">
                          <ShoppingBag size={18} />
                        </div>
                        <div>
                          <strong>Compra en Morowa</strong>
                          <small>
                            {date(p.createdAt)} · {p.ticket}
                          </small>
                        </div>
                        <div className="right">
                          <b className="green">+{p.points} pts</b>
                          <small>{labels[p.status]}</small>
                        </div>
                      </div>
                    ))
                ) : (
                  <Empty>Tu próxima compra empieza esta historia.</Empty>
                )}
              </section>
              <section className="card soft">
                <span className="eyebrow">TENÉ EN CUENTA</span>
                <h2>Que no se te pase.</h2>
                {upcoming.length ? (
                  <>
                    <p>
                      <strong>{upcoming[0].remaining} puntos</strong> de tu
                      próximo lote vencen el{" "}
                      <strong>{date(upcoming[0].expires)}</strong>.
                    </p>
                    <p className="muted">
                      Usamos primero los puntos que vencen antes.
                    </p>
                  </>
                ) : (
                  <p className="muted">
                    Cuando sumes puntos, acá vas a ver su próximo vencimiento.
                  </p>
                )}
                <button className="text" onClick={() => setTab("terms")}>
                  Cómo funciona el Club <ArrowRight size={16} />
                </button>
              </section>
            </div>
          </>
        )}
        {tab === "vouchers" && (
          <>
            <PageTitle
              kicker="TUS BENEFICIOS"
              title="Un mimo para tu próxima compra."
              subtitle="Elegí tu voucher y presentalo en el local. Solo uno por compra."
            />
            {requested && (
              <section className="card requested">
                <div className="row between">
                  <h2>Tu voucher solicitado</h2>
                  <Pill value="requested" />
                </div>
                <h1>{cash(requested.amount)}</h1>
                <div className="voucher-code">{requested.code}</div>
                <p>
                  Compra mínima {cash(requested.min)} · Hasta el{" "}
                  {date(requested.requestExpires)}
                </p>
                <p className="muted">
                  {c.pendingPoints} puntos pendientes de canje
                </p>
                <button onClick={() => select({ cancel: requested.id })}>
                  Cancelar solicitud
                </button>
              </section>
            )}
            <div className="voucher-grid">
              {vouchers
                .filter((v) => v.status === "available")
                .map((v) => (
                  <section className="voucher-card" key={v.id}>
                    <div className="row between">
                      <Gift />
                      <Pill value={v.kind} />
                    </div>
                    <h2>{cash(v.amount)}</h2>
                    <p>Compra mínima {cash(v.min)}</p>
                    <small>Vence el {date(v.expires)}</small>
                    <button
                      className="primary"
                      disabled={c.status !== "active"}
                      onClick={() =>
                        select({
                          voucherId: v.id,
                          amount: v.amount,
                          min: v.min,
                        })
                      }
                    >
                      {requested ? "Usar este en su lugar" : "Solicitar regalo"}
                    </button>
                  </section>
                ))}
            </div>
            <h2>Convertí tus puntos en beneficios</h2>
            <div className="voucher-grid">
              {data.config.catalog.map((v, i) => (
                <section className="voucher-card" key={i}>
                  <div className="row between">
                    <Ticket />
                    <span className="pill">{v.points} puntos</span>
                  </div>
                  <h2>{cash(v.amount)}</h2>
                  <p>Para tu próxima compra</p>
                  <div className="voucher-divider" />
                  <small>Compra mínima {cash(v.min)}</small>
                  <button
                    className="primary"
                    disabled={
                      c.status !== "active" ||
                      c.points + c.pendingPoints < v.points
                    }
                    onClick={() =>
                      select({ catalogIndex: i, amount: v.amount, min: v.min })
                    }
                  >
                    {c.points + c.pendingPoints < v.points
                      ? `Te faltan ${v.points - c.points - c.pendingPoints} puntos`
                      : requested
                        ? "Usar este en su lugar"
                        : "Solicitar voucher"}
                  </button>
                </section>
              ))}
            </div>
            <section className="card">
              <h2>Historial de vouchers</h2>
              {vouchers.filter(
                (v) => !["available", "requested"].includes(v.status),
              ).length ? (
                vouchers
                  .filter((v) => !["available", "requested"].includes(v.status))
                  .map((v) => (
                    <div className="line-item" key={v.id}>
                      <span>
                        {labels[v.kind]} · {cash(v.amount)}
                      </span>
                      <Pill value={v.status} />
                    </div>
                  ))
              ) : (
                <p className="muted">
                  Tus vouchers usados o vencidos aparecerán acá.
                </p>
              )}
            </section>
          </>
        )}
        {tab === "messages" && (
          <>
            <PageTitle
              kicker="TU BUZÓN"
              title="Tenemos algo para contarte."
              subtitle={`${unread} mensajes sin leer`}
            />
            {data.messages
              .slice()
              .reverse()
              .map((m) => (
                <section
                  className={"card message " + (!m.readAt ? "unread" : "")}
                  key={m.id}
                >
                  <div className="row between">
                    <Pill value={m.tag} />
                    <small>{date(m.createdAt)}</small>
                  </div>
                  <h2>{m.title}</h2>
                  <p className="pre">{m.body}</p>
                  {m.readAt ? (
                    <small className="muted">Leído el {date(m.readAt)}</small>
                  ) : (
                    <button
                      className="text"
                      onClick={() => void cmd("message.read", { id: m.id })}
                    >
                      <Check size={17} />
                      Marcar como leído
                    </button>
                  )}
                </section>
              ))}
            {!data.messages.length && <Empty>Tu buzón está al día.</Empty>}
          </>
        )}
        {tab === "account" && (
          <>
            <PageTitle
              kicker="SIEMPRE CERCA"
              title="Tu cuenta, en un vistazo."
              subtitle="Consultá el estado de tu cuenta corriente."
            />
            <section className="card">
              <div className="row between">
                <h2>Estado de tu cuenta</h2>
                <Pill value={c.accountStatus} />
              </div>
              <p>Última actualización: {date(c.account.updatedAt)}</p>
              {c.accountStatus === "Vencida" && (
                <div className="note warn">
                  Hay un saldo pendiente. Esto no bloquea tus puntos ni tus
                  beneficios.
                </div>
              )}
              {c.stale && (
                <div className="note warn">
                  La información podría estar desactualizada. Consultanos por
                  WhatsApp.
                </div>
              )}
              {data.shopWhatsapp ? (
                <a
                  className="button primary"
                  target="_blank"
                  rel="noreferrer"
                  href={`https://wa.me/${data.shopWhatsapp}?text=${encodeURIComponent("Hola Morowa, quisiera consultar el monto de mi cuenta corriente.")}`}
                >
                  Consultar monto de cuenta corriente <ArrowUpRight size={16} />
                </a>
              ) : (
                <p className="muted">
                  Consultá el monto con el equipo en el local. El contacto de
                  WhatsApp todavía no está configurado.
                </p>
              )}
            </section>
          </>
        )}
        {tab === "profile" && <Profile c={c} cmd={cmd} />}
        {tab === "terms" && (
          <>
            <PageTitle kicker="CLUB MOROWA" title="Las reglas, bien claras." />
            <section className="card pre">{data.config.terms}</section>
          </>
        )}
      </main>
      <footer className="portal-footer">
        <span>MOROWA · Un Club pensado para vos.</span>
        <button className="text" onClick={() => setTab("terms")}>
          Bases y condiciones
        </button>
      </footer>
      {choice && (
        <Modal
          title={choice.cancel ? "Cancelar solicitud" : "Tu próximo beneficio"}
          close={() => setChoice(null)}
        >
          {choice.cancel ? (
            <p>
              Los puntos vuelven a sus lotes originales. Si ya vencieron, no se
              recuperan.
            </p>
          ) : (
            <>
              <h1>{cash(choice.amount)}</h1>
              <p className="pre">
                {data.config.conditions
                  .replaceAll("{min}", cash(choice.min))
                  .replaceAll("{dias}", String(data.config.requestDays))
                  .replaceAll("{bmin}", cash(choice.min))}
              </p>
              {requested && (
                <div className="note warn">
                  Esta elección reemplaza tu solicitud actual. El cambio se
                  confirma completo o conserva tu solicitud anterior.
                </div>
              )}
              <CheckBox checked={accepted} onChange={setAccepted}>
                Leí las condiciones del canje.
              </CheckBox>
            </>
          )}
          <button
            className="primary"
            disabled={busy || (!choice.cancel && !accepted)}
            onClick={async () => {
              setBusy(true);
              if (
                await cmd(
                  choice.cancel ? "portal.cancel" : "voucher.request",
                  choice.cancel
                    ? { id: choice.cancel }
                    : { ...choice, accepted },
                )
              )
                setChoice(null);
              setBusy(false);
            }}
          >
            {busy
              ? "Guardando…"
              : choice.cancel
                ? "Confirmar cancelación"
                : "Confirmar solicitud"}
          </button>
        </Modal>
      )}
    </div>
  );
}
function Profile({ c, cmd }: { c: View["customers"][number]; cmd: Command }) {
  return (
    <>
      <PageTitle
        kicker="A TU MANERA"
        title="Tu perfil."
        subtitle="Contanos un poco más de vos."
      />
      <section className="card">
        <h2>{c.name}</h2>
        <p className="muted">
          {c.email} · {c.phone}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            void cmd("profile.save", {
              ...f,
              emailConsent: f.emailConsent === "on",
              whatsappConsent: f.whatsappConsent === "on",
            });
          }}
        >
          <Field label="Cumpleaños (DD/MM)">
            <input
              name="birthday"
              defaultValue={c.birthday}
              placeholder="19/04"
            />
          </Field>
          <Field label="Tus gustos (opcional)">
            <textarea
              name="preferences"
              defaultValue={c.preferences}
              placeholder="Estilos, colores, prendas favoritas…"
            />
          </Field>
          <h3>Mensajes</h3>
          <label className="check">
            <input
              name="emailConsent"
              type="checkbox"
              defaultChecked={c.emailConsent}
            />
            Quiero recibir mensajes por email.
          </label>
          <label className="check">
            <input
              name="whatsappConsent"
              type="checkbox"
              defaultChecked={c.whatsappConsent}
            />
            Acepto mensajes por WhatsApp.
          </label>
          <button className="primary">Guardar preferencias</button>
        </form>
      </section>
    </>
  );
}
function PageTitle({
  kicker,
  title,
  subtitle,
  children,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <span className="eyebrow">{kicker}</span>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
function Panel({
  data,
  cmd,
  refresh,
  logout,
}: {
  data: View;
  cmd: Command;
  refresh: () => Promise<void>;
  logout: () => void;
}) {
  const [tab, setTab] = useState("pending"),
    [selected, setSelected] = useState(""),
    [saleClient, setSaleClient] = useState("");
  const admin = data.actor.role === "admin";
  const pendingCount =
    data.customers.filter((c) => c.stale).length +
    (admin
      ? data.customers.filter((c) => c.accountStatus === "Vencida").length
      : 0) +
    data.vouchers.filter((v) => v.status === "requested").length +
    data.customers.filter((c) => ["approval", "pending"].includes(c.status))
      .length +
    (admin
      ? data.purchases.filter((p) => p.status === "annul_pending").length
      : 0);
  const nav = [
    ["pending", "Pendientes", Bell],
    ["sale", "Cargar compra", ShoppingBag],
    ["customers", "Clientas", Users],
    ...(admin ? [["catalog", "Vouchers", Ticket]] : []),
    ["campaigns", "Campañas", Gift],
    ["messages", "Mensajes", Mail],
    ...(admin
      ? [
          ["users", "Usuarios", Users],
          ["import", "Importar Excel", Upload],
          ["reports", "Reportes", BarChart3],
          ["settings", "Configuración", Settings],
        ]
      : []),
  ] as [string, string, typeof Home][];
  const sell = (cid: string) => {
    setSaleClient(cid);
    setSelected("");
    setTab("sale");
  };
  return (
    <>
      <div className="desktop-only-note">
        <Monitor size={42} />
        <h1>El panel se usa en computadora.</h1>
        <p>
          Para trabajar con clientas, ventas e importaciones, abrí el panel en
          una pantalla de al menos 1024 px.
        </p>
        <button onClick={logout}>Cerrar sesión</button>
      </div>
      <div className="panel-shell">
        <aside className="sidebar">
          <Brand />
          <span className="nav-label">ESPACIO DEL EQUIPO</span>
          <nav>
            {nav.map(([key, name, Icon]) => (
              <button
                className={tab === key ? "selected" : ""}
                key={key}
                onClick={() => setTab(key)}
              >
                <Icon size={19} />
                <span>{name}</span>
                {key === "pending" && pendingCount > 0 && <b>{pendingCount}</b>}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="avatar">M</div>
            <div>
              <strong>
                {data.currentUser?.name ||
                  data.currentUser?.email ||
                  "Mi cuenta"}
              </strong>
              <small>{labels[data.actor.role]}</small>
            </div>
            <button
              className="icon"
              onClick={logout}
              aria-label="Cerrar sesión"
            >
              <LogOut size={17} />
            </button>
          </div>
        </aside>
        <div className="panel-work">
          <header className="panel-top">
            <span>
              Panel Morowa <ChevronRight size={14} />{" "}
              {nav.find((x) => x[0] === tab)?.[1]}
            </span>
            <div className="row">
              <span className="live-dot" />
              Conectado <span className="top-date">{date(data.now)}</span>
              <button
                className="icon"
                aria-label="Ver pendientes"
                onClick={() => setTab("pending")}
              >
                <Bell size={19} />
              </button>
            </div>
          </header>
          <main className="panel-main">
            {admin && data.mailTestRecipient && (
              <div className="note warn">
                Correo de prueba: los nuevos mensajes se entregan únicamente a{" "}
                {data.mailTestRecipient}. Las clientas no reciben emails en sus
                propias casillas.
              </div>
            )}
            {admin && !data.mailReady && (
              <div className="note warn">
                El envío de emails no está configurado. Para probar, copiá el
                enlace de activación desde la ficha.
              </div>
            )}
            {tab === "users" && admin && <Team />}
            {tab === "pending" && <TicketRequests data={data} cmd={cmd} />}
            {tab === "pending" && (
              <Pending
                data={data}
                cmd={cmd}
                select={setSelected}
                sell={sell}
                refresh={refresh}
              />
            )}{" "}
            {tab === "sale" && (
              <Sale
                key={saleClient}
                data={data}
                cmd={cmd}
                initial={saleClient}
              />
            )}{" "}
            {tab === "customers" && (
              <Customers data={data} cmd={cmd} select={setSelected} />
            )}{" "}
            {tab === "catalog" && (
              <>
                <PageTitle
                  kicker="BENEFICIOS DEL CLUB"
                  title="Vouchers"
                  subtitle="Catálogo de puntos y regalos vigentes."
                />
                <div className="voucher-grid">
                  {data.config.catalog.map((v, i) => (
                    <section className="voucher-card" key={i}>
                      <Ticket />
                      <h2>{cash(v.amount)}</h2>
                      <p>{v.points} puntos</p>
                      <small>Compra mínima {cash(v.min)}</small>
                    </section>
                  ))}
                </div>
                <section className="card">
                  <h2>Vouchers de las clientas</h2>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Clienta</th>
                          <th>Voucher</th>
                          <th>Código</th>
                          <th>Vigencia</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.vouchers
                          .slice()
                          .reverse()
                          .map((v) => (
                            <tr key={v.id}>
                              <td>
                                <button
                                  className="text"
                                  onClick={() => setSelected(v.customerId)}
                                >
                                  {
                                    data.customers.find(
                                      (c) => c.id === v.customerId,
                                    )?.name
                                  }
                                </button>
                              </td>
                              <td>
                                {cash(v.amount)}
                                <small>{labels[v.kind]}</small>
                              </td>
                              <td className="mono">{v.code}</td>
                              <td>{date(v.expires)}</td>
                              <td>
                                <Pill value={v.status} />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}{" "}
            {tab === "campaigns" && <CampaignCenter data={data} cmd={cmd} />}{" "}
            {tab === "messages" && <Messages data={data} cmd={cmd} />}{" "}
            {tab === "import" && <Import data={data} refresh={refresh} />}{" "}
            {tab === "reports" && <ReportCenter />}{" "}
            {tab === "settings" && <Configuration data={data} cmd={cmd} />}
          </main>
          <footer className="panel-footer">
            CLUB MOROWA <span>Hecho para cuidar cada vínculo.</span>
          </footer>
        </div>
      </div>
      {selected && (
        <CustomerDetail
          data={data}
          cid={selected}
          cmd={cmd}
          close={() => setSelected("")}
          sell={sell}
        />
      )}
    </>
  );
}
function Pending({
  data,
  cmd,
  select,
  sell,
  refresh,
}: {
  data: View;
  cmd: Command;
  select: (id: string) => void;
  sell: (id: string) => void;
  refresh: () => Promise<void>;
}) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [oldOnly, setOldOnly] = useState(false),
    [notice, setNotice] = useState("");
  const admin = data.actor.role === "admin";
  type PendingItem = {
    id: string;
    cid: string;
    type: string;
    title: string;
    detail: string;
    at: string;
    action: string;
  };
  const items: PendingItem[] = [
    ...data.vouchers
      .filter((v) => v.status === "requested")
      .map((v) => ({
        id: v.id,
        cid: v.customerId,
        type: "voucher",
        title: "Voucher solicitado",
        detail: `${cash(v.amount)} · ${v.code}`,
        at: v.requestedAt!,
        action: "Canjear en caja",
      })),
    ...data.customers
      .filter((c) => ["approval", "pending"].includes(c.status))
      .map((c) => ({
        id: c.id,
        cid: c.id,
        type: c.status,
        title:
          c.status === "approval"
            ? "Nueva solicitud de registro"
            : "Invitación enviada, sin activar",
        detail:
          c.status === "approval"
            ? "Revisar datos y habilitar el acceso"
            : "Pendiente de activar desde el enlace",
        at: c.joined,
        action: c.status === "approval" ? "Revisar registro" : "Ver ficha",
      })),
    ...data.customers
      .filter((c) => c.stale)
      .map((c) => ({
        id: "stale-" + c.id,
        cid: c.id,
        type: "stale",
        title: "Cuenta sin actualizar",
        detail: `Última actualización: ${date(c.account.updatedAt)}`,
        at: c.account.updatedAt,
        action: "Actualizar cuenta",
      })),
    ...(admin
      ? data.purchases
          .filter((p) => p.status === "annul_pending")
          .map((p) => ({
            id: p.id,
            cid: p.customerId,
            type: "annul",
            title: "Anulación por aprobar",
            detail: `Ticket ${p.ticket} · ${p.reason}`,
            at: p.createdAt,
            action: "Revisar compra",
          }))
      : []),
    ...(admin
      ? data.customers
          .filter((c) => c.accountStatus === "Vencida")
          .map((c) => ({
            id: "overdue-" + c.id,
            cid: c.id,
            type: "overdue",
            title: "Saldo en más de 90 días",
            detail: "Revisar cuenta; el bloqueo es manual",
            at: c.account.updatedAt,
            action: "Ver ficha",
          }))
      : []),
  ];
  const age = (s: string) =>
    Math.max(0, Math.floor((Date.parse(data.now) - Date.parse(s)) / 864e5));
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const visible = items
    .filter(
      (i) =>
        (filter === "all" || i.type === filter) &&
        (!oldOnly || age(i.at) > 7) &&
        norm(
          `${data.customers.find((c) => c.id === i.cid)?.name} ${i.title} ${i.detail}`,
        ).includes(norm(query)),
    )
    .sort((a, b) => a.at.localeCompare(b.at));
  const types = [
    ["all", "Todos"],
    ["voucher", "Vouchers"],
    ["approval", "Registros"],
    ["pending", "Sin activar"],
    ["stale", "Cuentas"],
    ...(admin
      ? [
          ["annul", "Anulaciones"],
          ["overdue", "+90 días"],
        ]
      : []),
  ];
  return (
    <>
      <PageTitle
        kicker="EL CLUB, AL DÍA"
        title="Todo empieza por acá."
        subtitle="Un espacio compartido para resolver lo que necesita atención."
      >
        <button onClick={() => void refresh()}>
          <Clock size={16} />
          Actualizar
        </button>
      </PageTitle>
      <div className="stats">
        <Stat
          title="Pendientes de atención"
          value={items.length}
          icon={<Bell />}
        />
        <Stat
          title="Vouchers solicitados"
          value={items.filter((i) => i.type === "voucher").length}
          icon={<Ticket />}
        />
        <Stat
          title="Registros por revisar"
          value={items.filter((i) => i.type === "approval").length}
          icon={<Users />}
        />
        <Stat
          title="Más de 7 días"
          value={items.filter((i) => age(i.at) > 7).length}
          icon={<Clock />}
        />
      </div>
      <section className="card pending-card">
        <header>
          <div>
            <h2>
              Bandeja de pendientes{" "}
              <span className="count">{visible.length}</span>
            </h2>
            <p className="muted">Los más antiguos aparecen primero.</p>
          </div>
          <CheckBox checked={oldOnly} onChange={setOldOnly}>
            Solo más de 7 días
          </CheckBox>
        </header>
        <div className="search">
          <Search size={18} />
          <input
            aria-label="Buscar pendientes"
            placeholder="Buscar por clienta, código de voucher o ticket…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="icon"
              onClick={() => setQuery("")}
              aria-label="Limpiar búsqueda"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="filter-chips">
          {types.map(([key, name]) => (
            <button
              className={filter === key ? "selected" : ""}
              key={key}
              onClick={() => setFilter(key)}
            >
              {name}
              <span>
                {key === "all"
                  ? items.length
                  : items.filter((i) => i.type === key).length}
              </span>
            </button>
          ))}
        </div>
        {notice && <div className="note">{notice}</div>}
        <div className="pending-list">
          {visible.map((i) => {
            const c = data.customers.find((c) => c.id === i.cid)!;
            return (
              <article
                key={i.id}
                className={"pending-item " + (age(i.at) > 7 ? "old" : "")}
              >
                <div className={"round-icon " + i.type}>
                  {i.type === "voucher" ? (
                    <Ticket size={20} />
                  ) : i.type === "approval" ? (
                    <Users size={20} />
                  ) : (
                    <Clock size={20} />
                  )}
                </div>
                <div className="pending-info">
                  <div className="row">
                    <strong>{c.name}</strong>
                    <span className="tiny-label">{i.title}</span>
                  </div>
                  <p>{i.detail}</p>
                  <small className={age(i.at) > 7 ? "red" : "muted"}>
                    {`Hace ${age(i.at)} días`}
                  </small>
                </div>
                <div className="pending-actions">
                  {i.type === "approval" && data.actor.role === "admin" ? (
                    <>
                      <ApproveRegistration cid={i.cid} cmd={cmd} />
                      <button className="small" onClick={() => select(i.cid)}>
                        Revisar
                      </button>
                    </>
                  ) : (
                    <button
                      className="small"
                      onClick={() =>
                        i.type === "voucher" ? sell(i.cid) : select(i.cid)
                      }
                    >
                      {i.action}
                      <ArrowRight size={15} />
                    </button>
                  )}
                  {i.type === "pending" && (
                    <button
                      className="text small"
                      onClick={async () => {
                        try {
                          await api("invite", { customerId: i.cid });
                          setNotice("Invitación en la cola de email.");
                        } catch (e) {
                          setNotice((e as Error).message);
                        }
                      }}
                    >
                      Reenviar invitación
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {!visible.length && (
            <Empty>
              {query || filter !== "all" || oldOnly
                ? "No hay pendientes con estos filtros."
                : "¡Todo al día! No hay pendientes para resolver."}
            </Empty>
          )}
        </div>
      </section>
      <div className="note subtle">
        <ShieldCheck size={18} />
        Cuando alguien del equipo resuelve un pendiente, se actualiza para
        todas.
      </div>
    </>
  );
}
function Stat({
  title,
  value,
  icon,
}: {
  title: string;
  value: ReactNode;
  icon: ReactNode;
}) {
  return (
    <section className="stat">
      <div>
        <span>{title}</span>
        <b>{value}</b>
      </div>
      <div className="round-icon">{icon}</div>
    </section>
  );
}

function useCustomerSearch(data: View, q: string) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    let valid = true;
    if (q.trim().length < 2) {
      setIds([]);
      return;
    }
    const timer = setTimeout(() => {
      api<string[]>("customers/search?q=" + encodeURIComponent(q))
        .then((x) => {
          if (valid) setIds(x);
        })
        .catch(() => {
          if (valid) setIds([]);
        });
    }, 250);
    return () => {
      valid = false;
      clearTimeout(timer);
    };
  }, [q]);
  return data.customers.filter(
    (c) =>
      ids.includes(c.id) ||
      (c.name + " " + c.phone + " " + c.email)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(
          q
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase(),
        ),
  );
}

function Customers({
  data,
  cmd,
  select,
}: {
  data: View;
  cmd: Command;
  select: (id: string) => void;
}) {
  const [q, setQ] = useState(""),
    [status, setStatus] = useState("all"),
    [add, setAdd] = useState(false);
  const rows = useCustomerSearch(data, q).filter(
    (c) => status === "all" || c.status === status,
  );
  return (
    <>
      <PageTitle
        kicker="CADA CLIENTA CUENTA"
        title="Clientas"
        subtitle="Sus beneficios, sus compras y su vínculo con Morowa."
      >
        <button className="primary" onClick={() => setAdd(true)}>
          <Plus size={17} />
          Nueva clienta
        </button>
      </PageTitle>
      <section className="card">
        <div className="toolbar">
          <div className="search">
            <Search size={18} />
            <input
              aria-label="Buscar clientas"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por apellido, nombre, email o celular"
            />
          </div>
          <select
            aria-label="Estado de clienta"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            {["active", "pending", "approval", "blocked"].map((s) => (
              <option key={s} value={s}>
                {labels[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Clienta</th>
                <th>Club</th>
                <th>Puntos</th>
                <th>Cuenta corriente</th>
                <th>Alta</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    <small>{c.email || "Sin email"}</small>
                  </td>
                  <td>
                    <Pill value={c.status} />
                  </td>
                  <td>
                    <b>{c.points}</b>
                    <small>{c.pendingPoints} pendientes</small>
                  </td>
                  <td>
                    <Pill value={c.accountStatus} />
                  </td>
                  <td>{date(c.joined)}</td>
                  <td>
                    <button className="text" onClick={() => select(c.id)}>
                      Ver ficha <ArrowRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty>No hay clientas con estos filtros.</Empty>}
      </section>
      {add && (
        <Modal title="Nueva clienta" close={() => setAdd(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await cmd(
                  "customer.create",
                  (() => {
                    const f = Object.fromEntries(new FormData(e.currentTarget));
                    return { ...f, name: `${f.lastName}, ${f.firstName}` };
                  })(),
                )
              )
                setAdd(false);
            }}
          >
            <Field label="Apellido">
              <input name="lastName" required />
            </Field>
            <Field label="Nombre">
              <input name="firstName" required />
            </Field>
            <Field label="DNI (opcional, uso interno)">
              <input name="dni" inputMode="numeric" />
            </Field>
            <Field label="Celular">
              <input name="phone" type="tel" />
            </Field>
            <Field label="Email">
              <input name="email" type="email" required />
            </Field>
            <Field label="Cumpleaños (DD/MM)">
              <input name="birthday" placeholder="19/04" />
            </Field>
            {data.actor.role === "admin" && (
              <Field label="¿Tiene cuenta corriente?">
                <select name="hasAccount" defaultValue="false">
                  <option value="false">No</option>
                  <option value="true">Sí</option>
                </select>
              </Field>
            )}
            <Field label="Nombre en Ninox">
              <input name="ninox" />
            </Field>
            <p className="note">
              Recibirá una invitación para crear su contraseña y activar la
              cuenta. Las compras se registran y sus puntos se acreditan si
              activa dentro de 30 días.
            </p>
            <button className="primary">Crear clienta</button>
          </form>
        </Modal>
      )}
    </>
  );
}
function Sale({
  data,
  cmd,
  initial,
}: {
  data: View;
  cmd: Command;
  initial: string;
}) {
  const cfg = data.config as Config;
  const [cid, setCid] = useState(initial),
    [q, setQ] = useState(""),
    [pdv, setPdv] = useState(cfg.pdv[0]),
    [number, setNumber] = useState(""),
    [amount, setAmount] = useState(""),
    [voucher, setVoucher] = useState(""),
    [done, setDone] = useState(false),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false);
  const c = data.customers.find((c) => c.id === cid);
  const matched = useCustomerSearch(data, q);
  const options = data.vouchers.filter(
    (v) =>
      v.customerId === cid &&
      ["available", "requested"].includes(v.status) &&
      v.expires > data.now,
  );
  const catalogIndex = voucher.startsWith("catalog:")
    ? Number(voucher.slice(8))
    : undefined;
  const cat =
    catalogIndex !== undefined ? cfg.catalog[catalogIndex] : undefined;
  const v = cat
    ? {
        amount: cat.amount,
        min: cat.min,
        cost: cat.points,
        percent: undefined,
        code: "canje de " + cat.points + " puntos",
      }
    : options.find((v) => v.id === voucher);
  const discount = v?.percent
    ? Math.round(Number(amount) * v.percent) / 100
    : v?.amount || 0;
  const paid = Number(amount) - discount,
    mult = Math.max(
      1,
      ...data.campaigns
        .filter((c) => !c.paused && c.from <= data.now && c.to >= data.now)
        .map((c) => c.multiplier),
    );
  const points =
    c?.status === "active"
      ? (cfg.rounding === "down"
          ? Math.floor
          : cfg.rounding === "up"
            ? Math.ceil
            : Math.round)(paid / 1000) *
        cfg.per1000 *
        mult
      : 0;
  const suggested = options
    .filter((v) => v.min <= Number(amount) && v.amount < Number(amount))
    .sort((a, b) => b.amount - a.amount)[0];
  return (
    <>
      <PageTitle
        kicker="UNA COMPRA, UN NUEVO BENEFICIO"
        title="Cargar compra"
        subtitle="Revisá el resumen antes de registrar el ticket."
      />
      {done && (
        <div className="note good">
          <CheckCircle2 size={20} />
          Compra registrada. Los puntos y el voucher ya están actualizados.
        </div>
      )}
      <div className="sale-grid">
        <section className="card">
          <h2>1. Elegí la clienta</h2>
          <div className="search">
            <Search size={18} />
            <input
              aria-label="Buscar clienta para compra"
              placeholder="Apellido, nombre, email o celular"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div
            className="client-search-results"
            role="listbox"
            aria-label="Resultados de clientas"
          >
            {matched.slice(0, 15).map((x) => (
              <button
                role="option"
                aria-selected={cid === x.id}
                key={x.id}
                className={cid === x.id ? "selected" : ""}
                onClick={() => {
                  setCid(x.id);
                  setQ(x.name);
                  setVoucher("");
                  setDone(false);
                }}
              >
                <strong>{x.name}</strong>
                <small>
                  {x.email} · {labels[x.status]}
                </small>
              </button>
            ))}
            {!matched.length && (
              <p>
                No hay coincidencias. Podés cargar una clienta desde Clientas →
                Nueva clienta.
              </p>
            )}
          </div>
          {c && (
            <div className="note subtle">
              <Pill value={c.status} />
              {c.points} puntos disponibles
            </div>
          )}
          <div className="separator" />
          <h2>2. Datos de la compra</h2>
          <div className="two-col">
            <Field label="Punto de venta">
              <select value={pdv} onChange={(e) => setPdv(e.target.value)}>
                {cfg.pdv.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Número de ticket">
              <input
                inputMode="numeric"
                maxLength={8}
                value={number}
                onChange={(e) => {
                  setNumber(e.target.value.replace(/\D/g, "").slice(0, 8));
                  setDone(false);
                }}
                onBlur={() => {
                  if (number) setNumber(number.padStart(8, "0"));
                }}
                placeholder="572"
              />
            </Field>
          </div>
          <small className="muted mono">
            Ticket completo: {pdv}-{number.padStart(8, "0")}
          </small>
          <Field label="Importe del ticket, antes del voucher">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setDone(false);
              }}
              placeholder="0"
            />
          </Field>
          <small className="muted">
            {c?.hasAccount
              ? "Ingresá el importe con el descuento de cuenta corriente ya aplicado,"
              : "Ingresá el importe efectivamente pagado,"}
            si corresponde.
          </small>
          <div className="separator" />
          <h2>3. Voucher (opcional)</h2>
          <Field label="Se puede usar uno solo por compra">
            <select
              value={voucher}
              onChange={(e) => setVoucher(e.target.value)}
              disabled={c?.status !== "active"}
            >
              <option value="">Sin voucher</option>
              {cfg.catalog.map((cat, i) =>
                cat.enabled !== false &&
                c &&
                cat.points <= c.points &&
                Number(amount) >= cat.min ? (
                  <option key={"catalog:" + i} value={"catalog:" + i}>
                    {cat.points} puntos por {cash(cat.amount)} · mín.{" "}
                    {cash(cat.min)}
                  </option>
                ) : null,
              )}
              {options.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.percent ? `${v.percent}%` : cash(v.amount)} ·{" "}
                  {labels[v.kind]} · mín. {cash(v.min)} · {date(v.expires)}
                </option>
              ))}
            </select>
          </Field>
          {suggested && c?.status === "active" && (
            <button
              className="suggestion"
              onClick={() => setVoucher(suggested.id)}
            >
              <Gift size={18} />
              El que más descuenta: {cash(suggested.amount)}{" "}
              <ArrowRight size={16} />
            </button>
          )}
        </section>
        <section className="card summary-card">
          <span className="eyebrow">TODO CLARO ANTES DE CONFIRMAR</span>
          <h2>Resumen de la compra</h2>
          <div className="receipt-icon">
            <ShoppingBag size={38} strokeWidth={1.2} />
          </div>
          <div className="line-item">
            <span>Clienta</span>
            <strong>{c?.name || "Sin seleccionar"}</strong>
          </div>
          <div className="line-item">
            <span>Importe</span>
            <strong>{cash(Number(amount) || 0)}</strong>
          </div>
          <div className="line-item">
            <span>Voucher</span>
            <strong>− {cash(discount)}</strong>
          </div>
          <div className="line-item total">
            <span>Total a pagar</span>
            <strong>{cash(Math.max(0, paid) || 0)}</strong>
          </div>
          <div className="earned">
            <Heart size={19} />
            Suma <b>{Math.max(0, points) || 0} puntos</b>
          </div>
          {c && c.status !== "active" && (
            <p className="note warn">
              La compra se registra. Si activa su cuenta dentro de 30 días,
              recibirá los puntos con vencimiento desde la fecha del ticket. Por
              ahora no puede canjear.
            </p>
          )}
          {v && Number(amount) < v.min && (
            <p className="note bad">La compra mínima es {cash(v.min)}.</p>
          )}
          <button
            className="primary full"
            disabled={
              !cid ||
              !number ||
              !amount ||
              paid <= 0 ||
              (!!v && Number(amount) < v.min) ||
              done
            }
            onClick={() => setConfirm(true)}
          >
            Revisar y registrar <ArrowRight size={17} />
          </button>
          <small className="muted center">
            La operación queda registrada en la auditoría.
          </small>
        </section>
      </div>
      {confirm && (
        <Modal title="Confirmar compra" close={() => setConfirm(false)}>
          <p>
            {c?.name} · Ticket{" "}
            <b>
              {pdv}-{number.padStart(8, "0")}
            </b>
          </p>
          <h1>{cash(paid)}</h1>
          <p>
            Se acreditarán {points} puntos.{v ? ` Se canjeará ${v.code}.` : ""}
            {cat ? ` Se descontarán ${cat.points} puntos.` : ""}
          </p>
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              if (
                await cmd("purchase.create", {
                  customerId: cid,
                  pdv,
                  number,
                  amount: Number(amount),
                  voucherId:
                    catalogIndex === undefined
                      ? voucher || undefined
                      : undefined,
                  catalogIndex,
                  accepted: true,
                })
              ) {
                setDone(true);
                setConfirm(false);
              }
              setBusy(false);
            }}
          >
            Confirmar registro
          </button>
        </Modal>
      )}
    </>
  );
}
function CustomerDetail({
  data,
  cid,
  cmd,
  close,
  sell,
}: {
  data: View;
  cid: string;
  cmd: Command;
  close: () => void;
  sell: (id: string) => void;
}) {
  const c = data.customers.find((c) => c.id === cid)!;
  const [tab, setTab] = useState("overview"),
    [action, setAction] = useState<any>(null),
    [notice, setNotice] = useState("");
  if (!c) return null;
  const bands = ("bands" in c.account ? c.account.bands : []) as number[];
  const admin = data.actor.role === "admin";
  const purchases = data.purchases
    .filter((p) => p.customerId === cid)
    .slice()
    .reverse();
  return (
    <Modal title={c.name} close={close}>
      <div className="row">
        <Pill value={c.status} />
        <Pill value={c.accountStatus} />
        <span>
          {c.points} puntos · {c.pendingPoints} pendientes
        </span>
      </div>
      <div className="filter-chips">
        {[
          ["overview", "Datos"],
          ["purchases", "Compras"],
          ["vouchers", "Vouchers"],
          ["account", "Cuenta"],
          ["history", "Movimientos"],
        ].map(([key, title]) => (
          <button
            key={key}
            className={tab === key ? "selected" : ""}
            onClick={() => setTab(key)}
          >
            {title}
          </button>
        ))}
      </div>
      {notice && <div className="note">{notice}</div>}
      {tab === "overview" && (
        <>
          <p>
            {c.email || "Sin email"}
            <br />
            {c.phone}
            <br />
            Cumpleaños: {c.birthday || "Sin completar"}
          </p>
          <p className="muted">
            Bases aceptadas: {date(c.acceptedAt)}
            <br />
            Email: {c.emailConsent ? "Acepta" : "No acepta"} · WhatsApp:{" "}
            {c.whatsappConsent ? "Acepta" : "No acepta"}
          </p>
          {c.status === "active" && (
            <section className="card">
              <h3>Canjear puntos en el local</h3>
              {data.config.catalog.map((v, i) =>
                v.enabled !== false && v.points <= c.points ? (
                  <button
                    key={i}
                    onClick={() => {
                      if (
                        confirm(
                          `Se descontarán ${v.points} puntos por un voucher de ${cash(v.amount)}. Compra mínima ${cash(v.min)}. ¿Confirmar canje?`,
                        )
                      )
                        void cmd("voucher.request", {
                          customerId: cid,
                          catalogIndex: i,
                          accepted: true,
                        });
                    }}
                  >
                    {v.points} puntos → {cash(v.amount)}
                  </button>
                ) : null,
              )}
            </section>
          )}
          <div className="row">
            <button className="primary" onClick={() => sell(cid)}>
              Cargar compra
            </button>
            {admin && c.status === "approval" && (
              <>
                <ApproveRegistration cid={cid} cmd={cmd} />
                <button
                  onClick={() =>
                    setAction({
                      type: "registration.reject",
                      title: "Rechazar registro",
                    })
                  }
                >
                  Rechazar
                </button>
              </>
            )}
            {c.status === "pending" && (
              <button
                onClick={async () => {
                  try {
                    const r = await api("invite", {
                      customerId: cid,
                      copyOnly: true,
                    });
                    await navigator.clipboard.writeText(r.link);
                    setNotice(
                      "Enlace de activación copiado. Vence en 4 horas.",
                    );
                  } catch (e) {
                    setNotice((e as Error).message);
                  }
                }}
              >
                Copiar enlace de activación
              </button>
            )}
            {admin && (
              <button
                onClick={() => {
                  const email = prompt("Nuevo email", c.email);
                  if (email)
                    void cmd("customer.email", { customerId: cid, email });
                }}
              >
                Cambiar email
              </button>
            )}
            {admin && (
              <button
                onClick={() =>
                  void cmd("account.toggle", {
                    customerId: cid,
                    enabled: !c.hasAccount,
                  })
                }
              >
                {c.hasAccount
                  ? "Quitar cuenta corriente"
                  : "Habilitar cuenta corriente"}
              </button>
            )}
            {!admin && (
              <button
                onClick={() =>
                  void cmd("account.requested", {
                    customerId: cid,
                    enabled: true,
                  })
                }
              >
                Pidió cuenta corriente
              </button>
            )}
            {c.lastInvite && (
              <p>
                Invitación enviada hace{" "}
                {Math.max(
                  0,
                  Math.floor(
                    (Date.now() - Date.parse(c.lastInvite)) / 86400000,
                  ),
                )}{" "}
                días ·{" "}
                {labels[c.invitationStatus || "pending"] || c.invitationStatus}
              </p>
            )}
            {c.duplicate && (
              <p className="note">
                Coincide el nombre o celular con otra cuenta. Revisá antes de
                aprobar.
              </p>
            )}
            {admin && c.duplicate && !c.acceptedAt && c.status !== "active" && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const target = String(
                    new FormData(e.currentTarget).get("target") || "",
                  );
                  const kept = data.customers.find((x) => x.id === target);
                  if (
                    kept &&
                    confirm(
                      `Se conservará ${kept.name} (${kept.email}), se trasladarán los movimientos y se eliminará esta cuenta duplicada sin activar. ¿Confirmar unificación?`,
                    )
                  ) {
                    if (await cmd("customer.merge", { source: cid, target }))
                      close();
                  }
                }}
              >
                <Field label="Unificar duplicado en la cuenta que se conserva">
                  <select name="target" required defaultValue="">
                    <option value="" disabled>
                      Elegí la cuenta a conservar
                    </option>
                    {data.customers
                      .filter(
                        (x) =>
                          x.id !== cid &&
                          ((c.phone && x.phone === c.phone) ||
                            x.name.toLowerCase() === c.name.toLowerCase()),
                      )
                      .map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name} · {x.email}
                        </option>
                      ))}
                  </select>
                </Field>
                <p className="muted">
                  Solo cuentas origen sin activar, sin vouchers ni cuenta
                  corriente. Se conserva el acceso de la cuenta destino.
                </p>
                <button type="submit">Revisar y unificar</button>
              </form>
            )}
            {c.status !== "approval" && (
              <button
                onClick={async () => {
                  try {
                    await api("invite", {
                      customerId: cid,
                      reset: c.status !== "pending",
                    });
                    setNotice("Enlace agregado a la cola de email.");
                  } catch (e) {
                    setNotice((e as Error).message);
                  }
                }}
              >
                {c.status === "pending"
                  ? "Enviar invitación"
                  : "Enviar recuperación"}
              </button>
            )}
            {admin && (
              <>
                <button
                  onClick={() =>
                    setAction({
                      type: "points.adjust",
                      title: "Ajustar puntos",
                    })
                  }
                >
                  Ajustar puntos
                </button>
                {["active", "blocked"].includes(c.status) && (
                  <button
                    className="danger"
                    onClick={() =>
                      setAction({
                        type: "customer.block",
                        title:
                          c.status === "blocked"
                            ? "Desbloquear cuenta"
                            : "Bloquear cuenta",
                      })
                    }
                  >
                    {c.status === "blocked" ? "Desbloquear" : "Bloquear"}
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
      {tab === "purchases" && (
        <>
          {purchases.map((p) => (
            <section className="mini-card" key={p.id}>
              <div className="row between">
                <b>{p.ticket}</b>
                <Pill value={p.status} />
              </div>
              <p>
                {date(p.createdAt)} · Pagó {cash(p.paid)} · {p.points} puntos
              </p>
              {p.status === "active" &&
                (Date.parse(data.now) - Date.parse(p.createdAt)) / 864e5 <=
                  (data.config as Config).annulDays && (
                  <button
                    className="text"
                    onClick={() =>
                      setAction({
                        type: "purchase.annul",
                        id: p.id,
                        title: "Solicitar anulación",
                      })
                    }
                  >
                    Anular compra
                  </button>
                )}
              {p.status === "annul_pending" && admin && (
                <>
                  <p className="note warn">
                    Saldo resultante estimado: {c.points - p.points} puntos. Se
                    restan los puntos de la compra y se rehabilita su voucher si
                    sigue vigente.
                  </p>
                  <div className="row">
                    <button
                      onClick={() =>
                        setAction({
                          type: "annul.approve",
                          id: p.id,
                          title: "Aprobar anulación",
                        })
                      }
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => void cmd("annul.reject", { id: p.id })}
                    >
                      Rechazar
                    </button>
                  </div>
                </>
              )}
            </section>
          ))}
          {!purchases.length && <Empty>Sin compras registradas.</Empty>}
        </>
      )}
      {tab === "account" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void cmd("account.update", {
              customerId: cid,
              bands: [0, 1, 2, 3, 4].map((i) => Number(f.get("band" + i))),
            });
          }}
        >
          <p>
            Saldo total: <b>{cash(bands.reduce((a, b) => a + b, 0))}</b>
          </p>
          <div className="two-col">
            {["15 días", "30 días", "60 días", "90 días", "+90 días"].map(
              (label, i) => (
                <Field label={label} key={label}>
                  <input
                    name={"band" + i}
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={bands[i] || 0}
                  />
                </Field>
              ),
            )}
          </div>
          <small>Actualizado el {date(c.account.updatedAt)}</small>
          <button className="primary">Actualizar cuenta</button>
        </form>
      )}
      {tab === "vouchers" && (
        <>
          {data.vouchers
            .filter((v) => v.customerId === cid)
            .map((v) => (
              <div className="mini-card" key={v.id}>
                <div className="row between">
                  <strong>
                    {cash(v.amount)} · {labels[v.kind]}
                  </strong>
                  <Pill value={v.status} />
                </div>
                <p>
                  {v.code} · Vence {date(v.expires)}
                </p>
                {v.status === "requested" && (
                  <button
                    onClick={() =>
                      setAction({
                        type: "voucher.cancel",
                        id: v.id,
                        title: "Cancelar solicitud de voucher",
                      })
                    }
                  >
                    Cancelar solicitud
                  </button>
                )}
              </div>
            ))}
        </>
      )}
      {tab === "history" && (
        <>
          {data.lots
            .filter((l) => l.customerId === cid)
            .map((l) => (
              <div className="line-item" key={l.id}>
                <span>
                  {date(l.createdAt)} · {l.issued} puntos emitidos
                  <small>Vencimiento: {date(l.expires)}</small>
                </span>
                <b>{l.expired ? "Vencidos" : `${l.remaining} disponibles`}</b>
              </div>
            ))}
          {admin &&
            data.audit
              .filter((a) => a.target === cid)
              .slice(0, 20)
              .map((a) => (
                <small key={a.id}>
                  {date(a.at)} · {a.action}
                </small>
              ))}
        </>
      )}
      {action && (
        <section className="card soft">
          <h3>{action.title}</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              if (
                await cmd(action.type, {
                  ...f,
                  id: action.id,
                  customerId: cid,
                  points: Number(f.points),
                  blocked: c.status !== "blocked",
                  penalty: f.penalty === "on",
                })
              )
                setAction(null);
            }}
          >
            <Field label="Motivo">
              <textarea name="reason" required minLength={3} />
            </Field>
            {action.type === "points.adjust" && (
              <Field label="Puntos (positivo suma, negativo resta)">
                <input name="points" type="number" step="1" required />
              </Field>
            )}
            {action.type === "customer.block" && c.status !== "blocked" && (
              <label className="check">
                <input name="penalty" type="checkbox" />
                También quitar los {Math.max(0, c.points) +
                  c.pendingPoints}{" "}
                puntos disponibles y retenidos. Esta pérdida no se revierte al
                desbloquear.
              </label>
            )}
            <div className="row">
              <button className="primary">Confirmar</button>
              <button type="button" onClick={() => setAction(null)}>
                Volver
              </button>
            </div>
          </form>
        </section>
      )}
    </Modal>
  );
}
function Campaigns({ data, cmd }: { data: View; cmd: Command }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageTitle
        kicker="MÁS MOTIVOS PARA VOLVER"
        title="Campañas"
        subtitle="Programá puntos dobles o triples. Si coinciden, se aplica el mayor beneficio."
      >
        {data.actor.role === "admin" && (
          <button className="primary" onClick={() => setOpen(true)}>
            <Plus size={17} />
            Nueva campaña
          </button>
        )}
      </PageTitle>
      {data.campaigns.map((c) => (
        <section className="card" key={c.id}>
          <div className="row between">
            <h2>{c.name}</h2>
            <span className="pill">×{c.multiplier} puntos</span>
          </div>
          <p>{c.body}</p>
          <p className="muted">
            {date(c.from)} — {date(c.to)} ·{" "}
            {c.paused
              ? "Pausada"
              : c.to < data.now
                ? "Finalizada"
                : c.from > data.now
                  ? "Programada"
                  : "Activa"}
          </p>
          <button
            onClick={() =>
              void cmd("campaign.save", { ...c, paused: !c.paused })
            }
          >
            {c.paused ? "Reanudar" : "Pausar"}
          </button>
        </section>
      ))}
      {!data.campaigns.length && (
        <Empty>Todavía no hay campañas. Creá la primera cuando quieras.</Empty>
      )}
      {open && (
        <Modal title="Nueva campaña" close={() => setOpen(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              if (
                await cmd("campaign.save", {
                  ...f,
                  multiplier: Number(f.multiplier),
                  from: new Date(String(f.from)).toISOString(),
                  to: new Date(String(f.to)).toISOString(),
                })
              )
                setOpen(false);
            }}
          >
            <Field label="Nombre">
              <input name="name" required />
            </Field>
            <Field label="Beneficio">
              <select name="multiplier">
                <option value="2">Doble puntaje</option>
                <option value="3">Triple puntaje</option>
              </select>
            </Field>
            <div className="two-col">
              <Field label="Inicio (hora de esta computadora)">
                <input name="from" type="datetime-local" required />
              </Field>
              <Field label="Fin (hora de esta computadora)">
                <input name="to" type="datetime-local" required />
              </Field>
            </div>
            <Field label="Mensaje para las socias">
              <textarea name="body" required />
            </Field>
            <p className="note">
              Llega al portal de las cuentas activas. La copia por email respeta
              el consentimiento.
            </p>
            <button className="primary">Programar campaña</button>
          </form>
        </Modal>
      )}
    </>
  );
}
function Messages({ data, cmd }: { data: View; cmd: Command }) {
  const [open, setOpen] = useState(false);
  const grouped = new Map<string, View["messages"]>();
  for (const m of data.messages) {
    const key = m.title + "|" + m.createdAt;
    grouped.set(key, [...(grouped.get(key) || []), m]);
  }
  return (
    <>
      <PageTitle
        kicker="CONVERSACIONES QUE ACERCAN"
        title="Mensajes"
        subtitle="Novedades en el portal y seguimiento de lectura."
      >
        <button className="primary" onClick={() => setOpen(true)}>
          <Plus size={17} />
          Nuevo mensaje
        </button>
      </PageTitle>
      <div className="stats">
        <Stat
          title="Mensajes en el portal"
          value={data.messages.length}
          icon={<Mail />}
        />
        <Stat
          title="Lecturas confirmadas"
          value={data.messages.filter((m) => m.readAt).length}
          icon={<Check />}
        />
        <Stat
          title="Emails sin enviar"
          value={data.outbox.filter((o) => o.status !== "sent").length}
          icon={<Clock />}
        />
      </div>
      <MessageComposer cmd={cmd} />
      <section className="card">
        {[...grouped].reverse().map(([key, items]) => (
          <details key={key}>
            <summary>
              {items[0].title}{" "}
              <span className="muted">
                · Leído por {items.filter((m) => m.readAt).length} de{" "}
                {items.length}
              </span>
            </summary>
            <p>{items[0].body}</p>
            {items.map((m) => (
              <div className="line-item" key={m.id}>
                <span>
                  {data.customers.find((c) => c.id === m.customerId)?.name}
                </span>
                <small>
                  {m.readAt ? "Leído el " + date(m.readAt) : "Sin leer"}
                </small>
              </div>
            ))}
          </details>
        ))}
        {!grouped.size && <Empty>No hay mensajes enviados.</Empty>}
      </section>
      <section className="card">
        <h2>Cola de email</h2>
        {data.actor.role === "admin" && (
          <button
            onClick={async () => {
              const count = Number(
                prompt(
                  "Tamaño de la tanda (piloto recomendado: 10; máximo 50 por día)",
                  "10",
                ),
              );
              if (
                !count ||
                !confirm(
                  `Vas a enviar hasta ${count} invitaciones. ¿Confirmar?`,
                )
              )
                return;
              try {
                const r = await api("invite/batch", { count });
                alert(`${r.count} invitaciones en cola.`);
              } catch (e) {
                alert((e as Error).message);
              }
            }}
          >
            Invitar pendientes en tandas
          </button>
        )}
        <p className="muted">
          Estado de las copias por email. Los mensajes quedan disponibles en el
          portal aunque el envío falle.
        </p>
        {data.outbox
          .slice(-15)
          .reverse()
          .map((o) => (
            <div className="line-item" key={o.id}>
              <span>
                {o.subject}
                <small>
                  {o.to} · {o.attempts} intentos
                </small>
              </span>
              <Pill value={o.status} />
              {data.demo && (
                <select
                  aria-label="Simular estado de email"
                  value={o.status}
                  onChange={async (e) => {
                    await api("test/email-event", {
                      id: o.id,
                      status: e.target.value,
                    });
                    alert(
                      "Estado de prueba actualizado. Se verá al refrescar.",
                    );
                  }}
                >
                  <option value="pending">Pendiente</option>
                  <option value="sent">Simular enviado</option>
                  <option value="delivered">Simular entregado</option>
                  <option value="bounced">Simular rebote</option>
                  <option value="failed">Simular fallo</option>
                </select>
              )}
              {["failed", "bounced", "pending"].includes(o.status) && (
                <button onClick={() => void cmd("outbox.retry", { id: o.id })}>
                  Reintentar
                </button>
              )}
            </div>
          ))}
      </section>
      {open && (
        <Modal title="Nuevo mensaje" close={() => setOpen(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              if (await cmd("message.send", { ...f, email: f.email === "on" }))
                setOpen(false);
            }}
          >
            <Field label="Destinatarias">
              <select name="customerId">
                <option value="">Todas las socias activas</option>
                {data.customers
                  .filter((c) => c.status === "active")
                  .map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Título">
              <input name="title" required />
            </Field>
            <Field label="Mensaje">
              <textarea name="body" required />
            </Field>
            <label className="check">
              <input type="checkbox" name="email" />
              Enviar también por email a quienes dieron consentimiento.
            </label>
            <button className="primary">Enviar mensaje</button>
          </form>
        </Modal>
      )}
    </>
  );
}
function Import({
  data,
  refresh,
}: {
  data: View;
  refresh: () => Promise<void>;
}) {
  const [kind, setKind] = useState("master"),
    [base64, setBase64] = useState(""),
    [rows, setRows] = useState<any[]>([]),
    [selection, setSelection] = useState<Record<number, string>>({}),
    [fileDate, setFileDate] = useState(data.now.slice(0, 10)),
    [zero, setZero] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [name, setName] = useState("");
  async function preview(file: File) {
    setBusy(true);
    setRows([]);
    setError("");
    setName(file.name);
    try {
      if (file.size > 8e6) throw new Error("El máximo es 8 MB.");
      const b64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1]);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      setBase64(b64);
      const r = await api("import/preview", { base64: b64, kind });
      setRows(r.rows);
      setSelection(
        Object.fromEntries(
          r.rows
            .filter((x: any) => x.status === "ready")
            .map((x: any) => [x.row, x.customerId || "yes"]),
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        kicker="DATOS EN ORDEN"
        title="Importar Excel"
        subtitle="Primero revisás. Después confirmás. Nada se aplica automáticamente."
      />
      <section className="card">
        <details>
          <summary>Ver cómo preparar el Excel</summary>
          <p>
            Una sola hoja, títulos en la primera fila, sin celdas combinadas.
            Máximo 10.000 filas y 8 MB. Formatos .xlsx o .csv.
          </p>
          <p>
            {kind === "master"
              ? "Obligatorias: Apellido, Nombre, Email. Opcionales: Código de área, Celular, Cumpleaños (DD/MM), DNI, Cuenta corriente (Sí o No; vacío equivale a No). Ejemplo: Pérez, Ana, ana@example.invalid, 261, 5551234, 27/10, , No."
              : "Columnas: Cliente, Saldo, 15 dias, 30 dias, 60 dias, 90 dias, +90 dias. Solo actualiza clientas con cuenta corriente ya habilitada. El cruce es por nombre y apellido, sin tildes ni mayúsculas."}
          </p>
        </details>
        <button
          onClick={() => {
            const header =
              kind === "master"
                ? "Apellido,Nombre,Email,Código de área,Celular,Cumpleaños,DNI,Cuenta corriente"
                : "Cliente,Saldo,15 dias,30 dias,60 dias,90 dias,+90 dias";
            const a = document.createElement("a");
            a.href = URL.createObjectURL(
              new Blob(["\ufeff" + header + "\n"], {
                type: "text/csv;charset=utf-8",
              }),
            );
            a.download = "plantilla-" + kind + ".csv";
            a.click();
            URL.revokeObjectURL(a.href);
          }}
        >
          Descargar plantilla
        </button>
        <button
          onClick={async () => {
            if (
              !confirm(
                "¿Deshacer la última importación? Solo se permite si ninguna cuenta se activó ni tiene compras.",
              )
            )
              return;
            try {
              const r = await api("import/undo", {});
              setError(`Importación deshecha: ${r.count} clientas.`);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Deshacer última importación
        </button>
        <p>
          {rows.length} filas: {rows.filter((r) => r.status === "ready").length}{" "}
          listas, {rows.filter((r) => r.status !== "ready").length} para
          revisar.
        </p>
        <button
          onClick={() => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(
              new Blob(
                [
                  rows
                    .filter((r) => r.error)
                    .map((r) => `Fila ${r.row}: ${r.error}`)
                    .join("\n"),
                ],
                { type: "text/plain" },
              ),
            );
            a.download = "errores-importacion.txt";
            a.click();
            URL.revokeObjectURL(a.href);
          }}
        >
          Descargar errores
        </button>
      </section>
      <section className="card">
        <div className="two-col">
          <Field label="Tipo de planilla">
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setRows([]);
                setBase64("");
                setSelection({});
              }}
            >
              <option value="master">Maestro de clientas</option>
              <option value="balances">
                Saldos de cuenta corriente (Ninox)
              </option>
            </select>
          </Field>
          <Field label="Fecha de generación del archivo">
            <input
              type="date"
              value={fileDate}
              max={data.now.slice(0, 10)}
              onChange={(e) => setFileDate(e.target.value)}
            />
          </Field>
        </div>
        <label className="upload-zone">
          <Upload size={30} />
          <strong>
            {busy ? "Leyendo planilla…" : "Elegí tu archivo .xlsx o .csv"}
          </strong>
          <span>{name || "Hasta 8 MB · 10.000 filas"}</span>
          <input
            type="file"
            accept=".xlsx,.csv"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void preview(f);
              e.target.value = "";
            }}
          />
        </label>
        {error && (
          <p className="note warn" role="status">
            {error}
          </p>
        )}
      </section>
      {rows.length > 0 && (
        <section className="card">
          <header>
            <h2>Revisión de {rows.length} filas</h2>
            <span>{Object.keys(selection).length} seleccionadas</span>
          </header>
          <p className="muted">
            Las filas con errores del maestro deben corregirse en el Excel. Los
            nombres sin coincidencia de Ninox pueden asignarse manualmente. Las
            filas no seleccionadas se ignoran.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Incluir</th>
                  <th>Fila / nombre</th>
                  <th>Revisión</th>
                  {kind === "balances" && <th>Vincular a clienta</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.row}>
                    <td>
                      <input
                        aria-label={"Incluir fila " + r.row}
                        type="checkbox"
                        checked={r.row in selection}
                        disabled={
                          (kind === "master" && r.status !== "ready") ||
                          r.error?.includes("tramos")
                        }
                        onChange={(e) =>
                          setSelection((s) => {
                            const next = { ...s };
                            if (e.target.checked)
                              next[r.row] = r.customerId || "yes";
                            else delete next[r.row];
                            return next;
                          })
                        }
                      />
                    </td>
                    <td>
                      {r.row}. {r.name}
                      {r.blocked && (
                        <small className="red">Marcada BLOQUEADA</small>
                      )}
                    </td>
                    <td>{r.error || "Lista para importar"}</td>
                    {kind === "balances" && (
                      <td>
                        <select
                          aria-label={"Clienta para fila " + r.row}
                          value={selection[r.row] || r.customerId || ""}
                          onChange={(e) =>
                            setSelection((s) => ({
                              ...s,
                              [r.row]: e.target.value,
                            }))
                          }
                        >
                          <option value="">Elegir clienta</option>
                          {data.customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {kind === "balances" && (
            <CheckBox checked={zero} onChange={setZero}>
              Dejar en cero las cuentas que no estén entre las filas
              seleccionadas (revisá todas las coincidencias antes de activar
              esta opción).
            </CheckBox>
          )}
          <button
            className="primary"
            disabled={busy || !Object.keys(selection).length}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await api("import/confirm", {
                  base64,
                  kind,
                  fileDate,
                  zeroMissing: zero,
                  selection: Object.entries(selection).map(
                    ([row, customerId]) => ({
                      row: Number(row),
                      customerId: customerId === "yes" ? undefined : customerId,
                    }),
                  ),
                });
                setRows([]);
                setSelection({});
                setError(`${r.count} filas importadas correctamente.`);
                await refresh();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Confirmar importación de {Object.keys(selection).length} filas
          </button>
        </section>
      )}
    </>
  );
}
function Reports({ data }: { data: View }) {
  const [from, setFrom] = useState(data.now.slice(0, 7) + "-01"),
    [to, setTo] = useState(data.now.slice(0, 10));
  const purchases = data.purchases.filter(
    (p) =>
      p.createdAt.slice(0, 10) >= from &&
      p.createdAt.slice(0, 10) <= to &&
      p.status !== "annulled",
  );
  const vouchers = data.vouchers.filter(
    (v) =>
      v.status === "redeemed" &&
      v.redeemedAt &&
      v.redeemedAt.slice(0, 10) >= from &&
      v.redeemedAt.slice(0, 10) <= to,
  );
  const total = purchases.reduce((n, p) => n + p.paid, 0);
  const points = purchases.reduce((n, p) => n + p.points, 0);
  const circulation = data.customers.reduce(
    (n, c) => n + c.points + c.pendingPoints,
    0,
  );
  function csv() {
    const rows = [
      ["Fecha", "Ticket", "Clienta", "Importe", "Pagado", "Puntos", "Estado"],
      ...purchases.map((p) => [
        date(p.createdAt),
        p.ticket,
        data.customers.find((c) => c.id === p.customerId)?.name || "",
        p.amount,
        p.paid,
        p.points,
        labels[p.status],
      ]),
    ];
    const escape = (v: unknown) =>
      '"' +
      String(v)
        .replace(/^[=+@-]/, "'$&")
        .replaceAll('"', '""') +
      '"';
    const blob = new Blob(
      ["\uFEFF" + rows.map((row) => row.map(escape).join(";")).join("\r\n")],
      { type: "text/csv;charset=utf-8;" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `morowa-compras-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <>
      <PageTitle
        kicker="UNA MIRADA AL CLUB"
        title="Reporte de actividad"
        subtitle="Ventas y beneficios del período seleccionado."
      >
        <div className="row no-print">
          <button onClick={csv}>
            <Download size={17} />
            Exportar CSV
          </button>
          <button onClick={() => window.print()}>Imprimir A4</button>
        </div>
      </PageTitle>
      <div className="toolbar no-print">
        <Field label="Desde">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label="Hasta">
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
      </div>
      <div className="stats">
        <Stat
          title="Ventas registradas"
          value={purchases.length}
          icon={<ShoppingBag />}
        />
        <Stat title="Total pagado" value={cash(total)} icon={<BarChart3 />} />
        <Stat title="Puntos emitidos" value={points} icon={<Heart />} />
        <Stat
          title="Vouchers utilizados"
          value={vouchers.length}
          icon={<Ticket />}
        />
      </div>
      <div className="two-col">
        <section className="card">
          <h2>El Club hoy</h2>
          <div className="line-item">
            <span>Socias activas</span>
            <b>{data.customers.filter((c) => c.status === "active").length}</b>
          </div>
          <div className="line-item">
            <span>Puntos en circulación (incluye retenidos)</span>
            <b>{circulation}</b>
          </div>
          <div className="line-item">
            <span>Descuento potencial estimado</span>
            <b>{cash(circulation * 25)}</b>
          </div>
          <small className="muted">
            Estimación con relación inicial de $25 por punto; no es deuda
            contable ni se convierte en efectivo.
          </small>
          <div className="line-item">
            <span>Costo de vouchers en el período</span>
            <b>{cash(vouchers.reduce((n, v) => n + v.amount, 0))}</b>
          </div>
        </section>
        <section className="card">
          <h2>Lectura de mensajes</h2>
          <div
            className="report-donut"
            style={
              {
                "--percent": `${data.messages.length ? (data.messages.filter((m) => m.readAt).length / data.messages.length) * 100 : 0}%`,
              } as React.CSSProperties
            }
          >
            <div>
              <b>
                {data.messages.length
                  ? Math.round(
                      (data.messages.filter((m) => m.readAt).length /
                        data.messages.length) *
                        100,
                    )
                  : 0}
                %
              </b>
              <small>leídos</small>
            </div>
          </div>
          <p className="center muted">
            {data.messages.filter((m) => m.readAt).length} de{" "}
            {data.messages.length} mensajes con lectura confirmada.
          </p>
        </section>
      </div>
      <section className="card soft">
        <h2>Para seguir mejorando</h2>
        <p>
          Revisá las solicitudes que llevan más de 7 días, mantené actualizadas
          las cuentas y acompañá a las clientas que todavía no aceptaron las
          bases.
        </p>
        <p className="muted">
          La comparación de frecuencia antes y después del alta requiere
          importar un histórico previo de compras; no se estima con datos
          inexistentes.
        </p>
      </section>
    </>
  );
}
function Configuration({ data, cmd }: { data: View; cmd: Command }) {
  const [cfg, setCfg] = useState<Config>(() =>
      structuredClone(data.config as Config),
    ),
    [notice, setNotice] = useState("");
  const update = (key: keyof Config, value: any) =>
    setCfg((c) => ({ ...c, [key]: value }));
  return (
    <>
      <PageTitle
        kicker="LAS REGLAS DEL CLUB"
        title="Configuración"
        subtitle="Los cambios de vigencia y regalos afectan a las nuevas emisiones."
      />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            confirm("¿Guardar los cambios de configuración?") &&
            (await cmd("config.save", cfg))
          )
            setNotice("Configuración guardada.");
        }}
      >
        <div className="note">
          Los cambios aplican desde ahora. Los vouchers ya emitidos o
          solicitados conservan sus condiciones.
        </div>
        <p>
          {JSON.stringify(cfg) !== JSON.stringify(data.config)
            ? "Hay cambios sin guardar."
            : "Configuración guardada."}
        </p>
        <section className="card">
          <h2>Puntos y plazos</h2>
          <p>
            Redondeo: con 1 punto por $1.000 y redondeo cercano, $149.500 dan
            150 puntos. El saldo de cuenta corriente se considera desactualizado
            a los 7 días desde su última importación.
          </p>
          <Field label="Máximo de vouchers por clienta por día">
            <input
              type="number"
              min="1"
              value={cfg.dailyVoucherLimit ?? 1}
              onChange={(e) =>
                update("dailyVoucherLimit", Number(e.target.value))
              }
            />
          </Field>
          <div className="three-col">
            {(
              [
                ["per1000", "Puntos por $1.000"],
                ["expiryMonths", "Vigencia de puntos (meses)"],
                ["warnDays", "Aviso de vencimiento (días)"],
                ["requestDays", "Plazo para usar un voucher solicitado (días)"],
                ["annulDays", "Plazo de anulación (días)"],
                [
                  "staleDays",
                  "Vigencia del saldo desde su actualización (días)",
                ],
                ["reinviteDays", "Espera entre invitaciones (días)"],
              ] as const
            ).map(([k, l]) => (
              <Field key={k} label={l}>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={cfg[k]}
                  onChange={(e) => update(k, Number(e.target.value))}
                />
              </Field>
            ))}
            <Field label="Redondeo">
              <select
                value={cfg.rounding}
                onChange={(e) => update("rounding", e.target.value)}
              >
                <option value="near">Al más cercano</option>
                <option value="down">Hacia abajo</option>
                <option value="up">Hacia arriba</option>
              </select>
            </Field>
            <Field label="Puntos de venta (separados por coma)">
              <input
                value={cfg.pdv.join(",")}
                onChange={(e) =>
                  update(
                    "pdv",
                    e.target.value.split(",").map((s) => s.trim()),
                  )
                }
              />
            </Field>
          </div>
        </section>
        <section className="card">
          <header>
            <h2>Catálogo de vouchers</h2>
            <button
              type="button"
              onClick={() =>
                update("catalog", [
                  ...cfg.catalog,
                  { amount: 5000, points: 200, min: 50000 },
                ])
              }
            >
              <Plus size={16} />
              Agregar
            </button>
          </header>
          {cfg.catalog.map((v, i) => (
            <div className="toolbar" key={i}>
              {(
                [
                  ["amount", "Valor del voucher ($)"],
                  ["points", "Costo en puntos"],
                  ["min", "Compra mínima ($)"],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <input
                    type="number"
                    min="1"
                    value={v[key]}
                    onChange={(e) =>
                      update(
                        "catalog",
                        cfg.catalog.map((x, j) =>
                          i === j ? { ...x, [key]: Number(e.target.value) } : x,
                        ),
                      )
                    }
                  />
                </Field>
              ))}
              <small>
                {(((v.amount * cfg.per1000) / (v.points * 1000)) * 100).toFixed(
                  2,
                )}
                % de devolución ·{" "}
                {v.enabled === false ? "Desactivado" : "Activo"}
              </small>
              <button
                type="button"
                aria-label="Activar o desactivar voucher del catálogo"
                onClick={() =>
                  update(
                    "catalog",
                    cfg.catalog.map((x, j) =>
                      j === i ? { ...x, enabled: x.enabled === false } : x,
                    ),
                  )
                }
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </section>
        <div className="two-col">
          {(["welcome", "birthday"] as const).map((k) => (
            <section className="card" key={k}>
              <h2>
                {k === "welcome"
                  ? "Regalo de bienvenida"
                  : "Regalo de cumpleaños"}
              </h2>
              {(
                [
                  ["amount", "Monto ($)"],
                  ["min", "Compra mínima ($)"],
                  ["days", "Vigencia (días)"],
                ] as const
              ).map(([key, label]) => (
                <Field label={label} key={key}>
                  <input
                    type="number"
                    min="1"
                    value={cfg[k][key]}
                    onChange={(e) =>
                      update(k, { ...cfg[k], [key]: Number(e.target.value) })
                    }
                  />
                </Field>
              ))}
            </section>
          ))}
        </div>
        <section className="card">
          <h2>Textos del Club</h2>
          <p>
            Entorno de prueba: no son textos legales aprobados. {"{min}"}:
            compra mínima; {"{dias}"}: vigencia; {"{bmin}"}: mínimo del regalo
            de cumpleaños.
          </p>
          <Field label="Política de privacidad">
            <textarea
              rows={8}
              value={cfg.privacy || ""}
              onChange={(e) => update("privacy", e.target.value)}
            />
          </Field>
          <Field label="Condiciones del canje ({min}, {dias}, {bmin})">
            <textarea
              value={cfg.conditions}
              onChange={(e) => update("conditions", e.target.value)}
              rows={5}
            />
          </Field>
          <Field label="Bases y condiciones">
            <textarea
              value={cfg.terms}
              onChange={(e) => update("terms", e.target.value)}
              rows={6}
            />
          </Field>
        </section>
        <section className="card">
          <h2>Mensajes automáticos</h2>
          <Field label="Avisar antes de vencer un voucher (días)">
            <input
              type="number"
              min="1"
              value={cfg.voucherWarnDays ?? 3}
              onChange={(e) =>
                update("voucherWarnDays", Number(e.target.value))
              }
            />
          </Field>
          <Field label="Hora de cumpleaños (Argentina)">
            <input
              type="number"
              min="0"
              max="23"
              value={cfg.birthdayHour ?? 9}
              onChange={(e) => update("birthdayHour", Number(e.target.value))}
            />
          </Field>
          <CheckBox
            checked={!!cfg.secondExpiryReminder}
            onChange={(v) => update("secondExpiryReminder", v)}
          >
            Segundo recordatorio de puntos a los 7 días
          </CheckBox>
          {Object.entries(cfg.templates).map(([k, t]) => (
            <details key={k}>
              <summary>{labels[k] || k}</summary>
              <p>
                Cuándo se envía:{" "}
                {k === "invite"
                  ? "Solo cuando el equipo lo solicita"
                  : k === "welcome"
                    ? "Al activar la cuenta"
                    : k === "birthday"
                      ? "El día del cumpleaños, una vez por año"
                      : k === "expiry"
                        ? `Cuando faltan ${cfg.warnDays} días para vencer los puntos`
                        : k === "voucherExpiry"
                          ? `Cuando faltan ${cfg.voucherWarnDays ?? 3} días para vencer el voucher`
                          : k === "recovery"
                            ? "Cuando la persona solicita recuperar su contraseña"
                            : "Cuando el equipo resuelve un ticket"}
                .
              </p>
              <Field label="Canal">
                <select
                  value={t.channel || "both"}
                  onChange={(e) =>
                    update("templates", {
                      ...cfg.templates,
                      [k]: { ...t, channel: e.target.value },
                    })
                  }
                >
                  <option value="both">Portal y email</option>
                  <option value="portal">Portal</option>
                  <option value="email">Email (con copia en portal)</option>
                </select>
              </Field>
              <div className="row">
                {[
                  "{nombre}",
                  "{monto}",
                  "{minima}",
                  "{dias}",
                  "{fecha}",
                  "{puntos}",
                ].map((v) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() =>
                      update("templates", {
                        ...cfg.templates,
                        [k]: { ...t, body: t.body + " " + v },
                      })
                    }
                  >
                    {v}
                  </button>
                ))}
              </div>
              <details>
                <summary>Vista previa</summary>
                <p>
                  {t.body
                    .replaceAll("{nombre}", "Ana")
                    .replaceAll("{monto}", "$5.000")
                    .replaceAll("{minima}", "$50.000")
                    .replaceAll("{dias}", "30")}
                </p>
              </details>
              <p>
                {data.messages.filter((m) => m.tag === k).length} mensajes en el
                portal · Último:{" "}
                {date(
                  data.messages.filter((m) => m.tag === k).at(-1)?.createdAt,
                )}
              </p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const r = await api("templates/test", { key: k });
                    setNotice(r.message);
                  } catch (e) {
                    setNotice((e as Error).message);
                  }
                }}
              >
                Enviarme una prueba
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (confirm("¿Restaurar el texto original?")) {
                    await api("templates/reset", { key: k });
                    setNotice(
                      "Texto restaurado. Volvé a abrir Configuración para cargarlo.",
                    );
                  }
                }}
              >
                Restaurar texto original
              </button>
              <div className="stack">
                <CheckBox
                  checked={t.enabled}
                  onChange={(v) =>
                    update("templates", {
                      ...cfg.templates,
                      [k]: { ...t, enabled: v },
                    })
                  }
                >
                  Mensaje habilitado
                </CheckBox>
                <Field label="Título">
                  <input
                    value={t.title}
                    onChange={(e) =>
                      update("templates", {
                        ...cfg.templates,
                        [k]: { ...t, title: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field label="Texto">
                  <textarea
                    rows={4}
                    value={t.body}
                    onChange={(e) =>
                      update("templates", {
                        ...cfg.templates,
                        [k]: { ...t, body: e.target.value },
                      })
                    }
                  />
                </Field>
              </div>
            </details>
          ))}
        </section>
        {notice && <div className="note good">{notice}</div>}
        <button
          className="primary"
          style={{ position: "sticky", bottom: 16, zIndex: 2 }}
        >
          Guardar configuración
        </button>
      </form>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
