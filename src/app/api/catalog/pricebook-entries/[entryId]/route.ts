import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { deletePriceBookEntry, updatePriceBookEntry } from "@/lib/catalog/service";

export async function PATCH(req: NextRequest, { params }: { params: { entryId: string } }) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const updated = await updatePriceBookEntry(session, params.entryId, body);
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to update entry" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { entryId: string } }) {
  try {
    const session = await requireAuth();
    const res = await deletePriceBookEntry(session, params.entryId);
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to delete entry" }, { status: 400 });
  }
}
