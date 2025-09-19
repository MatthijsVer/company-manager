// components/documents/LinkCompanyDialog.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check } from "lucide-react";
import type { Document, Company } from "@/types/documents";

interface LinkCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document;
  companies: Company[];
  onLink: (companyIds: string[]) => Promise<void>;
}

export function LinkCompanyDialog({
  open,
  onOpenChange,
  document,
  companies,
  onLink,
}: LinkCompanyDialogProps) {
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(
    document.companies?.map((c) => c.id) || []
  );
  const [linking, setLinking] = useState(false);

  const handleLink = async () => {
    setLinking(true);
    try {
      await onLink(selectedCompanies);
      onOpenChange(false);
    } finally {
      setLinking(false);
    }
  };

  const toggleCompany = (companyId: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link to Companies</DialogTitle>
          <DialogDescription>
            Select companies to share "{document.fileName}" with
          </DialogDescription>
        </DialogHeader>

        <Command>
          <CommandInput placeholder="Search companies..." />
          <CommandEmpty>No companies found.</CommandEmpty>
          <CommandGroup>
            <ScrollArea className="h-[300px]">
              {companies.map((company) => (
                <CommandItem
                  key={company.id}
                  onSelect={() => toggleCompany(company.id)}
                  className="cursor-pointer"
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      selectedCompanies.includes(company.id)
                        ? "opacity-100"
                        : "opacity-0"
                    }`}
                  />
                  <div
                    className="h-2 w-2 rounded-full mr-2"
                    style={{ backgroundColor: company.color || "#999" }}
                  />
                  <span>{company.name}</span>
                </CommandItem>
              ))}
            </ScrollArea>
          </CommandGroup>
        </Command>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={linking}
          >
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={linking || selectedCompanies.length === 0}
            className="bg-[#FF6B4A] hover:bg-[#FF6B4A]/90"
          >
            {linking
              ? "Linking..."
              : `Link ${selectedCompanies.length} ${
                  selectedCompanies.length === 1 ? "Company" : "Companies"
                }`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
