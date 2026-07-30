import { eq } from "drizzle-orm";
import { sessions, users } from "../db/schema";
import { hashPassword } from "../lib/password";
import { scriptDb } from "./db";

async function hiddenPrompt(message: string) {
  if (!process.stdin.isTTY) throw new Error("Execute este comando em um terminal interativo.");
  process.stdout.write(message);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  return new Promise<string>((resolve, reject) => {
    let value = "";
    const onData = (key: string) => {
      if (key === "\u0003") {
        cleanup();
        reject(new Error("Cancelado."));
      } else if (key === "\r" || key === "\n") {
        cleanup();
        process.stdout.write("\n");
        resolve(value);
      } else if (key === "\u007f") {
        value = value.slice(0, -1);
      } else {
        value += key;
        process.stdout.write("*");
      }
    };
    const cleanup = () => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };
    process.stdin.on("data", onData);
  });
}

const [user] = await scriptDb.select().from(users).limit(1);
if (!user) throw new Error("Nenhum usuário encontrado.");
const password = await hiddenPrompt(`Nova senha para ${user.email}: `);
if (password.length < 12) throw new Error("A senha deve ter pelo menos 12 caracteres.");
const confirmation = await hiddenPrompt("Repita a nova senha: ");
if (password !== confirmation) throw new Error("As senhas não coincidem.");
await scriptDb.transaction(async (tx) => {
  await tx.update(users).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(users.id, user.id));
  await tx.delete(sessions).where(eq(sessions.userId, user.id));
});
console.log("Senha redefinida e sessões revogadas.");
