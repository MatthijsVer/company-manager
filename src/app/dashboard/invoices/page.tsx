import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Edit, FileText } from "lucide-react";
import Link from "next/link";

async function getInvoices(organizationId: string) {
  return prisma.invoice.findMany({
    where: { organizationId },
    include: {
      company: {
        select: { name: true }
      },
      contact: {
        select: { name: true, email: true }
      },
      creator: {
        select: { name: true }
      },
      quote: {
        select: { number: true }
      },
      _count: {
        select: { payments: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

function getStatusBadge(status: string) {
  const config = {
    DRAFT: { className: "bg-gray-100 text-gray-800", label: "Draft" },
    SENT: { className: "bg-blue-100 text-blue-800", label: "Sent" },
    PAID: { className: "bg-green-100 text-green-800", label: "Paid" },
    PARTIAL: { className: "bg-yellow-100 text-yellow-800", label: "Partial" },
    OVERDUE: { className: "bg-red-100 text-red-800", label: "Overdue" },
    CANCELLED: { className: "bg-gray-100 text-gray-800", label: "Cancelled" },
    REFUNDED: { className: "bg-purple-100 text-purple-800", label: "Refunded" },
  };
  
  const { className, label } = config[status as keyof typeof config] || config.DRAFT;
  
  return <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${className}`}>{label}</span>;
}

export default async function InvoicesPage() {
  const session = await requireAuth();
  const invoices = await getInvoices(session.organizationId!);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-muted-foreground">
            Manage your invoices and billing
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/invoices/new">
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Link>
          </Button>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Invoice</th>
              <th className="text-left p-3 font-medium">Customer</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-right p-3 font-medium">Total</th>
              <th className="text-left p-3 font-medium">Due Date</th>
              <th className="text-left p-3 font-medium">Created</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-t hover:bg-muted/25">
                <td className="p-3">
                  <div className="flex flex-col">
                    <span className="font-medium">{invoice.number}</span>
                    {invoice.quote && (
                      <span className="text-xs text-muted-foreground">
                        From {invoice.quote.number}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {invoice.company?.name || "No Company"}
                    </span>
                    {invoice.contact && (
                      <span className="text-xs text-muted-foreground">
                        {invoice.contact.name}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  {getStatusBadge(invoice.status)}
                </td>
                <td className="p-3 text-right font-medium">
                  {invoice.currency} {Number(invoice.total).toFixed(2)}
                </td>
                <td className="p-3">
                  <span className={`text-sm ${
                    new Date(invoice.dueDate) < new Date() && invoice.status !== 'PAID' 
                      ? 'text-red-600 font-medium' 
                      : 'text-muted-foreground'
                  }`}>
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">
                  {new Date(invoice.createdAt).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <Link href={`/dashboard/invoices/${invoice.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    {invoice.status === 'DRAFT' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <Link href={`/dashboard/invoices/${invoice.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-3">
                    <FileText className="h-8 w-8" />
                    <div>
                      <h3 className="font-medium">No invoices yet</h3>
                      <p className="text-sm">Create your first invoice to get started.</p>
                    </div>
                    <Button asChild>
                      <Link href="/dashboard/invoices/new">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Invoice
                      </Link>
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}