"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Ban, 
  Calendar, 
  FileText, 
  Download,
  Edit,
  Building,
  User,
  Mail,
  Phone
} from "lucide-react";
import { PaymentTracker } from "./PaymentTracker";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface InvoiceViewerProps {
  invoice: any;
}

export function InvoiceViewer({ invoice: initialInvoice }: InvoiceViewerProps) {
  const router = useRouter();
  const [invoice, setInvoice] = useState(initialInvoice);
  const [updating, setUpdating] = useState(false);

  function getStatusBadge(status: string) {
    const config = {
      DRAFT: { variant: "secondary" as const, icon: FileText, label: "Draft", color: "bg-gray-100 text-gray-800" },
      SENT: { variant: "default" as const, icon: Send, label: "Sent", color: "bg-blue-100 text-blue-800" },
      PAID: { variant: "default" as const, icon: CheckCircle, label: "Paid", color: "bg-green-100 text-green-800" },
      PARTIAL: { variant: "outline" as const, icon: Clock, label: "Partial", color: "bg-yellow-100 text-yellow-800" },
      OVERDUE: { variant: "destructive" as const, icon: XCircle, label: "Overdue", color: "bg-red-100 text-red-800" },
      CANCELLED: { variant: "outline" as const, icon: Ban, label: "Cancelled", color: "bg-gray-100 text-gray-800" },
      REFUNDED: { variant: "outline" as const, icon: XCircle, label: "Refunded", color: "bg-purple-100 text-purple-800" },
    };
    
    const { icon: Icon, label, color } = config[status as keyof typeof config] || config.DRAFT;
    
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${color}`}>
        <Icon className="h-4 w-4" />
        {label}
      </div>
    );
  }

  function canTransitionTo(currentStatus: string, targetStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['SENT', 'CANCELLED'],
      SENT: ['PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'],
      PARTIAL: ['PAID', 'OVERDUE', 'CANCELLED'],
      OVERDUE: ['PAID', 'PARTIAL', 'CANCELLED'],
      PAID: ['REFUNDED'],
      CANCELLED: [],
      REFUNDED: [],
    };
    
    return validTransitions[currentStatus]?.includes(targetStatus) || false;
  }

  async function updateInvoiceStatus(newStatus: string) {
    try {
      setUpdating(true);
      const res = await fetch(`/api/invoices/${invoice.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update status');
      }

      const updatedInvoice = await res.json();
      setInvoice(updatedInvoice);
      toast.success(`Invoice status updated to ${newStatus.toLowerCase()}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update invoice status');
    } finally {
      setUpdating(false);
    }
  }

  async function refreshInvoice() {
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`);
      if (res.ok) {
        const updatedInvoice = await res.json();
        setInvoice(updatedInvoice);
      }
    } catch (error) {
      console.error("Failed to refresh invoice:", error);
    }
  }

  const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{invoice.number}</h1>
            <p className="text-muted-foreground">
              Created {new Date(invoice.createdAt).toLocaleDateString()}
              {invoice.quote && ` • From Quote ${invoice.quote.number}`}
            </p>
          </div>
          {getStatusBadge(invoice.status)}
        </div>
        <div className="flex gap-2">
          {invoice.status === 'DRAFT' && (
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/invoices/${invoice.id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={updating}>
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {invoice.status === 'DRAFT' && canTransitionTo(invoice.status, 'SENT') && (
                <DropdownMenuItem onClick={() => updateInvoiceStatus('SENT')}>
                  <Send className="h-4 w-4 mr-2" />
                  Mark as Sent
                </DropdownMenuItem>
              )}
              
              {invoice.status === 'SENT' && (
                <>
                  <DropdownMenuItem onClick={() => updateInvoiceStatus('PAID')}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Paid
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateInvoiceStatus('PARTIAL')}>
                    <Clock className="h-4 w-4 mr-2" />
                    Mark as Partial
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateInvoiceStatus('OVERDUE')}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Mark as Overdue
                  </DropdownMenuItem>
                </>
              )}
              
              {canTransitionTo(invoice.status, 'CANCELLED') && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => updateInvoiceStatus('CANCELLED')}
                    className="text-red-600"
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Cancel Invoice
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Alert for overdue invoices */}
      {isOverdue && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center gap-2 text-red-800">
            <XCircle className="h-5 w-5" />
            <span className="font-medium">This invoice is overdue</span>
          </div>
          <p className="text-red-700 text-sm mt-1">
            Payment was due on {new Date(invoice.dueDate).toLocaleDateString()}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Building className="h-5 w-5" />
              Bill To
            </h3>
            <div className="space-y-2">
              <div className="font-medium text-lg">{invoice.company?.name || "No Company"}</div>
              {invoice.contact && (
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {invoice.contact.name}
                    {invoice.contact.title && ` • ${invoice.contact.title}`}
                  </div>
                  {invoice.contact.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {invoice.contact.email}
                    </div>
                  )}
                  {invoice.contact.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {invoice.contact.phone}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Invoice Lines */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/30 p-4 border-b">
              <h3 className="font-semibold">Invoice Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-4 font-medium">Description</th>
                    <th className="p-4 font-medium text-right w-20">Qty</th>
                    <th className="p-4 font-medium text-right w-24">Rate</th>
                    <th className="p-4 font-medium text-right w-24">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines?.map((line: any, index: number) => (
                    <tr key={index} className="border-t">
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{line.name}</div>
                          {line.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {line.description}
                            </div>
                          )}
                          {line.sku && (
                            <div className="text-xs text-muted-foreground">
                              SKU: {line.sku}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        {Number(line.quantity)} {line.unitLabel}
                      </td>
                      <td className="p-4 text-right">
                        {invoice.currency} {Number(line.unitPrice).toFixed(2)}
                      </td>
                      <td className="p-4 text-right font-medium">
                        {invoice.currency} {Number(line.lineTotal).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {(invoice.notesCustomer || invoice.notesInternal) && (
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold mb-4">Notes</h3>
              {invoice.notesCustomer && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Customer Notes</h4>
                  <p className="text-sm">{invoice.notesCustomer}</p>
                </div>
              )}
              {invoice.notesInternal && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Internal Notes</h4>
                  <p className="text-sm text-muted-foreground">{invoice.notesInternal}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Invoice Details */}
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Invoice Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issue Date</span>
                <span>{new Date(invoice.issueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date</span>
                <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                  {new Date(invoice.dueDate).toLocaleDateString()}
                </span>
              </div>
              {invoice.paymentTerms && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Terms</span>
                  <span>{invoice.paymentTerms}</span>
                </div>
              )}
              {invoice.paidDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid Date</span>
                  <span className="text-green-600 font-medium">
                    {new Date(invoice.paidDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{invoice.currency} {Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{invoice.currency} {Number(invoice.taxTotal).toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>{invoice.currency} {Number(invoice.total).toFixed(2)}</span>
                </div>
              </div>
              {Number(invoice.amountPaid) > 0 && (
                <>
                  <div className="flex justify-between text-green-600">
                    <span>Paid</span>
                    <span>-{invoice.currency} {Number(invoice.amountPaid).toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-semibold text-base">
                      <span>Amount Due</span>
                      <span className={Number(invoice.amountDue) > 0 ? "text-red-600" : "text-green-600"}>
                        {invoice.currency} {Number(invoice.amountDue).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Tracking */}
      <div className="border rounded-lg p-6">
        <PaymentTracker
          invoiceId={invoice.id}
          currency={invoice.currency}
          amountDue={Number(invoice.amountDue || 0)}
          status={invoice.status}
          onPaymentAdded={refreshInvoice}
        />
      </div>
    </div>
  );
}