import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CartProvider } from "./contexts/CartContext";
import { StoreSlugProvider } from "./contexts/StoreSlugContext";
import { CustomerAuthProvider, RequireFullAuth } from "./features/auth";
import { useHostDetection } from "./hooks/useHostDetection";
import { useCustomDomainResolver } from "./hooks/useCustomDomainResolver";
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { initGlobalErrorHandler } from "./lib/globalErrorHandler";
import { PlatformFaviconProvider } from "./components/PlatformFaviconProvider";
import { StorefrontRouteFallback } from "./features/storefront/components/skeletons";

// Only landing page essentials are eagerly loaded
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Critical storefront routes stay code-split. A direct category/product load
// must not download/parse the whole home + product + category surface before
// the first visible skeleton.
const Storefront = lazy(() => import("./pages/storefront/[storeSlug]/index"));
const ProductPage = lazy(() => import("./pages/storefront/[storeSlug]/product/[productSlug]"));
const CategoryPage = lazy(() => import("./pages/storefront/[storeSlug]/category/[categorySlug]"));

// Lazy-loaded layouts
const DashboardLayout = lazy(() => import("./components/layout/DashboardLayout").then(m => ({ default: m.DashboardLayout })));
const AdminLayout = lazy(() => import("./components/layout/AdminLayout").then(m => ({ default: m.AdminLayout })));
const CustomerLayout = lazy(() => import("./features/customer-portal/components/CustomerLayout").then(m => ({ default: m.CustomerLayout })));
const ProtectedRoute = lazy(() => import("./features/customer-portal/components/ProtectedRoute").then(m => ({ default: m.ProtectedRoute })));

// Lazy-loaded legal pages
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const Support = lazy(() => import("./pages/legal/Support"));

// Lazy-loaded dashboard pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/dashboard/Products"));
const ProductEdit = lazy(() => import("./pages/dashboard/ProductEdit"));
const Categories = lazy(() => import("./pages/dashboard/Categories"));
const CategoryEdit = lazy(() => import("./pages/dashboard/CategoryEdit"));
const Attributes = lazy(() => import("./pages/dashboard/Attributes"));
const Stores = lazy(() => import("./pages/dashboard/Stores"));
const Analytics = lazy(() => import("./pages/dashboard/Analytics"));
const Orders = lazy(() => import("./pages/dashboard/Orders"));
const OrderDetails = lazy(() => import("./pages/dashboard/OrderDetails"));
const AbandonedCarts = lazy(() => import("./pages/dashboard/AbandonedCarts"));
const Customers = lazy(() => import("./pages/dashboard/Customers"));
const CustomerDetails = lazy(() => import("./pages/dashboard/CustomerDetails"));
const CustomerFormPage = lazy(() => import("./pages/dashboard/CustomerForm"));
const Coupons = lazy(() => import("./pages/dashboard/Coupons"));
const Feeds = lazy(() => import("./pages/dashboard/marketing/Feeds"));
const Pixels = lazy(() => import("./pages/dashboard/marketing/Pixels"));
// Integrations removed
// FacebookInstagram removed
const Newsletter = lazy(() => import("./pages/dashboard/marketing/Newsletter"));
const Media = lazy(() => import("./pages/dashboard/Media"));
const SizeGuides = lazy(() => import("./pages/dashboard/SizeGuides"));
const SettingsGeneral = lazy(() => import("./pages/dashboard/settings/General"));
const SettingsBrand = lazy(() => import("./pages/dashboard/settings/Brand"));
const SettingsBusiness = lazy(() => import("./pages/dashboard/settings/Business"));
const SettingsAddress = lazy(() => import("./pages/dashboard/settings/Address"));
const SettingsSocial = lazy(() => import("./pages/dashboard/settings/Social"));
const SettingsShipping = lazy(() => import("./pages/dashboard/settings/Shipping"));
const SettingsPayments = lazy(() => import("./pages/dashboard/settings/Payments"));
const SettingsPolicies = lazy(() => import("./pages/dashboard/settings/Policies"));
const SettingsAppearance = lazy(() => import("./pages/dashboard/settings/Appearance"));
const SettingsEmails = lazy(() => import("./pages/dashboard/settings/Emails"));
const SettingsNotifications = lazy(() => import("./pages/dashboard/settings/Notifications"));
const SettingsLGPD = lazy(() => import("./pages/dashboard/settings/LGPD"));
const SettingsDomains = lazy(() => import("./pages/dashboard/settings/Domains"));
const StoreAppearance = lazy(() => import("./pages/dashboard/store/StoreAppearance"));
const StoreThemes = lazy(() => import("./pages/dashboard/store/StoreThemes"));
const StorePages = lazy(() => import("./pages/dashboard/store/StorePages"));
const StoreMenus = lazy(() => import("./pages/dashboard/store/StoreMenus"));
const StoreHome = lazy(() => import("./pages/dashboard/store/StoreHome"));
const StoreAnnouncements = lazy(() => import("./pages/dashboard/store/StoreAnnouncements"));
const PageEditor = lazy(() => import("./pages/dashboard/store/PageEditor"));
const Monitoring = lazy(() => import("./pages/dashboard/internal/Monitoring"));
const AdminOverview = lazy(() => import("./pages/dashboard/internal/AdminOverview"));
const AdminStores = lazy(() => import("./pages/dashboard/internal/AdminStores"));
const ChatSettingsPage = lazy(() => import("./pages/dashboard/marketing/ChatSettings"));
const WhatsAppConnect = lazy(() => import("./pages/dashboard/whatsapp/Connect"));
const WhatsAppInbox = lazy(() => import("./pages/dashboard/whatsapp/Inbox"));
const WhatsAppTemplates = lazy(() => import("./pages/dashboard/whatsapp/Templates"));
const WhatsAppCampaigns = lazy(() => import("./pages/dashboard/whatsapp/Campaigns"));
const WhatsAppNewCampaign = lazy(() => import("./pages/dashboard/whatsapp/NewCampaign"));

