import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { updateVariant, deleteVariant } from "@/lib/catalog/service";

export async function PATCH(req: NextRequest, { params }: { params: { variantId: string } }) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const updated = await updateVariant(session, params.variantId, body);
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to update variant" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { variantId: string } }) {
  try {
    const session = await requireAuth();
    const res = await deleteVariant(session, params.variantId);
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to delete variant" }, { status: 400 });
  }
}
