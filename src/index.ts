export interface Env {
	DB: D1Database;
	ENVIRONMENT: string;
}

export interface UserInput {
	name?: unknown;
	email?: unknown;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valida el cuerpo de la petición; devuelve un mensaje de error o null si es válido
export function validateUser(body: UserInput | null): string | null {
	if (!body || typeof body !== "object") {
		return "Body must be a JSON object";
	}
	if (typeof body.name !== "string" || body.name.trim() === "") {
		return "Name is required";
	}
	if (typeof body.email !== "string" || !EMAIL_REGEX.test(body.email)) {
		return "A valid email is required";
	}
	return null;
}

async function listUsers(env: Env): Promise<Response> {
	const { results } = await env.DB.prepare("SELECT * FROM users").all();
	return Response.json(results);
}

async function getUser(env: Env, id: number): Promise<Response> {
	const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?")
		.bind(id)
		.first();

	if (!user) {
		return Response.json({ error: "User not found" }, { status: 404 });
	}
	return Response.json(user);
}

async function createUser(request: Request, env: Env): Promise<Response> {
	let body: UserInput | null;
	try {
		body = await request.json<UserInput>();
	} catch {
		return Response.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const error = validateUser(body);
	if (error) {
		return Response.json({ error }, { status: 400 });
	}

	const name = (body!.name as string).trim();
	const email = body!.email as string;

	try {
		const result = await env.DB.prepare(
			"INSERT INTO users (name, email) VALUES (?, ?)",
		)
			.bind(name, email)
			.run();

		return Response.json(
			{
				message: "User created successfully",
				id: result.meta.last_row_id,
				name,
				email,
			},
			{ status: 201 },
		);
	} catch {
		return Response.json(
			{ error: "Could not create user" },
			{ status: 409 },
		);
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const userMatch = url.pathname.match(/^\/users\/(\d+)$/);

		if (url.pathname === "/users" && request.method === "GET") {
			return listUsers(env);
		}

		if (url.pathname === "/users" && request.method === "POST") {
			return createUser(request, env);
		}

		if (userMatch && request.method === "GET") {
			return getUser(env, Number(userMatch[1]));
		}

		if (url.pathname === "/health") {
			return Response.json({ status: "ok", environment: env.ENVIRONMENT });
		}

		if (url.pathname === "/") {
			return new Response(`Practica 7 - UAT (${env.ENVIRONMENT})`);
		}

		return Response.json({ error: "Not found" }, { status: 404 });
	},
} satisfies ExportedHandler<Env>;
