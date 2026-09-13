import { NextRequest, NextResponse } from "next/server";
import { getMember, setSharingEnabled, upsertLocation } from "@/lib/store";
import type { LocationUpdateRequestBody } from "@/lib/types";

export async function POST(request: NextRequest) {
  let body: LocationUpdateRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const { memberId, latitude, longitude, accuracy, sharingEnabled } = body;

  if (!memberId) {
    return NextResponse.json({ error: "memberId gerekli." }, { status: 400 });
  }

  const member = await getMember(memberId);
  if (!member) {
    return NextResponse.json({ error: "Üye bulunamadı. Lütfen tekrar katılın." }, { status: 404 });
  }

  // Consent is checked on every single update, not just at join time.
  // If sharing has been turned off (revoked), no location is stored,
  // even if a stray request slips through from a client that has not
  // caught up with the toggle state yet.
  if (typeof sharingEnabled === "boolean" && sharingEnabled !== member.sharingEnabled) {
    await setSharingEnabled(memberId, sharingEnabled);
  }

  const currentMember = await getMember(memberId);
  if (!currentMember?.sharingEnabled) {
    return NextResponse.json(
      { ok: true, stored: false, reason: "Konum paylaşımı kapalı, konum kaydedilmedi." },
      { status: 200 }
    );
  }

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return NextResponse.json({ error: "Geçerli bir konum (latitude, longitude) gerekli." }, { status: 400 });
  }

  const record = await upsertLocation({
    memberId,
    latitude,
    longitude,
    accuracy,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, stored: true, location: record }, { status: 200 });
}