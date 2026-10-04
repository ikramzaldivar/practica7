import { applyD1Migrations, env } from "cloudflare:test";

// Se ejecuta antes de cada archivo de pruebas; las migraciones ya aplicadas se omiten
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
