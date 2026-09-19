import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: "/", label: "Kasir", icon: ShoppingCart },
  { path: "/admin", label: "Admin", icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-card border-b border-border shrink-0 z-50">
        <div className="w-full flex items-center justify-between h-14 px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <img
              src="/favicon.png"
              alt="WarungPOS Logo"
              className="w-8 h-8 rounded-lg"
            />
            <span className="font-semibold text-lg">WarungPOS</span>
          </div>
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}

