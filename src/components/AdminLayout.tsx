import { ReactNode, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  History,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronDown,
  Percent,
  Calculator,
  CreditCard,
  Users,
  Wallet,
  HandCoins,
  ClipboardList,
  ShoppingCart,
  Database,
  Handshake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "../ThemeToggle";
import { Button } from "../ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AdminLayoutProps {
  children: ReactNode;
}

const mainNavItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/products", label: "Produk", icon: Package },
  { path: "/admin/history", label: "Riwayat", icon: History },
  { path: "/admin/debts", label: "Hutang", icon: CreditCard },
  { path: "/admin/pricing", label: "Harga Jual", icon: Percent },
  { path: "/admin/calculator", label: "Kalkulator", icon: Calculator },
];

const shoppingSubItems = [
  { path: "/admin/shopping-list", label: "Daftar Belanja", icon: ClipboardList },
  { path: "/admin/shopping-archive", label: "Arsip Belanja", icon: Database },
];

const employeeSubItems = [
  { path: "/admin/employees", label: "Data Karyawan", icon: Users },
  { path: "/admin/employees/earnings", label: "Pendapatan", icon: Wallet },
  { path: "/admin/employees/debts", label: "Hutang", icon: HandCoins },
  { path: "/admin/employees/records", label: "Pencatatan", icon: ClipboardList },
];

const partnerSubItems = [
  { path: "/admin/partners", label: "Data Mitra", icon: Users },
  { path: "/admin/partners/incoming", label: "Setoran Barang", icon: ClipboardList },
  { path: "/admin/partners/outgoing", label: "Ambil Barang/Uang", icon: HandCoins },
  { path: "/admin/partners/ledger", label: "Buku Rekap", icon: Database },
];

const systemNavItems = [
  { path: "/admin/master-data", label: "Master Data", icon: Database },
  { path: "/admin/reports", label: "Laporan", icon: BarChart3 },
  { path: "/admin/settings", label: "Pengaturan", icon: Settings },
];

let savedSidebarScrollTop = 0;

