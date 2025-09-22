// app/dashboard/quotes/new/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

function nextNumber(seed: number) {
  // very basic; replace with org-scoped sequence table later
  return `Q-${new Date().getFullYear()}-${String(seed).padStart(5, "0")}`;
}

export default async function NewQuote() {
  const session = await getSession();
  if (!session?.organizationId || !session?.userId) {
    throw new Error("Unauthorized");
  }

  // naive sequence using count (OK for now)
  const count = await prisma.quote.count({ 
    where: { organizationId: session.organizationId }
  });
  const number = nextNumber(count + 1);

  const quote = await prisma.quote.create({
    data: {
      organizationId: session.organizationId,
      number,
      currency: "EUR",
      priceBookId: null,
      companyId: null,
      contactId: null,
      validUntil: null,
      createdBy: session.userId,
    },
  });

  redirect(`/dashboard/quotes/${quote.id}`);
}