// Lazy-loaded secondary storefront pages
const CartPage = lazy(() => import("./pages/storefront/[storeSlug]/cart"));
const CheckoutPage = lazy(() => import("./pages/storefront/[storeSlug]/checkout"));
const SuccessPage = lazy(() => import("./pages/storefront/[storeSlug]/success"));
const ThankYouPage = lazy(() => import("./pages/storefront/[storeSlug]/thank-you"));
const RecoverCartPage = lazy(() => import("./pages/storefront/[storeSlug]/recover-cart"));
const RetryPaymentPage = lazy(() => import("./pages/storefront/[storeSlug]/retry-payment"));
const PolicyPage = lazy(() => import("./pages/storefront/[storeSlug]/pagina/[policySlug]"));

const SearchPage = lazy(() => import("./pages/storefront/[storeSlug]/search"));
const ContactPage = lazy(() => import("./pages/storefront/[storeSlug]/contato"));
const RedefinirSenhaPage = lazy(() => import("./pages/storefront/[storeSlug]/redefinir-senha"));
const AcessarLinkPage = lazy(() => import("./pages/storefront/[storeSlug]/acessar-link"));

// Lazy-loaded customer pages
const CustomerDashboard = lazy(() => import("./pages/customer/Dashboard"));
const CustomerOrders = lazy(() => import("./pages/customer/Orders"));
const CustomerAddresses = lazy(() => import("./pages/customer/Addresses"));
const CustomerPayments = lazy(() => import("./pages/customer/Payments"));
const CustomerProfile = lazy(() => import("./pages/customer/Profile"));
const CustomerFavorites = lazy(() => import("./pages/customer/Favorites"));
const CustomerNotifications = lazy(() => import("./pages/customer/Notifications"));
const CustomerOrderStatus = lazy(() => import("./pages/customer/OrderStatus"));

// Suspense fallback for non-storefront routes (admin/landing).
// Storefront uses `null` so each page's own skeleton appears immediately
// without a redundant spinner flash beforehand.
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

