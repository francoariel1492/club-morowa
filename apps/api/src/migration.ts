import { State, defaultConfig } from "./domain";
export const CLIENT_CHANGES_MIGRATION = "client-changes-2026-11-v1";
export function migrateClientChanges(s: State) {
  s.config = {
    ...structuredClone(defaultConfig),
    ...s.config,
    templates: {
      ...structuredClone(defaultConfig.templates),
      ...s.config.templates,
    },
  };
  s.submissions ??= [];
  for (const c of s.customers) {
    // Legacy accounts all had the account-current feature. Preserve it; new registrations default to false.
    c.hasAccount ??= true;
    c.registrationKind ??= "preloaded";
  }
  for (const u of s.users.filter((u) => u.role === "customer")) {
    const c = s.customers.find((c) => c.id === u.customerId);
    if (c?.email) u.login = c.email.trim().toLowerCase();
  }
}
