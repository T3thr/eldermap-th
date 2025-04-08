// middleware.ts
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Check if the user is trying to access an admin route
  if (req.nextUrl.pathname.startsWith('/admin')) {
    // If there's no session, redirect to login
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Check if the user's role is 'admin'
    if (session?.role !== 'admin' && session?.role !==  'master') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};