/**
 * Hardening headers on deployed HTML. Preview `/` is covered by feosHtmlPlugin
 * in vite.config.ts — this file is the Vercel/Nitro half.
 */
export default async function securityHeaders(
  event: { url: URL; req: { method: string; headers: Headers } },
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const result = await next();
  if (!(result instanceof Response)) return result;
  const headers = new Headers(result.headers);
  if (!headers.has("x-content-type-options")) {
    headers.set("X-Content-Type-Options", "nosniff");
  }
  if (!headers.has("referrer-policy")) {
    headers.set("Referrer-Policy", "no-referrer");
  }
  if (!headers.has("permissions-policy")) {
    headers.set(
      "Permissions-Policy",
      "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()",
    );
  }
  if (!headers.has("x-permitted-cross-domain-policies")) {
    headers.set("X-Permitted-Cross-Domain-Policies", "none");
  }
  headers.set("X-DNS-Prefetch-Control", "off");
  return new Response(result.body, {
    status: result.status,
    statusText: result.statusText,
    headers,
  });
}
