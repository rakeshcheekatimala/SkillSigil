import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/auth";

export async function GET(request: Request) {
  const res = NextResponse.redirect(new URL("/", new URL(request.url).origin));
  res.cookies.set(sessionCookieName(), "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function POST(request: Request) {
  return GET(request);
}
