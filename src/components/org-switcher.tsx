"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export function OrgSwitcher() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch("/api/user/organizations");
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data.organizations);
        setActiveOrgId(data.activeOrgId);
      }
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitch = async (orgId: string) => {
    try {
      const res = await fetch("/api/user/switch-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });

      if (res.ok) {
        setActiveOrgId(orgId);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to switch organization:", error);
    }
  };

  if (isLoading || organizations.length <= 1) {
    return null;
  }

  const activeOrg = organizations.find((org) => org.id === activeOrgId);

  return (
    <Select value={activeOrgId} onValueChange={handleSwitch}>
      <SelectTrigger className="w-[200px]">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <SelectValue>{activeOrg?.name || "Select Organization"}</SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {organizations.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            <div className="flex flex-col">
              <span>{org.name}</span>
              <span className="text-xs text-muted-foreground">{org.role}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
