-- Migration number: 0001 	 Tabla de usuarios con un registro de ejemplo
CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	email TEXT NOT NULL UNIQUE
);

INSERT OR IGNORE INTO users (name, email) VALUES ('Ikram', 'ikram@example.com');
