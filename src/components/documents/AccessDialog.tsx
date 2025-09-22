"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// keep roles tiny/simple (viewer/editor/manager)
const rolePresets = {
  viewer: {
    canView: true,
    canEdit: false,
    canDelete: false,
    canShare: false,
    canManagePerms: false,
  },
  editor: {
    canView: true,
    canEdit: true,
    canDelete: false,
    canShare: true,
    canManagePerms: false,
  },
  manager: {
    canView: true,
    canEdit: true,
    canDelete: true,
    canShare: true,
    canManagePerms: true,
  },
};
type RoleKey = keyof typeof rolePresets;

type LiteUser = {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
};

type RuleBase = {
  id?: string;
  userId: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  // folders only; harmless extra for docs (ignored on server)
  canManagePerms?: boolean;
};

export function AccessMini({
  entity, // "folder" | "document"
  entityId,
  title = "Manage access",
  className,
  maxChips = 3,
}: {
  entity: "folder" | "document";
  entityId: string;
  title?: string;
  className?: string;
  maxChips?: number;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<RuleBase[]>([]);
  const [users, setUsers] = useState<LiteUser[]>([]);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  const endpoint =
    entity === "folder"
      ? `/api/folders/${entityId}/permissions/users`
      : `/api/documents/${entityId}/permissions/users`;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/users?lite=1");
        if (res.ok) {
          const json = await res.json();
          setUsers(json?.users ?? json ?? []); // support both shapes
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(endpoint);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load access");
        setRules(json.rules || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, endpoint]);

  const assignedUsers = useMemo(
    () => users.filter((u) => rules.some((r) => r.userId === u.id)),
    [users, rules]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => (u.name || u.email).toLowerCase().includes(s));
  }, [users, q]);

  function upsertRule(userId: string, partial: Partial<RuleBase>) {
    setRules((prev) => {
      const i = prev.findIndex((r) => r.userId === userId);
      if (i === -1)
        return [{ userId, ...rolePresets.viewer, ...partial }, ...prev];
      const next = [...prev];
      next[i] = { ...next[i], ...partial };
      return next;
    });
  }
  function removeRule(userId: string) {
    setRules((prev) => prev.filter((r) => r.userId !== userId));
  }
  function roleOf(r: RuleBase): RoleKey {
    const m = JSON.stringify({ ...r, canManagePerms: !!r.canManagePerms });
    if (m === JSON.stringify(rolePresets.manager)) return "manager";
    if (
      m ===
      JSON.stringify({
        ...rolePresets.editor,
        canManagePerms: !!r.canManagePerms,
      })
    )
      return "editor";
    return "viewer";
  }

  async function persist() {
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to save");
      setOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  // ---- UI
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* chips */}
      <div className="flex -space-x-2">
        {assignedUsers.slice(0, maxChips).map((u) => (
          <Avatar key={u.id} className="size-7 border-2 border-background">
            {u.image ? (
              <AvatarImage src={u.image} />
            ) : (
              <AvatarFallback className="text-xs font-semibold">
                {(u.name || u.email).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
        ))}
        {assignedUsers.length > maxChips && (
          <div className="size-7 rounded-full bg-muted text-foreground border-2 border-background flex items-center justify-center text-xs">
            +{assignedUsers.length - maxChips}
          </div>
        )}
      </div>

      {/* open popover button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 mr-1">
            <UserCircle2 className="size-3.5 text-gray-500" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className={cn(
            "w-[460px] p-0 overflow-hidden",
            "bg-popover text-popover-foreground shadow-lg border"
          )}
        >
          <div className="p-3 border-b bg-card">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              <span className="font-medium text-sm">{title}</span>
              <div className="ml-auto text-xs text-muted-foreground">
                {loading ? "Loading…" : `${rules.length} members`}
              </div>
            </div>
            <div className="mt-2">
              <Input
                placeholder="Search users…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-8"
              />
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto p-2 bg-background">
            {filtered.map((u) => {
              const r = rules.find((x) => x.userId === u.id);
              const isAssigned = !!r;
              const working = processing.has(u.id);

              return (
                <div
                  key={u.id}
                  className={cn(
                    "flex items-center gap-3 px-2 py-2 rounded-md",
                    isAssigned ? "bg-muted/50" : "hover:bg-muted/40"
                  )}
                >
                  <div className="relative">
                    <Checkbox
                      checked={isAssigned}
                      onCheckedChange={(checked) => {
                        setProcessing(new Set(processing).add(u.id));
                        if (checked) upsertRule(u.id, rolePresets.viewer);
                        else removeRule(u.id);
                        setProcessing((prev) => {
                          const n = new Set(prev);
                          n.delete(u.id);
                          return n;
                        });
                      }}
                      disabled={working}
                    />
                  </div>

                  <Avatar className="size-8">
                    {u.image ? (
                      <AvatarImage src={u.image} />
                    ) : (
                      <AvatarFallback className="text-xs font-semibold bg-[#1F1F1F] text-white">
                        {(u.name || u.email).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {u.name || u.email}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {u.email}
                    </div>
                  </div>

                  {isAssigned && (
                    <div className="flex items-center gap-2">
                      {/* quick toggles */}
                      <div className="hidden md:flex items-center gap-3 text-xs">
                        <label className="flex items-center gap-1">
                          <Checkbox
                            checked={!!r?.canEdit}
                            onCheckedChange={(v) =>
                              upsertRule(u.id, { canEdit: !!v })
                            }
                          />
                          Edit
                        </label>
                        <label className="flex items-center gap-1">
                          <Checkbox
                            checked={!!r?.canDelete}
                            onCheckedChange={(v) =>
                              upsertRule(u.id, { canDelete: !!v })
                            }
                          />
                          Delete
                        </label>
                        {entity === "folder" && (
                          <label className="flex items-center gap-1">
                            <Checkbox
                              checked={!!r?.canManagePerms}
                              onCheckedChange={(v) =>
                                upsertRule(u.id, { canManagePerms: !!v })
                              }
                            />
                            Manage
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-sm text-muted-foreground p-3">No users</div>
            )}
          </div>

          <div className="p-3 border-t bg-card flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button size="sm" onClick={persist} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
