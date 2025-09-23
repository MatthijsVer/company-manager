"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  CreditCard,
  CheckCircle,
  Calendar,
  User,
  Hash,
  PlusCircle,
} from "lucide-react";

type Payment = {
  id: string;
  amount: number;
  currency: string;
  method: string;
  reference?: string | null;
  receivedDate: string;
  notes?: string | null;
  creator: {
    name: string | null;
    email: string;
  };
  createdAt: string;
};

interface PaymentTrackerProps {
  invoiceId: string;
  currency: string;
  amountDue: number;
  status: string;
  onPaymentAdded?: () => void;
}

export function PaymentTracker({
  invoiceId,
  currency,
  amountDue,
  status,
  onPaymentAdded,
}: PaymentTrackerProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    method: "BANK_TRANSFER",
    reference: "",
    receivedDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    fetchPayments();
  }, [invoiceId]);

  async function fetchPayments() {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/payments`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    } finally {
      setLoading(false);
    }
  }

  async function addPayment() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(formData.amount),
          currency,
          method: formData.method,
          reference: formData.reference || null,
          receivedDate: formData.receivedDate,
          notes: formData.notes || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to record payment");
      }

      const payment = await res.json();
      setPayments((prev) => [payment, ...prev]);
      setDialogOpen(false);
      setFormData({
        amount: "",
        method: "BANK_TRANSFER",
        reference: "",
        receivedDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
      toast.success("Payment recorded successfully");
      onPaymentAdded?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  }

  function getMethodColor(method: string) {
    switch (method) {
      case "BANK_TRANSFER":
        return "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20";
      case "CREDIT_CARD":
        return "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20";
      case "CHECK":
        return "bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20";
      case "CASH":
        return "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20";
      default:
        return "bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20";
    }
  }

  function getMethodLabel(method: string) {
    const labels: Record<string, string> = {
      BANK_TRANSFER: "Bank Transfer",
      CREDIT_CARD: "Credit Card",
      CHECK: "Check",
      CASH: "Cash",
      OTHER: "Other",
    };
    return labels[method] || method;
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading payments...</div>;
  }

  const canAddPayment =
    status !== "PAID" &&
    status !== "CANCELLED" &&
    status !== "REFUNDED" &&
    amountDue > 0;
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-4">
      {/* Header with summary */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            Payment Summary
          </p>
          <div className="flex items-center gap-4 mt-1">
            <div>
              <span className="text-sm text-gray-600">Total Paid: </span>
              <span className="font-medium">
                {currency} {totalPaid.toFixed(2)}
              </span>
            </div>
            {amountDue > 0 && (
              <div>
                <span className="text-sm text-gray-600">Remaining: </span>
                <span className="font-medium text-red-600">
                  {currency} {amountDue.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
        {canAddPayment && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
                <DialogDescription>
                  Record a payment received for this invoice. Amount due:{" "}
                  {currency} {amountDue.toFixed(2)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Amount *
                    </Label>
                    <Input
                      className="mt-1"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={amountDue}
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                      placeholder={amountDue.toFixed(2)}
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Method
                    </Label>
                    <Select
                      value={formData.method}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, method: value }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BANK_TRANSFER">
                          Bank Transfer
                        </SelectItem>
                        <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                        <SelectItem value="CHECK">Check</SelectItem>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Reference
                    </Label>
                    <Input
                      className="mt-1"
                      value={formData.reference}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          reference: e.target.value,
                        }))
                      }
                      placeholder="Transaction ID"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Date Received
                    </Label>
                    <Input
                      className="mt-1"
                      type="date"
                      value={formData.receivedDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          receivedDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Notes
                  </Label>
                  <Textarea
                    className="mt-1"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Optional notes"
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={addPayment}
                  disabled={
                    submitting ||
                    !formData.amount ||
                    Number(formData.amount) <= 0
                  }
                >
                  {submitting ? "Recording..." : "Record Payment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Payments List */}
      {payments.length === 0 ? (
        <div className="text-center py-8">
          <CreditCard className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">No payments recorded</p>
          {canAddPayment && (
            <p className="text-xs text-gray-400 mt-1">
              Click "Record Payment" to add the first payment
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-t-lg">
            <div className="col-span-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
              Amount
            </div>
            <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
              Method
            </div>
            <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
              Reference
            </div>
            <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
              Date
            </div>
            <div className="col-span-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
              Recorded By
            </div>
          </div>

          {/* Table Body */}
          <div className="border-x border-b border-gray-200 rounded-b-lg divide-y divide-gray-100">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50/50 transition-colors"
              >
                <div className="col-span-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-sm">
                      {payment.currency} {Number(payment.amount).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="col-span-2">
                  <span
                    className={`text-[10px] font-medium uppercase px-2 py-1 rounded-full ${getMethodColor(payment.method)}`}
                  >
                    {getMethodLabel(payment.method)}
                  </span>
                </div>
                <div className="col-span-2">
                  {payment.reference ? (
                    <div className="flex items-center gap-1">
                      <Hash className="h-3 w-3 text-gray-400" />
                      <span className="text-sm text-gray-700">
                        {payment.reference}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {new Date(payment.receivedDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="col-span-3">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {payment.creator.name || payment.creator.email}
                    </span>
                  </div>
                  {payment.notes && (
                    <p className="text-xs text-gray-500 mt-1">
                      {payment.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
