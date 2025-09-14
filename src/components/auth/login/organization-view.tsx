"use client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Building2 } from "lucide-react";
import type { Organization } from "@/types/login";

interface OrganizationViewProps {
  error: string;
  organizations: Organization[];
  onSelectOrganization: (slug: string) => void;
  onBack: () => void;
}

export function OrganizationView({
  error,
  organizations,
  onSelectOrganization,
  onBack,
}: OrganizationViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto" />
        </div>
        <h1 className="text-2xl font-bold">Select Organization</h1>
        <p className="text-muted-foreground text-balance">
          Choose which organization to access
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        {organizations.map((org) => (
          <button
            key={org.id}
            onClick={() => onSelectOrganization(org.slug)}
            className="w-full p-4 text-left border rounded-lg hover:bg-accent transition-colors"
          >
            <div className="font-semibold">{org.name}</div>
            <div className="text-sm text-muted-foreground">
              Role: {org.role.toLowerCase().replace("_", " ")}
            </div>
          </button>
        ))}
      </div>

      <Button variant="ghost" onClick={onBack} className="w-full">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to login
      </Button>
    </div>
  );
}
