import { NextResponse, type NextRequest } from 'next/server'

// <html lang> must reflect the URL for crawlers (they carry no locale cookie):
// every /es/* page is Spanish regardless of the cookie the layout reads.
// Layouts can't see the pathname, so pass the signal via a request header
// that app/layout.tsx reads with headers().
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-path-locale', 'es')
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/es', '/es/:path*'],
}