const RouteAwareSuspenseFallback = () => {
  const pathname = window.location.pathname;
  return pathname.startsWith('/store/') ? <StorefrontRouteFallback /> : <PageLoader />;
};

const StorefrontSuspense = ({ children, variant }: { children: ReactNode; variant?: "home" | "category" | "product" | "page" }) => (
  <Suspense fallback={<StorefrontRouteFallback variant={variant} />}>{children}</Suspense>
);
const StoreChatWrapper = lazy(() => import("./features/chat/components/StoreChatWrapper").then(m => ({ default: m.StoreChatWrapper })));

const queryClient = new QueryClient();

/* ─── Route groups ─── */

/** Landing page + legal pages (zelpi.com.br) */
function LandingRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <PlatformFaviconProvider />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/privacidade" element={<PrivacyPolicy />} />
        <Route path="/termos" element={<TermsOfService />} />
        <Route path="/suporte" element={<Support />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

/** Admin / Dashboard (admin.zelpi.com.br) */
function AdminRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <PlatformFaviconProvider />
      <Routes>
        {/* Root redirects to dashboard */}
        <Route path="/" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
        <Route path="/auth" element={<Auth />} />
        {/* Keep /dashboard prefix so all sidebar links work unchanged */}
        <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
        <Route path="/dashboard/analytics" element={<DashboardLayout><Analytics /></DashboardLayout>} />
        <Route path="/dashboard/products" element={<DashboardLayout><Products /></DashboardLayout>} />
        <Route path="/dashboard/products/new" element={<DashboardLayout><ProductEdit /></DashboardLayout>} />
        <Route path="/dashboard/products/:productId/edit" element={<DashboardLayout><ProductEdit /></DashboardLayout>} />
        <Route path="/dashboard/categories" element={<DashboardLayout><Categories /></DashboardLayout>} />
        <Route path="/dashboard/categories/:categoryId/edit" element={<DashboardLayout><CategoryEdit /></DashboardLayout>} />
        <Route path="/dashboard/attributes" element={<DashboardLayout><Attributes /></DashboardLayout>} />
        <Route path="/dashboard/stores" element={<DashboardLayout><Stores /></DashboardLayout>} />
        <Route path="/dashboard/payments" element={<Navigate to="/dashboard/settings/payments" replace />} />
        <Route path="/dashboard/orders" element={<DashboardLayout><Orders /></DashboardLayout>} />
        <Route path="/dashboard/orders/abandoned" element={<DashboardLayout><AbandonedCarts /></DashboardLayout>} />
        <Route path="/dashboard/orders/:orderId" element={<DashboardLayout><OrderDetails /></DashboardLayout>} />
        <Route path="/dashboard/customers" element={<DashboardLayout><Customers /></DashboardLayout>} />
        <Route path="/dashboard/customers/new" element={<DashboardLayout><CustomerFormPage /></DashboardLayout>} />
        <Route path="/dashboard/customers/:customerId" element={<DashboardLayout><CustomerDetails /></DashboardLayout>} />
        <Route path="/dashboard/customers/:customerId/edit" element={<DashboardLayout><CustomerFormPage /></DashboardLayout>} />
        <Route path="/dashboard/coupons" element={<DashboardLayout><Coupons /></DashboardLayout>} />
        <Route path="/dashboard/marketing/chat" element={<DashboardLayout><ChatSettingsPage /></DashboardLayout>} />
        <Route path="/dashboard/marketing/feeds" element={<DashboardLayout><Feeds /></DashboardLayout>} />
        <Route path="/dashboard/marketing/pixels" element={<DashboardLayout><Pixels /></DashboardLayout>} />
        <Route path="/dashboard/marketing/newsletter" element={<DashboardLayout><Newsletter /></DashboardLayout>} />
        <Route path="/dashboard/whatsapp" element={<DashboardLayout><WhatsAppConnect /></DashboardLayout>} />
        <Route path="/dashboard/whatsapp/inbox" element={<DashboardLayout><WhatsAppInbox /></DashboardLayout>} />
        <Route path="/dashboard/whatsapp/templates" element={<DashboardLayout><WhatsAppTemplates /></DashboardLayout>} />
        <Route path="/dashboard/whatsapp/campaigns" element={<DashboardLayout><WhatsAppCampaigns /></DashboardLayout>} />
        <Route path="/dashboard/whatsapp/campaigns/new" element={<DashboardLayout><WhatsAppNewCampaign /></DashboardLayout>} />
                {/* Integrations route removed */}
                {/* Facebook/Instagram route removed */}
                <Route path="/dashboard/media" element={<DashboardLayout><Media /></DashboardLayout>} />
        <Route path="/dashboard/size-guides" element={<SizeGuides />} />
        <Route path="/dashboard/store/home" element={<DashboardLayout><StoreHome /></DashboardLayout>} />
        <Route path="/dashboard/store/themes" element={<DashboardLayout><StoreThemes /></DashboardLayout>} />
        <Route path="/dashboard/store/appearance" element={<DashboardLayout><StoreAppearance /></DashboardLayout>} />
        <Route path="/dashboard/store/pages" element={<DashboardLayout><StorePages /></DashboardLayout>} />
        <Route path="/dashboard/store/pages/new" element={<DashboardLayout><PageEditor /></DashboardLayout>} />
        <Route path="/dashboard/store/pages/:pageId/edit" element={<DashboardLayout><PageEditor /></DashboardLayout>} />
        <Route path="/dashboard/store/menus" element={<DashboardLayout><StoreMenus /></DashboardLayout>} />
        <Route path="/dashboard/store/announcements" element={<DashboardLayout><StoreAnnouncements /></DashboardLayout>} />
        <Route path="/dashboard/settings" element={<DashboardLayout><SettingsGeneral /></DashboardLayout>} />
        <Route path="/dashboard/settings/general" element={<DashboardLayout><SettingsGeneral /></DashboardLayout>} />
        <Route path="/dashboard/settings/contact" element={<DashboardLayout><SettingsGeneral /></DashboardLayout>} />
        <Route path="/dashboard/settings/brand" element={<DashboardLayout><SettingsBrand /></DashboardLayout>} />
        <Route path="/dashboard/settings/business" element={<DashboardLayout><SettingsBusiness /></DashboardLayout>} />
        <Route path="/dashboard/settings/address" element={<DashboardLayout><SettingsAddress /></DashboardLayout>} />
        <Route path="/dashboard/settings/social" element={<DashboardLayout><SettingsSocial /></DashboardLayout>} />
        <Route path="/dashboard/settings/shipping" element={<DashboardLayout><SettingsShipping /></DashboardLayout>} />
        <Route path="/dashboard/settings/payments" element={<DashboardLayout><SettingsPayments /></DashboardLayout>} />
        <Route path="/dashboard/settings/policies" element={<DashboardLayout><SettingsPolicies /></DashboardLayout>} />
        <Route path="/dashboard/settings/appearance" element={<DashboardLayout><SettingsAppearance /></DashboardLayout>} />
        <Route path="/dashboard/settings/emails" element={<DashboardLayout><SettingsEmails /></DashboardLayout>} />
        <Route path="/dashboard/settings/notifications" element={<DashboardLayout><SettingsNotifications /></DashboardLayout>} />
        <Route path="/dashboard/settings/lgpd" element={<DashboardLayout><SettingsLGPD /></DashboardLayout>} />
        <Route path="/dashboard/settings/domains" element={<DashboardLayout><SettingsDomains /></DashboardLayout>} />
        <Route path="/dashboard/internal/monitoring" element={<AdminLayout><Monitoring /></AdminLayout>} />
        <Route path="/dashboard/internal/admin" element={<AdminLayout><AdminOverview /></AdminLayout>} />
        <Route path="/dashboard/internal/stores" element={<AdminLayout><AdminStores /></AdminLayout>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

/** Storefront (nomedaloja.zelpi.com.br) — slug comes from context */
function StorefrontRoutes({ storeSlug }: { storeSlug: string }) {
  return (
    <StoreSlugProvider slug={storeSlug}>
      <CustomerAuthProvider>
        <Routes>
          <Route path="/" element={<StorefrontSuspense variant="home"><Storefront /></StorefrontSuspense>} />
          <Route path="/category/:categorySlug" element={<StorefrontSuspense variant="category"><CategoryPage /></StorefrontSuspense>} />
          <Route path="/product/:productSlug" element={<StorefrontSuspense variant="product"><ProductPage /></StorefrontSuspense>} />
          <Route path="/search" element={<StorefrontSuspense variant="category"><SearchPage /></StorefrontSuspense>} />
          <Route path="/cart" element={<StorefrontSuspense><CartPage /></StorefrontSuspense>} />
          <Route path="/checkout" element={<StorefrontSuspense><CheckoutPage /></StorefrontSuspense>} />
          <Route path="/success" element={<StorefrontSuspense><SuccessPage /></StorefrontSuspense>} />
          <Route path="/thank-you" element={<StorefrontSuspense><ThankYouPage /></StorefrontSuspense>} />
          <Route path="/recover-cart" element={<StorefrontSuspense><RecoverCartPage /></StorefrontSuspense>} />
          <Route path="/order/:orderId/retry-payment" element={<StorefrontSuspense><RetryPaymentPage /></StorefrontSuspense>} />
          <Route path="/pagina/:policySlug" element={<StorefrontSuspense><PolicyPage /></StorefrontSuspense>} />
          <Route path="/contato" element={<StorefrontSuspense><ContactPage /></StorefrontSuspense>} />
          
          <Route path="/redefinir-senha" element={<StorefrontSuspense><RedefinirSenhaPage /></StorefrontSuspense>} />
          <Route path="/acessar-link" element={<StorefrontSuspense><AcessarLinkPage /></StorefrontSuspense>} />
          {/* Customer area within storefront */}
          <Route path="/customer" element={<Suspense fallback={null}><ProtectedRoute><CustomerLayout /></ProtectedRoute></Suspense>}>
            <Route index element={<CustomerDashboard />} />
            <Route path="dashboard" element={<CustomerDashboard />} />
            <Route path="orders" element={<CustomerOrders />} />
            <Route path="orders/:orderId" element={<CustomerOrderStatus />} />
            <Route path="addresses" element={<RequireFullAuth sectionName="seus endereços"><CustomerAddresses /></RequireFullAuth>} />
            <Route path="payments" element={<RequireFullAuth sectionName="suas formas de pagamento"><CustomerPayments /></RequireFullAuth>} />
            <Route path="profile" element={<RequireFullAuth sectionName="seu perfil"><CustomerProfile /></RequireFullAuth>} />
            <Route path="favorites" element={<CustomerFavorites />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Suspense fallback={null}>
          <StoreChatWrapper />
        </Suspense>
      </CustomerAuthProvider>
    </StoreSlugProvider>
  );
}

/** Development mode: all routes available via path-based routing */
function AllRoutes() {
  return (
    <Suspense fallback={<RouteAwareSuspenseFallback />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/privacidade" element={<PrivacyPolicy />} />
        <Route path="/termos" element={<TermsOfService />} />
        <Route path="/suporte" element={<Support />} />
        
        {/* Dashboard routes with layout */}
        <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
        <Route path="/dashboard/analytics" element={<DashboardLayout><Analytics /></DashboardLayout>} />
        <Route path="/dashboard/products" element={<DashboardLayout><Products /></DashboardLayout>} />
        <Route path="/dashboard/products/new" element={<DashboardLayout><ProductEdit /></DashboardLayout>} />
        <Route path="/dashboard/products/:productId/edit" element={<DashboardLayout><ProductEdit /></DashboardLayout>} />
        <Route path="/dashboard/categories" element={<DashboardLayout><Categories /></DashboardLayout>} />
        <Route path="/dashboard/categories/:categoryId/edit" element={<DashboardLayout><CategoryEdit /></DashboardLayout>} />
        <Route path="/dashboard/attributes" element={<DashboardLayout><Attributes /></DashboardLayout>} />
        <Route path="/dashboard/stores" element={<DashboardLayout><Stores /></DashboardLayout>} />
        <Route path="/dashboard/payments" element={<Navigate to="/dashboard/settings/payments" replace />} />
        <Route path="/dashboard/orders" element={<DashboardLayout><Orders /></DashboardLayout>} />
        <Route path="/dashboard/orders/abandoned" element={<DashboardLayout><AbandonedCarts /></DashboardLayout>} />
        <Route path="/dashboard/orders/:orderId" element={<DashboardLayout><OrderDetails /></DashboardLayout>} />
        <Route path="/dashboard/customers" element={<DashboardLayout><Customers /></DashboardLayout>} />
        <Route path="/dashboard/customers/new" element={<DashboardLayout><CustomerFormPage /></DashboardLayout>} />
        <Route path="/dashboard/customers/:customerId" element={<DashboardLayout><CustomerDetails /></DashboardLayout>} />
        <Route path="/dashboard/customers/:customerId/edit" element={<DashboardLayout><CustomerFormPage /></DashboardLayout>} />
        <Route path="/dashboard/coupons" element={<DashboardLayout><Coupons /></DashboardLayout>} />
        <Route path="/dashboard/marketing/chat" element={<DashboardLayout><ChatSettingsPage /></DashboardLayout>} />
        <Route path="/dashboard/marketing/feeds" element={<DashboardLayout><Feeds /></DashboardLayout>} />
        <Route path="/dashboard/marketing/pixels" element={<DashboardLayout><Pixels /></DashboardLayout>} />
        <Route path="/dashboard/marketing/newsletter" element={<DashboardLayout><Newsletter /></DashboardLayout>} />
        <Route path="/dashboard/whatsapp" element={<DashboardLayout><WhatsAppConnect /></DashboardLayout>} />
        <Route path="/dashboard/whatsapp/inbox" element={<DashboardLayout><WhatsAppInbox /></DashboardLayout>} />
        <Route path="/dashboard/whatsapp/templates" element={<DashboardLayout><WhatsAppTemplates /></DashboardLayout>} />
        <Route path="/dashboard/whatsapp/campaigns" element={<DashboardLayout><WhatsAppCampaigns /></DashboardLayout>} />
        <Route path="/dashboard/whatsapp/campaigns/new" element={<DashboardLayout><WhatsAppNewCampaign /></DashboardLayout>} />
        {/* Integrations route removed */}
                {/* Facebook/Instagram route removed */}
                
                <Route path="/dashboard/media" element={<DashboardLayout><Media /></DashboardLayout>} />
        <Route path="/dashboard/size-guides" element={<SizeGuides />} />
        
        <Route path="/dashboard/store/home" element={<DashboardLayout><StoreHome /></DashboardLayout>} />
        <Route path="/dashboard/store/themes" element={<DashboardLayout><StoreThemes /></DashboardLayout>} />
        <Route path="/dashboard/store/appearance" element={<DashboardLayout><StoreAppearance /></DashboardLayout>} />
        <Route path="/dashboard/store/pages" element={<DashboardLayout><StorePages /></DashboardLayout>} />
        <Route path="/dashboard/store/pages/new" element={<DashboardLayout><PageEditor /></DashboardLayout>} />
        <Route path="/dashboard/store/pages/:pageId/edit" element={<DashboardLayout><PageEditor /></DashboardLayout>} />
        <Route path="/dashboard/store/menus" element={<DashboardLayout><StoreMenus /></DashboardLayout>} />
        <Route path="/dashboard/store/announcements" element={<DashboardLayout><StoreAnnouncements /></DashboardLayout>} />
        
        <Route path="/dashboard/settings" element={<DashboardLayout><SettingsGeneral /></DashboardLayout>} />
        <Route path="/dashboard/settings/general" element={<DashboardLayout><SettingsGeneral /></DashboardLayout>} />
        <Route path="/dashboard/settings/contact" element={<DashboardLayout><SettingsGeneral /></DashboardLayout>} />
        <Route path="/dashboard/settings/brand" element={<DashboardLayout><SettingsBrand /></DashboardLayout>} />
        <Route path="/dashboard/settings/business" element={<DashboardLayout><SettingsBusiness /></DashboardLayout>} />
        <Route path="/dashboard/settings/address" element={<DashboardLayout><SettingsAddress /></DashboardLayout>} />
        <Route path="/dashboard/settings/social" element={<DashboardLayout><SettingsSocial /></DashboardLayout>} />
        <Route path="/dashboard/settings/shipping" element={<DashboardLayout><SettingsShipping /></DashboardLayout>} />
        <Route path="/dashboard/settings/payments" element={<DashboardLayout><SettingsPayments /></DashboardLayout>} />
        <Route path="/dashboard/settings/policies" element={<DashboardLayout><SettingsPolicies /></DashboardLayout>} />
        <Route path="/dashboard/settings/appearance" element={<DashboardLayout><SettingsAppearance /></DashboardLayout>} />
        <Route path="/dashboard/settings/emails" element={<DashboardLayout><SettingsEmails /></DashboardLayout>} />
        <Route path="/dashboard/settings/notifications" element={<DashboardLayout><SettingsNotifications /></DashboardLayout>} />
        <Route path="/dashboard/settings/lgpd" element={<DashboardLayout><SettingsLGPD /></DashboardLayout>} />
        <Route path="/dashboard/settings/domains" element={<DashboardLayout><SettingsDomains /></DashboardLayout>} />
        
        {/* Internal Admin routes */}
        <Route path="/dashboard/internal/monitoring" element={<AdminLayout><Monitoring /></AdminLayout>} />
        <Route path="/dashboard/internal/admin" element={<AdminLayout><AdminOverview /></AdminLayout>} />
        <Route path="/dashboard/internal/stores" element={<AdminLayout><AdminStores /></AdminLayout>} />
        
        {/* Public storefront (path-based) — wrapped in CustomerAuthProvider so customer auth context is available */}
          <Route element={<CustomerAuthProvider><Outlet /></CustomerAuthProvider>}>
            <Route path="/store/:storeSlug" element={<StorefrontSuspense variant="home"><Storefront /></StorefrontSuspense>} />
            <Route path="/store/:storeSlug/search" element={<StorefrontSuspense variant="category"><SearchPage /></StorefrontSuspense>} />
            <Route path="/store/:storeSlug/category/:categorySlug" element={<StorefrontSuspense variant="category"><CategoryPage /></StorefrontSuspense>} />
            <Route path="/store/:storeSlug/product/:productSlug" element={<StorefrontSuspense variant="product"><ProductPage /></StorefrontSuspense>} />
          <Route path="/store/:storeSlug/cart" element={<StorefrontSuspense variant="page"><CartPage /></StorefrontSuspense>} />
          <Route path="/store/:storeSlug/checkout" element={<StorefrontSuspense variant="page"><CheckoutPage /></StorefrontSuspense>} />
          <Route path="/store/:storeSlug/success" element={<StorefrontSuspense variant="page"><SuccessPage /></StorefrontSuspense>} />
          <Route path="/store/:storeSlug/thank-you" element={<StorefrontSuspense variant="page"><ThankYouPage /></StorefrontSuspense>} />
          <Route path="/store/:storeSlug/recover-cart" element={<StorefrontSuspense variant="page"><RecoverCartPage /></StorefrontSuspense>} />
          <Route path="/store/:storeSlug/order/:orderId/retry-payment" element={<StorefrontSuspense variant="page"><RetryPaymentPage /></StorefrontSuspense>} />
          <Route path="/store/:storeSlug/pagina/:policySlug" element={<StorefrontSuspense variant="page"><PolicyPage /></StorefrontSuspense>} />
          <Route path="/store/:storeSlug/contato" element={<StorefrontSuspense variant="page"><ContactPage /></StorefrontSuspense>} />
          
          <Route path="/store/:storeSlug/redefinir-senha" element={<StorefrontSuspense variant="page"><RedefinirSenhaPage /></StorefrontSuspense>} />
          <Route path="/redefinir-senha" element={<StorefrontSuspense variant="page"><RedefinirSenhaPage /></StorefrontSuspense>} />
          <Route path="/store/:storeSlug/acessar-link" element={<StorefrontSuspense variant="page"><AcessarLinkPage /></StorefrontSuspense>} />
          <Route path="/acessar-link" element={<StorefrontSuspense variant="page"><AcessarLinkPage /></StorefrontSuspense>} />

          {/* Customer Area Routes */}
          <Route path="/customer" element={<ProtectedRoute><CustomerLayout /></ProtectedRoute>}>
            <Route index element={<CustomerDashboard />} />
            <Route path="dashboard" element={<CustomerDashboard />} />
            <Route path="orders" element={<CustomerOrders />} />
            <Route path="orders/:orderId" element={<CustomerOrderStatus />} />
            <Route path="addresses" element={<RequireFullAuth sectionName="seus endereços"><CustomerAddresses /></RequireFullAuth>} />
            <Route path="payments" element={<RequireFullAuth sectionName="suas formas de pagamento"><CustomerPayments /></RequireFullAuth>} />
            <Route path="profile" element={<RequireFullAuth sectionName="seu perfil"><CustomerProfile /></RequireFullAuth>} />
            <Route path="favorites" element={<CustomerFavorites />} />
          </Route>

          {/* Customer Area Routes within store path */}
          <Route path="/store/:storeSlug/customer" element={<ProtectedRoute><CustomerLayout /></ProtectedRoute>}>
            <Route index element={<CustomerDashboard />} />
            <Route path="dashboard" element={<CustomerDashboard />} />
            <Route path="orders" element={<CustomerOrders />} />
            <Route path="orders/:orderId" element={<CustomerOrderStatus />} />
            <Route path="addresses" element={<RequireFullAuth sectionName="seus endereços"><CustomerAddresses /></RequireFullAuth>} />
            <Route path="payments" element={<RequireFullAuth sectionName="suas formas de pagamento"><CustomerPayments /></RequireFullAuth>} />
            <Route path="profile" element={<RequireFullAuth sectionName="seu perfil"><CustomerProfile /></RequireFullAuth>} />
            <Route path="favorites" element={<CustomerFavorites />} />
          </Route>
        </Route>
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

/** Main router that selects which route group to render */
function AppRouter() {
  const { mode, storeSlug, isDev } = useHostDetection();
  const hostname = window.location.hostname;
  const customDomain = useCustomDomainResolver(
    // Only resolve custom domains when not in dev mode and not a known domain
    isDev || mode !== 'landing' ? '' : hostname
  );

  // Custom domain detected → render storefront
  if (customDomain.isCustomDomain && customDomain.storeSlug) {
    return <StorefrontRoutes storeSlug={customDomain.storeSlug} />;
  }

  // Still loading custom domain check — render the neutral fallback (NOT null,
  // which would show a white screen between the inline boot surface being
  // wiped and the real route mounting).
  if (!isDev && mode === 'landing' && customDomain.isLoading && hostname !== 'zelpi.com.br' && hostname !== 'www.zelpi.com.br') {
    return <StorefrontRouteFallback />;
  }

  // In development, show all routes (path-based routing for convenience)
  if (isDev) {
    return <AllRoutes />;
  }

  // In production on the main domain (zelpi.com.br), only show landing routes
  if (mode === 'landing') {
    return <LandingRoutes />;
  }

  // Production with subdomain: render only the relevant route group
  switch (mode) {
    case 'admin':
      return <AdminRoutes />;
    case 'storefront':
      return <StorefrontRoutes storeSlug={storeSlug!} />;
    default:
      return <AllRoutes />;
  }
}

const App = () => {
  // Inicializa captura global de erros no mount
  useEffect(() => {
    initGlobalErrorHandler();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <AppRouter />
            </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
