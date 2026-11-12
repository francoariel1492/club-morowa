import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  Module,
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  Query,
  HttpException,
} from "@nestjs/common";
import { Request, Response, json, static as serveStatic } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { hash, compare } from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { deliver, mailConfigured, requireMail } from "./mail";
import { bootstrap } from "./bootstrap";
import { Store } from "./store";
import {
  Actor,
  State,
  User,
  id,
  ensure,
  digits,
  days,
  audit,
  execute,
  publicView,
  daily,
  newCustomer,
  gift,
} from "./domain";
import { parseWorkbook, applyImport } from "./imports";
const store = new Store();
const digest = (v: string) => createHash("sha256").update(v).digest("hex");
const now = () => new Date().toISOString();
const webOrigin = () =>
  process.env.WEB_ORIGIN ||
  process.env.RENDER_EXTERNAL_URL ||
  "http://localhost:5173";
function actor(s: State, req: Request, allowSetup = false): Actor {
  const session = s.sessions.find(
    (t) =>
      t.id === digest(req.cookies?.morowa_session || "") && t.expires > now(),
  );
  const u = s.users.find((u) => u.id === session?.userId);
  if (!u) throw new HttpException("Iniciá sesión para continuar.", 401);
  if (u.mustChange && !allowSetup)
    throw new HttpException("Completá el primer ingreso.", 403);
  return { id: u.id, role: u.role, customerId: u.customerId };
}
function cookie(res: Response, value: string) {
  res.cookie("morowa_session", value, {
    httpOnly: true,
    secure:
      process.env.COOKIE_SECURE === "true" ||
      process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 3600000,
    path: "/",
  });
}
async function credentials(s: State, cid: string, password?: string) {
  const c = s.customers.find((c) => c.id === cid)!;
  if (!s.users.some((u) => u.customerId === cid))
    s.users.push({
      id: id(),
      login: c.dni,
      customerId: cid,
      role: "customer",
      passwordHash: await hash(password || c.dni, 12),
      mustChange: true,
      createdAt: now(),
      failures: 0,
    });
}
async function invitation(s: State, u: User, reset = false) {
  requireMail();
  const c = s.customers.find((c) => c.id === u.customerId);
  const recipient = c?.email || (u.role !== "customer" ? u.login : undefined);
  ensure(recipient, "La cuenta necesita un email registrado.");
  if (!reset)
    ensure(
      !u.lastInvite || days(u.lastInvite, s.config.reinviteDays) <= now(),
      "Todavía no pasaron los días para reenviar la invitación.",
    );
  const raw = randomBytes(32).toString("hex");
  u.tokenHash = digest(raw);
  u.tokenExpires = days(now(), 2);
  u.lastInvite = now();
  u.inviteCount = (u.inviteCount || 0) + 1;
  const link = webOrigin() + "/#activar/" + raw;
  s.outbox.push({
    id: id(),
    to: recipient,
    subject: reset
      ? "Recuperá tu acceso a Club Morowa"
      : s.config.templates.invite.title,
    text: reset
      ? `Para crear una nueva contraseña, entrá a ${link}. Vence en 48 horas.`
      : s.config.templates.invite.body.replace("{link}", link),
    status: "pending",
    attempts: 0,
    createdAt: now(),
  });
}
const limiter = new Map<string, { count: number; until: number }>();
function rate(req: Request) {
  const key = req.ip || "local";
  const entry = limiter.get(key);
  if (entry && entry.until > Date.now()) {
    if (++entry.count > 30)
      throw new HttpException("Demasiados intentos. Probá en 15 minutos.", 429);
  } else limiter.set(key, { count: 1, until: Date.now() + 900000 });
  if (limiter.size > 10000)
    for (const [k, v] of limiter) if (v.until < Date.now()) limiter.delete(k);
}
@Controller("api")
class Api {
  @Get("health") health() {
    return { ok: true, service: "Club Morowa" };
  }
  @Get("session") session(@Req() req: Request) {
    return store.tx((s) => {
      const a = actor(s, req, true);
      const u = s.users.find((u) => u.id === a.id)!;
      return { actor: a, mustChange: u.mustChange, terms: s.config.terms };
    });
  }
  @Post("login") async login(
    @Body() b: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    rate(req);
    const result = await store.tx(async (s) => {
      const login = String(b.login || "").includes("@")
        ? String(b.login).toLowerCase()
        : digits(b.login);
      const u = s.users.find((u) => u.login === login);
      const failure = {
        error: "Datos incorrectos o acceso temporalmente no disponible.",
      };
      if (!u || (u.lockedUntil && u.lockedUntil > now())) return failure;
      const c = s.customers.find((c) => c.id === u.customerId);
      if (c && ["approval", "rejected"].includes(c.status)) return failure;
      if (u.mustChange && days(u.createdAt, 30) < now())
        return {
          error: "Tu clave inicial venció. Solicitá un enlace de recuperación.",
        };
      if (!(await compare(String(b.password || ""), u.passwordHash))) {
        u.failures++;
        if (u.failures >= 5) {
          u.lockedUntil = days(now(), 15 / 1440);
          u.failures = 0;
        }
        return failure;
      }
      u.failures = 0;
      const raw = randomBytes(32).toString("hex");
      s.sessions.push({
        id: digest(raw),
        userId: u.id,
        expires: days(now(), 8 / 24),
      });
      return {
        raw,
        actor: { id: u.id, role: u.role, customerId: u.customerId },
        mustChange: u.mustChange,
        terms: s.config.terms,
      };
    });
    if ("error" in result) throw new HttpException(result.error!, 401);
    cookie(res, result.raw);
    const { raw, ...safe } = result;
    return safe;
  }
  @Post("logout") logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie("morowa_session", { path: "/" });
    return store.tx((s) => {
      s.sessions = s.sessions.filter(
        (t) => t.id !== digest(req.cookies?.morowa_session || ""),
      );
      return { ok: true };
    });
  }
  @Post("register") register(@Body() b: any, @Req() req: Request) {
    rate(req);
    return store.tx(async (s) => {
      ensure(
        typeof b.password === "string" &&
          b.password.length >= 8 &&
          b.password.length <= 72 &&
          b.password !== digits(b.dni),
        "Elegí una contraseña de entre 8 y 72 caracteres, distinta de tu DNI.",
      );
      ensure(
        b.accepted === true,
        "Aceptá las bases para solicitar el registro.",
      );
      const c = newCustomer(s, b, now(), "approval");
      await credentials(s, c.id, b.password);
      audit(
        s,
        { id: "public", role: "customer" },
        "registration.requested",
        c.id,
        { accepted: true },
        now(),
      );
      return { ok: true };
    });
  }
  @Post("recover") recover(@Body() b: any, @Req() req: Request) {
    rate(req);
    if (!mailConfigured())
      throw new HttpException(
        "La recuperación por email todavía no está habilitada. Contactá al administrador para configurar el envío.",
        503,
      );
    return store.tx(async (s) => {
      const lookup = String(b.login || b.dni || "").trim();
      const login = lookup.includes("@")
        ? lookup.toLowerCase()
        : digits(lookup);
      const u = s.users.find((u) => u.login === login);
      if (u && (!u.lastInvite || days(u.lastInvite, 1 / 24) < now())) {
        const c = s.customers.find((c) => c.id === u.customerId);
        if (
          u.role !== "customer" ||
          (c?.email && ["pending", "active", "blocked"].includes(c.status))
        )
          await invitation(s, u, true);
      }
      return {
        ok: true,
        message: "Si hay una cuenta habilitada con email, recibirá un enlace.",
      };
    });
  }
  @Post("activate") activate(
    @Body() b: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    rate(req);
    return store.tx(async (s) => {
      const u = s.users.find(
        (u) =>
          u.tokenHash === digest(String(b.token)) && u.tokenExpires! > now(),
      );
      ensure(u, "El enlace venció o ya fue utilizado.");
      ensure(
        String(b.password || "").length >= 8,
        "La contraseña necesita al menos 8 caracteres.",
      );
      u.passwordHash = await hash(b.password, 12);
      u.tokenHash = undefined;
      u.tokenExpires = undefined;
      s.sessions = s.sessions.filter((t) => t.userId !== u.id);
      const raw = randomBytes(32).toString("hex");
      s.sessions.push({
        id: digest(raw),
        userId: u.id,
        expires: days(now(), 8 / 24),
      });
      cookie(res, raw);
      return {
        actor: { id: u.id, role: u.role, customerId: u.customerId },
        mustChange: u.mustChange,
        terms: s.config.terms,
      };
    });
  }
  @Post("onboard") onboard(@Body() b: any, @Req() req: Request) {
    return store.tx(async (s) => {
      const a = actor(s, req, true),
        u = s.users.find((u) => u.id === a.id)!,
        c = s.customers.find((c) => c.id === a.customerId);
      ensure(
        u.mustChange && c?.status === "pending",
        "El primer ingreso ya está completo.",
      );
      ensure(
        b.accepted === true &&
          String(b.password || "").length >= 8 &&
          b.password !== c.dni,
        "Aceptá las bases y elegí una nueva contraseña de al menos 8 caracteres.",
      );
      ensure(
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email),
        "Ingresá un email válido.",
      );
      u.passwordHash = await hash(b.password, 12);
      u.mustChange = false;
      c.email = b.email;
      c.emailConsent = b.emailConsent === true;
      c.whatsappConsent = b.whatsappConsent === true;
      c.status = "active";
      c.acceptedAt = now();
      gift(s, c, "welcome", now());
      audit(
        s,
        a,
        "terms.accepted",
        c.id,
        {
          emailConsent: c.emailConsent,
          whatsappConsent: c.whatsappConsent,
          terms: s.config.terms,
        },
        now(),
      );
      return { ok: true };
    });
  }
  @Get("state") state(@Req() req: Request) {
    return store.tx((s) => {
      const a = actor(s, req);
      daily(s, now());
      return {
        ...publicView(s, a, now()),
        shopWhatsapp: process.env.SHOP_WHATSAPP || "",
        demo: store.demo,
      };
    });
  }
  @Get("customers/search") search(@Query("q") q: string, @Req() req: Request) {
    return store.tx((s) => {
      ensure(actor(s, req).role !== "customer", "Sin permiso.");
      const term = String(q || "")
        .trim()
        .toLowerCase();
      ensure(term.length >= 3, "Ingresá al menos tres caracteres.");
      return s.customers
        .filter(
          (c) =>
            c.name.toLowerCase().includes(term) ||
            (digits(term).length >= 3 &&
              (c.dni.includes(digits(term)) || c.phone.includes(digits(term)))),
        )
        .map((c) => c.id);
    });
  }
  @Post("command") command(@Body() b: any, @Req() req: Request) {
    return store.tx(async (s) => {
      const a = actor(s, req);
      daily(s, now());
      const result = execute(s, a, b.action, b.input || {}, now());
      if (b.action === "customer.create") await credentials(s, result.id);
      if (b.action === "registration.approve")
        await credentials(s, b.input.customerId);
      return result;
    });
  }
  @Post("invite") invite(@Body() b: any, @Req() req: Request) {
    return store.tx(async (s) => {
      const a = actor(s, req);
      ensure(a.role !== "customer", "Sin permiso.");
      const u = s.users.find((u) => u.customerId === b.customerId);
      ensure(u, "Cuenta inexistente.");
      await invitation(s, u, b.reset === true);
      audit(
        s,
        a,
        b.reset ? "password.reset_requested" : "invitation.sent",
        b.customerId,
        {},
        now(),
      );
      return { ok: true };
    });
  }
  @Post("import/preview") preview(@Body() b: any, @Req() req: Request) {
    return store.tx(async (s) => {
      ensure(actor(s, req).role === "admin", "Solo administradora.");
      return { rows: await parseWorkbook(b.base64, b.kind, s) };
    });
  }
  @Post("import/confirm") importConfirm(@Body() b: any, @Req() req: Request) {
    return store.tx(async (s) => {
      const a = actor(s, req);
      ensure(a.role === "admin", "Solo administradora.");
      const rows = await parseWorkbook(b.base64, b.kind, s);
      const result = applyImport(
        s,
        a,
        rows,
        b.kind,
        b.selection,
        b.fileDate,
        b.zeroMissing === true,
        now(),
      );
      for (const c of s.customers.filter((c) => c.status === "pending"))
        await credentials(s, c.id);
      return result;
    });
  }
  @Post("jobs/run") jobs(@Req() req: Request) {
    return store.tx((s) => {
      ensure(actor(s, req).role === "admin", "Solo administradora.");
      daily(s, now());
      return { ok: true };
    });
  }
}
@Module({ controllers: [Api] })
class AppModule {}
async function main() {
  await store.init();
  await bootstrap(store);
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  if (process.env.NODE_ENV === "production")
    app.getHttpAdapter().getInstance().set("trust proxy", 1);
  app.use(json({ limit: "12mb" }));
  app.use(helmet());
  app.use(cookieParser());
  const origins = new Set([
    webOrigin(),
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    ...(process.env.EXTRA_WEB_ORIGINS || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
  ]);
  app.enableCors({
    origin: (origin, cb) => cb(null, !origin || origins.has(origin)),
    credentials: true,
  });
  app.use((req: Request, res: Response, next: () => void) => {
    if (
      req.method === "POST" &&
      (!req.headers.origin || !origins.has(req.headers.origin))
    ) {
      res.status(403).json({ message: "Origen no autorizado." });
      return;
    }
    next();
  });
  app.useGlobalFilters({
    catch(e: any, host: any) {
      const res = host.switchToHttp().getResponse() as Response;
      res.status(e instanceof HttpException ? e.getStatus() : 400).json({
        message:
          e instanceof Error ? e.message : "No se pudo completar la operación.",
      });
    },
  });
  const webDist = resolve(__dirname, "../../web/dist");
  if (process.env.SERVE_WEB === "true" && existsSync(webDist)) {
    app.use(serveStatic(webDist));
  }
  await app.listen(
    Number(process.env.PORT || 3001),
    process.env.HOST ||
      (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1"),
  );
  console.log("API Morowa en http://127.0.0.1:3001");
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await store.tx(async (s) => {
        daily(s, now());
        if (store.demo || !mailConfigured()) return;
        for (const item of s.outbox
          .filter(
            (x) =>
              x.status !== "sent" &&
              x.attempts < 5 &&
              (!x.nextAttempt || x.nextAttempt <= now()),
          )
          .slice(0, 10)) {
          try {
            item.providerId = await deliver(item);
            item.status = "sent";
          } catch (e) {
            item.status = "failed";
            item.error =
              e instanceof Error ? e.message : "Error del proveedor de email";
            item.nextAttempt = days(now(), 5 / 1440);
          }
          item.attempts++;
        }
      });
    } catch (e) {
      console.error("Tarea programada falló:", e);
    } finally {
      running = false;
    }
  }, 60000);
  const close = async () => {
    clearInterval(timer);
    await app.close();
    await store.close();
    process.exit(0);
  };
  process.on("SIGTERM", close);
  process.on("SIGINT", close);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
