"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  RefreshCw,
  Search,
  Filter,
  Package,
  Download,
  Upload,
  Settings2,
  MoreVertical,
  Edit,
  Eye,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  type: "SERVICE" | "GOOD" | "BUNDLE";
  isActive: boolean;
  unit?: { code: string } | null;
  category?: { name: string } | null;
  createdAt: string;
  updatedAt: string;
  defaultCost?: string | null;
  variants?: any[];
};

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    services: 0,
    goods: 0,
    bundles: 0,
  });

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (statusFilter === "active") params.set("active", "true");
    if (statusFilter === "inactive") params.set("active", "false");
    return params.toString();
  }, [q, typeFilter, statusFilter]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/catalog/products?${query}`, {
        cache: "no-store",
      });
      const json = await res.json();
      const products = json.items || [];
      setItems(products);

      // Calculate stats
      setStats({
        total: products.length,
        active: products.filter((p: Product) => p.isActive).length,
        inactive: products.filter((p: Product) => !p.isActive).length,
        services: products.filter((p: Product) => p.type === "SERVICE").length,
        goods: products.filter((p: Product) => p.type === "GOOD").length,
        bundles: products.filter((p: Product) => p.type === "BUNDLE").length,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [query]);

  function toggleSelection(id: string) {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  }

  function toggleSelectAll() {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((p) => p.id)));
    }
  }

  function getTypeColor(type: string) {
    switch (type) {
      case "SERVICE":
        return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20";
      case "GOOD":
        return "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20";
      case "BUNDLE":
        return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20";
      default:
        return "bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20";
    }
  }

  return (
    <div className="flex flex-col items-start flex-1">
      {/* Header */}
      <div className="flex items-center border-b py-3 px-4 w-full">
        <Package className="h-5 w-5 mr-2 text-gray-600" />
        <h1 className="text-lg font-semibold mr-auto">Products</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw
              className={cn("h-4 w-4 mr-2", loading && "animate-spin")}
            />
            Refresh
          </Button>
          <Link href="/dashboard/catalog/products/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Product
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-start w-full flex-1">
        {/* Main Content */}
        <section className="flex-1">
          {/* Filters Bar */}
          <div className="px-4 py-3 border-b bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products by name or SKU..."
                  className="h-9 pl-8"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="SERVICE">Service</SelectItem>
                  <SelectItem value="GOOD">Good</SelectItem>
                  <SelectItem value="BUNDLE">Bundle</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {selectedItems.size > 0 && (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {selectedItems.size} selected
                  </span>
                  <Button variant="outline" size="sm">
                    Bulk Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600">
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="col-span-1 flex items-center">
                <Checkbox
                  checked={
                    selectedItems.size === items.length && items.length > 0
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </div>
              <div className="col-span-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                Product
              </div>
              <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                SKU
              </div>
              <div className="col-span-1 text-xs font-medium text-gray-600 uppercase tracking-wider">
                Type
              </div>
              <div className="col-span-1 text-xs font-medium text-gray-600 uppercase tracking-wider">
                Unit
              </div>
              <div className="col-span-1 text-xs font-medium text-gray-600 uppercase tracking-wider">
                Status
              </div>
              <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider text-right">
                Actions
              </div>
            </div>

            {/* Table Body */}
            {loading ? (
              <div className="px-4 py-12 text-center text-sm text-gray-500">
                Loading products...
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No products found</p>
                <p className="text-xs text-gray-400 mt-1">
                  Try adjusting your filters or create a new product
                </p>
              </div>
            ) : (
              items.map((product) => (
                <div
                  key={product.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 items-center border-b border-gray-100 hover:bg-gray-50/50 transition-colors group"
                >
                  <div className="col-span-1">
                    <Checkbox
                      checked={selectedItems.has(product.id)}
                      onCheckedChange={() => toggleSelection(product.id)}
                    />
                  </div>
                  <div className="col-span-4">
                    <Link
                      href={`/dashboard/catalog/products/${product.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline"
                    >
                      {product.name}
                    </Link>
                    {product.category && (
                      <span className="block text-xs text-gray-500 mt-0.5">
                        {product.category.name}
                      </span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-gray-600">
                      {product.sku || "—"}
                    </span>
                  </div>
                  <div className="col-span-1">
                    <span
                      className={`text-[10px] font-medium uppercase px-2 py-1 rounded-full ${getTypeColor(product.type)}`}
                    >
                      {product.type}
                    </span>
                  </div>
                  <div className="col-span-1">
                    <span className="text-sm text-gray-600">
                      {product.unit?.code || "—"}
                    </span>
                  </div>
                  <div className="col-span-1">
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
                  <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/dashboard/catalog/products/${product.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Sidebar */}
        <div className="border-l w-80 p-4 h-full bg-gray-50/30">
          {/* Stats */}
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
              Overview
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <p className="text-2xl font-semibold">{stats.total}</p>
                <p className="text-xs text-gray-500">Total Products</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <p className="text-2xl font-semibold text-green-600">
                  {stats.active}
                </p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
            </div>
          </div>

          {/* Product Types Breakdown */}
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
              By Type
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-600">Services</span>
                <span className="text-sm font-medium">{stats.services}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-600">Goods</span>
                <span className="text-sm font-medium">{stats.goods}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-600">Bundles</span>
                <span className="text-sm font-medium">{stats.bundles}</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-200 mb-6" />

          {/* Quick Actions */}
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Products
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Products
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Manage Categories
              </Button>
            </div>
          </div>

          <div className="h-px bg-gray-200 mb-6" />

          {/* Recent Activity */}
          <div>
            <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
              Recent Activity
            </h3>
            <div className="space-y-2">
              <div className="text-sm text-gray-500 py-2">
                <p className="font-medium text-gray-700">Product updated</p>
                <p className="text-xs mt-0.5">
                  Premium Service Package • 2 hours ago
                </p>
              </div>
              <div className="text-sm text-gray-500 py-2">
                <p className="font-medium text-gray-700">New variant added</p>
                <p className="text-xs mt-0.5">
                  Basic Subscription • 5 hours ago
                </p>
              </div>
              <div className="text-sm text-gray-500 py-2">
                <p className="font-medium text-gray-700">
                  Bulk import completed
                </p>
                <p className="text-xs mt-0.5">
                  23 products imported • Yesterday
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
