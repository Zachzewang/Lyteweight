// Server half of the Withings and WHOOP integrations, running as a Cloudflare Pages Function on the same
// domain as the app. It owns the OAuth client secrets and the users' tokens (in KV), and proxies a small
// allowlist of read-only API calls. Every data call needs the SYNC_KEY secret, so only the owner's app can read.

export interface IKv {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface IIntegrationsEnv {
  TOKENS?: IKv;
  SYNC_KEY?: string;
  WHOOP_CLIENT_ID?: string;
  WHOOP_CLIENT_SECRET?: string;
  WITHINGS_CLIENT_ID?: string;
  WITHINGS_CLIENT_SECRET?: string;
}

type IFetch = (input: string, init?: RequestInit) => Promise<Response>;
type IProvider = "whoop" | "withings";

interface ITokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const whoopAuthUrl = "https://api.prod.whoop.com/oauth/oauth2/auth";
const whoopTokenUrl = "https://api.prod.whoop.com/oauth/oauth2/token";
const whoopApiBase = "https://api.prod.whoop.com/developer";
const whoopScopes = "offline read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement";
const whoopAllowedPaths = new Set([
  "/v2/recovery",
  "/v2/activity/sleep",
  "/v2/cycle",
  "/v2/activity/workout",
  "/v2/user/measurement/body",
  "/v2/user/profile/basic",
]);

const withingsAuthUrl = "https://account.withings.com/oauth2_user/authorize2";
const withingsTokenUrl = "https://wbsapi.withings.net/v2/oauth2";
const withingsMeasureUrl = "https://wbsapi.withings.net/measure";
const withingsScopes = "user.metrics,user.info,user.activity";

const stateTtlSec = 600;
// Refresh a token this long before it expires, so a sync never starts with one that dies mid-way.
const refreshMarginMs = 2 * 60 * 1000;

function json(body: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function html(message: string, status: number): Response {
  const safe = message.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!);
  return new Response(
    `<!doctype html><meta name="viewport" content="width=device-width"><body style="font-family:sans-serif;padding:24px"><p>${safe}</p><p><a href="/app/">Back to Lyteweight</a></p></body>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

function isProvider(value: string | undefined): value is IProvider {
  return value === "whoop" || value === "withings";
}

function isConfigured(env: IIntegrationsEnv, provider: IProvider): boolean {
  return provider === "whoop"
    ? !!(env.WHOOP_CLIENT_ID && env.WHOOP_CLIENT_SECRET)
    : !!(env.WITHINGS_CLIENT_ID && env.WITHINGS_CLIENT_SECRET);
}

function keyMatches(env: IIntegrationsEnv, given: string | null): boolean {
  const expected = env.SYNC_KEY ?? "";
  if (!expected || given == null || given.length !== expected.length) {
    return false;
  }
  // Compare every character instead of stopping at the first mismatch, so response time doesn't reveal the key.
  let mismatches = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatches += expected[i] === given[i] ? 0 : 1;
  }
  return mismatches === 0;
}

function redirectUri(origin: string, provider: IProvider): string {
  return `${origin}/integrations/${provider}/callback`;
}

async function requestTokens(
  fetch: IFetch,
  env: IIntegrationsEnv,
  provider: IProvider,
  grant: { code: string; redirectUri: string } | { refreshToken: string },
  now: number
): Promise<ITokens> {
  const isCode = "code" in grant;
  if (provider === "whoop") {
    const form = new URLSearchParams({
      grant_type: isCode ? "authorization_code" : "refresh_token",
      client_id: env.WHOOP_CLIENT_ID!,
      client_secret: env.WHOOP_CLIENT_SECRET!,
      ...(isCode
        ? { code: grant.code, redirect_uri: grant.redirectUri }
        : { refresh_token: grant.refreshToken, scope: "offline" }),
    });
    const response = await fetch(whoopTokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const body = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!response.ok || !body.access_token || !body.refresh_token) {
      throw new Error(`WHOOP token request failed (${response.status})`);
    }
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresAt: now + (body.expires_in ?? 3600) * 1000,
    };
  }
  const form = new URLSearchParams({
    action: "requesttoken",
    grant_type: isCode ? "authorization_code" : "refresh_token",
    client_id: env.WITHINGS_CLIENT_ID!,
    client_secret: env.WITHINGS_CLIENT_SECRET!,
    ...(isCode ? { code: grant.code, redirect_uri: grant.redirectUri } : { refresh_token: grant.refreshToken }),
  });
  const response = await fetch(withingsTokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const body = (await response.json()) as {
    status?: number;
    error?: string;
    body?: { access_token?: string; refresh_token?: string; expires_in?: number };
  };
  if (body.status !== 0 || !body.body?.access_token || !body.body.refresh_token) {
    throw new Error(`Withings token request failed (status ${body.status}${body.error ? `: ${body.error}` : ""})`);
  }
  return {
    accessToken: body.body.access_token,
    refreshToken: body.body.refresh_token,
    expiresAt: now + (body.body.expires_in ?? 10800) * 1000,
  };
}

async function freshAccessToken(
  fetch: IFetch,
  env: IIntegrationsEnv,
  kv: IKv,
  provider: IProvider,
  now: number
): Promise<string | undefined> {
  const raw = await kv.get(`tokens:${provider}`);
  if (!raw) {
    return undefined;
  }
  const tokens = JSON.parse(raw) as ITokens;
  if (tokens.expiresAt - refreshMarginMs > now) {
    return tokens.accessToken;
  }
  // Both services rotate the refresh token, so the new pair must be saved before it's used.
  const refreshed = await requestTokens(fetch, env, provider, { refreshToken: tokens.refreshToken }, now);
  await kv.put(`tokens:${provider}`, JSON.stringify(refreshed));
  return refreshed.accessToken;
}

async function connect(env: IIntegrationsEnv, kv: IKv, url: URL, provider: IProvider): Promise<Response> {
  if (!keyMatches(env, url.searchParams.get("key"))) {
    return html("Wrong sync key. Check the key in Lyteweight → Me → Connected devices.", 403);
  }
  const state = crypto.randomUUID();
  await kv.put(`state:${state}`, provider, { expirationTtl: stateTtlSec });
  const params =
    provider === "whoop"
      ? new URLSearchParams({
          response_type: "code",
          client_id: env.WHOOP_CLIENT_ID!,
          redirect_uri: redirectUri(url.origin, provider),
          scope: whoopScopes,
          state,
        })
      : new URLSearchParams({
          response_type: "code",
          client_id: env.WITHINGS_CLIENT_ID!,
          redirect_uri: redirectUri(url.origin, provider),
          scope: withingsScopes,
          state,
        });
  return Response.redirect(`${provider === "whoop" ? whoopAuthUrl : withingsAuthUrl}?${params.toString()}`, 302);
}

async function callback(
  fetch: IFetch,
  env: IIntegrationsEnv,
  kv: IKv,
  url: URL,
  provider: IProvider,
  now: number
): Promise<Response> {
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code");
  const expectedProvider = await kv.get(`state:${state}`);
  if (!code || expectedProvider !== provider) {
    return html("This login link expired or was already used. Start again from Lyteweight.", 400);
  }
  await kv.delete(`state:${state}`);
  const tokens = await requestTokens(
    fetch,
    env,
    provider,
    { code, redirectUri: redirectUri(url.origin, provider) },
    now
  );
  await kv.put(`tokens:${provider}`, JSON.stringify(tokens));
  return Response.redirect(`${url.origin}/app/?connected=${provider}`, 302);
}

async function whoopApi(fetch: IFetch, env: IIntegrationsEnv, kv: IKv, url: URL, now: number): Promise<Response> {
  const path = url.searchParams.get("path") ?? "";
  if (!whoopAllowedPaths.has(path)) {
    return json({ error: "path_not_allowed" }, 400);
  }
  const token = await freshAccessToken(fetch, env, kv, "whoop", now);
  if (!token) {
    return json({ error: "not_connected" }, 409);
  }
  const params = new URLSearchParams();
  for (const name of ["start", "end", "limit", "nextToken"]) {
    const value = url.searchParams.get(name);
    if (value) {
      params.set(name, value);
    }
  }
  const response = await fetch(`${whoopApiBase}${path}?${params.toString()}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  return new Response(await response.text(), {
    status: response.status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function withingsMeasure(
  fetch: IFetch,
  env: IIntegrationsEnv,
  kv: IKv,
  url: URL,
  now: number
): Promise<Response> {
  const token = await freshAccessToken(fetch, env, kv, "withings", now);
  if (!token) {
    return json({ error: "not_connected" }, 409);
  }
  // No meastypes filter: Withings then returns every measurement type the user's devices recorded.
  const form = new URLSearchParams({ action: "getmeas", category: "1" });
  for (const name of ["lastupdate", "offset"]) {
    const value = url.searchParams.get(name);
    if (value) {
      form.set(name, value);
    }
  }
  const response = await fetch(withingsMeasureUrl, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  return new Response(await response.text(), {
    status: response.status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function IntegrationsServer_handle(
  request: Request,
  env: IIntegrationsEnv,
  fetch: IFetch,
  now: number = Date.now()
): Promise<Response> {
  const url = new URL(request.url);
  const [, , first, second] = url.pathname.split("/");
  const kv = env.TOKENS;
  if (!kv || !env.SYNC_KEY) {
    return json({ error: "not_configured", missing: !kv ? "TOKENS" : "SYNC_KEY" }, 503);
  }
  try {
    if (isProvider(first) && (second === "connect" || second === "callback")) {
      if (!isConfigured(env, first)) {
        return html(`${first} isn't set up yet: its client ID and secret are missing in Cloudflare.`, 503);
      }
      return second === "connect"
        ? await connect(env, kv, url, first)
        : await callback(fetch, env, kv, url, first, now);
    }
    if (!keyMatches(env, request.headers.get("x-sync-key"))) {
      return json({ error: "wrong_sync_key" }, 403);
    }
    if (first === "status" && request.method === "GET") {
      return json({
        whoop: (await kv.get("tokens:whoop")) != null,
        withings: (await kv.get("tokens:withings")) != null,
        configured: { whoop: isConfigured(env, "whoop"), withings: isConfigured(env, "withings") },
      });
    }
    if (isProvider(first) && second === "disconnect" && request.method === "POST") {
      await kv.delete(`tokens:${first}`);
      return json({ ok: true });
    }
    if (first === "whoop" && second === "api" && request.method === "GET") {
      return await whoopApi(fetch, env, kv, url, now);
    }
    if (first === "withings" && second === "measure" && request.method === "GET") {
      return await withingsMeasure(fetch, env, kv, url, now);
    }
    return json({ error: "not_found" }, 404);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return second === "callback" ? html(message, 502) : json({ error: message }, 502);
  }
}
