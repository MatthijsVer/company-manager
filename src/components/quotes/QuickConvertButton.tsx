"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileText } from "lucide-react";

interface QuickConvertButtonProps {
  quoteId: string;
  quoteName: string;
}

export function QuickConvertButton({ quoteId, quoteName }: QuickConvertButtonProps) {
  const router = useRouter();
  const [converting, setConverting] = useState(false);

  async function convertToInvoice() {
    try {
      setConverting(true);
      const res = await fetch(`/api/quotes/${quoteId}/convert-to-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to convert to invoice');
      }

      const invoice = await res.json();
      toast.success(`${quoteName} converted to invoice ${invoice.number}`);
      router.push(`/dashboard/invoices/${invoice.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to convert to invoice');
    } finally {
      setConverting(false);
    }
  }

  return (
    <Button
      size="sm"
      onClick={convertToInvoice}
      disabled={converting}
      className="bg-green-600 hover:bg-green-700 text-white"
    >
      <FileText className="h-4 w-4 mr-1" />
      {converting ? "Converting..." : "→ Invoice"}
    </Button>
  );
}