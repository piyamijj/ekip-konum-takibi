// Data store for team members and their locations.
//
// This is backed by Upstash Redis (via the official @upstash/redis SDK) so
// data persists across serverless invocations and multiple instances —
// required for a real Vercel deployment, where each request may hit a
// different lambda instance and plain in-memory storage would appear to
// randomly "forget" members and locations.
//
// Vercel's Storage > Upstash for Redis integration provisions these two
// environment variables automatically once connected to the project:
//   KV_REST_API_URL
//   KV_REST_API_TOKEN
//
// When those are not present (e.g. local development without `vercel env
// pull` / without a linked Redis database), this falls back to a simple
// in-memory Map so `npm run dev` still works out of the box. Every function
// is async so callers never need to know which backend is actually in use.
//
// The Redis client is created with a static import and a concrete type
// (Redis | null) rather than a dynamically-imported `any` — calling a
// generic method like `.get<T>()` on an untyped (`any`) value is rejected
// by TypeScript ("Untyped function calls may not accept type arguments"),
// which is exactly what broke the previous @vercel/kv-based version.
//
// See README.md, "Vercel KV Kurulumu" for how to attach a real Upstash
// Redis database to your Vercel project.

import { Redis } from "@upstash/redis";
import type { LocationRecord, MemberWithLocation, TeamMember } from "./types";

const KV_MEMBER_PREFIX = "member:";
const KV_MEMBER_BY_NAME_PREFIX = "member:byname:";
const KV_LOCATION_PREFIX = "location:";
const KV_MEMBER_INDEX_KEY = "members:index";

const redisUrl = process.env.KV_REST_API_URL;
const redisToken = process.env.KV_REST_API_TOKEN;

const redis: Redis | null =
  redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const hasRedis = redis !== null;

// ---------------------------------------------------------------------------
// In-memory fallback (local dev only — not used when Redis env vars are set)
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __teamMembers: Map<string, TeamMember> | undefined;
  // eslint-disable-next-line no-var
  var __memberLocations: Map<string, LocationRecord> | undefined;
}

const memoryMembers: Map<string, TeamMember> =
  global.__teamMembers ?? new Map<string, TeamMember>();
const memoryLocations: Map<string, LocationRecord> =
  global.__memberLocations ?? new Map<string, LocationRecord>();

if (process.env.NODE_ENV !== "production") {
  global.__teamMembers = memoryMembers;
  global.__memberLocations = memoryLocations;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Public API — same signatures regardless of backend
// ---------------------------------------------------------------------------

export async function createMember(member: TeamMember): Promise<TeamMember> {
  if (hasRedis && redis) {
    await redis.set(`${KV_MEMBER_PREFIX}${member.id}`, member);
    await redis.set(`${KV_MEMBER_BY_NAME_PREFIX}${normalizeName(member.name)}`, member.id);
    await redis.sadd(KV_MEMBER_INDEX_KEY, member.id);
    return member;
  }

  memoryMembers.set(member.id, member);
  return member;
}

export async function getMember(memberId: string): Promise<TeamMember | null> {
  if (hasRedis && redis) {
    const member = await redis.get<TeamMember>(`${KV_MEMBER_PREFIX}${memberId}`);
    return member ?? null;
  }

  return memoryMembers.get(memberId) ?? null;
}

export async function getMemberByName(name: string): Promise<TeamMember | null> {
  const normalized = normalizeName(name);

  if (hasRedis && redis) {
    const memberId = await redis.get<string>(`${KV_MEMBER_BY_NAME_PREFIX}${normalized}`);
    if (!memberId) return null;
    return getMember(memberId);
  }

  for (const member of memoryMembers.values()) {
    if (normalizeName(member.name) === normalized) {
      return member;
    }
  }
  return null;
}

export async function setSharingEnabled(
  memberId: string,
  sharingEnabled: boolean
): Promise<TeamMember | null> {
  if (hasRedis && redis) {
    const member = await redis.get<TeamMember>(`${KV_MEMBER_PREFIX}${memberId}`);
    if (!member) return null;

    const updated: TeamMember = { ...member, sharingEnabled };
    await redis.set(`${KV_MEMBER_PREFIX}${memberId}`, updated);

    // Consent is revocable at any time: if sharing is turned off, immediately
    // drop the last known location instead of keeping a stale/frozen pin.
    if (!sharingEnabled) {
      await redis.del(`${KV_LOCATION_PREFIX}${memberId}`);
    }

    return updated;
  }

  const member = memoryMembers.get(memberId);
  if (!member) return null;
  const updated: TeamMember = { ...member, sharingEnabled };
  memoryMembers.set(memberId, updated);

  if (!sharingEnabled) {
    memoryLocations.delete(memberId);
  }

  return updated;
}

export async function upsertLocation(record: LocationRecord): Promise<LocationRecord> {
  if (hasRedis && redis) {
    await redis.set(`${KV_LOCATION_PREFIX}${record.memberId}`, record);
    return record;
  }

  memoryLocations.set(record.memberId, record);
  return record;
}

export async function clearLocation(memberId: string): Promise<void> {
  if (hasRedis && redis) {
    await redis.del(`${KV_LOCATION_PREFIX}${memberId}`);
    return;
  }

  memoryLocations.delete(memberId);
}

export async function listMembersWithLocations(): Promise<MemberWithLocation[]> {
  if (hasRedis && redis) {
    const memberIds = await redis.smembers(KV_MEMBER_INDEX_KEY);
    if (!memberIds || memberIds.length === 0) return [];

    const members = await Promise.all(
      memberIds.map((id) => redis.get<TeamMember>(`${KV_MEMBER_PREFIX}${id}`))
    );

    const results = await Promise.all(
      members
        .filter((m): m is TeamMember => Boolean(m))
        .map(async (member) => {
          const location = member.sharingEnabled
            ? (await redis.get<LocationRecord>(`${KV_LOCATION_PREFIX}${member.id}`)) ?? null
            : null;
          return { ...member, location };
        })
    );

    return results;
  }

  return Array.from(memoryMembers.values()).map((member) => ({
    ...member,
    location: member.sharingEnabled ? memoryLocations.get(member.id) ?? null : null,
  }));
}

export async function countMembers(): Promise<number> {
  if (hasRedis && redis) {
    const memberIds = await redis.smembers(KV_MEMBER_INDEX_KEY);
    return memberIds?.length ?? 0;
  }

  return memoryMembers.size;
}