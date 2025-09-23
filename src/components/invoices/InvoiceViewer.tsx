"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  FileText,
  Download,
  Edit,
  MoreVertical,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  X,
} from "lucide-react";
import { PaymentTracker } from "./PaymentTracker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface InvoiceViewerProps {
  invoice: any;
}

export function InvoiceViewer({ invoice: initialInvoice }: InvoiceViewerProps) {
  const router = useRouter();
  const [invoice, setInvoice] = useState(initialInvoice);
  const [updating, setUpdating] = useState(false);

  function getStatusColor(status: string) {
    switch (status) {
      case "DRAFT":
        return "bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20";
      case "SENT":
        return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20";
      case "PAID":
        return "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20";
      case "PARTIAL":
        return "bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20";
      case "OVERDUE":
        return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20";
      case "CANCELLED":
        return "bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20";
      case "REFUNDED":
        return "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20";
      default:
        return "bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20";
    }
  }

  function canTransitionTo(
    currentStatus: string,
    targetStatus: string
  ): boolean {
    const validTransitions: Record<string, string[]> = {
      DRAFT: ["SENT", "CANCELLED"],
      SENT: ["PAID", "PARTIAL", "OVERDUE", "CANCELLED"],
      PARTIAL: ["PAID", "OVERDUE", "CANCELLED"],
      OVERDUE: ["PAID", "PARTIAL", "CANCELLED"],
      PAID: ["REFUNDED"],
      CANCELLED: [],
      REFUNDED: [],
    };

    return validTransitions[currentStatus]?.includes(targetStatus) || false;
  }

  async function updateInvoiceStatus(newStatus: string) {
    try {
      setUpdating(true);
      const res = await fetch(`/api/invoices/${invoice.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update status");
      }

      const updatedInvoice = await res.json();
      setInvoice(updatedInvoice);
      toast.success(`Invoice marked as ${newStatus.toLowerCase()}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update invoice status");
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

  const isOverdue =
    new Date(invoice.dueDate) < new Date() &&
    invoice.status !== "PAID" &&
    invoice.status !== "CANCELLED";

  return (
    <div className="h-full">
      {/* Minimal Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{invoice.number}</h1>
          <span
            className={`text-[10px] font-medium uppercase px-2 py-1 rounded-full ${getStatusColor(invoice.status)}`}
          >
            {invoice.status}
          </span>
          <div className="text-sm text-gray-500">
            {invoice.company?.name || "No Company"} • Due{" "}
            {new Date(invoice.dueDate).toLocaleDateString()}
          </div>
          <div className="flex ml-auto items-center gap-2">
            {invoice.status === "DRAFT" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  router.push(`/dashboard/invoices/${invoice.id}/edit`)
                }
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
              Download
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={updating}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {invoice.status === "DRAFT" && (
                  <DropdownMenuItem onClick={() => updateInvoiceStatus("SENT")}>
                    <Send className="h-4 w-4 mr-2" />
                    Mark as Sent
                  </DropdownMenuItem>
                )}
                {(invoice.status === "SENT" ||
                  invoice.status === "OVERDUE") && (
                  <DropdownMenuItem onClick={() => updateInvoiceStatus("PAID")}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Paid
                  </DropdownMenuItem>
                )}
                {canTransitionTo(invoice.status, "CANCELLED") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => updateInvoiceStatus("CANCELLED")}
                      className="text-red-600"
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Cancel Invoice
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm">
              <Link href="/dashboard/invoices">
                <X className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Overdue Alert */}
      {isOverdue && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-800">
            This invoice is overdue since{" "}
            {new Date(invoice.dueDate).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* Main Content - Simple Cards */}
      <div className="grid gap-4 p-4 pt-0 lg:grid-cols-3">
        {/* Line Items - Takes 2 columns */}
        <div className="lg:col-span-2 border-r pr-4 pt-4">
          <div className="bg-white rounded-xl overflow-hidden">
            <div className="px-6 py-3.5 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Items</h3>
            </div>

            <div className="divide-y divide-gray-100">
              {invoice.lines?.map((line: any, index: number) => (
                <div key={index} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {line.name}
                      </p>
                      {line.description && (
                        <p className="text-sm text-gray-500 mt-1">
                          {line.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        {invoice.currency} {Number(line.lineTotal).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {Number(line.quantity)} × {invoice.currency}{" "}
                        {Number(line.unitPrice).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="bg-gray-50 px-6 py-4">
              <div className="space-y-2 max-w-xs ml-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>
                    {invoice.currency} {Number(invoice.subtotal).toFixed(2)}
                  </span>
                </div>
                {Number(invoice.taxTotal) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span>
                      {invoice.currency} {Number(invoice.taxTotal).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span>
                    {invoice.currency} {Number(invoice.total).toFixed(2)}
                  </span>
                </div>
                {Number(invoice.amountPaid) > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Paid</span>
                      <span>
                        -{invoice.currency}{" "}
                        {Number(invoice.amountPaid).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Due</span>
                      <span
                        className={
                          Number(invoice.amountDue) > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }
                      >
                        {invoice.currency}{" "}
                        {Number(invoice.amountDue).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Payments Section - Always visible for non-draft invoices */}
          <div className="mt-4 bg-white rounded-xl overflow-hidden0">
            <div className="px-6 py-3.5 rounded-t-xl bg-gray-50 ">
              <h3 className="text-sm font-semibold text-gray-900">
                Payment Tracking
              </h3>
            </div>
            <div className="p-6">
              <PaymentTracker
                invoiceId={invoice.id}
                currency={invoice.currency}
                amountDue={Number(invoice.amountDue || 0)}
                status={invoice.status}
                onPaymentAdded={refreshInvoice}
              />
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="space-y-4 pt-4">
          {/* Customer */}
          <div className="bg-white rounded-xl overflow-hidden">
            <div className="px-6 bg-gray-50 rounded-t-xl py-3.5">
              <h3 className="text-sm font-semibold text-gray-900">Customer</h3>
            </div>
            <div className="px-6 py-4">
              <p className="font-medium text-sm">
                {invoice.company?.name || "No Company"}
              </p>
              {invoice.contact && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>{invoice.contact.name}</p>
                  {invoice.contact.email && (
                    <p className="text-xs">{invoice.contact.email}</p>
                  )}
                  {invoice.contact.phone && (
                    <p className="text-xs">{invoice.contact.phone}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-xl overflow-hidden">
            <div className="px-6 py-3.5 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Details</h3>
            </div>
            <div className="px-6 py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Invoice Date</span>
                <span>{new Date(invoice.issueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Due Date</span>
                <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                  {new Date(invoice.dueDate).toLocaleDateString()}
                </span>
              </div>
              {invoice.paymentTerms && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Terms</span>
                  <span>{invoice.paymentTerms}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {(invoice.notesCustomer || invoice.notesInternal) && (
        <div className="mt-6 bg-white rounded-xl overflow-hidden">
          <div className="px-6 pt-5 pb-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Notes</h3>
          </div>
          <div className="px-6 py-4 space-y-4">
            {invoice.notesCustomer && (
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
                  Customer Notes
                </p>
                <p className="text-sm text-gray-700">{invoice.notesCustomer}</p>
              </div>
            )}
            {invoice.notesInternal && (
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
                  Internal Notes
                </p>
                <p className="text-sm text-gray-500">{invoice.notesInternal}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
