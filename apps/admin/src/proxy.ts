import { type NextRequest, NextResponse } from "next/server"

/**
 * Optimistic redirect to sign-in when there is no session cookie. The real
 * check happens in the tRPC context on every request.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/sign-in")) return NextResponse.next()
  if (request.cookies.has("admin_session")) return NextResponse.next()
  const url = request.nextUrl.clone()
  url.pathname = "/sign-in"
  url.search = ""
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|.*\\..*).*)"],
}
