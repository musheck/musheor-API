// ─────────────────────────────────────────────────────────────
//  Cloudflare Worker — UUID List Proxy
//
//  Fetches uuids.json from a private GitHub repo and serves it.
//  The GitHub token is stored as a Cloudflare secret, never exposed.
// ─────────────────────────────────────────────────────────────

const GITHUB_RAW_URL =
  "https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/main/uuids.json";

const CACHE_TTL = 300;

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const githubResponse = await fetch(GITHUB_RAW_URL, {
        headers: {
          "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
          "User-Agent": "MusheorCloudflareWorker/1.0",
          "Accept": "application/vnd.github.v3.raw",
        },
        cf: {
          cacheTtl: CACHE_TTL,
          cacheEverything: true,
        },
      });

      if (!githubResponse.ok) {
        console.error(`GitHub returned ${githubResponse.status}`);
        return new Response(
          JSON.stringify({ error: "Failed to fetch UUID list" }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }

      const data = await githubResponse.text();

      return new Response(data, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${CACHE_TTL}`,
          "Access-Control-Allow-Origin": "*",
        },
      });

    } catch (err) {
      console.error("Worker error:", err);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
