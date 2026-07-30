import { count } from "drizzle-orm";
import { settings, users } from "../db/schema";
import { hashPassword } from "../lib/password";
import { scriptDb } from "./db";

const name = process.env.INITIAL_USER_NAME?.trim();
const email = process.env.INITIAL_USER_EMAIL?.trim().toLowerCase();
const password = process.env.INITIAL_USER_PASSWORD;

if (!name || !email || !password) throw new Error("Preencha INITIAL_USER_NAME, INITIAL_USER_EMAIL e INITIAL_USER_PASSWORD.");
if (password.length < 12) throw new Error("INITIAL_USER_PASSWORD deve ter pelo menos 12 caracteres.");

const [existing] = await scriptDb.select({ value: count() }).from(users);
if (existing.value > 0) throw new Error("Já existe um usuário. A criação de novos usuários está bloqueada.");

const [user] = await scriptDb
  .insert(users)
  .values({ name, email, passwordHash: await hashPassword(password) })
  .returning({ id: users.id, email: users.email });
await scriptDb.insert(settings).values({ userId: user.id });
console.log(`Usuário único criado com segurança: ${user.email}`);
