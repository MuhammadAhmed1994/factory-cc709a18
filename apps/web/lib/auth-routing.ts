const PROTECTED_PREFIXES = ['/dashboard', '/expenses', '/summary']

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/** Where an unauthenticated visitor must be sent, or null when the request may proceed. */
export function redirectTarget(pathname: string, hasSession: boolean): string | null {
  return isProtectedPath(pathname) && !hasSession ? '/login' : null
}
