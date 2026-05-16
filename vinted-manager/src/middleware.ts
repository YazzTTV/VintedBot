import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // 1. Definir les chemins publics (login, api auth, assets statiques)
  const isPublicPath = 
    path === '/login' || 
    path.startsWith('/api/auth') || 
    path.startsWith('/_next') || 
    path.includes('/api/') // For general api safety, usually you protect API too, but we focus on page UI for now.

  // IMPORTANT: Re-protect general API routes except auth and extension public sync endpoints
  const isApiRoute = path.startsWith('/api/') && 
                     !path.startsWith('/api/auth') && 
                     !path.startsWith('/api/comptabilite/balance') && 
                     !path.startsWith('/api/comptabilite/orders') && 
                     !path.startsWith('/api/comptabilite/capture') &&
                     !path.startsWith('/api/extension/')
  
  const session = request.cookies.get('app_auth_session')?.value

  // Cas A: Veut aller sur une page protegee MAIS pas de session -> redirect to login
  if (!isPublicPath && !session && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Protection API : Retourne 401 si pas de session
  if (isApiRoute && !session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // Cas B: Est deja connecte MAIS essaye d'aller sur login -> redirect to home
  if (path === '/login' && session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

// Applies to all except icons, static, next files
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
}
