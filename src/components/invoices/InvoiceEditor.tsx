"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Save, Send, CheckCircle, XCircle, Clock, Ban, Calendar, FileText } from "lucide-react";
import { usePriceQuote } from "@/hooks/usePriceQuote";
import { ProductSelector } from "@/components/quotes/ProductSelector";
import { PricingDetails, InlinePricingInfo } from "@/components/quotes/PricingDetails";
import { Badge } from "@/components/ui/badge";
import { PaymentTracker } from "./PaymentTracker";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

type InvoiceLine = {
  id?: string;
  productId?: string;
  variantId?: string;
  sku?: string;
  name: string;
  description?: string;
  unitId?: string;
  unitLabel?: string;
  quantity: number;
  unitPrice: number;
  discountPct?: number;
  taxRatePct?: number;
  taxAmount: number;
  lineSubtotal: number;
  lineTotal: number;
  position: number;
};

type Company = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  contacts?: Array<{
    id: string;
    name: string;
    title?: string | null;
    email?: string | null;
    isPrimary: boolean;
  }>;
};

type Contact = {
  id: string;
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  isPrimary: boolean;
};

type PriceBook = {
  id: string;
  name: string;
  currency: string;
  isDefault: boolean;
};

interface InvoiceEditorProps {
  initialInvoice: any;
  companies: Company[];
  priceBooks: PriceBook[];
  isNew?: boolean;
}

