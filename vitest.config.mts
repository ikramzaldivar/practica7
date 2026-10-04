import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
	// Las migraciones se aplican a una D1 local antes de las pruebas
	const migrations = await readD1Migrations(path.join(import.meta.dirname, "migrations"));

	return {
		plugins: [
			cloudflareTest({
				wrangler: { configPath: "./wrangler.jsonc" },
				// Las pruebas nunca tocan la base de datos real
				remoteBindings: false,
				miniflare: {
					bindings: { TEST_MIGRATIONS: migrations },
				},
			}),
		],
		test: {
			setupFiles: ["./test/apply-migrations.ts"],
			reporters: ["default", "junit"],
			outputFile: { junit: "./reports/junit.xml" },
			coverage: {
				provider: "istanbul",
				include: ["src/**/*.ts"],
				reporter: ["text", "html", "lcov", "cobertura", "json-summary"],
				reportsDirectory: "./coverage",
			},
		},
	};
});
