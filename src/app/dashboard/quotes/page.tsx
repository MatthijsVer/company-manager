// app/dashboard/quotes/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { formatDistanceToNow } from "date-fns";
import { Plus, FileText, Clock, CheckCircle, XCircle, Send, Ban, AlertTriangle } from "lucide-react";
import { processExpiredQuotes } from "@/lib/quote-expiration";
import { QuickConvertButton } from "@/components/quotes/QuickConvertButton";

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
      validUntil: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

function getStatusBadge(status: string) {
  const config = {
    DRAFT: { variant: "secondary" as const, icon: FileText, label: "Draft" },
    SENT: { variant: "default" as const, icon: Send, label: "Sent" },
    ACCEPTED: { variant: "default" as const, icon: CheckCircle, label: "Accepted" },
    REJECTED: { variant: "destructive" as const, icon: XCircle, label: "Rejected" },
    EXPIRED: { variant: "outline" as const, icon: Clock, label: "Expired" },
    CANCELLED: { variant: "outline" as const, icon: Ban, label: "Cancelled" },
  };
  
  const { variant, icon: Icon, label } = config[status as keyof typeof config] || config.DRAFT;
  
  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function isExpired(validUntil: Date | null): boolean {
  if (!validUntil) return false;
  return new Date() > validUntil;
}

function isExpiringSoon(validUntil: Date | null, days: number = 3): boolean {
  if (!validUntil) return false;
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  return new Date() < validUntil && validUntil <= futureDate;
}

export default async function QuotesPage() {
  // Process expired quotes before showing the page
  await processExpiredQuotes();
  
  const quotes = await getQuotes();
  
  // Separate quotes by status for better organization
  const draftQuotes = quotes.filter(q => q.status === 'DRAFT');
  const activeQuotes = quotes.filter(q => ['SENT'].includes(q.status));
  const completedQuotes = quotes.filter(q => ['ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'].includes(q.status));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quotes</h1>
          <p className="text-muted-foreground">Manage your sales quotes and proposals</p>
        </div>
        <Link href="/dashboard/quotes/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Quote
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Draft</p>
              <p className="text-2xl font-semibold">{draftQuotes.length}</p>
            </div>
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-semibold">{activeQuotes.length}</p>
            </div>
            <Send className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Accepted</p>
              <p className="text-2xl font-semibold">{quotes.filter(q => q.status === 'ACCEPTED').length}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-semibold">
                {quotes[0]?.currency || 'EUR'} {quotes.reduce((sum, q) => sum + Number(q.total || 0), 0).toFixed(2)}
              </p>
            </div>
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">All Quotes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">Quote</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Valid Until</th>
                <th className="text-right p-4 font-medium">Total</th>
                <th className="text-left p-4 font-medium">Updated</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => {
                const expired = isExpired(quote.validUntil);
                const expiringSoon = isExpiringSoon(quote.validUntil);
                return (
                  <tr key={quote.id} className="border-t hover:bg-muted/25 transition-colors">
                    <td className="p-4">
                      <div className="font-medium">{quote.number}</div>
                      <div className="text-sm text-muted-foreground">
                        Created {formatDistanceToNow(new Date(quote.createdAt))} ago
                      </div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(quote.status)}
                      {expired && quote.status === 'SENT' && (
                        <Badge variant="destructive" className="ml-2">
                          <Clock className="h-3 w-3 mr-1" />
                          Expired
                        </Badge>
                      )}
                      {expiringSoon && quote.status === 'SENT' && !expired && (
                        <Badge variant="outline" className="ml-2 border-orange-500 text-orange-700">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Expires Soon
                        </Badge>
                      )}
                    </td>
                    <td className="p-4">
                      {quote.validUntil ? (
                        <div className={`text-sm ${
                          expired ? 'text-red-600 font-medium' : 
                          expiringSoon ? 'text-orange-600 font-medium' : 
                          'text-muted-foreground'
                        }`}>
                          {new Date(quote.validUntil).toLocaleDateString()}
                          {expiringSoon && !expired && (
                            <div className="text-xs text-orange-600">
                              ({Math.ceil((new Date(quote.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left)
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No expiration</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-medium">
                        {quote.currency} {Number(quote.total || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(quote.updatedAt))} ago
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Link href={`/dashboard/quotes/${quote.id}`}>
                          <Button variant="outline" size="sm">
                            Open
                          </Button>
                        </Link>
                        {quote.status === 'ACCEPTED' && (
                          <QuickConvertButton quoteId={quote.id} quoteName={quote.number} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!quotes.length && (
                <tr>
                  <td className="p-8 text-center text-muted-foreground" colSpan={6}>
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <div className="text-lg font-medium mb-2">No quotes yet</div>
                    <div className="text-sm">Create your first quote to get started</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
