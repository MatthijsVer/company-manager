"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  DollarSign,
  Plus,
  RefreshCw,
  BookOpen,
  Settings,
  TrendingUp,
  Globe,
  Shield,
  MoreVertical,
  Edit,
} from "lucide-react";

type PriceBook = {
  id: string;
  name: string;
  currency: string;
  priceBasis: "EXCLUSIVE" | "INCLUSIVE";
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  _count?: { entries: number };
};

export default function PriceBooksPage() {
  const [items, setItems] = useState<PriceBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    currency: "EUR",
    priceBasis: "EXCLUSIVE" as const,
    isDefault: false,
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/catalog/pricebooks", { cache: "no-store" });
      const json = await res.json();
      setItems(json.items || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    setCreating(true);
    try {
      const res = await fetch("/api/catalog/pricebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        toast.error("Failed to create price book");
        return;
      }
      toast.success("Price book created successfully");
      setDraft({
        name: "",
        currency: "EUR",
        priceBasis: "EXCLUSIVE",
        isDefault: false,
      });
      setShowCreateForm(false);
      load();
    } finally {
      setCreating(false);
    }
  }

  const stats = {
    total: items.length,
    active: items.filter((pb) => pb.isActive).length,
    default: items.filter((pb) => pb.isDefault).length,
    inclusive: items.filter((pb) => pb.priceBasis === "INCLUSIVE").length,
  };

  const currencies = ["EUR", "USD", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY"];

  return (
    <div className="flex flex-col items-start flex-1">
      {/* Header */}
      <div className="flex items-center border-b py-3 px-4 w-full">
        <BookOpen className="h-5 w-5 mr-2 text-gray-600" />
        <h1 className="text-lg font-semibold mr-auto">Price Books</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw
              className={loading ? "h-4 w-4 mr-2 animate-spin" : "h-4 w-4 mr-2"}
            />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Price Book
          </Button>
        </div>
      </div>

      <div className="flex items-start w-full flex-1">
        {/* Main Content */}
        <section className="flex-1">
          {/* Create Form (conditionally shown) */}
          {showCreateForm && (
            <div className="px-4 py-4 bg-blue-50 border-b border-blue-200">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Create New Price Book
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Name
                    </Label>
                    <Input
                      className="h-9 mt-1"
                      value={draft.name}
                      onChange={(e) =>
                        setDraft({ ...draft, name: e.target.value })
                      }
                      placeholder="e.g., Retail Prices"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Currency
                    </Label>
                    <Select
                      value={draft.currency}
                      onValueChange={(v) => setDraft({ ...draft, currency: v })}
                    >
                      <SelectTrigger className="h-9 mt-1">
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
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mt-6">
                      <Switch
                        checked={draft.priceBasis === "INCLUSIVE"}
                        onCheckedChange={(v) =>
                          setDraft((d) => ({
                            ...d,
                            priceBasis: v ? "INCLUSIVE" : "EXCLUSIVE",
                          }))
                        }
                      />
                      <Label className="text-sm font-normal">
                        Tax inclusive
                      </Label>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mt-6">
                      <Switch
                        checked={draft.isDefault}
                        onCheckedChange={(v) =>
                          setDraft((d) => ({ ...d, isDefault: v }))
                        }
                      />
                      <Label className="text-sm font-normal">
                        Set as default
                      </Label>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    onClick={create}
                    disabled={!draft.name || creating}
                  >
                    {creating ? "Creating..." : "Create Price Book"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setDraft({
                        name: "",
                        currency: "EUR",
                        priceBasis: "EXCLUSIVE",
                        isDefault: false,
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Price Books Table */}
          <div className="bg-white">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="col-span-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                Price Book
              </div>
              <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                Currency
              </div>
              <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                Tax Basis
              </div>
              <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                Status
              </div>
              <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider text-right">
                Actions
              </div>
            </div>

            {/* Table Body */}
            {loading ? (
              <div className="px-4 py-12 text-center text-sm text-gray-500">
                Loading price books...
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  No price books created yet
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Create your first price book to manage product pricing
                </p>
              </div>
            ) : (
              items.map((pb) => (
                <div
                  key={pb.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 items-center border-b border-gray-100 hover:bg-gray-50/50 transition-colors group"
                >
                  <div className="col-span-4">
                    <Link
                      href={`/dashboard/catalog/pricebooks/${pb.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline"
                    >
                      {pb.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      {pb.isDefault && (
                        <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                          Default
                        </span>
                      )}
                      {pb._count?.entries && (
                        <span className="text-xs text-gray-500">
                          {pb._count.entries} entries
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-1">
                      <Globe className="h-3 w-3 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">
                        {pb.currency}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span
                      className={`text-[10px] font-medium uppercase px-2 py-1 rounded-full ${
                        pb.priceBasis === "INCLUSIVE"
                          ? "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20"
                          : "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20"
                      }`}
                    >
                      Tax {pb.priceBasis.toLowerCase()}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span
                      className={`text-[10px] font-medium uppercase px-2 py-1 rounded-full ${
                        pb.isActive
                          ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                          : "bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20"
                      }`}
                    >
                      {pb.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/dashboard/catalog/pricebooks/${pb.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
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
                <p className="text-xs text-gray-500">Total Price Books</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <p className="text-2xl font-semibold text-green-600">
                  {stats.active}
                </p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
            </div>
          </div>

          {/* Tax Basis Breakdown */}
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
              Tax Configuration
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-600">Tax Exclusive</span>
                <span className="text-sm font-medium">
                  {items.length - stats.inclusive}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-600">Tax Inclusive</span>
                <span className="text-sm font-medium">{stats.inclusive}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-600">Default Books</span>
                <span className="text-sm font-medium">{stats.default}</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-200 mb-6" />

          {/* Quick Info */}
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
              Info
            </h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-700">
                    Default Price Book
                  </p>
                  <p className="text-xs mt-0.5">
                    Applied when no specific price book is selected
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-700">Volume Pricing</p>
                  <p className="text-xs mt-0.5">
                    Set quantity-based discounts per entry
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Globe className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-700">Multi-Currency</p>
                  <p className="text-xs mt-0.5">
                    Each price book uses a single currency
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-200 mb-6" />

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
                <Settings className="h-4 w-4 mr-2" />
                Tax Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Currency Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
