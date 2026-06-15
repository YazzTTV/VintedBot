import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Routes API et assets statiques : toujours accessibles sans session
  // (appelées par l'extension Chrome depuis vinted.fr qui n'a pas le cookie de session)
  if (path.startsWith('/api/') || path.startsWith('/_next')) {
    return NextResponse.next()
  }

  const session = request.cookies.get('app_auth_session')?.value

  // Page login : accessible sans session, redirige vers / si déjà connecté
  if (path === '/login') {
    if (session) return NextResponse.redirect(new URL('/', request.url))
    return NextResponse.next()
  }

  // Toutes les pages UI nécessitent une session
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

// Applies to all routes except static files
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
}
