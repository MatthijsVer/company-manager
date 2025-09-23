"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Info, Calculator, Percent, Receipt } from "lucide-react";
import { usePriceQuote } from "@/hooks/usePriceQuote";

interface PricingDetailsProps {
  productId?: string;
  variantId?: string;
  quantity: number;
  priceBookId?: string;
  currency?: string;
  shipTo?: { country?: string; region?: string; postal?: string };
}

interface PriceDetails {
  unitPrice: string;
  discountPct?: string | null;
  tax: {
    rules: Array<{
      ruleId: string;
      name: string;
      ratePct: string;
      compound: boolean;
    }>;
    taxAmount: string;
    effectiveRatePct: string;
  };
  lineSubtotal: string;
  lineTotal: string;
  basis: "EXCLUSIVE" | "INCLUSIVE";
}

export function PricingDetails({
  productId,
  variantId,
  quantity,
  priceBookId,
  currency = "EUR",
  shipTo,
}: PricingDetailsProps) {
  const [priceDetails, setPriceDetails] = useState<PriceDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { quote: quotePrice } = usePriceQuote();

  useEffect(() => {
    if (!productId || !priceBookId || quantity <= 0) {
      setPriceDetails(null);
      return;
    }

    async function fetchPricing() {
      setLoading(true);
      setError(null);
      
      try {
        const result = await quotePrice({
          productId,
          variantId,
          priceBookId,
          quantity,
          shipTo,
        });

        if (result?.ok) {
          setPriceDetails(result as PriceDetails);
        } else {
          setError(result?.error || "Failed to get pricing");
        }
      } catch (err: any) {
        setError(err.message || "Failed to get pricing");
      } finally {
        setLoading(false);
      }
    }

    fetchPricing();
  }, [productId, variantId, priceBookId, quantity, shipTo, quotePrice]);

  if (!productId || !priceBookId) {
    return (
      <div className="text-xs text-muted-foreground text-center">
        Select product and price book
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground text-center">
        Calculating...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-red-500 text-center">
        {error}
      </div>
    );
  }

  if (!priceDetails) {
    return (
      <div className="text-xs text-muted-foreground text-center">
        No pricing available
      </div>
    );
  }

  const unitPriceNum = parseFloat(priceDetails.unitPrice);
  const discountPct = priceDetails.discountPct ? parseFloat(priceDetails.discountPct) : 0;
  const originalUnitPrice = discountPct > 0 ? unitPriceNum / (1 - discountPct / 100) : unitPriceNum;
  const discountAmount = originalUnitPrice - unitPriceNum;

  return (
    <div className="space-y-2">
      {/* Quick Summary */}
      <div className="text-xs space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Unit Price:</span>
          <div className="flex items-center gap-1">
            {discountPct > 0 && (
              <>
                <span className="line-through text-muted-foreground">
                  {currency} {originalUnitPrice.toFixed(2)}
                </span>
                <Badge variant="destructive" className="text-xs px-1 py-0">
                  -{discountPct}%
                </Badge>
              </>
            )}
            <span className="font-medium">
              {currency} {unitPriceNum.toFixed(2)}
            </span>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Line Total:</span>
          <span className="font-medium">
            {currency} {parseFloat(priceDetails.lineTotal).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-full text-xs">
            <Calculator className="h-3 w-3 mr-1" />
            View Details
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              <h4 className="font-semibold text-sm">Pricing Breakdown</h4>
            </div>

            {/* Unit Price Details */}
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Unit Pricing
              </h5>
              
              {discountPct > 0 ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Original Unit Price:</span>
                    <span>{currency} {originalUnitPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Discount ({discountPct}%):</span>
                    <span>-{currency} {discountAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Net Unit Price:</span>
                    <span>{currency} {unitPriceNum.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-sm">
                  <span>Unit Price:</span>
                  <span>{currency} {unitPriceNum.toFixed(2)}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Line Calculation */}
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Line Calculation
              </h5>
              
              <div className="flex justify-between text-sm">
                <span>Quantity:</span>
                <span>{quantity}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span>Subtotal ({priceDetails.basis.toLowerCase()}):</span>
                <span>{currency} {parseFloat(priceDetails.lineSubtotal).toFixed(2)}</span>
              </div>
            </div>

            {/* Tax Details */}
            {priceDetails.tax.rules.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Tax Breakdown
                  </h5>
                  
                  {priceDetails.tax.rules.map((rule, index) => (
                    <div key={rule.ruleId} className="flex justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <span>{rule.name}</span>
                        {rule.compound && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            Compound
                          </Badge>
                        )}
                      </div>
                      <span>{rule.ratePct}%</span>
                    </div>
                  ))}
                  
                  <div className="flex justify-between text-sm font-medium text-green-600">
                    <span>Total Tax ({parseFloat(priceDetails.tax.effectiveRatePct).toFixed(2)}%):</span>
                    <span>{currency} {parseFloat(priceDetails.tax.taxAmount).toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Final Total */}
            <div className="flex justify-between text-base font-semibold">
              <span>Line Total:</span>
              <span>{currency} {parseFloat(priceDetails.lineTotal).toFixed(2)}</span>
            </div>

            {/* Pricing Basis Info */}
            <div className="bg-muted/50 p-2 rounded text-xs">
              <div className="flex items-center gap-1 mb-1">
                <Info className="h-3 w-3" />
                <span className="font-medium">Pricing Basis</span>
              </div>
              <p className="text-muted-foreground">
                {priceDetails.basis === "EXCLUSIVE" 
                  ? "Prices are tax-exclusive. Tax is added to the subtotal."
                  : "Prices are tax-inclusive. Tax is included in the unit price."
                }
              </p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Simple inline pricing display without popover
export function InlinePricingInfo({
  productId,
  variantId,
  quantity,
  priceBookId,
  currency = "EUR",
}: PricingDetailsProps) {
  const [priceDetails, setPriceDetails] = useState<PriceDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const { quote: quotePrice } = usePriceQuote();

  useEffect(() => {
    if (!productId || !priceBookId || quantity <= 0) {
      setPriceDetails(null);
      return;
    }

    async function fetchPricing() {
      setLoading(true);
      
      try {
        const result = await quotePrice({
          productId,
          variantId,
          priceBookId,
          quantity,
        });

        if (result?.ok) {
          setPriceDetails(result as PriceDetails);
        }
      } catch (err) {
        // Ignore errors for inline display
      } finally {
        setLoading(false);
      }
    }

    fetchPricing();
  }, [productId, variantId, priceBookId, quantity, quotePrice]);

  if (!priceDetails || loading) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const unitPriceNum = parseFloat(priceDetails.unitPrice);
  const discountPct = priceDetails.discountPct ? parseFloat(priceDetails.discountPct) : 0;
  const totalNum = parseFloat(priceDetails.lineTotal);

  return (
    <div className="text-right text-xs space-y-0.5">
      <div className="flex items-center justify-end gap-1">
        <span className="font-medium">{currency} {unitPriceNum.toFixed(2)}</span>
        {discountPct > 0 && (
          <Badge variant="destructive" className="text-xs px-1 py-0">
            -{discountPct}%
          </Badge>
        )}
      </div>
      <div className="text-muted-foreground">
        Total: {currency} {totalNum.toFixed(2)}
      </div>
      {priceDetails.tax.rules.length > 0 && (
        <div className="text-green-600">
          +{parseFloat(priceDetails.tax.effectiveRatePct).toFixed(1)}% tax
        </div>
      )}
    </div>
  );
}