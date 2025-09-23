"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Package, Clock, TrendingUp } from "lucide-react";
import { usePriceQuote } from "@/hooks/usePriceQuote";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  type: string;
  unit?: { code: string } | null;
  variants?: Array<{
    id: string;
    sku: string | null;
    name: string | null;
  }>;
}

interface ProductSelectorProps {
  value?: string;
  variantId?: string;
  onSelect: (productId: string | undefined, variantId?: string | undefined) => void;
  priceBookId?: string;
  quantity?: number;
  disabled?: boolean;
  organizationId?: string;
}

export function ProductSelector({
  value,
  variantId,
  onSelect,
  priceBookId,
  quantity = 1,
  disabled,
  organizationId,
}: ProductSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentProducts, setRecentProducts] = useState<string[]>([]);
  const [prices, setPrices] = useState<Record<string, { price: string; currency: string }>>({});
  const { quote: quotePrice } = usePriceQuote();

  // Load products
  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/catalog/products?active=true');
        const data = await res.json();
        setProducts(data.items || []);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  // Load recent products from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentQuoteProducts');
    if (stored) {
      try {
        setRecentProducts(JSON.parse(stored));
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Save to recent products
  const saveToRecent = useCallback((productId: string) => {
    const updated = [productId, ...recentProducts.filter(id => id !== productId)].slice(0, 5);
    setRecentProducts(updated);
    localStorage.setItem('recentQuoteProducts', JSON.stringify(updated));
  }, [recentProducts]);

  // Fetch price for a product
  const fetchPrice = useCallback(async (productId: string, variantId?: string) => {
    if (!priceBookId) return;
    
    try {
      const result = await quotePrice({
        productId,
        variantId,
        priceBookId,
        quantity,
      });
      
      if (result?.ok) {
        setPrices(prev => ({
          ...prev,
          [variantId || productId]: {
            price: result.unitPrice,
            currency: result.currency,
          }
        }));
      }
    } catch (error) {
      // Ignore price fetch errors
    }
  }, [priceBookId, quantity, quotePrice]);

  // Filtered and categorized products
  const { filteredProducts, recentProductsList, topProducts } = useMemo(() => {
    const searchLower = search.toLowerCase();
    
    const filtered = products.filter(product => 
      product.name.toLowerCase().includes(searchLower) ||
      (product.sku && product.sku.toLowerCase().includes(searchLower)) ||
      (product.description && product.description.toLowerCase().includes(searchLower))
    );

    const recent = recentProducts
      .map(id => products.find(p => p.id === id))
      .filter(Boolean) as Product[];

    // Mock top products (in real app, this would come from analytics)
    const top = products.slice(0, 3);

    return {
      filteredProducts: filtered,
      recentProductsList: recent,
      topProducts: top,
    };
  }, [products, search, recentProducts]);

  // Get selected product
  const selectedProduct = products.find(p => p.id === value);
  const selectedVariant = selectedProduct?.variants?.find(v => v.id === variantId);

  // Fetch prices for visible products
  useEffect(() => {
    if (!priceBookId) return;

    const visibleProducts = [...filteredProducts, ...recentProductsList, ...topProducts];
    const uniqueProducts = Array.from(new Set(visibleProducts.map(p => p.id)));
    
    uniqueProducts.forEach(productId => {
      const product = products.find(p => p.id === productId);
      if (product?.variants?.length) {
        product.variants.forEach(variant => {
          if (!prices[variant.id]) {
            fetchPrice(productId, variant.id);
          }
        });
      } else if (!prices[productId]) {
        fetchPrice(productId);
      }
    });
  }, [filteredProducts, recentProductsList, topProducts, priceBookId, products, prices, fetchPrice]);

  const handleSelect = (productId: string, variantId?: string) => {
    saveToRecent(productId);
    onSelect(productId, variantId);
    setOpen(false);
  };

  const displayValue = selectedProduct 
    ? `${selectedProduct.name}${selectedVariant ? ` - ${selectedVariant.name || selectedVariant.sku}` : ''}`
    : "Select product...";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search products by name, SKU, or description..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <CommandEmpty>Loading products...</CommandEmpty>
            ) : (
              <>
                {/* Recently Used Products */}
                {recentProductsList.length > 0 && search === "" && (
                  <CommandGroup heading={
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Recently Used
                    </div>
                  }>
                    {recentProductsList.map((product) => (
                      <ProductItem
                        key={product.id}
                        product={product}
                        selected={value === product.id && !variantId}
                        onSelect={handleSelect}
                        prices={prices}
                        priceBookId={priceBookId}
                      />
                    ))}
                  </CommandGroup>
                )}

                {/* Top Products */}
                {topProducts.length > 0 && search === "" && (
                  <CommandGroup heading={
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Popular Products
                    </div>
                  }>
                    {topProducts.map((product) => (
                      <ProductItem
                        key={`top-${product.id}`}
                        product={product}
                        selected={value === product.id && !variantId}
                        onSelect={handleSelect}
                        prices={prices}
                        priceBookId={priceBookId}
                      />
                    ))}
                  </CommandGroup>
                )}

                {/* Search Results */}
                {filteredProducts.length === 0 ? (
                  <CommandEmpty>No products found.</CommandEmpty>
                ) : (
                  <CommandGroup heading={
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {search ? "Search Results" : "All Products"}
                    </div>
                  }>
                    {filteredProducts.map((product) => (
                      <ProductItem
                        key={`all-${product.id}`}
                        product={product}
                        selected={value === product.id && !variantId}
                        selectedVariantId={variantId}
                        onSelect={handleSelect}
                        prices={prices}
                        priceBookId={priceBookId}
                      />
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface ProductItemProps {
  product: Product;
  selected: boolean;
  selectedVariantId?: string;
  onSelect: (productId: string, variantId?: string) => void;
  prices: Record<string, { price: string; currency: string }>;
  priceBookId?: string;
}

function ProductItem({ product, selected, selectedVariantId, onSelect, prices, priceBookId }: ProductItemProps) {
  const [showVariants, setShowVariants] = useState(false);
  const hasVariants = product.variants && product.variants.length > 0;

  return (
    <>
      <CommandItem
        value={`${product.name} ${product.sku || ''} ${product.description || ''}`}
        onSelect={() => {
          if (hasVariants) {
            setShowVariants(!showVariants);
          } else {
            onSelect(product.id);
          }
        }}
        className="flex items-start gap-3 p-2"
      >
        <Check
          className={cn(
            "mt-1 h-4 w-4 shrink-0",
            selected ? "opacity-100" : "opacity-0"
          )}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{product.name}</span>
            {product.sku && (
              <Badge variant="outline" className="text-xs">
                {product.sku}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {product.type}
            </Badge>
            {hasVariants && (
              <Badge variant="default" className="text-xs">
                {product.variants.length} variants
              </Badge>
            )}
          </div>
          {product.description && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
              {product.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-1">
            {product.unit && (
              <span className="text-xs text-muted-foreground">
                Unit: {product.unit.code}
              </span>
            )}
            {priceBookId && prices[product.id] && !hasVariants && (
              <span className="text-xs font-medium text-green-600">
                {prices[product.id].currency} {prices[product.id].price}
              </span>
            )}
          </div>
        </div>
      </CommandItem>

      {/* Variants */}
      {hasVariants && showVariants && product.variants.map((variant) => (
        <CommandItem
          key={variant.id}
          value={`variant-${variant.id}`}
          onSelect={() => onSelect(product.id, variant.id)}
          className="ml-8 flex items-start gap-3 p-2 border-l-2"
        >
          <Check
            className={cn(
              "mt-1 h-4 w-4 shrink-0",
              selectedVariantId === variant.id ? "opacity-100" : "opacity-0"
            )}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm">{variant.name || variant.sku || 'Variant'}</span>
              {variant.sku && (
                <Badge variant="outline" className="text-xs">
                  {variant.sku}
                </Badge>
              )}
            </div>
            {priceBookId && prices[variant.id] && (
              <span className="text-xs font-medium text-green-600">
                {prices[variant.id].currency} {prices[variant.id].price}
              </span>
            )}
          </div>
        </CommandItem>
      ))}
    </>
  );
}