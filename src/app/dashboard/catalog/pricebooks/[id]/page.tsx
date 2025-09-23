"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  Trash2,
  Save,
  RefreshCw,
  Plus,
  DollarSign,
  Package,
  Percent,
  Hash,
  Globe,
  Shield,
  TrendingUp,
  Settings,
  Edit,
} from "lucide-react";
import { ProductSelector } from "@/components/quotes/ProductSelector";

type Entry = {
  id: string;
  product?: { id: string; name: string } | null;
  variant?: { id: string; name: string | null; sku?: string | null } | null;
  unitPrice: string;
  minQty?: string | null;
  maxQty?: string | null;
  discountPct?: string | null;
};

type PB = {
  id: string;
  name: string;
  currency: string;
  priceBasis: "EXCLUSIVE" | "INCLUSIVE";
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
};

export default function PriceBookEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pb, setPb] = useState<PB | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [activeTab, setActiveTab] = useState<"settings" | "entries">("entries");
  const [editingEntry, setEditingEntry] = useState<string | null>(null);

  const [draft, setDraft] = useState({
    productId: "",
    variantId: "",
    unitPrice: "",
    minQty: "",
    maxQty: "",
    discountPct: "",
  });

  const currencies = ["EUR", "USD", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY"];

  async function load() {
    setLoading(true);
    try {
      const [meta, ent] = await Promise.all([
        fetch(`/api/catalog/pricebooks/${id}`, { cache: "no-store" }).then(
          (r) => r.json()
        ),
        fetch(`/api/catalog/pricebooks/${id}/entries`, {
          cache: "no-store",
        }).then((r) => r.json()),
      ]);
      setPb(meta);
      setEntries(ent.entries || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function savePB(patch: Partial<PB>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/catalog/pricebooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) toast.error("Failed to update price book");
      else {
        toast.success("Price book updated");
        load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function addEntry() {
    if (!draft.unitPrice || (!draft.productId && !draft.variantId)) {
      toast.error("Set unit price & product OR variant");
      return;
    }

    const body: any = { unitPrice: Number(draft.unitPrice) };
    if (draft.productId) body.productId = draft.productId;
    if (draft.variantId) body.variantId = draft.variantId;
    if (draft.minQty) body.minQty = Number(draft.minQty);
    if (draft.maxQty) body.maxQty = Number(draft.maxQty);
    if (draft.discountPct) body.discountPct = Number(draft.discountPct);

    const res = await fetch(`/api/catalog/pricebooks/${id}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const j = await res.json();
      toast.error(j.error || "Failed to add entry");
      return;
    }

    toast.success("Entry added successfully");
    setDraft({
      productId: "",
      variantId: "",
      unitPrice: "",
      minQty: "",
      maxQty: "",
      discountPct: "",
    });
    setShowAddEntry(false);
    load();
  }

  async function removeEntry(entryId: string) {
    const res = await fetch(`/api/catalog/pricebook-entries/${entryId}`, {
      method: "DELETE",
    });
    if (!res.ok) toast.error("Failed to delete entry");
    else {
      toast.success("Entry deleted");
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    }
  }

  async function updateEntry(entryId: string, patch: Partial<Entry>) {
    const res = await fetch(`/api/catalog/pricebook-entries/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const j = await res.json();
      toast.error(j.error || "Failed to update entry");
    } else {
      toast.success("Entry updated");
      load();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading price book...</div>
      </div>
    );
  }

  if (!pb) return <div className="p-6">Price book not found</div>;

  return (
    <div className="flex flex-col items-start flex-1">
      {/* Header */}
      <div className="flex items-center border-b py-3 px-4 w-full">
        <Link
          href="/dashboard/catalog/pricebooks"
          className="text-gray-600 hover:text-gray-900 transition-colors mr-3"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{pb.name}</h1>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-xs text-gray-500">ID: {pb.id}</span>
            <div className="flex items-center gap-1">
              <Globe className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500">{pb.currency}</span>
            </div>
            <span
              className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full ${
                pb.isActive
                  ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                  : "bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20"
              }`}
            >
              {pb.isActive ? "Active" : "Inactive"}
            </span>
            {pb.isDefault && (
              <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                Default
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => load()}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => savePB({})} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex items-start w-full flex-1">
        {/* Main Content Area */}
        <section className="flex-1 p-4">
          {/* Tab Navigation */}
          <div className="flex items-center gap-4 mb-4 border-b">
            <button
              onClick={() => setActiveTab("entries")}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "entries"
                  ? "text-gray-900 border-gray-900"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              Price Entries ({entries.length})
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "settings"
                  ? "text-gray-900 border-gray-900"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              Settings
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "entries" && (
            <div className="space-y-4">
              {/* Add Entry Form */}
              {showAddEntry && (
                <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
                  <div className="px-6 pt-5 pb-3 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Add Price Entry
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="mb-4">
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wider block mb-2">
                        Product Selection
                      </label>
                      <ProductSelector
                        value={draft.productId}
                        variantId={draft.variantId}
                        onSelect={(productId, variantId) => {
                          setDraft((d) => ({
                            ...d,
                            productId: productId || "",
                            variantId: variantId || "",
                          }));
                        }}
                        priceBookId={id}
                        quantity={1}
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wider block mb-2">
                          Unit Price *
                        </label>
                        <Input
                          className="h-9"
                          type="number"
                          step="0.01"
                          value={draft.unitPrice}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              unitPrice: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wider block mb-2">
                          Min Qty
                        </label>
                        <Input
                          className="h-9"
                          type="number"
                          value={draft.minQty}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, minQty: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wider block mb-2">
                          Max Qty
                        </label>
                        <Input
                          className="h-9"
                          type="number"
                          value={draft.maxQty}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, maxQty: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 uppercase tracking-wider block mb-2">
                          Discount %
                        </label>
                        <Input
                          className="h-9"
                          type="number"
                          step="0.01"
                          value={draft.discountPct}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              discountPct: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={addEntry}>
                        Add Entry
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowAddEntry(false);
                          setDraft({
                            productId: "",
                            variantId: "",
                            unitPrice: "",
                            minQty: "",
                            maxQty: "",
                            discountPct: "",
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Entries Table */}
              <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
                <div className="px-6 pt-5 pb-3 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Price Entries
                  </h3>
                  {!showAddEntry && (
                    <Button size="sm" onClick={() => setShowAddEntry(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Entry
                    </Button>
                  )}
                </div>

                {entries.length > 0 ? (
                  <>
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200">
                      <div className="col-span-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Product / Variant
                      </div>
                      <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Unit Price
                      </div>
                      <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Qty Range
                      </div>
                      <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Discount
                      </div>
                      <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider text-right">
                        Actions
                      </div>
                    </div>
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors group"
                      >
                        <div className="col-span-4">
                          <div className="flex items-center gap-2">
                            {entry.variant ? (
                              <Package className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Package className="h-4 w-4 text-blue-500" />
                            )}
                            <div>
                              <span className="text-sm font-medium text-gray-900">
                                {entry.variant?.name ||
                                  entry.product?.name ||
                                  "Unknown"}
                              </span>
                              {entry.variant?.sku && (
                                <span className="block text-xs text-gray-500">
                                  SKU: {entry.variant.sku}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-gray-400" />
                            {editingEntry === entry.id ? (
                              <Input
                                type="number"
                                step="0.01"
                                defaultValue={entry.unitPrice}
                                className="h-7 w-20 text-sm"
                                onBlur={(e) => {
                                  const newPrice = e.target.value;
                                  if (newPrice && newPrice !== entry.unitPrice) {
                                    updateEntry(entry.id, { unitPrice: newPrice });
                                  }
                                  setEditingEntry(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.currentTarget.blur();
                                  }
                                  if (e.key === "Escape") {
                                    setEditingEntry(null);
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              <span 
                                className="text-sm font-medium cursor-pointer hover:text-blue-600"
                                onClick={() => setEditingEntry(entry.id)}
                              >
                                {entry.unitPrice}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <span className="text-sm text-gray-600">
                            {entry.minQty || "1"} — {entry.maxQty || "∞"}
                          </span>
                        </div>
                        <div className="col-span-2">
                          {entry.discountPct ? (
                            <div className="flex items-center gap-1">
                              <Percent className="h-3 w-3 text-green-500" />
                              <span className="text-sm font-medium text-green-700">
                                {entry.discountPct}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </div>
                        <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingEntry(editingEntry === entry.id ? null : entry.id)}
                            title="Edit entry"
                          >
                            <Edit className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeEntry(entry.id)}
                            title="Delete entry"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      No price entries yet
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Add entries to define product pricing
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
              <div className="px-6 pt-5 pb-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">
                  Price Book Settings
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wider block mb-2">
                      Name
                    </label>
                    <Input
                      className="h-9"
                      defaultValue={pb.name}
                      onBlur={(e) => savePB({ name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wider block mb-2">
                      Currency
                    </label>
                    <Select
                      value={pb.currency}
                      onValueChange={(v) => savePB({ currency: v })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((curr) => (
                          <SelectItem key={curr} value={curr}>
                            {curr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Tax Inclusive Pricing
                      </p>
                      <p className="text-xs text-gray-500">
                        Prices include tax in calculations
                      </p>
                    </div>
                    <Switch
                      checked={pb.priceBasis === "INCLUSIVE"}
                      onCheckedChange={(v) =>
                        savePB({ priceBasis: v ? "INCLUSIVE" : "EXCLUSIVE" })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Default Price Book
                      </p>
                      <p className="text-xs text-gray-500">
                        Use when no specific book is selected
                      </p>
                    </div>
                    <Switch
                      checked={pb.isDefault}
                      onCheckedChange={(v) => savePB({ isDefault: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Active
                      </p>
                      <p className="text-xs text-gray-500">
                        Enable this price book for use
                      </p>
                    </div>
                    <Switch
                      checked={pb.isActive}
                      onCheckedChange={(v) => savePB({ isActive: v })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Right Sidebar */}
        <div className="border-l w-80 p-4 h-full bg-gray-50/30">
          {/* Quick Info */}
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
              Quick Info
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-500">Total Entries</span>
                <span className="text-sm font-medium">{entries.length}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-500">Currency</span>
                <span className="text-sm font-medium">{pb.currency}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-500">Tax Basis</span>
                <span
                  className={`text-[10px] font-medium uppercase px-2 py-1 rounded-full ${
                    pb.priceBasis === "INCLUSIVE"
                      ? "bg-purple-50 text-purple-700"
                      : "bg-orange-50 text-orange-700"
                  }`}
                >
                  {pb.priceBasis}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-500">Created</span>
                <span className="text-sm">
                  {new Date(pb.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-200 mb-6" />

          {/* Entry Statistics */}
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
              Entry Statistics
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-600">Product Entries</span>
                <span className="text-sm font-medium">
                  {entries.filter((e) => e.product).length}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-600">Variant Entries</span>
                <span className="text-sm font-medium">
                  {entries.filter((e) => e.variant).length}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-600">With Discounts</span>
                <span className="text-sm font-medium">
                  {entries.filter((e) => e.discountPct).length}
                </span>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-200 mb-6" />

          {/* Help */}
          <div>
            <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
              Help
            </h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-700">Volume Pricing</p>
                  <p className="text-xs mt-0.5">
                    Use Min/Max Qty to create tiered pricing
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-700">Variant Priority</p>
                  <p className="text-xs mt-0.5">
                    Variant prices override product prices
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
