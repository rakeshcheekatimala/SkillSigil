import { NextResponse } from "next/server";
import {
  createSessionToken,
  sessionCookieName,
  toSessionUser,
  upsertGithubUser,
} from "@/lib/auth";

/**
 * Local/demo auth when GITHUB_CLIENT_ID is unset.
 * With credentials, redirects to GitHub OAuth authorize.
 */
export async function GET(request: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const { origin, searchParams } = new URL(request.url);
  const nextPath = searchParams.get("next");
  const safeNext =
    nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/publish";

  if (!clientId && process.env.NODE_ENV === "production") {
    return NextResponse.redirect(
      new URL("/?auth_error=oauth_not_configured", origin),
    );
  }

  if (clientId) {
    const redirectUri = `${origin}/api/auth/github/callback`;
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", "read:user user:email public_repo");
    url.searchParams.set("state", safeNext);
    return NextResponse.redirect(url);
  }

  // Local-only demo session when OAuth env is unset (still a real Neon user row).
  const user = await upsertGithubUser({
    githubId: "demo-user",
    username: "demo-dev",
    avatarUrl: "https://avatars.githubusercontent.com/u/9919?v=4",
    email: "demo@skillsigil.dev",
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
  // Prevent caches from serving a logged-out shell after auth.
  res.headers.set("Cache-Control", "no-store");
  return res;
}
