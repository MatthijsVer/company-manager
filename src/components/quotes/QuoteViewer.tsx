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
  Edit,
  Building,
  User,
  Mail,
  Phone
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface QuoteViewerProps {
  quote: any;
}

export function QuoteViewer({ quote: initialQuote }: QuoteViewerProps) {
  const router = useRouter();
  const [quote, setQuote] = useState(initialQuote);
  const [updating, setUpdating] = useState(false);

  function getStatusBadge(status: string) {
    const config = {
      DRAFT: { className: "bg-gray-100 text-gray-800", label: "Draft" },
      SENT: { className: "bg-blue-100 text-blue-800", label: "Sent" },
      ACCEPTED: { className: "bg-green-100 text-green-800", label: "Accepted" },
      REJECTED: { className: "bg-red-100 text-red-800", label: "Rejected" },
      EXPIRED: { className: "bg-orange-100 text-orange-800", label: "Expired" },
      CANCELLED: { className: "bg-gray-100 text-gray-800", label: "Cancelled" },
    };
    
    const { className, label } = config[status as keyof typeof config] || config.DRAFT;
    
    return <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${className}`}>{label}</span>;
  }

  function canTransitionTo(currentStatus: string, targetStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['SENT', 'CANCELLED'],
      SENT: ['ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
      ACCEPTED: ['CANCELLED'], // Only allow cancellation of accepted quotes
      REJECTED: [], // Final state
      EXPIRED: [], // Final state
      CANCELLED: [], // Final state
    };
    
    return validTransitions[currentStatus]?.includes(targetStatus) || false;
  }

  async function updateQuoteStatus(newStatus: string) {
    try {
      setUpdating(true);
      const res = await fetch(`/api/quotes/${quote.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update status');
      }

      const updatedQuote = await res.json();
      setQuote(updatedQuote);
      toast.success(`Quote status updated to ${newStatus.toLowerCase()}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update quote status');
    } finally {
      setUpdating(false);
    }
  }

  async function convertToInvoice() {
    try {
      setUpdating(true);
      const res = await fetch(`/api/quotes/${quote.id}/convert-to-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to convert to invoice');
      }

      const invoice = await res.json();
      toast.success(`Quote converted to invoice ${invoice.number}`);
      router.push(`/dashboard/invoices/${invoice.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to convert to invoice');
    } finally {
      setUpdating(false);
    }
  }

  const isExpired = quote.validUntil && new Date(quote.validUntil) < new Date() && quote.status !== 'ACCEPTED' && quote.status !== 'REJECTED';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{quote.number}</h1>
            <p className="text-muted-foreground">
              Created {new Date(quote.createdAt).toLocaleDateString()}
            </p>
          </div>
          {getStatusBadge(quote.status)}
        </div>
        <div className="flex gap-2">
          {quote.status === 'DRAFT' && (
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/quotes/${quote.id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          
          {quote.status === 'ACCEPTED' && (
            <Button
              onClick={convertToInvoice}
              disabled={updating}
            >
              <FileText className="h-4 w-4 mr-2" />
              {updating ? "Converting..." : "Convert to Invoice"}
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={updating}>
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Quick actions based on current status */}
              {quote.status === 'DRAFT' && canTransitionTo(quote.status, 'SENT') && (
                <DropdownMenuItem onClick={() => updateQuoteStatus('SENT')}>
                  <Send className="h-4 w-4 mr-2" />
                  Mark as Sent
                </DropdownMenuItem>
              )}
              
              {quote.status === 'SENT' && (
                <>
                  <DropdownMenuItem onClick={() => updateQuoteStatus('ACCEPTED')}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Accepted
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateQuoteStatus('REJECTED')}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Mark as Rejected
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateQuoteStatus('EXPIRED')}>
                    <Clock className="h-4 w-4 mr-2" />
                    Mark as Expired
                  </DropdownMenuItem>
                </>
              )}
              
              {quote.status === 'ACCEPTED' && (
                <>
                  <DropdownMenuItem onClick={convertToInvoice} disabled={updating}>
                    <FileText className="h-4 w-4 mr-2" />
                    Convert to Invoice
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              
              {canTransitionTo(quote.status, 'CANCELLED') && (
                <DropdownMenuItem 
                  onClick={() => updateQuoteStatus('CANCELLED')}
                  className="text-red-600"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Cancel Quote
                </DropdownMenuItem>
              )}
              
              {/* Fallback if no actions are available */}
              {quote.status !== 'DRAFT' && quote.status !== 'SENT' && quote.status !== 'ACCEPTED' && !canTransitionTo(quote.status, 'CANCELLED') && (
                <DropdownMenuItem disabled>
                  No actions available
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Alert for expired quotes */}
      {isExpired && (
        <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
          <div className="flex items-center gap-2 text-orange-800">
            <Clock className="h-5 w-5" />
            <span className="font-medium">This quote has expired</span>
          </div>
          <p className="text-orange-700 text-sm mt-1">
            Quote was valid until {new Date(quote.validUntil).toLocaleDateString()}
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
              Quote For
            </h3>
            <div className="space-y-2">
              <div className="font-medium text-lg">{quote.company?.name || "No Company"}</div>
              {quote.contact && (
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {quote.contact.name}
                    {quote.contact.title && ` • ${quote.contact.title}`}
                  </div>
                  {quote.contact.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {quote.contact.email}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quote Lines */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/30 p-4 border-b">
              <h3 className="font-semibold">Quote Items</h3>
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
                  {quote.lines?.map((line: any, index: number) => (
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
                        {quote.currency} {Number(line.unitPrice).toFixed(2)}
                      </td>
                      <td className="p-4 text-right font-medium">
                        {quote.currency} {Number(line.lineTotal).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {(quote.notesCustomer || quote.notesInternal) && (
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold mb-4">Notes</h3>
              {quote.notesCustomer && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Customer Notes</h4>
                  <p className="text-sm">{quote.notesCustomer}</p>
                </div>
              )}
              {quote.notesInternal && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Internal Notes</h4>
                  <p className="text-sm text-muted-foreground">{quote.notesInternal}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quote Details */}
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Quote Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(quote.createdAt).toLocaleDateString()}</span>
              </div>
              {quote.validUntil && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valid Until</span>
                  <span className={isExpired ? "text-orange-600 font-medium" : ""}>
                    {new Date(quote.validUntil).toLocaleDateString()}
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
                <span>{quote.currency} {Number(quote.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{quote.currency} {Number(quote.taxTotal).toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>{quote.currency} {Number(quote.total).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}