interface SidebarContentProps {
  isMobile: boolean;
  setSidebarOpen: (open: boolean) => void;
  pathname: string;
  shoppingMenuOpen: boolean;
  setShoppingMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  employeeMenuOpen: boolean;
  setEmployeeMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  partnerMenuOpen: boolean;
  setPartnerMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

function SidebarContent({
  isMobile,
  setSidebarOpen,
  pathname,
  shoppingMenuOpen,
  setShoppingMenuOpen,
  employeeMenuOpen,
  setEmployeeMenuOpen,
  partnerMenuOpen,
  setPartnerMenuOpen,
}: SidebarContentProps) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (navRef.current && savedSidebarScrollTop > 0) {
      navRef.current.scrollTop = savedSidebarScrollTop;
    }
  }, [pathname]);

  const isActive = (path: string) => {
    if (path === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(path);
  };

  const isEmployeeActive = employeeSubItems.some(
    (item) => pathname === item.path,
  );

  const isShoppingActive = shoppingSubItems.some(
    (item) => pathname === item.path,
  );

  const isPartnerActive = partnerSubItems.some(
    (item) => pathname === item.path,
  );

  return (
    <div className="flex flex-col h-full text-sm">
      <div className="h-14 px-4 flex items-center justify-between border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2.5">
          <img
            src="/favicon.png"
            alt="WarungPOS Logo"
            className="w-7 h-7 rounded-md"
          />
          <span className="font-bold text-sm tracking-tight">WarungPOS</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <nav
        ref={navRef}
        onScroll={(e) => {
          savedSidebarScrollTop = e.currentTarget.scrollTop;
        }}
        className="flex-1 p-3 space-y-4 overflow-y-auto"
      >
        <div className="space-y-1">
          <p className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Utama
          </p>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 h-9 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="space-y-1">
          <p className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Operasional
          </p>

          <Collapsible open={shoppingMenuOpen} onOpenChange={setShoppingMenuOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex items-center justify-between w-full px-3 h-9 rounded-md text-sm font-medium transition-colors",
                  isShoppingActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-4 h-4 shrink-0" />
                  <span>Belanja</span>
                </div>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform text-muted-foreground/80",
                    shoppingMenuOpen && "rotate-180",
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="ml-3.5 pl-3 border-l-2 border-border/40 space-y-1 my-1">
              {shoppingSubItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => isMobile && setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 h-9 rounded-md text-sm font-medium transition-colors",
                      active
                        ? "text-primary font-semibold bg-primary/10"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={employeeMenuOpen} onOpenChange={setEmployeeMenuOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex items-center justify-between w-full px-3 h-9 rounded-md text-sm font-medium transition-colors",
                  isEmployeeActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Karyawan</span>
                </div>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform text-muted-foreground/80",
                    employeeMenuOpen && "rotate-180",
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="ml-3.5 pl-3 border-l-2 border-border/40 space-y-1 my-1">
              {employeeSubItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => isMobile && setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 h-9 rounded-md text-sm font-medium transition-colors",
                      active
                        ? "text-primary font-semibold bg-primary/10"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={partnerMenuOpen} onOpenChange={setPartnerMenuOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex items-center justify-between w-full px-3 h-9 rounded-md text-sm font-medium transition-colors",
                  isPartnerActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <div className="flex items-center gap-3">
                  <Handshake className="w-4 h-4 shrink-0" />
                  <span>Mitra Pengepul</span>
                </div>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform text-muted-foreground/80",
                    partnerMenuOpen && "rotate-180",
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="ml-3.5 pl-3 border-l-2 border-border/40 space-y-1 my-1">
              {partnerSubItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => isMobile && setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 h-9 rounded-md text-sm font-medium transition-colors",
                      active
                        ? "text-primary font-semibold bg-primary/10"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="space-y-1">
          <p className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Sistem
          </p>
          {systemNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 h-9 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="p-3 border-t border-border/40 shrink-0">
        <Link
          to="/"
          onClick={() => isMobile && setSidebarOpen(false)}
          className="flex items-center gap-2.5 px-3 h-9 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4 shrink-0" />
          <span>Kembali ke Kasir</span>
        </Link>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [employeeMenuOpen, setEmployeeMenuOpen] = useState(() =>
    location.pathname.startsWith("/admin/employees"),
  );
  const [shoppingMenuOpen, setShoppingMenuOpen] = useState(() =>
    location.pathname.startsWith("/admin/shopping"),
  );
  const [partnerMenuOpen, setPartnerMenuOpen] = useState(() =>
    location.pathname.startsWith("/admin/partners"),
  );

  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    if (!isMobile) return;

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('button, a, input, select, textarea, [role="button"]')
      ) {
        return;
      }

      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartX.current > 0) {
        touchEndX.current = e.touches[0].clientX;
      }
    };

    const handleTouchEnd = () => {
      if (touchStartX.current === 0) {
        return;
      }

      const diffX = touchStartX.current - touchEndX.current;
      const diffY = Math.abs(
        touchStartY.current - (touchEndX.current ? touchStartY.current : 0),
      );
      const minSwipeDistance = 50;
      const edgeThreshold = 100;

      if (
        !sidebarOpen &&
        touchStartX.current > window.innerWidth - edgeThreshold &&
        diffX > minSwipeDistance &&
        diffY < 100
      ) {
        setSidebarOpen(true);
      }

      if (sidebarOpen && diffX < -minSwipeDistance && diffY < 100) {
        setSidebarOpen(false);
      }

      touchStartX.current = 0;
      touchEndX.current = 0;
    };

    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isMobile, sidebarOpen]);

  const currentTitle =
    employeeSubItems.find((item) => location.pathname === item.path)?.label ||
    partnerSubItems.find((item) => location.pathname === item.path)?.label ||
    shoppingSubItems.find((item) => location.pathname === item.path)?.label ||
    mainNavItems.find((item) => isActive(item.path))?.label ||
    systemNavItems.find((item) => isActive(item.path))?.label ||
    "Admin";

  const sidebarProps: SidebarContentProps = {
    isMobile,
    setSidebarOpen,
    pathname: location.pathname,
    shoppingMenuOpen,
    setShoppingMenuOpen,
    employeeMenuOpen,
    setEmployeeMenuOpen,
    partnerMenuOpen,
    setPartnerMenuOpen,
  };

  return (
    <div className="h-dvh bg-background flex overflow-hidden">
      {!isMobile && (
        <aside className="w-64 bg-card/60 border-r border-border/40 shrink-0">
          <SidebarContent {...sidebarProps} />
        </aside>
      )}

      {isMobile && (
        <>
          <div
            className={cn(
              "fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-200",
              sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className={cn(
              "fixed right-0 top-0 bottom-0 w-64 bg-card z-50 shadow-2xl border-l border-border/40 transition-transform duration-200 ease-out",
              sidebarOpen ? "translate-x-0" : "translate-x-full",
            )}
          >
            <SidebarContent {...sidebarProps} />
          </aside>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-card/40 border-b border-border/40 shrink-0 h-14 flex items-center justify-between px-4">
          <h1 className="font-semibold text-base truncate">
            {currentTitle}
          </h1>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
        </header>

        <main
          className="flex-1 overflow-auto p-4 lg:p-6"
          data-scrollable
        >
          {children}
        </main>
      </div>
    </div>
  );
}

