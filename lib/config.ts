// Application configuration for the consent-based team location app.
//
// These are safe, non-secret defaults. Nothing here is an API key or
// credential — real secrets belong in environment variables only
// (see .env.local.example), never in source code.

// Shared invite code new team members type in to join the dashboard.
// Change this to your own value, or better: set INVITE_CODE in your
// environment and read it from there for a real deployment.
export const INVITE_CODE = process.env.INVITE_CODE ?? "EKIP2024";

// This app is designed for a small team (the user + a few teammates).
// Keep it small on purpose — this is a consensual team tool, not a
// general-purpose tracking platform.
export const MAX_TEAM_MEMBERS = Number(process.env.MAX_TEAM_MEMBERS ?? 4);

// How often (in milliseconds) a device is expected to send a location
// update while the dashboard tab or the PWA is open and sharing is on.
export const LOCATION_UPDATE_INTERVAL_MS = Number(
  process.env.NEXT_PUBLIC_LOCATION_UPDATE_INTERVAL_MS ?? 45000
);

// If a member's last update is older than this, the dashboard shows them
// as "stale" / offline rather than pinning a possibly outdated location.
export const STALE_THRESHOLD_MS = Number(
  process.env.STALE_THRESHOLD_MS ?? 120000
);

// How often the dashboard polls the server for fresh member locations.
export const DASHBOARD_POLL_INTERVAL_MS = Number(
  process.env.NEXT_PUBLIC_DASHBOARD_POLL_INTERVAL_MS ?? 15000
);