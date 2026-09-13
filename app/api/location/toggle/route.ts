import { NextRequest, NextResponse } from "next/server";
import { getMember, setSharingEnabled } from "@/lib/store";
import type { ToggleSharingRequestBody } from "@/lib/types";

export async function POST(request: NextRequest) {
  let body: ToggleSharingRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const { memberId, sharingEnabled } = body;

  if (!memberId) {
    return NextResponse.json({ error: "memberId gerekli." }, { status: 400 });
  }

  if (typeof sharingEnabled !== "boolean") {
    return NextResponse.json({ error: "sharingEnabled (true/false) gerekli." }, { status: 400 });
  }

  const member = await getMember(memberId);
  if (!member) {
    return NextResponse.json({ error: "Üye bulunamadı. Lütfen tekrar katılın." }, { status: 404 });
  }

  // Consent is always revocable: turning sharing off immediately stops
  // location storage and clears the last known position (see lib/store.ts).
  const updated = await setSharingEnabled(memberId, sharingEnabled);

  return NextResponse.json(
    { ok: true, memberId: updated?.id, sharingEnabled: updated?.sharingEnabled },
    { status: 200 }
  );
}