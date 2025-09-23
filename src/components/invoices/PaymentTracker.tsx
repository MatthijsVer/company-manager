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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, CreditCard, CheckCircle, Calendar } from "lucide-react";

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
  onPaymentAdded 
}: PaymentTrackerProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    method: "BANK_TRANSFER",
    reference: "",
    receivedDate: new Date().toISOString().split('T')[0],
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
        receivedDate: new Date().toISOString().split('T')[0],
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

  function getMethodBadge(method: string) {
    const config = {
      CASH: { variant: "default" as const, label: "Cash" },
      CHECK: { variant: "outline" as const, label: "Check" },
      BANK_TRANSFER: { variant: "default" as const, label: "Bank Transfer" },
      CREDIT_CARD: { variant: "default" as const, label: "Credit Card" },
      OTHER: { variant: "secondary" as const, label: "Other" },
    };
    
    const { variant, label } = config[method as keyof typeof config] || config.OTHER;
    return <Badge variant={variant}>{label}</Badge>;
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading payments...</div>;
  }

  const canAddPayment = status !== 'PAID' && status !== 'CANCELLED' && status !== 'REFUNDED' && amountDue > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Payments</h3>
        {canAddPayment && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
                <DialogDescription>
                  Record a payment received for this invoice.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={amountDue}
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder={`Max: ${currency} ${amountDue.toFixed(2)}`}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="method">Payment Method</Label>
                    <Select
                      value={formData.method}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, method: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
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
                    <Label htmlFor="reference">Reference</Label>
                    <Input
                      id="reference"
                      value={formData.reference}
                      onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                      placeholder="Transaction ID, check #, etc."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="receivedDate">Received Date</Label>
                    <Input
                      id="receivedDate"
                      type="date"
                      value={formData.receivedDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, receivedDate: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes about this payment"
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
                  disabled={submitting || !formData.amount || Number(formData.amount) <= 0}
                >
                  {submitting ? "Recording..." : "Record Payment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CreditCard className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p>No payments recorded yet</p>
          {canAddPayment && (
            <p className="text-sm">Record the first payment to get started.</p>
          )}
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Amount</th>
                <th className="text-left p-3 font-medium">Method</th>
                <th className="text-left p-3 font-medium">Reference</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t">
                  <td className="p-3 font-medium">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      {payment.currency} {Number(payment.amount).toFixed(2)}
                    </div>
                  </td>
                  <td className="p-3">
                    {getMethodBadge(payment.method)}
                  </td>
                  <td className="p-3">
                    {payment.reference || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(payment.receivedDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {payment.creator.name || payment.creator.email}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}