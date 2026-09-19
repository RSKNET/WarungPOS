import { useState, useMemo, useEffect } from "react";
import { Product, ProductVariant, CartItem, Transaction } from "@/types/pos";
import { Customer } from "@/types/debt";
import { Employee } from "@/types/employee";
import {
  saveTransaction,
  waitForProducts,
  refreshProducts,
  waitForVariants,
  refreshVariants,
  getVariantBySku,
} from "@/database";
import { createDebt } from "@/database/debts";
import { createEmployeeDebt } from "@/database/employees";
import { addOutgoing } from "@/database/partners";
import { Partner } from "@/types/partner";
import { format } from "date-fns";
import { ProductCard } from "@/components/ProductCard";
import { Cart } from "@/components/Cart";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { DebtDialog } from "@/components/DebtDialog";
import { Receipt } from "@/components/Receipt";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, ShoppingCart, Loader2, ScanLine } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSearchInput } from "@/hooks/use-search-input";

interface FlatItem {
  product: Product;
  variant: ProductVariant;
}

export function CashierPage() {
  const [flatItems, setFlatItems] = useState<FlatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState<string>("all");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [debtDialogOpen, setDebtDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isScannerStarting, setIsScannerStarting] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const isMobile = useIsMobile();

  const {
    searchQuery: search,
    setSearchQuery: setSearch,
    isSearchDisabled,
  } = useSearchInput([checkoutOpen, debtDialogOpen, receiptOpen, cartOpen, scannerOpen]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [products, variants] = await Promise.all([
        waitForProducts(),
        waitForVariants(),
      ]);
      const items: FlatItem[] = [];
      for (const product of products) {
        const pvs = variants.filter((v) => v.productId === product.id);
        for (const variant of pvs) {
          items.push({ product, variant });
        }
      }
      setFlatItems(items);
      setLoading(false);
    };
    load();
  }, []);

  const cartItemsCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const categories = useMemo(() => {
    const cats = new Set(flatItems.map((fi) => fi.product.category));
    return ["all", ...Array.from(cats)];
  }, [flatItems]);

  const filteredItems = useMemo(() => {
    return flatItems.filter((fi) => {
      const matchesSearch =
        fi.product.name.toLowerCase().includes(search.toLowerCase()) ||
        fi.variant.sku.toLowerCase().includes(search.toLowerCase()) ||
        fi.variant.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        category === "all" || fi.product.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [flatItems, search, category]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.subtotal, 0),
    [cart],
  );

  const addToCart = (product: Product, variant: ProductVariant) => {
    const existing = cart.find((item) => item.variant.id === variant.id);
    const currentQty = existing ? existing.quantity : 0;

    if (currentQty >= variant.stock) {
      toast({
        title: "Stok Tidak Cukup",
        description: `Maksimal stok ${product.name} (${variant.name}) adalah ${variant.stock}`,
        variant: "destructive",
      });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.variant.id === variant.id);
      if (existing) {
        return prev.map((item) => {
          if (item.variant.id === variant.id) {
            const newQty = item.quantity + 1;
            const isWholesale =
              newQty >= variant.wholesaleMinQty && variant.wholesalePrice > 0;
            const price = isWholesale
              ? variant.wholesalePrice
              : variant.retailPrice;
            return {
              ...item,
              quantity: newQty,
              priceType: isWholesale ? "wholesale" : "retail",
              subtotal: newQty * price,
            };
          }
          return item;
        });
      }
      return [
        ...prev,
        {
          product,
          variant,
          quantity: 1,
          priceType: "retail" as const,
          subtotal: variant.retailPrice,
        },
      ];
    });
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(variantId);
      return;
    }

    const item = cart.find((i) => i.variant.id === variantId);
    if (item && quantity > item.variant.stock) {
      toast({
        title: "Stok Tidak Cukup",
        description: `Maksimal stok ${item.product.name} (${item.variant.name}) adalah ${item.variant.stock}`,
        variant: "destructive",
      });
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.variant.id === variantId) {
          const isWholesale =
            quantity >= item.variant.wholesaleMinQty &&
            item.variant.wholesalePrice > 0;
          const price = isWholesale
            ? item.variant.wholesalePrice
            : item.variant.retailPrice;
          return {
            ...item,
            quantity,
            priceType: isWholesale ? "wholesale" : "retail",
            subtotal: quantity * price,
          };
        }
        return item;
      }),
    );
  };

  const removeFromCart = (variantId: string) => {
    setCart((prev) => prev.filter((item) => item.variant.id !== variantId));
  };

  const handleBarcodeDetected = (sku: string) => {
    const variant = getVariantBySku(sku);
    if (!variant) {
      toast({
        title: "Produk Tidak Ditemukan",
        description: `Barcode "${sku}" tidak ada di database`,
        variant: "destructive",
      });
      return;
    }
    const fi = flatItems.find((fi) => fi.variant.id === variant.id);
    if (!fi) return;
    addToCart(fi.product, fi.variant);
    toast({
      title: "Ditambahkan",
      description: `${fi.product.name} (${fi.variant.name}) ditambahkan ke keranjang`,
    });
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setCheckoutOpen(true);
  };

  const handleConfirmPayment = (payment: number) => {
    const transaction = saveTransaction({
      items: cart,
      total: cartTotal,
      payment,
      change: payment - cartTotal,
      paymentType: "cash",
    });

    setLastTransaction(transaction);
    setCart([]);
    setCheckoutOpen(false);
    setReceiptOpen(true);

    toast({
      title: "Transaksi Berhasil",
      description: `Pembayaran sebesar ${payment.toLocaleString("id-ID", { style: "currency", currency: "IDR" })} diterima`,
    });

    setTimeout(() => {
      Promise.all([refreshProducts(), refreshVariants()]).then(
        ([products, variants]) => {
          const items: FlatItem[] = [];
          for (const product of products) {
            const pvs = variants.filter((v) => v.productId === product.id);
            for (const variant of pvs) items.push({ product, variant });
          }
          setFlatItems(items);
        },
      );
    }, 300);
  };

  const handleDebt = () => {
    if (cart.length === 0) return;
    setDebtDialogOpen(true);
  };

  const handleConfirmDebt = async (customer: Customer) => {
    await createDebt(customer.id, customer.name, cart, cartTotal);
    saveTransaction({
      items: cart,
      total: cartTotal,
      payment: 0,
      change: 0,
      paymentType: "debt",
      customerId: customer.id,
      customerName: customer.name,
    });
    setCart([]);
    setDebtDialogOpen(false);
    toast({
      title: "Hutang Dicatat",
      description: `Hutang atas nama ${customer.name} sebesar ${cartTotal.toLocaleString("id-ID", { style: "currency", currency: "IDR" })} telah dicatat`,
    });
    setTimeout(() => {
      Promise.all([refreshProducts(), refreshVariants()]).then(
        ([products, variants]) => {
          const items: FlatItem[] = [];
          for (const product of products) {
            const pvs = variants.filter((v) => v.productId === product.id);
            for (const variant of pvs) items.push({ product, variant });
          }
          setFlatItems(items);
        },
      );
    }, 300);
  };

  const handleConfirmEmployeeDebt = async (employee: Employee) => {
    cart.forEach((item) => {
      const price =
        item.priceType === "wholesale"
          ? item.variant.wholesalePrice
          : item.variant.retailPrice;
      const description = `${item.quantity} ${item.product.name} (${item.variant.name}) x ${price.toLocaleString("id-ID")}`;
      createEmployeeDebt({
        employeeId: employee.id,
        employeeName: employee.name,
        description,
        amount: item.subtotal,
      });
    });

    saveTransaction({
      items: cart,
      total: cartTotal,
      payment: 0,
      change: 0,
      paymentType: "debt",
      customerId: employee.id,
      customerName: `${employee.name} (Karyawan)`,
    });

    setCart([]);
    setDebtDialogOpen(false);
    toast({
      title: "Hutang Karyawan Dicatat",
      description: `Hutang atas nama ${employee.name} sebesar ${cartTotal.toLocaleString("id-ID", { style: "currency", currency: "IDR" })} telah dicatat`,
    });
  };

  const handleConfirmPartnerDebt = async (partner: Partner) => {
    const description = cart
      .map((item) => `${item.quantity} ${item.product.name} (${item.variant.name})`)
      .join(", ");

    addOutgoing({
      partnerId: partner.id,
      date: format(new Date(), "yyyy-MM-dd"),
      description: `Ambil barang kasir: ${description}`,
      totalValue: cartTotal,
    });

    saveTransaction({
      items: cart,
      total: cartTotal,
      payment: 0,
      change: 0,
      paymentType: "debt",
      customerId: partner.id,
      customerName: `${partner.name} (Mitra)`,
    });

    setCart([]);
    setDebtDialogOpen(false);
    toast({
      title: "Hutang Mitra Dicatat",
      description: `Pengambilan barang atas nama ${partner.name} sebesar ${cartTotal.toLocaleString("id-ID", { style: "currency", currency: "IDR" })} telah dicatat`,
    });
  };

  const CartContent = () => (
    <Cart
      items={cart}
      onUpdateQuantity={updateQuantity}
      onRemoveItem={removeFromCart}
      onCheckout={() => {
        handleCheckout();
        if (isMobile) setCartOpen(false);
      }}
      onDebt={() => {
        handleDebt();
        if (isMobile) setCartOpen(false);
      }}
      total={cartTotal}
    />
  );

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 p-3 sm:p-4 overflow-hidden">
        <div className="flex gap-2 sm:gap-3 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
            <Input
              placeholder="Cari produk atau SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 focus-visible:ring-offset-0 h-9 sm:h-10 text-sm"
              disabled={isSearchDisabled}
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            className="shrink-0 h-9 w-9 sm:h-10 sm:w-10"
            title="Scan Barcode"
            onClick={() => {
              setIsScannerStarting(true);
              setScannerOpen(true);
            }}
            disabled={isSearchDisabled || isScannerStarting}
          >
            {isScannerStarting ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-primary" />
            ) : (
              <ScanLine className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </Button>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-28 sm:w-40 h-9 sm:h-10 text-sm">
              <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat === "all" ? "Semua" : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isMobile && (
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="shrink-0 relative h-9 w-9 sm:h-10 sm:w-10"
                >
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                  {cartItemsCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center px-1 text-xs"
                    >
                      {cartItemsCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-full sm:w-96 p-0 flex flex-col"
              >
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle>Keranjang Belanja</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-hidden">
                  <CartContent />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>

        <div
          className="flex-1 overflow-auto scrollbar-thin min-h-0"
          data-scrollable
        >
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p className="text-lg font-medium">Memuat produk...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <p className="text-lg font-medium">Tidak ada produk</p>
              <p className="text-sm">Tambahkan produk di menu Produk</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-2.5 pb-4">
              {filteredItems.map((fi) => (
                <ProductCard
                  key={fi.variant.id}
                  product={fi.product}
                  variant={fi.variant}
                  onClick={() => addToCart(fi.product, fi.variant)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {!isMobile && (
        <aside className="w-80 lg:w-96 border-l border-border bg-card flex flex-col h-full shrink-0">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-base">Keranjang Belanja</h2>
            {cartItemsCount > 0 && (
              <Badge variant="secondary" className="font-normal text-xs">
                {cartItemsCount} item
              </Badge>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <CartContent />
          </div>
        </aside>
      )}

      <CheckoutDialog
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onConfirm={handleConfirmPayment}
        total={cartTotal}
        items={cart}
      />

      <DebtDialog
        open={debtDialogOpen}
        onClose={() => setDebtDialogOpen(false)}
        onConfirm={handleConfirmDebt}
        onConfirmEmployee={handleConfirmEmployeeDebt}
        onConfirmPartner={handleConfirmPartnerDebt}
        total={cartTotal}
        items={cart}
      />

      <Receipt
        transaction={lastTransaction}
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
      />

      <BarcodeScanner
        open={scannerOpen}
        onReady={() => setIsScannerStarting(false)}
        onClose={() => {
          setIsScannerStarting(false);
          setScannerOpen(false);
        }}
        onDetected={handleBarcodeDetected}
        title="Scan Produk"
      />
    </div>
  );
}

