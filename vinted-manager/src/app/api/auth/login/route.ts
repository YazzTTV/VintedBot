import { NextResponse } from 'next/server'
import { serialize } from 'cookie'

export async function POST(request: Request) {
  try {
    const { password } = await request.json()
    
    // Read password from secured environment env or fallback safely for initial setup
    const correctPassword = process.env.APP_PASSWORD || "vinted2026" 

    if (password === correctPassword) {
      // Create an HTTP Only secure cookie to hold session state
      const cookie = serialize('app_auth_session', 'authenticated_true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30, // 30 Days session persistence
        path: '/',
      })

      const response = NextResponse.json({ success: true })
      response.headers.append('Set-Cookie', cookie)
      return response
    }

    return NextResponse.json({ success: false, message: "Mot de passe incorrect" }, { status: 401 })

  } catch (e) {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
