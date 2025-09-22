"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Save } from "lucide-react";
import { usePriceQuote } from "@/hooks/usePriceQuote";

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

export default function QuoteEditor({ initialQuote }: { initialQuote: any }) {
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
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const { quote: quotePrice } = usePriceQuote();

  // Fetch products on component mount
  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/catalog/products?active=true');
        const data = await res.json();
        setProducts(data.items || []);
      } catch (error) {
        toast.error('Failed to load products');
      } finally {
        setLoadingProducts(false);
      }
    }
    fetchProducts();
  }, []);

  function addEmpty() {
    setLines((prev) => [
      ...prev,
      { name: "New line", quantity: 1, position: prev.length },
    ]);
  }

  async function recomputeAndSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency: quote.currency,
          priceBookId: quote.priceBookId,
          lines: lines.map((l) => ({
            ...l,
            // allow server to compute — but pass ids + qty
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to save");
      setQuote(json);
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
        <h1 className="text-xl font-semibold">{quote.number}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addEmpty}>
            <Plus className="h-4 w-4 mr-1" />
            Add line
          </Button>
          <Button onClick={recomputeAndSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2 w-[32%]">Item</th>
              <th className="text-left p-2">Product</th>
              <th className="text-right p-2 w-28">Qty</th>
              <th className="text-right p-2 w-24">Preview</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
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
                  <Select
                    value={l.productId || "no-selection"}
                    onValueChange={(value) => {
                      if (value === "no-selection") {
                        setLines((prev) =>
                          prev.map((x, idx) =>
                            idx === i 
                              ? { 
                                  ...x, 
                                  productId: undefined,
                                } 
                              : x
                          )
                        );
                      } else {
                        const selectedProduct = products.find(p => p.id === value);
                        setLines((prev) =>
                          prev.map((x, idx) =>
                            idx === i 
                              ? { 
                                  ...x, 
                                  productId: value,
                                  name: selectedProduct?.name || x.name,
                                  unitId: selectedProduct?.unit?.code || x.unitId
                                } 
                              : x
                          )
                        );
                      }
                    }}
                    disabled={loadingProducts}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingProducts ? "Loading..." : "Select product"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-selection">No product selected</SelectItem>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} {product.sku ? `(${product.sku})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Button size="sm" variant="ghost" onClick={() => preview(i)}>
                    Quote
                  </Button>
                </td>
              </tr>
            ))}
            {!lines.length && (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={4}>
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
