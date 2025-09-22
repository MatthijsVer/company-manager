import { useCallback, useState } from "react";

export function usePriceQuote() {
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState<string | null>(null);

  const quote = useCallback(async (args: {
    productId: string;
    variantId?: string;
    priceBookId?: string;
    unitId?: string;
    quantity: number;
    asOf?: Date;
    shipTo?: { country?: string; region?: string; postal?: string };
  }) => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch("/api/catalog/price/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to quote");
      return json;
    } catch (e: any) {
      setErr(e?.message || "Failed to quote");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { quote, loading, error };
}
