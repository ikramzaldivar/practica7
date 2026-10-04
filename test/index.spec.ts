import { env, SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker, { validateUser } from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

// Prueba unitaria: llama directamente al handler del Worker
function callWorker(
	path: string,
	init?: RequestInit<IncomingRequestCfProperties>,
) {
	const request = new IncomingRequest(`http://example.com${path}`, init);
	return worker.fetch(request, env);
}

function postUser(body: string) {
	return callWorker("/users", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body,
	});
}

describe("validateUser", () => {
	it("accepts a valid user", () => {
		expect(validateUser({ name: "Ana", email: "ana@example.com" })).toBeNull();
	});

	it("rejects a null body", () => {
		expect(validateUser(null)).toBe("Body must be a JSON object");
	});

	it("rejects a missing or blank name", () => {
		expect(validateUser({ email: "ana@example.com" })).toBe("Name is required");
		expect(validateUser({ name: "   ", email: "ana@example.com" })).toBe(
			"Name is required",
		);
	});

	it("rejects an invalid email", () => {
		expect(validateUser({ name: "Ana", email: "not-an-email" })).toBe(
			"A valid email is required",
		);
		expect(validateUser({ name: "Ana" })).toBe("A valid email is required");
	});
});

describe("GET /", () => {
	it("responds with the Practica 7 message (unit style)", async () => {
		const response = await callWorker("/");
		expect(response.status).toBe(200);
		expect(await response.text()).toBe("Practica 7 - UAT (development)");
	});

	it("responds with the Practica 7 message (integration style)", async () => {
		const response = await SELF.fetch("https://example.com/");
		expect(response.status).toBe(200);
		expect(await response.text()).toBe("Practica 7 - UAT (development)");
	});
});

describe("GET /health", () => {
	it("reports status and environment", async () => {
		const response = await callWorker("/health");
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			status: "ok",
			environment: "development",
		});
	});
});

describe("GET /users", () => {
	it("returns the seeded user from the migration", async () => {
		const response = await callWorker("/users");
		expect(response.status).toBe(200);
		const users = await response.json<{ name: string; email: string }[]>();
		expect(users).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: "Ikram", email: "ikram@example.com" }),
			]),
		);
	});
});

describe("GET /users/:id", () => {
	it("returns a user by id", async () => {
		const response = await callWorker("/users/1");
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ id: 1, name: "Ikram" });
	});

	it("returns 404 when the user does not exist", async () => {
		const response = await callWorker("/users/9999");
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "User not found" });
	});
});

describe("POST /users", () => {
	it("creates a user and stores it in D1", async () => {
		const response = await postUser(
			JSON.stringify({ name: " Luisa ", email: "luisa@example.com" }),
		);
		expect(response.status).toBe(201);
		const created = await response.json<{ id: number; name: string }>();
		expect(created).toMatchObject({
			message: "User created successfully",
			name: "Luisa",
			email: "luisa@example.com",
		});

		const row = await env.DB.prepare("SELECT name FROM users WHERE id = ?")
			.bind(created.id)
			.first<{ name: string }>();
		expect(row?.name).toBe("Luisa");
	});

	it("returns 400 for invalid JSON", async () => {
		const response = await postUser("{not json");
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "Invalid JSON" });
	});

	it("returns 400 when validation fails", async () => {
		const response = await postUser(JSON.stringify({ name: "Sin correo" }));
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: "A valid email is required",
		});
	});

	it("returns 409 when the email already exists", async () => {
		const response = await postUser(
			JSON.stringify({ name: "Otra Ikram", email: "ikram@example.com" }),
		);
		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ error: "Could not create user" });
	});
});

describe("unknown routes", () => {
	it("returns 404", async () => {
		const response = await callWorker("/does-not-exist");
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not found" });
	});
});
