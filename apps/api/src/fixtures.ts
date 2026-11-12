import { hash } from "bcryptjs";
import {
  State,
  emptyState,
  newCustomer,
  days,
  months,
  id,
  purchase,
  request,
  gift,
  notify,
  audit,
} from "./domain";
export async function demoState(
  now = new Date().toISOString(),
  password = "MorowaDemo2026!",
): Promise<State> {
  const s = emptyState();
  const passwordHash = await hash(password, 12);
  const admin = { id: "demo-admin", role: "admin" as const };
  s.users.push(
    {
      id: admin.id,
      login: "admin@morowa.local",
      passwordHash,
      role: "admin",
      mustChange: false,
      createdAt: now,
      failures: 0,
    },
    {
      id: "demo-seller",
      login: "vendedora@morowa.local",
      passwordHash,
      role: "seller",
      mustChange: false,
      createdAt: now,
      failures: 0,
    },
  );
  const names = [
    "Florencia Garmendia",
    "Valentina Suárez",
    "Marcela Quiroga",
    "Julieta Navarro",
    "Romina Acosta",
    "Ana Pérez",
    "Camila Rosales",
    "Laura Gómez",
  ];
  for (let i = 0; i < names.length; i++) {
    const joined = days(now, -40 - i * 3);
    const c = newCustomer(
      s,
      {
        name: names[i],
        dni: String(30412887 + i),
        phone: "54926155501" + String(42 + i),
        email: "clienta" + i + "@example.invalid",
        birthday: i === 0 ? "19/04" : "03/11",
        ninox: names[i].split(" ").reverse().join(" "),
      },
      joined,
      i === 4 ? "approval" : i === 5 ? "pending" : "active",
    );
    c.emailConsent = true;
    c.acceptedAt = c.status === "active" ? joined : undefined;
    c.account = {
      bands: i === 7 ? [0, 0, 0, 0, 40500] : [0, 50000, 0, 0, 0],
      updatedAt: days(now, i % 3 === 0 ? -10 : -2),
    };
    s.users.push({
      id: id(),
      login: c.dni,
      passwordHash:
        c.status === "pending" ? await hash(c.dni, 12) : passwordHash,
      role: "customer",
      customerId: c.id,
      mustChange: c.status === "pending",
      createdAt: c.status === "pending" ? now : joined,
      failures: 0,
    });
    if (c.status === "active") {
      for (let j = 0; j < 3; j++)
        purchase(
          s,
          admin,
          {
            customerId: c.id,
            pdv: "0001",
            number: String(100 + i * 10 + j),
            amount: [245000, 180000, 215000][j],
          },
          days(now, -(24 - j * 7)),
        );
      gift(s, c, "welcome", days(now, -12));
      notify(
        s,
        c,
        "Qué lindo tenerte cerca.",
        "Tus compras suman puntos y tus puntos se convierten en beneficios. Descubrí los vouchers que tenemos para vos.",
        "notice",
        days(now, -2),
      );
    }
  }
  const first = s.customers[0];
  request(s, first, { catalogIndex: 0, accepted: true }, days(now, -3));
  request(
    s,
    s.customers[1],
    { catalogIndex: 1, accepted: true },
    days(now, -9),
  );
  gift(s, first, "birthday", days(now, -1));
  s.lots.find((l) => l.customerId === first.id)!.expires = days(now, 19);
  s.campaigns.push({
    id: id(),
    name: "Días para sumar más",
    from: days(now, 3),
    to: days(now, 6),
    multiplier: 2,
    paused: false,
    body: "Durante estos días tus compras suman el doble de puntos. Te esperamos en Morowa.",
  });
  s.outbox = [];
  audit(s, admin, "demo.created", "", { fictional: true }, now);
  return s;
}
