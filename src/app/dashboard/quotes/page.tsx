// app/dashboard/quotes/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

async function getQuotes() {
  const session = await getSession();
  if (!session?.organizationId) return [];

  return prisma.quote.findMany({
    where: { organizationId: session.organizationId },
    select: {
      id: true,
      number: true,
      status: true,
      currency: true,
      total: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function QuotesPage() {
  const quotes = await getQuotes();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Quotes</h1>
        <form action="/dashboard/quotes/new">
          <Button>New quote</Button>
        </form>
      </div>

      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2">Number</th>
              <th className="text-left p-2">Status</th>
              <th className="text-right p-2">Total</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} className="border-t">
                <td className="p-2">{q.number}</td>
                <td className="p-2">{q.status}</td>
                <td className="p-2 text-right">
                  {q.currency} {Number(q.total ?? 0).toFixed(2)}
                </td>
                <td className="p-2 text-right">
                  <Link
                    className="underline"
                    href={`/dashboard/quotes/${q.id}`}
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {!quotes.length && (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={4}>
                  No quotes yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
