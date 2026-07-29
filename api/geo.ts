// Coarse IP geolocation for Search city prefill.
// Reads only Vercel's edge geo headers and returns { country, city, region }.
// Never returns or logs the IP. Per-visitor, never shared-cached (no-store).

export const config = { runtime: "edge" };

export default function handler(request: Request): Response {
  const h = request.headers;
  const country = h.get("x-vercel-ip-country") ?? null;
  const rawCity = h.get("x-vercel-ip-city");
  const region = h.get("x-vercel-ip-country-region") ?? null;

  // Vercel URL-encodes the city header (e.g. "New%20Delhi").
  let city: string | null = null;
  if (rawCity) {
    try {
      city = decodeURIComponent(rawCity);
    } catch {
      city = rawCity;
    }
  }

  return new Response(JSON.stringify({ country, city, region }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store, private",
    },
  });
}
