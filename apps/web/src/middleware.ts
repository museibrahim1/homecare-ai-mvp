import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect duplicate routes to canonical routes
  
  // /visits/visits/* → /visits/*
  if (pathname.startsWith('/visits/visits')) {
    const newPath = pathname.replace('/visits/visits', '/visits');
    return NextResponse.redirect(new URL(newPath, request.url));
  }

  // /clients/clients → /clients
  if (pathname.startsWith('/clients/clients')) {
    const newPath = pathname.replace('/clients/clients', '/clients');
    return NextResponse.redirect(new URL(newPath, request.url));
  }

  // /settings/settings/* → /settings/*
  if (pathname.startsWith('/settings/settings')) {
    const newPath = pathname.replace('/settings/settings', '/settings');
    return NextResponse.redirect(new URL(newPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/visits/visits/:path*',
    '/clients/clients/:path*',
    '/settings/settings/:path*',
  ],
};
