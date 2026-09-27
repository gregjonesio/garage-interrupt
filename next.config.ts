import type { NextConfig } from "next";

// Every page is prerendered, so scripts cannot carry a per-request nonce, and
// the framework's own inline scripts need 'unsafe-inline'. This policy is a
// baseline, not a strict one: it stops the page loading or sending anything to
// another origin, framing, plugins and form posts. The site has no user input
// and renders notice text as text, which is what keeps script out of the page.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const headers = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    // The development server needs eval and a websocket for reloading, so the policy is for builds only.
    if (process.env.NODE_ENV === "production") headers.push({ key: "Content-Security-Policy", value: CSP });
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
