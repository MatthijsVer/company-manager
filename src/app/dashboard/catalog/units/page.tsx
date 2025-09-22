"use client";

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
  Ruler,
  Plus,
  RefreshCw,
  Hash,
  Clock,
  Box,
  Weight,
  Maximize,
  Droplets,
  MoreHorizontal,
  Edit,
  Trash2,
  Settings,
} from "lucide-react";

type Unit = {
  id: string;
  code: string;
  label: string;
  kind: "UNIT" | "TIME" | "LENGTH" | "AREA" | "VOLUME" | "WEIGHT" | "OTHER";
  isActive: boolean;
  createdAt?: string;
};

const kindOptions = [
  { value: "UNIT", label: "Unit", icon: Hash },
  { value: "TIME", label: "Time", icon: Clock },
  { value: "LENGTH", label: "Length", icon: Ruler },
  { value: "AREA", label: "Area", icon: Maximize },
  { value: "VOLUME", label: "Volume", icon: Droplets },
  { value: "WEIGHT", label: "Weight", icon: Weight },
  { value: "OTHER", label: "Other", icon: MoreHorizontal },
];

export default function UnitsPage() {
  const [items, setItems] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterKind, setFilterKind] = useState<string>("all");
  const [draft, setDraft] = useState({
    code: "",
    label: "",
    kind: "UNIT" as Unit["kind"],
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/catalog/units", { cache: "no-store" });
      const json = await res.json();
      setItems(json.items || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!draft.code || !draft.label) {
      toast.error("Please fill in all required fields");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/catalog/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.message || "Failed to create unit");
        return;
      }

      toast.success("Unit created successfully");
      setDraft({ code: "", label: "", kind: "UNIT" });
      setShowCreateForm(false);
      load();
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(u: Unit, v: boolean) {
    const res = await fetch(`/api/catalog/units/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: v }),
    });

    if (!res.ok) {
      toast.error("Failed to update unit");
    } else {
      toast.success("Unit updated");
      setItems((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, isActive: v } : x))
      );
    }
  }

  function getKindIcon(kind: Unit["kind"]) {
    const kindOption = kindOptions.find((k) => k.value === kind);
    const Icon = kindOption?.icon || Hash;
    return <Icon className="h-3 w-3" />;
  }

  function getKindColor(kind: Unit["kind"]) {
    switch (kind) {
      case "TIME":
        return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20";
      case "LENGTH":
        return "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20";
      case "AREA":
        return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20";
      case "VOLUME":
        return "bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-600/20";
      case "WEIGHT":
        return "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20";
      case "UNIT":
        return "bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20";
      default:
        return "bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20";
    }
  }

  // Filter items based on search and kind
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      searchTerm === "" ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.label.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesKind = filterKind === "all" || item.kind === filterKind;
    return matchesSearch && matchesKind;
  });

  // Calculate stats
  const stats = {
    total: items.length,
    active: items.filter((u) => u.isActive).length,
    byKind: kindOptions.map((k) => ({
      ...k,
      count: items.filter((u) => u.kind === k.value).length,
    })),
  };

  return (
    <div className="flex flex-col items-start flex-1">
      {/* Header */}
      <div className="flex items-center border-b py-3 px-4 w-full">
        <Ruler className="h-5 w-5 mr-2 text-gray-600" />
        <h1 className="text-lg font-semibold mr-auto">Units of Measurement</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw
              className={loading ? "h-4 w-4 mr-2 animate-spin" : "h-4 w-4 mr-2"}
            />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Unit
          </Button>
        </div>
      </div>

      <div className="flex items-start w-full flex-1">
        {/* Main Content */}
        <section className="flex-1">
          {/* Create Form */}
          {showCreateForm && (
            <div className="px-4 py-4 bg-blue-50 border-b border-blue-200">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Create New Unit
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Code *
                    </Label>
                    <Input
                      className="h-9 mt-1"
                      value={draft.code}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          code: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="e.g., KG, HR, M2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Label *
                    </Label>
                    <Input
                      className="h-9 mt-1"
                      value={draft.label}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, label: e.target.value }))
                      }
                      placeholder="e.g., Kilogram, Hour, Square Meter"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Category
                    </Label>
                    <Select
                      value={draft.kind}
                      onValueChange={(v) =>
                        setDraft((d) => ({ ...d, kind: v as Unit["kind"] }))
                      }
                    >
                      <SelectTrigger className="h-9 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {kindOptions.map((opt) => {
                          const Icon = opt.icon;
                          return (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-3 w-3" />
                                {opt.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    onClick={add}
                    disabled={!draft.code || !draft.label || creating}
                  >
                    {creating ? "Creating..." : "Create Unit"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setDraft({ code: "", label: "", kind: "UNIT" });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="px-4 py-3 border-b bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Hash className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by code or label..."
                  className="h-9 pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterKind} onValueChange={setFilterKind}>
                <SelectTrigger className="h-9 w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {kindOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className="h-3 w-3" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Units Table */}
          <div className="bg-white">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                Code
              </div>
              <div className="col-span-4 text-xs font-medium text-gray-600 uppercase tracking-wider">
                Label
              </div>
              <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                Category
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
                Loading units...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Box className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {searchTerm || filterKind !== "all"
                    ? "No units found matching your filters"
                    : "No units created yet"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {searchTerm || filterKind !== "all"
                    ? "Try adjusting your search or filters"
                    : "Create your first unit to get started"}
                </p>
              </div>
            ) : (
              filteredItems.map((unit) => (
                <div
                  key={unit.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 items-center border-b border-gray-100 hover:bg-gray-50/50 transition-colors group"
                >
                  <div className="col-span-2">
                    <span className="text-sm font-mono font-medium text-gray-900">
                      {unit.code}
                    </span>
                  </div>
                  <div className="col-span-4">
                    <span className="text-sm text-gray-700">{unit.label}</span>
                  </div>
                  <div className="col-span-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase px-2 py-1 rounded-full ${getKindColor(unit.kind)}`}
                    >
                      {getKindIcon(unit.kind)}
                      {unit.kind}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={unit.isActive}
                        onCheckedChange={(v) => toggleActive(unit, v)}
                        className="data-[state=checked]:bg-green-600"
                      />
                      <span className="text-xs text-gray-500">
                        {unit.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Trash2 className="h-4 w-4 text-red-500" />
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
                <p className="text-xs text-gray-500">Total Units</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <p className="text-2xl font-semibold text-green-600">
                  {stats.active}
                </p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
              By Category
            </h3>
            <div className="space-y-2">
              {stats.byKind.map((kind) => {
                const Icon = kind.icon;
                return (
                  <div
                    key={kind.value}
                    className="flex items-center justify-between py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-3 w-3 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {kind.label}
                      </span>
                    </div>
                    <span className="text-sm font-medium">{kind.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-gray-200 mb-6" />

          {/* Common Units Reference */}
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">
              Common Units
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <p className="font-medium text-gray-700 mb-1">Time</p>
                <p className="text-gray-500">SEC, MIN, HR, DAY, WK, MON, YR</p>
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-1">Weight</p>
                <p className="text-gray-500">MG, G, KG, LB, OZ, TON</p>
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-1">Length</p>
                <p className="text-gray-500">MM, CM, M, KM, IN, FT, YD, MI</p>
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-1">Volume</p>
                <p className="text-gray-500">ML, L, GAL, FL OZ, CUP, PT, QT</p>
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
                Unit Conversion Rules
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
