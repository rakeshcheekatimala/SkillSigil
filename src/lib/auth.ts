import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users, type User } from "@/db/schema";

export type SessionUser = {
  id: string;
  githubId: string;
  username: string;
  avatarUrl: string | null;
  email: string | null;
};

const COOKIE = "skillsigil_session";

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be at least 16 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    sub: user.id,
    githubId: user.githubId,
    username: user.username,
    avatarUrl: user.avatarUrl,
    email: user.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || typeof payload.username !== "string") return null;
    return {
      id: payload.sub,
      githubId: String(payload.githubId ?? ""),
      username: payload.username,
      avatarUrl: (payload.avatarUrl as string | null) ?? null,
      email: (payload.email as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function sessionCookieName() {
  return COOKIE;
}

export async function upsertGithubUser(input: {
  githubId: string;
  username: string;
  avatarUrl?: string | null;
  email?: string | null;
  accessToken?: string | null;
}): Promise<User> {
  const db = getDb();
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.githubId, input.githubId))
    .limit(1);

  if (existing[0]) {
    const [updated] = await db
      .update(users)
      .set({
        username: input.username,
        avatarUrl: input.avatarUrl ?? existing[0].avatarUrl,
        email: input.email ?? existing[0].email,
        accessToken: input.accessToken ?? existing[0].accessToken,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing[0].id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(users)
    .values({
      githubId: input.githubId,
      username: input.username,
      avatarUrl: input.avatarUrl ?? null,
      email: input.email ?? null,
      accessToken: input.accessToken ?? null,
    })
    .returning();
  return created;
}

export function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    githubId: user.githubId,
    username: user.username,
    avatarUrl: user.avatarUrl,
    email: user.email,
  };
}
