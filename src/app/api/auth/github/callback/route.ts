import { NextResponse } from "next/server";
import {
  createSessionToken,
  sessionCookieName,
  toSessionUser,
  upsertGithubUser,
} from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const safeNext =
    state && state.startsWith("/") && !state.startsWith("//")
      ? state
      : "/publish";
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!code || !clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/?auth_error=missing_oauth", origin),
    );
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
  };
  if (!tokenJson.access_token) {
    return NextResponse.redirect(
      new URL("/?auth_error=token_exchange", origin),
    );
  }

  const ghUserRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "SkillSigil",
    },
  });
  if (!ghUserRes.ok) {
    return NextResponse.redirect(new URL("/?auth_error=profile", origin));
  }
  const ghUser = (await ghUserRes.json()) as {
    id: number;
    login: string;
    avatar_url?: string;
    email?: string | null;
  };

  const user = await upsertGithubUser({
    githubId: String(ghUser.id),
    username: ghUser.login,
    avatarUrl: ghUser.avatar_url,
    email: ghUser.email,
    accessToken: tokenJson.access_token,
  });

  const token = await createSessionToken(toSessionUser(user));
  const res = NextResponse.redirect(new URL(safeNext, origin));
  res.cookies.set(sessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
