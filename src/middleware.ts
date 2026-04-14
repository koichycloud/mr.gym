import { withAuth } from "next-auth/middleware"

export default withAuth({
    pages: {
        signIn: "/login",
    },
})

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - login
         * - api/auth
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - manifest.webmanifest (PWA - dynamic route from manifest.ts)
         * - manifest.json (PWA - legacy static)
         * - sw.js (Service Worker)
         * - workbox-* (Workbox SW chunks)
         * - icons (PWA icons)
         * - screenshots (PWA screenshots)
         * - .well-known (assetlinks.json for APK verification)
         */
        "/((?!login|kiosco|api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|manifest.json|sw.js|workbox-|icons|screenshots|\\.well-known).*)",
    ]
}
