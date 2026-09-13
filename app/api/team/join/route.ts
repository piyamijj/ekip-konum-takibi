import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { INVITE_CODE, MAX_TEAM_MEMBERS } from "@/lib/config";
import { countMembers, createMember, getMemberByName } from "@/lib/store";
import type { JoinRequestBody, JoinResponseBody, TeamMember } from "@/lib/types";

export async function POST(request: NextRequest) {
  let body: JoinRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const inviteCode = (body.inviteCode ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Lütfen adınızı girin." }, { status: 400 });
  }

  if (!inviteCode || inviteCode !== INVITE_CODE) {
    return NextResponse.json({ error: "Davet kodu geçersiz." }, { status: 401 });
  }

  const existing = await getMemberByName(name);
  if (existing) {
    const response: JoinResponseBody = {
      memberId: existing.id,
      name: existing.name,
      sharingEnabled: existing.sharingEnabled,
    };
    return NextResponse.json(response, { status: 200 });
  }

  const currentCount = await countMembers();
  if (currentCount >= MAX_TEAM_MEMBERS) {
    return NextResponse.json(
      {
        error: `Bu ekip en fazla ${MAX_TEAM_MEMBERS} kişi için yapılandırılmış. Yeni üye eklemek için lib/config.ts içindeki MAX_TEAM_MEMBERS değerini artırın.`,
      },
      { status: 403 }
    );
  }

  const member: TeamMember = {
    id: nanoid(12),
    name,
    joinedAt: new Date().toISOString(),
    sharingEnabled: false,
  };

  await createMember(member);

  const response: JoinResponseBody = {
    memberId: member.id,
    name: member.name,
    sharingEnabled: member.sharingEnabled,
  };

  return NextResponse.json(response, { status: 201 });
}