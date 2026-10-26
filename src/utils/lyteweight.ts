// Lyteweight-specific settings for this fork of Liftosaur (https://github.com/astashov/liftosaur).

declare let __LOCAL_ONLY__: boolean | undefined;

export const Lyteweight_appName = "Lyteweight";
export const Lyteweight_sourceCodeUrl = "https://github.com/barely-ai/Lyteweight";
export const Lyteweight_upstreamUrl = "https://github.com/astashov/liftosaur";

/**
 * True when the app is built without a backend: all data stays on the device, cloud sign-in and sync are
 * unavailable, and features that upstream gates behind a paid subscription are unlocked.
 */
export function Lyteweight_isLocalOnly(): boolean {
  return typeof __LOCAL_ONLY__ !== "undefined" && !!__LOCAL_ONLY__;
}
