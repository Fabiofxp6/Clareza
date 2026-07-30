import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("fin_session");
  const isLogin = request.nextUrl.pathname === "/login";
  if (!hasSession && !isLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (hasSession && isLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/backup|_next/static|_next/image|favicon.ico).*)"],
};
