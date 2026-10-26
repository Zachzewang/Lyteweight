# Connecting WHOOP and Withings

Lyteweight reads WHOOP and Withings data through a small server that runs inside the Cloudflare Pages project, as Pages Functions (`functions/integrations/`). It keeps the client secrets and your login tokens, and the app reaches it with a sync key that only you know.

This takes about 20 minutes, once. Never paste a secret into a chat or a commit. Cloudflare is the only place they go.

## 1. Make a sync key

Make a long random string and keep it in your password manager. On a Mac, `openssl rand -hex 24` prints one. This is your `SYNC_KEY`.

## 2. Create the WHOOP app

1. Go to https://developer-dashboard.whoop.com and sign in with your WHOOP account. Create a team if it asks.
2. Create an app:
   - Name: Lyteweight
   - Privacy policy URL: `https://lyteweight.pages.dev/lyteweight-privacy.html`
   - Redirect URL: `https://lyteweight.pages.dev/integrations/whoop/callback`
   - Scopes: tick all of them, including `offline`. Without `offline`, WHOOP gives no refresh token, and you'd have to log in again every hour.
3. Keep the page open. You need its Client ID and Client Secret in step 4.

## 3. Create the Withings app

1. Go to https://developer.withings.com and open the developer dashboard. Sign in with your Withings account.
2. Create an application of type "Public API integration":
   - Name: Lyteweight
   - Callback URL: `https://lyteweight.pages.dev/integrations/withings/callback`
   - Privacy policy or description, if asked: `https://lyteweight.pages.dev/lyteweight-privacy.html`
3. Keep its Client ID and Client Secret (Withings may call the secret "Consumer Secret") for step 4.

## 4. Set up Cloudflare

1. In the Cloudflare dashboard, go to Storage & Databases → KV (or Workers & Pages → KV). Create a namespace named `lyteweight-tokens`.
2. Go to Workers & Pages → lyteweight → Settings → Bindings. Add a binding of type KV namespace with the variable name `TOKENS`, pointing at `lyteweight-tokens`.
3. Go to Settings → Variables and Secrets. Add these five, each as type Secret, for Production:
   - `SYNC_KEY`: the key from step 1
   - `WHOOP_CLIENT_ID`
   - `WHOOP_CLIENT_SECRET`
   - `WITHINGS_CLIENT_ID`
   - `WITHINGS_CLIENT_SECRET`
4. Bindings and secrets only apply to new deployments. Go to Deployments, open the latest one's menu, and choose Retry deployment.

## 5. Connect in the app

1. In Lyteweight, go to Me → Connected Devices and enter the sync key. Tap outside the field to save it.
2. WHOOP and Withings now show Connect. Tap each one, log in, and allow access. You land back in Lyteweight.
3. Tap Sync now. The first sync pulls your full history, which can take a minute. After that, the app syncs on open, at most once an hour.

## What goes where

- Withings weight and body fat go into the app's bodyweight and body fat stats. Meet Prep, DOTS and the weight graph use them.
- Every other Withings measurement (muscle, bone, water, visceral fat and anything else your devices record) goes into the body composition log.
- WHOOP recovery, HRV, resting heart rate, sleep stages, sleep need and debt, and strain go into a daily log, plus a list of WHOOP workouts.

## When something fails

- "Wrong sync key": the key in the app doesn't match `SYNC_KEY` in Cloudflare. Spaces count.
- "Not set up in Cloudflare": that service's client ID or secret is missing, or you didn't redeploy after adding it.
- "not_configured": the `TOKENS` binding or `SYNC_KEY` is missing.
- A WHOOP or Withings error after login: send the message shown on the Connected Devices screen to Claude.
