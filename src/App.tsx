import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, lazy, Suspense, ReactNode } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Loader2 } from "lucide-react";
import { CashierPage } from "./pages/CashierPage";
import { Layout } from "./components/Layout";
import { AdminLayout } from "./components/AdminLayout";
import { PWAUpdateNotification } from "./components/PWAUpdateNotification";
import NotFound from "./pages/NotFound";
import { migrateFromLocalStorage } from "./database";

const DashboardPage = lazy(() =>
  import("./pages/admin/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const ProductsPage = lazy(() =>
  import("./pages/admin/ProductsPage").then((m) => ({ default: m.ProductsPage })),
);
const HistoryPage = lazy(() =>
  import("./pages/admin/HistoryPage").then((m) => ({ default: m.HistoryPage })),
);
const ReportsPage = lazy(() =>
  import("./pages/admin/ReportsPage").then((m) => ({ default: m.ReportsPage })),
);
const SettingsPage = lazy(() =>
  import("./pages/admin/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const PricingPage = lazy(() =>
  import("./pages/admin/pricing").then((m) => ({ default: m.PricingPage })),
);
const CalculatorPage = lazy(() =>
  import("./pages/admin/CalculatorPage").then((m) => ({ default: m.CalculatorPage })),
);
const DebtsPage = lazy(() =>
  import("./pages/admin/CustomerDebtsPage").then((m) => ({ default: m.CustomerDebtsPage })),
);
const MasterDataPage = lazy(() =>
  import("./pages/admin/MasterDataPage").then((m) => ({ default: m.MasterDataPage })),
);

const EmployeesPage = lazy(() =>
  import("./pages/admin/employee").then((m) => ({ default: m.EmployeesPage })),
);
const EmployeeEarningsPage = lazy(() =>
  import("./pages/admin/employee").then((m) => ({ default: m.EmployeeEarningsPage })),
);
const EmployeeDebtsPage = lazy(() =>
  import("./pages/admin/employee").then((m) => ({ default: m.EmployeeDebtsPage })),
);
const EmployeeRecordsPage = lazy(() =>
  import("./pages/admin/employee").then((m) => ({ default: m.EmployeeRecordsPage })),
);

const ShoppingListPage = lazy(() =>
  import("./pages/admin/shopping").then((m) => ({ default: m.ShoppingListPage })),
);
const ShoppingArchivePage = lazy(() =>
  import("./pages/admin/shopping").then((m) => ({ default: m.ShoppingArchivePage })),
);

const PartnersPage = lazy(() =>
  import("./pages/admin/partners").then((m) => ({ default: m.PartnersPage })),
);
const PartnerIncomingPage = lazy(() =>
  import("./pages/admin/partners").then((m) => ({ default: m.PartnerIncomingPage })),
);
const PartnerOutgoingPage = lazy(() =>
  import("./pages/admin/partners").then((m) => ({ default: m.PartnerOutgoingPage })),
);
const PartnerLedgerPage = lazy(() =>
  import("./pages/admin/partners").then((m) => ({ default: m.PartnerLedgerPage })),
);

function AdminRoute({ children }: { children: ReactNode }) {
  return (
    <AdminLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        {children}
      </Suspense>
    </AdminLayout>
  );
}
const App = () => {
  useEffect(() => {
    migrateFromLocalStorage();

    const savedSettings = localStorage.getItem("store-settings");
    if (!savedSettings) {
      const defaultSettings = {
        storeName: "WarungPOS",
        storeAddress: "",
        storePhone: "",
        receiptFooter: "Terima kasih atas kunjungan Anda!",
        taxEnabled: false,
        taxRate: 11,
        receiptTemplate: "compact",
      };
      localStorage.setItem("store-settings", JSON.stringify(defaultSettings));
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={
                  <Layout>
                    <CashierPage />
                  </Layout>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <DashboardPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/products"
                element={
                  <AdminRoute>
                    <ProductsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/pricing"
                element={
                  <AdminRoute>
                    <PricingPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/calculator"
                element={
                  <AdminRoute>
                    <CalculatorPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/debts"
                element={
                  <AdminRoute>
                    <DebtsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/history"
                element={
                  <AdminRoute>
                    <HistoryPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <AdminRoute>
                    <ReportsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <AdminRoute>
                    <SettingsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/employees"
                element={
                  <AdminRoute>
                    <EmployeesPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/employees/earnings"
                element={
                  <AdminRoute>
                    <EmployeeEarningsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/employees/debts"
                element={
                  <AdminRoute>
                    <EmployeeDebtsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/employees/records"
                element={
                  <AdminRoute>
                    <EmployeeRecordsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/partners"
                element={
                  <AdminRoute>
                    <PartnersPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/partners/incoming"
                element={
                  <AdminRoute>
                    <PartnerIncomingPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/partners/outgoing"
                element={
                  <AdminRoute>
                    <PartnerOutgoingPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/partners/ledger"
                element={
                  <AdminRoute>
                    <PartnerLedgerPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/shopping-list"
                element={
                  <AdminRoute>
                    <ShoppingListPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/shopping-archive"
                element={
                  <AdminRoute>
                    <ShoppingArchivePage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/master-data"
                element={
                  <AdminRoute>
                    <MasterDataPage />
                  </AdminRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <PWAUpdateNotification />
          <Analytics />
          <SpeedInsights />
        </TooltipProvider>
    </ThemeProvider>
  );
};

export default App;

