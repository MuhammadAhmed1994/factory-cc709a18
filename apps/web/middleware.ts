import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { redirectTarget } from './lib/auth-routing'

// Protected pages need the api's session cookie; the api itself still validates it on every call.
export function middleware(request: NextRequest) {
  const target = redirectTarget(request.nextUrl.pathname, request.cookies.has('session'))
  if (target) return NextResponse.redirect(new URL(target, request.url))
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/expenses/:path*', '/summary/:path*'],
}
