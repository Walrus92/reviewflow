import { execSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";

let status;
try {
  status = execSync("npx --no-install supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch {
  console.error("Supabase local no está disponible. Ejecuta `npx supabase start` primero.");
  process.exit(1);
}

const settings = Object.fromEntries(status.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (!match) return [];
  return [[match[1], match[2].replace(/^"|"$/g, "")]];
}));
if (!settings.API_URL || !settings.SERVICE_ROLE_KEY) {
  console.error("Faltan la URL o la clave local de Supabase.");
  process.exit(1);
}

const origin = "http://localhost:3000";
const environment = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: settings.API_URL,
  SUPABASE_SERVICE_ROLE_KEY: settings.SERVICE_ROLE_KEY,
  NEXTAUTH_SECRET: randomBytes(32).toString("hex"),
  NEXTAUTH_URL: origin,
  NEXT_PUBLIC_SITE_URL: origin,
  NEXT_PUBLIC_BASE_URL: origin,
  DEV_MAGIC_LINK_ENABLED: "true",
  WEEKLY_EMAIL_ENABLED: "false",
  LEGACY_GOOGLE_CAPTURE_ENABLED: "false",
};

console.log("ReviewFlow local: Supabase y enlace de acceso de desarrollo activos. Sin envíos reales.");
const result = spawnSync("npm run dev", { shell: true, stdio: "inherit", env: environment });
process.exit(result.status ?? 1);
