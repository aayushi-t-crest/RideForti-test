import { lazy, Suspense } from "react";

// Auto-recover from stale chunk errors after a redeploy.
// When a dynamic import fails (old hashed chunk no longer exists),
// reload the page once to fetch the fresh asset manifest.
const lazyWithRetry = <T extends { default: React.ComponentType<any> }>(factory: () => Promise<T>) =>
  lazy(async () => {
    const key = "forti:chunk-reloaded";
    try {
      return await factory();
    } catch (err: any) {
      const msg = String(err?.message || "");
      const isChunkErr =
        msg.includes("Importing a module script failed") ||
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Loading chunk") ||
        msg.includes("error loading dynamically imported module");
      if (isChunkErr && typeof window !== "undefined" && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        return { default: () => null } as unknown as T;
      }
      throw err;
    }
  });
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
const Index = lazyWithRetry(() => import("./pages/Index"));
import { usePrefetchImages } from "./hooks/usePrefetchImages";
import SupportWidget from "./components/SupportWidget";
import { SupportProvider } from "./contexts/SupportContext";

// Lazy-load non-landing routes so they don't bloat the initial bundle
const Waitlist = lazyWithRetry(() => import("./pages/Waitlist"));
const Drivers = lazyWithRetry(() => import("./pages/Drivers"));
const Guards = lazyWithRetry(() => import("./pages/Guards"));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const TermsAndConditions = lazyWithRetry(() => import("./pages/TermsAndConditions"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const AdminLogin = lazyWithRetry(() => import("./pages/AdminLogin"));
const Admin = lazyWithRetry(() => import("./pages/Admin"));
const Download = lazyWithRetry(() => import("./pages/Download"));
const SwimWeek = lazyWithRetry(() => import("./pages/SwimWeek"));
const EmailEditor = lazyWithRetry(() => import("./pages/EmailEditor"));
const Academy = lazyWithRetry(() => import("./pages/Academy"));
const SharedCalendar = lazyWithRetry(() => import("./pages/SharedCalendar"));
const SignContract = lazyWithRetry(() => import("./pages/SignContract"));
const OAuthConsent = lazyWithRetry(() => import("./pages/OAuthConsent"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
    },
  },
});

const PrefetchWrapper = ({ children }: { children: React.ReactNode }) => {
  usePrefetchImages();
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PrefetchWrapper>
      <TooltipProvider>
        <SupportProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<div className="fixed inset-0 bg-background" />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/waitlist" element={<Waitlist />} />
                <Route path="/drivers" element={<Drivers />} />
                <Route path="/guards" element={<Guards />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsAndConditions />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/download" element={<Download />} />
                <Route path="/swimweek" element={<SwimWeek />} />
                <Route path="/admin/email-editor" element={<EmailEditor />} />
                <Route path="/calendar/share/:token" element={<SharedCalendar />} />
                <Route path="/contract/:token" element={<SignContract />} />
                <Route path="/academy" element={<Academy />} />
                <Route path="/academy/invite/:token" element={<Academy />} />
                <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <SupportWidget />
          </BrowserRouter>
        </SupportProvider>
      </TooltipProvider>
    </PrefetchWrapper>
  </QueryClientProvider>
);

export default App;
