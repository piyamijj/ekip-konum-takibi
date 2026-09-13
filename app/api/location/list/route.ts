import { NextResponse } from "next/server";
import { listMembersWithLocations } from "@/lib/store";

export async function GET() {
  const members = await listMembersWithLocations();
  return NextResponse.json({ members }, { status: 200 });
}