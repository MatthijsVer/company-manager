"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
import { toast } from "sonner";
import { Plus, Save, Send, CheckCircle, XCircle, Clock, Ban, Calendar, FileText } from "lucide-react";
import { usePriceQuote } from "@/hooks/usePriceQuote";
import { ProductSelector } from "./ProductSelector";
import { PricingDetails, InlinePricingInfo } from "./PricingDetails";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

type Line = {
  id?: string;
  productId?: string;
  variantId?: string;
  name: string;
  description?: string;
  unitId?: string;
  quantity: number;
  position: number;
};

type Product = {
  id: string;
  name: string;
  sku: string | null;
  type: string;
  unit?: { code: string } | null;
};

type Company = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
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

export default function QuoteEditor({ initialQuote }: { initialQuote: any }) {
  const router = useRouter();
  const [quote, setQuote] = useState(initialQuote);
  const [lines, setLines] = useState<Line[]>(
    (initialQuote.lines || []).map((l: any) => ({
      id: l.id,
      productId: l.productId || undefined,
      variantId: l.variantId || undefined,
      name: l.name,
      description: l.description || "",
      unitId: l.unitId || undefined,
      quantity: Number(l.quantity || 1),
      position: l.position,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [priceBooks, setPriceBooks] = useState<PriceBook[]>([]);
  const [loadingPriceBooks, setLoadingPriceBooks] = useState(true);
  const [expandedPricing, setExpandedPricing] = useState<Set<number>>(
    new Set()
  );
  const { quote: quotePrice } = usePriceQuote();

  // Debounced auto-save function
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const autoSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;
    
    setAutoSaving(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency: quote.currency,
          priceBookId: quote.priceBookId,
          companyId: quote.companyId,
          contactId: quote.contactId,
          validUntil: quote.validUntil,
          lines: lines.map((l) => ({
            ...l,
          })),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        // Only update the quote totals, not the entire object to avoid loop
        setQuote(prev => ({
          ...prev,
          subtotal: json.subtotal,
          taxTotal: json.taxTotal,
          total: json.total,
        }));
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setAutoSaving(false);
    }
  }, [quote.id, quote.currency, quote.priceBookId, quote.companyId, quote.contactId, quote.validUntil, lines, hasUnsavedChanges]);

  // Debounced version - saves 2 seconds after last change
  const debouncedAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave();
    }, 2000);
  }, [autoSave]);

  // Track if this is the initial render
  const isInitialRender = useRef(true);
  
  // Trigger auto-save when lines or quote data changes (but not on initial render)
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    
    setHasUnsavedChanges(true);
    debouncedAutoSave();
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [lines, quote.currency, quote.priceBookId, quote.companyId, quote.contactId, quote.validUntil]);

  // Warn user about unsaved changes when leaving the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  function getStatusBadge(status: string) {
    const config = {
      DRAFT: { variant: "secondary" as const, icon: Save, label: "Draft" },
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
    }
  }

  async function convertToInvoice() {
    try {
      setSaving(true);
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
      setSaving(false);
    }
  }

  // Fetch products on component mount
  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/catalog/products?active=true");
        const data = await res.json();
        setProducts(data.items || []);
      } catch (error) {
        toast.error("Failed to load products");
      } finally {
        setLoadingProducts(false);
      }
    }
    fetchProducts();
  }, []);

  // Fetch companies on component mount
  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await fetch("/api/companies?status=ACTIVE");
        const data = await res.json();
        setCompanies(data.companies || []);
      } catch (error) {
        toast.error("Failed to load companies");
      } finally {
        setLoadingCompanies(false);
      }
    }
    fetchCompanies();
  }, []);

  // Fetch price books on component mount
  useEffect(() => {
    async function fetchPriceBooks() {
      try {
        const res = await fetch("/api/catalog/pricebooks");
        const data = await res.json();
        const activeBooks = (data.items || []).filter((pb: any) => pb.isActive);
        setPriceBooks(activeBooks);

        // If no price book is selected, select the default one
        if (!quote.priceBookId) {
          const defaultBook = activeBooks.find((pb: PriceBook) => pb.isDefault);
          if (defaultBook) {
            setQuote((prev: any) => ({
              ...prev,
              priceBookId: defaultBook.id,
              currency: defaultBook.currency,
            }));
          }
        }
      } catch (error) {
        toast.error("Failed to load price books");
      } finally {
        setLoadingPriceBooks(false);
      }
    }
    fetchPriceBooks();
  }, []);

  // Fetch contacts when company changes
  useEffect(() => {
    if (!quote.companyId) {
      setContacts([]);
      return;
    }

    async function fetchContacts() {
      setLoadingContacts(true);
      try {
        const res = await fetch(`/api/companies/${quote.companyId}/contacts`);
        const data = await res.json();
        setContacts(data || []);
      } catch (error) {
        toast.error("Failed to load contacts");
      } finally {
        setLoadingContacts(false);
      }
    }
    fetchContacts();
  }, [quote.companyId]);

  function addEmpty() {
    setLines((prev) => [
      ...prev,
      { name: "New line", quantity: 1, position: prev.length },
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

  async function recomputeAndSave() {
    setSaving(true);
    
    // Clear auto-save timeout since we're doing manual save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency: quote.currency,
          priceBookId: quote.priceBookId,
          companyId: quote.companyId,
          contactId: quote.contactId,
          validUntil: quote.validUntil,
          lines: lines.map((l) => ({
            ...l,
            // allow server to compute — but pass ids + qty
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to save");
      setQuote(json);
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      toast.success("Quote saved");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  // (Optional) live unit price preview using the pricing endpoint
  async function preview(i: number) {
    const l = lines[i];
    if (!l.productId || !l.quantity) return;
    const res = await quotePrice({
      productId: l.productId,
      variantId: l.variantId,
      quantity: l.quantity,
      priceBookId: quote.priceBookId || undefined,
    });
    if (res) {
      toast.message(`${l.name}: ${res.currency} ${res.lineTotal}`);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">{quote.number}</h1>
          {getStatusBadge(quote.status)}
          {quote.validUntil && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Valid until {new Date(quote.validUntil).toLocaleDateString()}
            </div>
          )}
          
          {/* Auto-save status */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {autoSaving && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Saving...
              </div>
            )}
            {!autoSaving && hasUnsavedChanges && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                Unsaved changes
              </div>
            )}
            {!autoSaving && !hasUnsavedChanges && lastSaved && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Saved {lastSaved.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addEmpty}>
            <Plus className="h-4 w-4 mr-1" />
            Add line
          </Button>
          <Button onClick={recomputeAndSave} disabled={saving || autoSaving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Saving..." : autoSaving ? "Auto-saving..." : "Save"}
          </Button>
          
          {/* Status Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Debug info - remove this later */}
              <div className="p-2 text-xs text-muted-foreground border-b">
                Status: {quote.status}
              </div>
              
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={convertToInvoice} disabled={saving}>
                    <FileText className="h-4 w-4 mr-2" />
                    Convert to Invoice
                  </DropdownMenuItem>
                </>
              )}
              
              {canTransitionTo(quote.status, 'CANCELLED') && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => updateQuoteStatus('CANCELLED')}
                    className="text-red-600"
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Cancel Quote
                  </DropdownMenuItem>
                </>
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

      {/* Quote Configuration */}
      <div className="border rounded-md p-4 bg-muted/50 space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {/* Price Book Selection */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Price Book
            </label>
            <Select
              value={quote.priceBookId || "no-selection"}
              onValueChange={(value) => {
                const newPriceBookId = value === "no-selection" ? null : value;
                const selectedPriceBook = priceBooks.find(
                  (pb) => pb.id === newPriceBookId
                );
                setQuote({
                  ...quote,
                  priceBookId: newPriceBookId,
                  currency: selectedPriceBook?.currency || quote.currency,
                });
              }}
              disabled={loadingPriceBooks}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingPriceBooks ? "Loading..." : "Select price book"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-selection">
                  No price book selected
                </SelectItem>
                {priceBooks.map((priceBook) => (
                  <SelectItem key={priceBook.id} value={priceBook.id}>
                    {priceBook.name} ({priceBook.currency})
                    {priceBook.isDefault && (
                      <span className="ml-1 text-xs text-blue-600">
                        (Default)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Valid Until Date */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Valid Until
            </label>
            <Input
              type="date"
              value={quote.validUntil ? new Date(quote.validUntil).toISOString().split('T')[0] : ''}
              onChange={(e) => {
                setQuote({
                  ...quote,
                  validUntil: e.target.value ? new Date(e.target.value).toISOString() : null,
                });
              }}
              className="h-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Company</label>
            <Select
              value={quote.companyId || "no-selection"}
              onValueChange={(value) => {
                const newCompanyId = value === "no-selection" ? null : value;
                setQuote({
                  ...quote,
                  companyId: newCompanyId,
                  contactId: null,
                });
              }}
              disabled={loadingCompanies}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingCompanies ? "Loading..." : "Select company"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-selection">
                  No company selected
                </SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Contact</label>
            <Select
              value={quote.contactId || "no-selection"}
              onValueChange={(value) => {
                setQuote({
                  ...quote,
                  contactId: value === "no-selection" ? null : value,
                });
              }}
              disabled={!quote.companyId || loadingContacts}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !quote.companyId
                      ? "Select company first"
                      : loadingContacts
                        ? "Loading..."
                        : "Select contact"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-selection">
                  No contact selected
                </SelectItem>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name}
                    {contact.title && (
                      <span className="text-muted-foreground">
                        {" "}
                        - {contact.title}
                      </span>
                    )}
                    {contact.isPrimary && (
                      <span className="ml-1 text-xs text-blue-600">
                        (Primary)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2 w-[25%]">Item</th>
              <th className="text-left p-2 w-[25%]">Product</th>
              <th className="text-right p-2 w-20">Qty</th>
              <th className="text-right p-2 w-32">Pricing</th>
              <th className="text-right p-2 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <>
                <tr key={i} className="border-t align-top">
                  <td className="p-2">
                    <Input
                      value={l.name}
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
                      value={l.description || ""}
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
                    <ProductSelector
                      value={l.productId}
                      variantId={l.variantId}
                      onSelect={(productId, variantId) => {
                        const selectedProduct = products.find(
                          (p) => p.id === productId
                        );
                        setLines((prev) =>
                          prev.map((x, idx) =>
                            idx === i
                              ? {
                                  ...x,
                                  productId: productId,
                                  variantId: variantId,
                                  name: selectedProduct?.name || x.name,
                                  unitId:
                                    selectedProduct?.unit?.code || x.unitId,
                                }
                              : x
                          )
                        );
                      }}
                      priceBookId={quote.priceBookId}
                      quantity={l.quantity}
                      disabled={loadingProducts}
                    />
                  </td>
                  <td className="p-2 text-right">
                    <Input
                      type="number"
                      min={0}
                      step="0.001"
                      value={l.quantity}
                      onChange={(e) => {
                        const v = Number(e.target.value || 0);
                        setLines((prev) =>
                          prev.map((x, idx) =>
                            idx === i ? { ...x, quantity: v } : x
                          )
                        );
                      }}
                    />
                  </td>
                  <td className="p-2 text-right">
                    <InlinePricingInfo
                      productId={l.productId}
                      variantId={l.variantId}
                      quantity={l.quantity}
                      priceBookId={quote.priceBookId}
                      currency={quote.currency}
                    />
                  </td>
                  <td className="p-2 text-right">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => togglePricingDetails(i)}
                        className="px-2"
                      >
                        {expandedPricing.has(i) ? "Hide" : "Details"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => preview(i)}
                        className="px-2"
                      >
                        Preview
                      </Button>
                    </div>
                  </td>
                </tr>
                {expandedPricing.has(i) && (
                  <tr className="bg-muted/30">
                    <td colSpan={5} className="p-0">
                      <div className="p-4 border-l-4 border-blue-500">
                        <PricingDetails
                          productId={l.productId}
                          variantId={l.variantId}
                          quantity={l.quantity}
                          priceBookId={quote.priceBookId}
                          currency={quote.currency}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {!lines.length && (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={5}>
                  No lines yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ml-auto max-w-sm">
        <div className="flex justify-between text-sm py-1">
          <span>Subtotal</span>
          <span>
            {quote.currency} {Number(quote.subtotal).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-sm py-1">
          <span>Tax</span>
          <span>
            {quote.currency} {Number(quote.taxTotal).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between font-semibold py-2 border-t mt-2">
          <span>Total</span>
          <span>
            {quote.currency} {Number(quote.total).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
