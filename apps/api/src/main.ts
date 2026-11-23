import { migrateClientChanges, CLIENT_CHANGES_MIGRATION } from "./migration";
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
import {
  mailConfigured,
  processMailQueue,
  queueAccessEmail,
  requireMail,
  testMailRecipient,
} from "./mail";
import { customerForEmail } from "./identity";
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
  defaultConfig,
  activateCustomer,
  normalized,
  notify,
} from "./domain";
import ExcelJS from "exceljs";
import { reportRows } from "./reports";
import { extensionCommand } from "./extensions";
import {
  emailKey,
  personName,
  birthdayInput,
  argentinaPhone,
  acceptTerms,
} from "./identity";
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
  if (session?.lastActive && days(session.lastActive, 30 / 1440) < now())
    throw new HttpException(
      "Tu sesión venció por inactividad. Volvé a ingresar.",
      401,
    );
  if (!u || u.disabled)
    throw new HttpException("Iniciá sesión para continuar.", 401);
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
      login: c.email.toLowerCase(),
      customerId: cid,
      role: "customer",
      passwordHash: await hash(password || randomBytes(32).toString("hex"), 12),
      mustChange: true,
      createdAt: now(),
      failures: 0,
    });
}
async function invitation(s: State, u: User, reset = false, copyOnly = false) {
  const c = s.customers.find((c) => c.id === u.customerId);
  ensure(
    !u.disabled && (!c || ["pending", "active", "blocked"].includes(c.status)),
    "La cuenta aún no está aprobada.",
  );
  ensure(
    !u.lastInvite || days(u.lastInvite, 1 / 1440) <= now(),
    "Esperá un minuto antes de generar otro enlace.",
  );
  const raw = randomBytes(32).toString("hex");
  u.tokenHash = digest(raw);
  u.tokenExpires = days(now(), 4 / 24);
  u.lastInvite = now();
  u.inviteCount = (u.inviteCount || 0) + 1;
  const link = webOrigin() + "/#activar/" + raw;
  if (!copyOnly) {
    const subject =
      reset && c?.status !== "pending"
        ? "Recuperá tu acceso a Club Morowa"
        : "Sumarme al Club Morowa";
    const body = `Creá tu contraseña y completá tu cuenta: ${link}. Este enlace vence en 4 horas y se puede usar una sola vez. Revisá spam o promociones.`;
    queueAccessEmail(s, c?.email || u.login, subject, body, now());
  }
  return link;
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
    return {
      ok: true,
      service: "Club Morowa",
      revision: process.env.RENDER_GIT_COMMIT?.slice(0, 12) || "local",
    };
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
      const login = emailKey(b.login || b.email);
      const customer = customerForEmail(s, login);
      const matches = s.users.filter((u) =>
        u.role === "customer"
          ? u.customerId === customer?.id
          : u.login.toLowerCase() === login,
      );
      const u =
        matches.length === 1 && login.includes("@") ? matches[0] : undefined;
      const failure = {
        error: "Datos incorrectos o acceso temporalmente no disponible.",
      };
      if (!u || u.disabled || (u.lockedUntil && u.lockedUntil > now()))
        return failure;
      const c = s.customers.find((c) => c.id === u.customerId);
      if (!(await compare(String(b.password || ""), u.passwordHash))) {
        u.failures++;
        if (u.failures >= 5) {
          u.lockedUntil = days(now(), 15 / 1440);
          u.failures = 0;
        }
        return failure;
      }
      if (c?.status === "approval")
        return {
          error: "Tu solicitud está en revisión, te avisamos por mail.",
        };
      if (c?.status === "rejected") return failure;
      if (c?.status === "pending" || u.mustChange)
        return {
          error:
            "Activá tu cuenta desde el enlace de invitación. Podés solicitarlo en Olvidé mi contraseña.",
        };
      u.failures = 0;
      const raw = randomBytes(32).toString("hex");
      s.sessions.push({
        id: digest(raw),
        userId: u.id,
        expires: days(now(), 8 / 24),
        lastActive: now(),
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
  @Post("activity") activity(@Req() req: Request) {
    return store.tx((s) => {
      actor(s, req, true);
      const t = s.sessions.find(
        (t) => t.id === digest(req.cookies?.morowa_session || ""),
      );
      if (t) t.lastActive = now();
      return { ok: true };
    });
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
  @Get("public-config") publicConfig() {
    return store.tx((s) => ({
      terms: s.config.terms,
      privacy:
        s.config.privacy || "Política de prueba pendiente de aprobación.",
      termsVersion: s.config.termsVersion,
      privacyVersion: s.config.privacyVersion,
    }));
  }
  @Post("register") register(@Body() b: any, @Req() req: Request) {
    rate(req);
    return store.tx(async (s) => {
      const email = emailKey(b.email);
      const existing = customerForEmail(s, email);
      if (existing) {
        if (existing.status === "pending") {
          await credentials(s, existing.id);
          const u = s.users.find((u) => u.customerId === existing.id)!;
          if (!u.lastInvite || days(u.lastInvite, 1 / 1440) <= now())
            await invitation(s, u);
          return { message: "Ya estás en el Club, revisá tu mail." };
        }
        return {
          message:
            existing.status === "active"
              ? "Ya tenés cuenta, ingresá."
              : "Tu solicitud está en revisión, te avisamos por mail.",
        };
      }
      const firstName = personName(b.firstName),
        lastName = personName(b.lastName);
      ensure(
        firstName.length >= 2 && lastName.length >= 2,
        "Completá nombre y apellido.",
      );
      ensure(
        typeof b.password === "string" &&
          b.password.length >= 8 &&
          Buffer.byteLength(b.password) <= 72,
        "La contraseña necesita al menos 8 caracteres y hasta 72 bytes.",
      );
      const phone = argentinaPhone(b.area, b.phone),
        birthday = birthdayInput(b.birthday);
      const c = newCustomer(
        s,
        {
          name: lastName + ", " + firstName,
          firstName,
          lastName,
          email,
          phone,
          birthday,
        },
        now(),
        "approval",
      );
      acceptTerms(s, c, b, now());
      await credentials(s, c.id, b.password);
      const u = s.users.find((u) => u.customerId === c.id)!;
      u.mustChange = false;
      audit(
        s,
        { id: "public", role: "customer" },
        "registration.requested",
        c.id,
        { termsVersion: c.termsVersion, privacyVersion: c.privacyVersion },
        now(),
      );
      notify(
        s,
        c,
        "Recibimos tu solicitud al Club Morowa",
        `Hola ${c.firstName}, recibimos tu solicitud. El equipo la revisará y te avisaremos por email cuando esté aprobada. Todavía no necesitás activar nada: después podrás ingresar con el email y la contraseña que elegiste.`,
        "service",
        now(),
      );
      for (const admin of s.users.filter(
        (u) => u.role === "admin" && !u.disabled,
      ))
        s.outbox.push({
          id: id(),
          to: admin.login,
          subject: "Nueva solicitud de registro",
          text: `${c.name} solicitó ingresar al Club. Revisala en Pendientes.`,
          status: "pending",
          attempts: 0,
          createdAt: now(),
        });
      return {
        message:
          "¡Gracias por sumarte! Revisamos tu solicitud y te avisamos por mail. Si no lo ves, revisá spam o promociones.",
      };
    });
  }
  @Post("recover") recover(@Body() b: any, @Req() req: Request) {
    rate(req);
    if (!store.demo) requireMail();
    return store.tx(async (s) => {
      const email = emailKey(b.email || b.login),
        c = customerForEmail(s, email);
      if (c) await credentials(s, c.id);
      const u = s.users.find((u) =>
        c ? u.customerId === c.id : u.login === email,
      );
      if (
        u &&
        !u.disabled &&
        (!c || ["pending", "active", "blocked"].includes(c.status)) &&
        (!u.lastInvite || days(u.lastInvite, 1 / 1440) <= now())
      ) {
        await invitation(s, u, true);
      }
      return {
        ok: true,
        message: store.demo
          ? "Modo demostración: no se envían correos reales. Si ese email está en el Club, el enlace queda en la cola simulada."
          : "Si ese email está en el Club y la cuenta está habilitada, recibirás un enlace. Revisá tu bandeja y spam. Podés solicitar otro después de un minuto.",
      };
    });
  }
  @Post("activation-info") activationInfo(@Body() b: any, @Req() req: Request) {
    rate(req);
    return store.tx((s) => {
      const u = s.users.find(
        (u) =>
          !u.disabled &&
          u.tokenHash === digest(String(b.token)) &&
          u.tokenExpires! > now(),
      );
      ensure(u, "El enlace venció o ya fue utilizado.");
      const c = s.customers.find((c) => c.id === u.customerId);
      return {
        needsActivation: c?.status === "pending",
        needsBirthday: !!c && !c.birthday,
        needsPhone: !!c && !c.phone,
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
      ensure(u && !u.disabled, "El enlace venció o ya fue utilizado.");
      ensure(
        String(b.password || "").length >= 8,
        "La contraseña necesita al menos 8 caracteres.",
      );
      const c = s.customers.find((c) => c.id === u.customerId);
      ensure(
        !c || ["pending", "active", "blocked"].includes(c.status),
        "La cuenta aún no está aprobada.",
      );
      if (c?.status === "pending") {
        if (!c.birthday) c.birthday = birthdayInput(b.birthday);
        if (!c.phone) c.phone = argentinaPhone(b.area, b.phone);
        acceptTerms(s, c, b, now());
        activateCustomer(s, c, now());
        audit(
          s,
          { id: u.id, role: u.role },
          "terms.accepted",
          c.id,
          { termsVersion: c.termsVersion, privacyVersion: c.privacyVersion },
          now(),
        );
      }
      u.mustChange = false;
      u.failures = 0;
      u.lockedUntil = undefined;
      u.passwordHash = await hash(b.password, 12);
      u.tokenHash = undefined;
      u.tokenExpires = undefined;
      s.sessions = s.sessions.filter((t) => t.userId !== u.id);
      const raw = randomBytes(32).toString("hex");
      s.sessions.push({
        id: digest(raw),
        userId: u.id,
        expires: days(now(), 8 / 24),
        lastActive: now(),
      });
      cookie(res, raw);
      return {
        actor: { id: u.id, role: u.role, customerId: u.customerId },
        mustChange: u.mustChange,
        terms: s.config.terms,
      };
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
        currentUser: {
          name: s.users.find((u) => u.id === a.id)?.name,
          email: s.users.find((u) => u.id === a.id)!.login,
        },
        mailReady: a.role === "admin" ? mailConfigured() : undefined,
        mailTestRecipient: a.role === "admin" ? testMailRecipient() : undefined,
      };
    });
  }
  @Get("customers/search") search(@Query("q") q: string, @Req() req: Request) {
    return store.tx((s) => {
      ensure(actor(s, req).role !== "customer", "Sin permiso.");
      const term = normalized(String(q || ""));
      ensure(term.length >= 2, "Ingresá al menos dos caracteres.");
      return s.customers
        .filter((c) =>
          [c.name, c.email, c.phone].some((value) =>
            normalized(value).includes(term),
          ),
        )
        .map((c) => c.id);
    });
  }
  @Post("command") command(@Body() b: any, @Req() req: Request) {
    return store.tx(async (s) => {
      const a = actor(s, req);
      daily(s, now());
      if (extensionCommand(s, a, b.action, b.input || {}, now()))
        return { ok: true };
      if (b.action === "customer.create" && a.role !== "admin")
        b.input = { ...b.input, hasAccount: false };
      const result = execute(s, a, b.action, b.input || {}, now());
      if (b.action === "customer.create") {
        await credentials(s, result.id);
        await invitation(
          s,
          s.users.find((u) => u.customerId === result.id)!,
        );
      }
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
      const link = await invitation(
        s,
        u,
        b.reset === true,
        b.copyOnly === true,
      );
      audit(
        s,
        a,
        b.copyOnly
          ? "activation.link_copied"
          : b.reset
            ? "password.reset_requested"
            : "invitation.queued",
        b.customerId,
        {},
        now(),
      );
      return {
        ok: true,
        link: b.copyOnly ? link : undefined,
        message: b.copyOnly
          ? "Enlace generado"
          : mailConfigured()
            ? "Invitación en cola"
            : "Guardado en cola; envío de emails no configurado",
      };
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
  @Get("ticket/photo") ticketPhoto(
    @Query("id") ticketId: string,
    @Req() req: Request,
  ) {
    return store.tx((s) => {
      ensure(actor(s, req).role !== "customer", "Solo equipo.");
      const t = s.submissions.find((t) => t.id === ticketId);
      ensure(t, "Ticket inexistente.");
      return { photo: t.photo };
    });
  }
  @Get("reports") reports(@Query() q: any, @Req() req: Request) {
    return store.tx((s) => {
      ensure(actor(s, req).role === "admin", "Solo administradora.");
      const from = q.from || days(now(), -30),
        to = q.to || now();
      ensure(
        Number.isFinite(Date.parse(from)) &&
          Number.isFinite(Date.parse(to)) &&
          from <= to,
        "Período inválido.",
      );
      return { rows: reportRows(s, q.type || "summary", from, to, now()) };
    });
  }
  @Get("reports/excel") reportExcel(
    @Query() q: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return store.tx(async (s) => {
      ensure(actor(s, req).role === "admin", "Solo administradora.");
      const rows = reportRows(
        s,
        q.type || "summary",
        q.from || days(now(), -30),
        q.to || now(),
        now(),
      );
      const w = new ExcelJS.Workbook();
      const sheet = w.addWorksheet("Reporte");
      sheet.columns = Object.keys(rows[0] || { Resultado: "" }).map((k) => ({
        header: k,
        key: k,
        width: 25,
      }));
      sheet.addRows(rows);
      sheet.getRow(1).font = { bold: true };
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=morowa-reporte.xlsx",
      );
      res.send(Buffer.from(await w.xlsx.writeBuffer()));
    });
  }
  @Post("import/undo") undoImport(@Req() req: Request) {
    return store.tx((s) => {
      const a = actor(s, req);
      ensure(a.role === "admin", "Solo administradora.");
      const latest = s.customers
        .map((c) => c.importId)
        .filter(Boolean)
        .sort()
        .at(-1);
      ensure(latest, "No hay importación para deshacer.");
      const cs = s.customers.filter((c) => c.importId === latest);
      ensure(
        cs.every(
          (c) =>
            c.status === "pending" &&
            !c.acceptedAt &&
            !s.purchases.some((p) => p.customerId === c.id),
        ),
        "Hay cuentas activadas o compras: no se puede deshacer.",
      );
      const ids = cs.map((c) => c.id),
        users = s.users
          .filter((u) => ids.includes(u.customerId || ""))
          .map((u) => u.id);
      s.customers = s.customers.filter((c) => !ids.includes(c.id));
      s.users = s.users.filter((u) => !users.includes(u.id));
      s.sessions = s.sessions.filter((t) => !users.includes(t.userId));
      audit(s, a, "import.undone", latest!, { count: ids.length }, now());
      return { count: ids.length };
    });
  }
  @Post("invite/batch") inviteBatch(@Body() b: any, @Req() req: Request) {
    return store.tx(async (s) => {
      const a = actor(s, req);
      ensure(a.role === "admin", "Solo administradora.");
      const count = Number(b.count);
      ensure(
        Number.isInteger(count) && count >= 1 && count <= 50,
        "Elegí una tanda de 1 a 50 invitaciones.",
      );
      const today = now().slice(0, 10);
      const used = s.audit.filter(
        (e) => e.action === "invitation.batch_item" && e.at.startsWith(today),
      ).length;
      ensure(used + count <= 50, "Máximo 50 invitaciones por día.");
      let sent = 0;
      for (const c of s.customers
        .filter((c) => c.status === "pending")
        .sort((a, b) => a.joined.localeCompare(b.joined))) {
        if (sent >= count) break;
        await credentials(s, c.id);
        const u = s.users.find((u) => u.customerId === c.id)!;
        if (u.lastInvite && days(u.lastInvite, s.config.reinviteDays) > now())
          continue;
        await invitation(s, u);
        audit(s, a, "invitation.batch_item", c.id, {}, now());
        sent++;
      }
      return { count: sent };
    });
  }
  @Post("templates/test") testTemplate(@Body() b: any, @Req() req: Request) {
    return store.tx((s) => {
      const a = actor(s, req);
      ensure(a.role === "admin", "Solo administradora.");
      const u = s.users.find((u) => u.id === a.id)!;
      const t = s.config.templates[b.key];
      ensure(t, "Plantilla inexistente.");
      s.outbox.push({
        id: id(),
        to: u.login,
        subject: "[PRUEBA] " + t.title,
        text: t.body
          .replace(/\{nombre\}/g, "Ana")
          .replace(/\{link\}/g, webOrigin())
          .replace(/\{monto\}|\{regalo\}/g, "$5.000")
          .replace(/\{minima\}/g, "$50.000")
          .replace(/\{dias\}/g, "30"),
        status: "pending",
        attempts: 0,
        createdAt: now(),
      });
      return {
        ok: true,
        message: store.demo
          ? "Prueba guardada en la cola simulada; no se envió email real."
          : "Prueba en cola.",
      };
    });
  }
  @Post("templates/reset") resetTemplate(@Body() b: any, @Req() req: Request) {
    return store.tx((s) => {
      const a = actor(s, req);
      ensure(a.role === "admin", "Solo administradora.");
      ensure(defaultConfig.templates[b.key], "Plantilla inexistente.");
      s.config.templates[b.key] = structuredClone(
        defaultConfig.templates[b.key],
      );
      audit(s, a, "template.restored", b.key, {}, now());
      return { ok: true };
    });
  }
  @Post("test/email-event") testEmail(@Body() b: any, @Req() req: Request) {
    return store.tx((s) => {
      ensure(
        store.demo && actor(s, req).role === "admin",
        "Solo entorno de prueba y administración.",
      );
      const o = s.outbox.find((o) => o.id === b.id);
      ensure(
        o && ["sent", "delivered", "bounced", "failed"].includes(b.status),
        "Estado inválido.",
      );
      o.status = b.status;
      audit(
        s,
        { id: "demo", role: "admin" },
        "email.simulated",
        o.id,
        { status: b.status },
        now(),
      );
      return { ok: true };
    });
  }
  @Get("team") team(@Req() req: Request) {
    return store.tx((s) => {
      ensure(actor(s, req).role === "admin", "Solo administradora.");
      return s.users
        .filter((u) => u.role !== "customer")
        .map(({ id, name, login, role, disabled, lastInvite }) => ({
          id,
          name,
          login,
          role,
          disabled,
          lastInvite,
        }));
    });
  }
  @Post("team") teamSave(@Body() b: any, @Req() req: Request) {
    return store.tx(async (s) => {
      const a = actor(s, req);
      ensure(a.role === "admin", "Solo administradora.");
      let u = s.users.find((u) => u.id === b.id && u.role !== "customer");
      if (!u) {
        const login = emailKey(b.email);
        ensure(
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login) &&
            !s.users.some((u) => u.login === login) &&
            !s.customers.some((c) => c.email === login),
          "Email inválido o duplicado.",
        );
        ensure(String(b.name || "").trim(), "Completá el nombre.");
        u = {
          id: id(),
          name: personName(b.name),
          login,
          role: "seller",
          passwordHash: await hash(randomBytes(32).toString("hex"), 12),
          mustChange: true,
          createdAt: now(),
          failures: 0,
        };
        s.users.push(u);
      }
      if (b.role) {
        ensure(["admin", "seller"].includes(b.role), "Rol inválido.");
        ensure(
          u.id !== a.id || b.role === "admin",
          "No podés quitarte tu propio acceso de administración.",
        );
        u.role = b.role;
      }
      if (typeof b.disabled === "boolean") {
        ensure(u.id !== a.id, "No podés desactivar tu propio usuario.");
        u.disabled = b.disabled;
      }
      s.sessions = s.sessions.filter(
        (t) => t.userId !== u!.id || u!.id === a.id,
      );
      let link;
      if (b.invite || b.copyOnly)
        link = await invitation(s, u, true, b.copyOnly === true);
      audit(
        s,
        a,
        "team.updated",
        u.id,
        { role: u.role, disabled: u.disabled },
        now(),
      );
      return { ok: true, link: b.copyOnly ? link : undefined };
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
  testMailRecipient();
  await store.init();
  await bootstrap(store);
  await store.tx(migrateClientChanges, CLIENT_CHANGES_MIGRATION);
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  let mailRunning = false;
  let mailRequested = false;
  let closing = false;
  let mailTask: Promise<void> | undefined;
  const wakeMail = () => {
    if (closing || store.demo || !mailConfigured()) return;
    mailRequested = true;
    if (mailRunning) return;
    mailRunning = true;
    mailTask = (async () => {
      try {
        while (mailRequested && !closing) {
          mailRequested = false;
          const count = await store.tx((s) => processMailQueue(s, now()));
          if (count === 10) mailRequested = true;
        }
      } catch (e) {
        console.error("Envío de emails falló:", e);
      } finally {
        mailRunning = false;
      }
    })();
  };
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
  app.use((req: Request, res: Response, next: () => void) => {
    if (req.method === "POST") res.once("finish", wakeMail);
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
  console.log(`API Morowa en http://localhost:${process.env.PORT || 3001}`);
  wakeMail();
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await store.tx((s) => daily(s, now()));
    } catch (e) {
      console.error("Tarea programada falló:", e);
    } finally {
      running = false;
      wakeMail();
    }
  }, 60000);
  const close = async () => {
    closing = true;
    clearInterval(timer);
    await app.close();
    await mailTask;
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
