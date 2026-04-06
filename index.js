// ─────────────────────────────────────────────────────────────
//  Cloudflare Worker — Musheor API
//
//  Routes:
//    GET /           → uuids.json   (served at mutuals.musheck.dev)
//    GET /highways   → highways.json (served at highways.musheck.dev)
//
//  The GitHub token is stored as a Cloudflare secret (GITHUB_TOKEN),
//  never exposed to clients.
// ─────────────────────────────────────────────────────────────

const GITHUB_BASE =
  "https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/main";

const CACHE_TTL = 300;

async function fetchFromGitHub(path, env) {
  const url = `${GITHUB_BASE}/${path}`;

  const githubResponse = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent":    "MusheorCloudflareWorker/1.0",
      "Accept":        "application/vnd.github.v3.raw",
    },
    cf: {
      cacheTtl:      CACHE_TTL,
      cacheEverything: true,
    },
  });

  return githubResponse;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const url      = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, "") || "/";

    // Resolve which GitHub file to serve
    let githubFile;
    if (pathname === "/" || pathname === "") {
      githubFile = "uuids.json";
    } else if (pathname === "/highways") {
      githubFile = "highways.json";
    } else {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const githubResponse = await fetchFromGitHub(githubFile, env);

      if (!githubResponse.ok) {
        console.error(`GitHub returned ${githubResponse.status} for ${githubFile}`);
        return new Response(
          JSON.stringify({ error: `Failed to fetch ${githubFile}` }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }

      const data = await githubResponse.text();

      return new Response(data, {
        status: 200,
        headers: {
          "Content-Type":                "application/json",
          "Cache-Control":               `public, max-age=${CACHE_TTL}`,
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