export function InvoiceEditor({ initialInvoice, companies, priceBooks, isNew = false }: InvoiceEditorProps) {
  const router = useRouter();
  const [invoice, setInvoice] = useState(initialInvoice);
  const [lines, setLines] = useState<InvoiceLine[]>(
    (initialInvoice.lines || []).map((l: any) => ({
      id: l.id,
      productId: l.productId || undefined,
      variantId: l.variantId || undefined,
      sku: l.sku || "",
      name: l.name,
      description: l.description || "",
      unitId: l.unitId || undefined,
      unitLabel: l.unitLabel || "",
      quantity: Number(l.quantity || 1),
      unitPrice: Number(l.unitPrice || 0),
      discountPct: l.discountPct ? Number(l.discountPct) : undefined,
      taxRatePct: l.taxRatePct ? Number(l.taxRatePct) : undefined,
      taxAmount: Number(l.taxAmount || 0),
      lineSubtotal: Number(l.lineSubtotal || 0),
      lineTotal: Number(l.lineTotal || 0),
      position: l.position,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [expandedPricing, setExpandedPricing] = useState<Set<number>>(new Set());
  const { quote: quotePrice } = usePriceQuote();

  async function refreshInvoice() {
    if (isNew) return;
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

  function getStatusBadge(status: string) {
    const config = {
      DRAFT: { variant: "secondary" as const, icon: FileText, label: "Draft" },
      SENT: { variant: "default" as const, icon: Send, label: "Sent" },
      PAID: { variant: "default" as const, icon: CheckCircle, label: "Paid" },
      PARTIAL: { variant: "outline" as const, icon: Clock, label: "Partial" },
      OVERDUE: { variant: "destructive" as const, icon: XCircle, label: "Overdue" },
      CANCELLED: { variant: "outline" as const, icon: Ban, label: "Cancelled" },
      REFUNDED: { variant: "outline" as const, icon: XCircle, label: "Refunded" },
    };
    
    const { variant, icon: Icon, label } = config[status as keyof typeof config] || config.DRAFT;
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
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
    }
  }

  // Fetch contacts when company changes
  useEffect(() => {
    if (!invoice.companyId) {
      setContacts([]);
      return;
    }

    async function fetchContacts() {
      setLoadingContacts(true);
      try {
        const res = await fetch(`/api/companies/${invoice.companyId}/contacts`);
        const data = await res.json();
        setContacts(data || []);
      } catch (error) {
        toast.error("Failed to load contacts");
      } finally {
        setLoadingContacts(false);
      }
    }
    fetchContacts();
  }, [invoice.companyId]);

  function addEmpty() {
    setLines((prev) => [
      ...prev,
      { 
        name: "New line", 
        quantity: 1, 
        unitPrice: 0,
        taxAmount: 0,
        lineSubtotal: 0,
        lineTotal: 0,
        position: prev.length 
      },
    ]);
  }

  function togglePricingDetails(index: number) {
    setExpandedPricing((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }

  async function saveInvoice() {
    setSaving(true);
    try {
      const url = isNew ? "/api/invoices" : `/api/invoices/${invoice.id}`;
      const method = isNew ? "POST" : "PUT";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency: invoice.currency,
          companyId: invoice.companyId,
          contactId: invoice.contactId,
          dueDate: invoice.dueDate,
          paymentTerms: invoice.paymentTerms,
          notesCustomer: invoice.notesCustomer,
          notesInternal: invoice.notesInternal,
          lines: lines.map((l) => ({ ...l })),
        }),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to save");
      
      if (isNew) {
        toast.success("Invoice created");
        router.push(`/dashboard/invoices/${json.id}`);
      } else {
        setInvoice(json);
        toast.success("Invoice saved");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  // Recalculate totals when lines change
  useEffect(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.lineSubtotal, 0);
    const taxTotal = lines.reduce((sum, line) => sum + line.taxAmount, 0);
    const total = subtotal + taxTotal;
    
    setInvoice((prev: any) => ({
      ...prev,
      subtotal,
      taxTotal,
      total,
      amountDue: total - (prev.amountPaid || 0),
    }));
  }, [lines]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">
            {isNew ? "New Invoice" : invoice.number}
          </h1>
          {!isNew && getStatusBadge(invoice.status)}
          {invoice.dueDate && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Due {new Date(invoice.dueDate).toLocaleDateString()}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addEmpty}>
            <Plus className="h-4 w-4 mr-1" />
            Add line
          </Button>
          <Button onClick={saveInvoice} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Saving..." : isNew ? "Create" : "Save"}
          </Button>
          
          {!isNew && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Actions</Button>
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
          )}
        </div>
      </div>

      {/* Invoice Configuration */}
      <div className="border rounded-md p-4 bg-muted/50 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : ''}
              onChange={(e) => {
                setInvoice((prev: any) => ({
                  ...prev,
                  dueDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                }));
              }}
              className="h-9"
            />
          </div>
          
          <div>
            <Label htmlFor="paymentTerms">Payment Terms</Label>
            <Input
              id="paymentTerms"
              value={invoice.paymentTerms || ""}
              onChange={(e) => {
                setInvoice((prev: any) => ({
                  ...prev,
                  paymentTerms: e.target.value,
                }));
              }}
              placeholder="e.g. Net 30"
            />
          </div>
          
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              value={invoice.currency}
              onChange={(e) => {
                setInvoice((prev: any) => ({
                  ...prev,
                  currency: e.target.value,
                }));
              }}
              placeholder="EUR"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="company">Company</Label>
            <Select
              value={invoice.companyId || "no-selection"}
              onValueChange={(value) => {
                const newCompanyId = value === "no-selection" ? null : value;
                setInvoice((prev: any) => ({
                  ...prev,
                  companyId: newCompanyId,
                  contactId: null,
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-selection">No company selected</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="contact">Contact</Label>
            <Select
              value={invoice.contactId || "no-selection"}
              onValueChange={(value) => {
                setInvoice((prev: any) => ({
                  ...prev,
                  contactId: value === "no-selection" ? null : value,
                }));
              }}
              disabled={!invoice.companyId || loadingContacts}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !invoice.companyId
                      ? "Select company first"
                      : loadingContacts
                        ? "Loading..."
                        : "Select contact"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-selection">No contact selected</SelectItem>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name}
                    {contact.title && (
                      <span className="text-muted-foreground"> - {contact.title}</span>
                    )}
                    {contact.isPrimary && (
                      <span className="ml-1 text-xs text-blue-600">(Primary)</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="notesCustomer">Customer Notes</Label>
            <Textarea
              id="notesCustomer"
              value={invoice.notesCustomer || ""}
              onChange={(e) => {
                setInvoice((prev: any) => ({
                  ...prev,
                  notesCustomer: e.target.value,
                }));
              }}
              placeholder="Notes visible to customer"
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="notesInternal">Internal Notes</Label>
            <Textarea
              id="notesInternal"
              value={invoice.notesInternal || ""}
              onChange={(e) => {
                setInvoice((prev: any) => ({
                  ...prev,
                  notesInternal: e.target.value,
                }));
              }}
              placeholder="Internal notes (not visible to customer)"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Invoice Lines */}
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2 w-[25%]">Item</th>
              <th className="text-left p-2 w-[25%]">Product</th>
              <th className="text-right p-2 w-20">Qty</th>
              <th className="text-right p-2 w-24">Unit Price</th>
              <th className="text-right p-2 w-32">Total</th>
              <th className="text-right p-2 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <>
                <tr key={i} className="border-t align-top">
                  <td className="p-2">
                    <Input
                      value={line.name}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLines((prev) =>
                          prev.map((x, idx) =>
                            idx === i ? { ...x, name: v } : x
                          )
                        );
                      }}
                    />
                    <Input
                      className="mt-1"
                      placeholder="Description (optional)"
                      value={line.description || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLines((prev) =>
                          prev.map((x, idx) =>
                            idx === i ? { ...x, description: v } : x
                          )
                        );
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <div className="text-sm text-muted-foreground">
                      {line.sku && <div>SKU: {line.sku}</div>}
                      {line.unitLabel && <div>Unit: {line.unitLabel}</div>}
                    </div>
                  </td>
                  <td className="p-2 text-right">
                    <Input
                      type="number"
                      min={0}
                      step="0.001"
                      value={line.quantity}
                      onChange={(e) => {
                        const v = Number(e.target.value || 0);
                        setLines((prev) =>
                          prev.map((x, idx) =>
                            idx === i ? { 
                              ...x, 
                              quantity: v,
                              lineSubtotal: v * x.unitPrice,
                              lineTotal: (v * x.unitPrice) + x.taxAmount,
                            } : x
                          )
                        );
                      }}
                    />
                  </td>
                  <td className="p-2 text-right">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) => {
                        const v = Number(e.target.value || 0);
                        setLines((prev) =>
                          prev.map((x, idx) =>
                            idx === i ? { 
                              ...x, 
                              unitPrice: v,
                              lineSubtotal: x.quantity * v,
                              lineTotal: (x.quantity * v) + x.taxAmount,
                            } : x
                          )
                        );
                      }}
                    />
                  </td>
                  <td className="p-2 text-right font-medium">
                    {invoice.currency} {line.lineTotal.toFixed(2)}
                  </td>
                  <td className="p-2 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setLines((prev) => prev.filter((_, idx) => idx !== i));
                      }}
                      className="px-2"
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              </>
            ))}
            {!lines.length && (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={6}>
                  No lines yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="ml-auto max-w-sm">
        <div className="flex justify-between text-sm py-1">
          <span>Subtotal</span>
          <span>
            {invoice.currency} {Number(invoice.subtotal || 0).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-sm py-1">
          <span>Tax</span>
          <span>
            {invoice.currency} {Number(invoice.taxTotal || 0).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between font-semibold py-2 border-t mt-2">
          <span>Total</span>
          <span>
            {invoice.currency} {Number(invoice.total || 0).toFixed(2)}
          </span>
        </div>
        {!isNew && Number(invoice.amountPaid || 0) > 0 && (
          <>
            <div className="flex justify-between text-sm py-1 text-green-600">
              <span>Amount Paid</span>
              <span>
                {invoice.currency} {Number(invoice.amountPaid).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between font-semibold py-2 border-t mt-2">
              <span>Amount Due</span>
              <span>
                {invoice.currency} {Number(invoice.amountDue).toFixed(2)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Payment Tracking - Only show for existing invoices */}
      {!isNew && (
        <div className="border rounded-md p-4">
          <PaymentTracker
            invoiceId={invoice.id}
            currency={invoice.currency}
            amountDue={Number(invoice.amountDue || 0)}
            status={invoice.status}
            onPaymentAdded={refreshInvoice}
          />
        </div>
      )}
    </div>
  );
}