// In-memory data store for team members and their locations.
//
// This is intentionally a thin abstraction so it can be swapped for a real
// database (Vercel Postgres, Supabase, etc.) without touching the API route
// handlers. Every function here is async on purpose, even though the current
// implementation is synchronous in-memory storage — this matches the shape
// a real DB client would have, so migrating later only means rewriting the
// bodies of these functions, not their call sites.
//
// NOTE: In-memory storage does NOT persist across server restarts or across
// multiple serverless instances (e.g. on Vercel, each invocation may hit a
// different lambda instance). For a real multi-user deployment, replace this
// with a persistent store (see README.md, "Gerçek Veritabanına Geçiş").

import type { LocationRecord, MemberWithLocation, TeamMember } from "./types";

// Global singletons survive hot-reloads in dev, but are still per-process.
declare global {
  // eslint-disable-next-line no-var
  var __teamMembers: Map<string, TeamMember> | undefined;
  // eslint-disable-next-line no-var
  var __memberLocations: Map<string, LocationRecord> | undefined;
}

const teamMembers: Map<string, TeamMember> =
  global.__teamMembers ?? new Map<string, TeamMember>();
const memberLocations: Map<string, LocationRecord> =
  global.__memberLocations ?? new Map<string, LocationRecord>();

if (process.env.NODE_ENV !== "production") {
  global.__teamMembers = teamMembers;
  global.__memberLocations = memberLocations;
}

export async function createMember(member: TeamMember): Promise<TeamMember> {
  teamMembers.set(member.id, member);
  return member;
}

export async function getMember(memberId: string): Promise<TeamMember | null> {
  return teamMembers.get(memberId) ?? null;
}

export async function getMemberByName(name: string): Promise<TeamMember | null> {
  const normalized = name.trim().toLowerCase();
  for (const member of teamMembers.values()) {
    if (member.name.trim().toLowerCase() === normalized) {
      return member;
    }
  }
  return null;
}

export async function setSharingEnabled(
  memberId: string,
  sharingEnabled: boolean
): Promise<TeamMember | null> {
  const member = teamMembers.get(memberId);
  if (!member) return null;
  const updated: TeamMember = { ...member, sharingEnabled };
  teamMembers.set(memberId, updated);

  // Consent is revocable at any time: if sharing is turned off, immediately
  // drop the last known location instead of keeping a stale/frozen pin.
  if (!sharingEnabled) {
    memberLocations.delete(memberId);
  }

  return updated;
}

export async function upsertLocation(record: LocationRecord): Promise<LocationRecord> {
  memberLocations.set(record.memberId, record);
  return record;
}

export async function clearLocation(memberId: string): Promise<void> {
  memberLocations.delete(memberId);
}

export async function listMembersWithLocations(): Promise<MemberWithLocation[]> {
  return Array.from(teamMembers.values()).map((member) => ({
    ...member,
    location: member.sharingEnabled ? memberLocations.get(member.id) ?? null : null,
  }));
}

export async function countMembers(): Promise<number> {
  return teamMembers.size;
}