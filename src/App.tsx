import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import Index from "./pages/Index";
import {
  DashboardPage,
  ProductsPage,
  HistoryPage,
  ReportsPage,
  SettingsPage,
  PricingPage,
  CalculatorPage,
  DebtsPage,
  EmployeesPage,
  EmployeeEarningsPage,
  EmployeeDebtsPage,
  EmployeeRecordsPage,
  ShoppingListPage,
  ShoppingArchivePage,
  MasterDataPage,
  PartnersPage,
  PartnerIncomingPage,
  PartnerOutgoingPage,
  PartnerLedgerPage,
} from "./pages/admin";
import { AdminLayout } from "./components/admin";
import { PWAUpdateNotification } from "./components/PWAUpdateNotification";
import NotFound from "./pages/NotFound";
import { migrateFromLocalStorage } from "./database";

const queryClient = new QueryClient();

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
        showLogo: true,
        taxEnabled: false,
        taxRate: 11,
        paperWidth: "58",
      };
      localStorage.setItem("store-settings", JSON.stringify(defaultSettings));
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route
                path="/admin"
                element={
                  <AdminLayout>
                    <DashboardPage />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/products"
                element={
                  <AdminLayout>
                    <ProductsPage />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/pricing"
                element={
                  <AdminLayout>
                    <PricingPage />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/calculator"
                element={
                  <AdminLayout>
                    <CalculatorPage />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/debts"
                element={
                  <AdminLayout>
                    <DebtsPage />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/history"
                element={
                  <AdminLayout>
                    <HistoryPage />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <AdminLayout>
                    <ReportsPage />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <AdminLayout>
                    <SettingsPage />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/employees"
                element={
                  <AdminLayout>
                    <EmployeesPage />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/employees/earnings"
                element={
                  <AdminLayout>
                    <EmployeeEarningsPage />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/employees/debts"
                element={
                  <AdminLayout>
                    <EmployeeDebtsPage />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/employees/records"
                element={
                  <AdminLayout>
                    <EmployeeRecordsPage />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/partners"
                element={
                  <AdminLayout>
                    <PartnersPage />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/partners/incoming"
                element={
                  <AdminLayout>
                    <PartnerIncomingPage />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/partners/outgoing"
                element={
                  <AdminLayout>
                    <PartnerOutgoingPage />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/partners/ledger"
                element={
                  <AdminLayout>
                    <PartnerLedgerPage />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/shopping-list"
                element={
                  <AdminLayout>
                    <ShoppingListPage />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/shopping-archive"
                element={
                  <AdminLayout>
                    <ShoppingArchivePage />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/master-data"
                element={
                  <AdminLayout>
                    <MasterDataPage />
                  </AdminLayout>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <PWAUpdateNotification />
          <Analytics />
          <SpeedInsights />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;

