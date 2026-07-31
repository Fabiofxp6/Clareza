"use server";

import { and, count, eq, gt, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { loginAttempts, users } from "@/db/schema";
import {
  createSession,
  deleteSession,
  requestIpHash,
  requireUser,
  revokeUserSessions,
} from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { loginSchema, profileSchema } from "@/schemas/finance";

export type ActionState = { ok?: boolean; error?: string };

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "E-mail ou senha inválidos." };
  const db = getDb();
  const ipHash = await requestIpHash();
  const since = new Date(Date.now() - 15 * 60_000);
  const [attempts] = await db
    .select({ value: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.email, parsed.data.email),
        eq(loginAttempts.ipHash, ipHash),
        eq(loginAttempts.succeeded, false),
        gt(loginAttempts.attemptedAt, since),
      ),
    );
  if (attempts.value >= 5) return { error: "Muitas tentativas. Aguarde 15 minutos." };

  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  const valid = user ? await verifyPassword(user.passwordHash, parsed.data.password) : false;
  await db.insert(loginAttempts).values({
    email: parsed.data.email,
    ipHash,
    succeeded: valid,
  });
  if (!user || !valid) return { error: "E-mail ou senha inválidos." };
  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}

export async function changePasswordAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  if (currentPassword.length > 200 || newPassword.length < 12 || newPassword.length > 200) {
    return { error: "A nova senha deve ter entre 12 e 200 caracteres." };
  }
  const db = getDb();
  const [record] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!record || !(await verifyPassword(record.passwordHash, currentPassword))) {
    return { error: "Senha atual incorreta." };
  }
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(users.id, user.id));
  await revokeUserSessions(user.id);
  await createSession(user.id);
  return { ok: true };
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const db = getDb();
  const [duplicate] = await db.select({ id: users.id }).from(users).where(and(eq(users.email, parsed.data.email), ne(users.id, user.id))).limit(1);
  if (duplicate) return;
  await db
    .update(users)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(users.id, user.id));
}
