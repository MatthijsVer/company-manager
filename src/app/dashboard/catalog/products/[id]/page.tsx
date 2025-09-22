"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Save,
  RefreshCw,
  ArrowLeft,
  Package,
  Image,
  Tag,
  Layers,
  X,
  ExternalLink,
  Box,
  DollarSign,
  BarChart3,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

type Unit = { id: string; code: string; label: string };
type Variant = {
  id: string;
  sku?: string | null;
  name?: string | null;
  isActive: boolean;
  attributes?: Record<string, string> | null;
};
type Product = {
  id: string;
  name: string;
  sku: string | null;
  description?: string | null;
  type: "SERVICE" | "GOOD" | "BUNDLE";
  unitId?: string | null;
  isActive: boolean;
  taxClassId?: string | null;
  defaultCost?: string | null;
  attributes: { id: string; key: string; value: string }[];
  media: {
    id: string;
    url: string;
    kind?: string | null;
    alt?: string | null;
    order: number;
  }[];
  variants: Variant[];
};

export default function ProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"general" | "variants" | "bundle">(
    "general"
  );

  async function load() {
    setLoading(true);
    try {
      const [p, u] = await Promise.all([
        fetch(`/api/catalog/products/${id}`, { cache: "no-store" }).then((r) =>
          r.json()
        ),
        fetch(`/api/catalog/units`, { cache: "no-store" }).then((r) =>
          r.json()
        ),
      ]);
      setProduct(p);
      setUnits(u.items || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  const canBundle = product?.type === "BUNDLE";

  async function saveBase() {
    if (!product) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/catalog/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          sku: product.sku,
          description: product.description,
          type: product.type,
          unitId: product.unitId || null,
          isActive: product.isActive,
          defaultCost: product.defaultCost
            ? Number(product.defaultCost)
            : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) return toast.error(json.error || "Failed to save");
      toast.success("Product saved successfully");
      setProduct(json);
    } finally {
      setSaving(false);
    }
  }

  async function replaceAttributes(attrs: { key: string; value: string }[]) {
    if (!product) return;
    const res = await fetch(`/api/catalog/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attributes: attrs }),
    });
    if (!res.ok) toast.error("Failed to update attributes");
    else {
      toast.success("Attributes updated");
      await load();
    }
  }

  async function removeAttribute(index: number) {
    if (!product) return;
    const attrs = product.attributes.filter((_, i) => i !== index);
    await replaceAttributes(attrs.map((a) => ({ key: a.key, value: a.value })));
  }

  async function replaceMedia(
    media: { url: string; kind?: string; alt?: string; order?: number }[]
  ) {
    if (!product) return;
    const res = await fetch(`/api/catalog/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media }),
    });
    if (!res.ok) toast.error("Failed to update media");
    else {
      toast.success("Media updated");
      await load();
    }
  }

  async function removeMedia(index: number) {
    if (!product) return;
    const media = product.media.filter((_, i) => i !== index);
    await replaceMedia(
      media.map((m) => ({
        url: m.url,
        kind: m.kind || undefined,
        alt: m.alt || undefined,
        order: m.order,
      }))
    );
  }

  async function addVariant() {
    if (!product) return;
    const res = await fetch(`/api/catalog/products/${product.id}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", sku: "" }),
    });
    if (!res.ok) toast.error("Failed to add variant");
    else {
      toast.success("Variant added");
      await load();
    }
  }

  async function updateVariant(v: Variant, patch: Partial<Variant>) {
    const res = await fetch(`/api/catalog/variants/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) toast.error("Failed to update variant");
    else toast.success("Variant updated");
  }

  async function deleteVariant(v: Variant) {
    const res = await fetch(`/api/catalog/variants/${v.id}`, {
      method: "DELETE",
    });
    if (!res.ok) toast.error("Failed to delete variant");
    else {
      toast.success("Variant deleted");
      await load();
    }
  }

  // Attribute editor state
  const [attrDraft, setAttrDraft] = useState<{ key: string; value: string }>({
    key: "",
    value: "",
  });

  // Media URL input
  const [mediaUrl, setMediaUrl] = useState("");

  // Bundle items state
  const [bundleDraft, setBundleDraft] = useState<{
    childId: string;
    qty: string;
  }>({ childId: "", qty: "1" });
  const [bundleItems, setBundleItems] = useState<
    { childId: string; name: string; qty: string }[]
  >([]);

  useEffect(() => {
    if (!canBundle) return;
    (async () => {
      const res = await fetch(`/api/catalog/products/${id}/bundle`, {
        cache: "no-store",
      });
      const json = await res.json();
      const items = (json.items || []).map((x: any) => ({
        childId: x.childProductId,
        name: x.child?.name || x.childProductId,
        qty: String(x.quantity),
      }));
      setBundleItems(items);
    })();
  }, [id, canBundle]);

  async function saveBundle() {
    const payload = bundleItems.map((i) => ({
      childProductId: i.childId,
      quantity: Number(i.qty || "1"),
    }));
    const res = await fetch(`/api/catalog/products/${id}/bundle`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) toast.error("Failed to save bundle");
    else toast.success("Bundle saved successfully");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading product details...</div>
      </div>
    );
  }

  if (!product) return <div className="p-6">Product not found</div>;

  return (
    <div className="flex flex-col items-start flex-1">
      {/* Header Section */}
      <div className="flex items-center border-b py-3 px-4 w-full">
        <Link
          href="/dashboard/catalog/products"
          className="text-gray-600 hover:text-gray-900 transition-colors mr-3"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{product.name}</h1>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-xs text-gray-500">ID: {product.id}</span>
            {product.sku && (
              <span className="text-xs text-gray-500">SKU: {product.sku}</span>
            )}
            <span
              className={`text-[10px] font-medium uppercase px-2 py-1 rounded-full ${
                product.isActive
                  ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                  : "bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20"
              }`}
            >
              {product.isActive ? "Active" : "Inactive"}
            </span>
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
          <Button size="sm" onClick={saveBase} disabled={saving}>
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
              onClick={() => setActiveTab("general")}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "general"
                  ? "text-gray-900 border-gray-900"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab("variants")}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "variants"
                  ? "text-gray-900 border-gray-900"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              Variants ({product.variants?.length || 0})
            </button>
            {canBundle && (
              <button
                onClick={() => setActiveTab("bundle")}
                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "bundle"
                    ? "text-gray-900 border-gray-900"
                    : "text-gray-500 border-transparent hover:text-gray-700"
                }`}
              >
                Bundle Items
              </button>
            )}
          </div>

          {/* Tab Content */}
          {activeTab === "general" && (
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
                <div className="px-6 pt-5 pb-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Basic Information
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wider block mb-2">
                        Product Name
                      </label>
                      <Input
                        value={product.name}
                        onChange={(e) =>
                          setProduct({ ...product, name: e.target.value })
                        }
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wider block mb-2">
                        SKU
                      </label>
                      <Input
                        value={product.sku ?? ""}
                        onChange={(e) =>
                          setProduct({ ...product, sku: e.target.value })
                        }
                        placeholder="Enter SKU"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wider block mb-2">
                        Type
                      </label>
                      <Select
                        value={product.type}
                        onValueChange={(v: any) =>
                          setProduct({ ...product, type: v })
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SERVICE">Service</SelectItem>
                          <SelectItem value="GOOD">Good</SelectItem>
                          <SelectItem value="BUNDLE">Bundle</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wider block mb-2">
                        Unit
                      </label>
                      <Select
                        value={product.unitId ?? "none"}
                        onValueChange={(v) =>
                          setProduct({
                            ...product,
                            unitId: v === "none" ? null : v,
                          })
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {units.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.code} — {u.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wider block mb-2">
                      Description
                    </label>
                    <Textarea
                      rows={4}
                      value={product.description ?? ""}
                      onChange={(e) =>
                        setProduct({ ...product, description: e.target.value })
                      }
                      placeholder="Enter product description"
                      className="resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Attributes */}
              <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
                <div className="px-6 pt-5 pb-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Custom Attributes
                  </h3>
                </div>

                {product.attributes?.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {product.attributes.map((a, index) => (
                      <div
                        key={a.id}
                        className="px-6 py-3 flex items-center hover:bg-gray-50/50 transition-colors group"
                      >
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">
                            {a.key}
                          </span>
                          <span className="text-sm text-gray-500 ml-2">→</span>
                          <span className="text-sm text-gray-700 ml-2">
                            {a.value}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeAttribute(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-6 py-8 text-sm text-gray-500 text-center">
                    No custom attributes defined
                  </div>
                )}

                <div className="px-6 py-4 bg-gray-50 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Key"
                      value={attrDraft.key}
                      onChange={(e) =>
                        setAttrDraft((s) => ({ ...s, key: e.target.value }))
                      }
                      className="h-9"
                    />
                    <Input
                      placeholder="Value"
                      value={attrDraft.value}
                      onChange={(e) =>
                        setAttrDraft((s) => ({ ...s, value: e.target.value }))
                      }
                      className="h-9"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (attrDraft.key && attrDraft.value) {
                          const next = (product.attributes || []).map((a) => ({
                            key: a.key,
                            value: a.value,
                          }));
                          next.push(attrDraft);
                          replaceAttributes(next);
                          setAttrDraft({ key: "", value: "" });
                        }
                      }}
                      disabled={!attrDraft.key || !attrDraft.value}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "variants" && (
            <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
              <div className="px-6 pt-5 pb-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Product Variants
                </h3>
                <Button size="sm" onClick={addVariant}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Variant
                </Button>
              </div>

              {product.variants?.length > 0 ? (
                <>
                  <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="col-span-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Name
                    </div>
                    <div className="col-span-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                      SKU
                    </div>
                    <div className="col-span-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Status
                    </div>
                    <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Actions
                    </div>
                  </div>
                  {product.variants.map((v) => (
                    <div
                      key={v.id}
                      className="grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors group"
                    >
                      <div className="col-span-4">
                        <Input
                          className="h-8 border-0 bg-transparent hover:bg-gray-50 focus:bg-white focus:border-gray-300"
                          placeholder="Variant name"
                          defaultValue={v.name ?? ""}
                          onBlur={(e) =>
                            updateVariant(v, { name: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          className="h-8 border-0 bg-transparent hover:bg-gray-50 focus:bg-white focus:border-gray-300"
                          placeholder="SKU"
                          defaultValue={v.sku ?? ""}
                          onBlur={(e) =>
                            updateVariant(v, { sku: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-span-3">
                        <span
                          className={`text-[10px] font-medium uppercase px-2 py-1 rounded-full ${
                            v.isActive
                              ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                              : "bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20"
                          }`}
                        >
                          {v.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteVariant(v)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="px-6 py-12 text-sm text-gray-500 text-center">
                  <Box className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  No variants created yet
                </div>
              )}
            </div>
          )}

          {activeTab === "bundle" && canBundle && (
            <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
              <div className="px-6 pt-5 pb-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Bundle Items
                </h3>
                <Button size="sm" onClick={saveBundle}>
                  Save Bundle
                </Button>
              </div>

              {bundleItems.length > 0 ? (
                <>
                  <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="col-span-8 text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Product
                    </div>
                    <div className="col-span-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Quantity
                    </div>
                  </div>
                  {bundleItems.map((b, i) => (
                    <div
                      key={`${b.childId}-${i}`}
                      className="grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="col-span-8">
                        <span className="text-sm text-gray-900">{b.name}</span>
                      </div>
                      <div className="col-span-4">
                        <span className="text-sm text-gray-700">×{b.qty}</span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="px-6 py-12 text-sm text-gray-500 text-center">
                  <Layers className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  No items in this bundle
                </div>
              )}

              <div className="px-6 py-4 bg-gray-50 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Child Product ID"
                    value={bundleDraft.childId}
                    onChange={(e) =>
                      setBundleDraft((s) => ({ ...s, childId: e.target.value }))
                    }
                    className="h-9 flex-1"
                  />
                  <Input
                    placeholder="Qty"
                    value={bundleDraft.qty}
                    onChange={(e) =>
                      setBundleDraft((s) => ({ ...s, qty: e.target.value }))
                    }
                    className="h-9 w-20"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!bundleDraft.childId) return;
                      setBundleItems((prev) => [
                        ...prev,
                        {
                          childId: bundleDraft.childId,
                          name: bundleDraft.childId,
                          qty: bundleDraft.qty || "1",
                        },
                      ]);
                      setBundleDraft({ childId: "", qty: "1" });
                    }}
                    disabled={!bundleDraft.childId}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Right Sidebar */}
        <div className="border-l w-80 p-4 h-full">
          {/* Quick Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
                Quick Info
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-500">Type</span>
                  <Badge variant="outline" className="text-xs">
                    {product.type}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-500">Status</span>
                  <span
                    className={`text-[10px] font-medium uppercase px-2 py-1 rounded-full ${
                      product.isActive
                        ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                        : "bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20"
                    }`}
                  >
                    {product.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                {product.defaultCost && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-500">Default Cost</span>
                    <span className="text-sm font-medium">
                      ${product.defaultCost}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-gray-200" />

            {/* Media Section */}
            <div>
              <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
                Media Files
              </h3>

              {product.media?.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {product.media.map((m, index) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors group"
                    >
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline truncate flex-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span className="truncate">
                          {m.url.split("/").pop()}
                        </span>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeMedia(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 mb-3">
                  No media files attached
                </div>
              )}

              <div className="space-y-2">
                <Input
                  placeholder="Media URL"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="h-9"
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={async () => {
                    if (mediaUrl) {
                      await replaceMedia([
                        ...(product.media || []).map((m) => ({
                          url: m.url,
                          kind: m.kind || undefined,
                          alt: m.alt || undefined,
                          order: m.order,
                        })),
                        { url: mediaUrl },
                      ]);
                      setMediaUrl("");
                    }
                  }}
                  disabled={!mediaUrl}
                >
                  <Image className="h-4 w-4 mr-1" />
                  Add Media
                </Button>
              </div>
            </div>

            <div className="h-px bg-gray-200" />

            {/* Quick Actions */}
            <div>
              <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Pricing Rules
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Advanced Settings
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
