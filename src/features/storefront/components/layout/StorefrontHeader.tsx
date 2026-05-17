import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useStorePath } from "@/contexts/StoreSlugContext";
import { Menu, Search, ShoppingCart, User, Heart, Store, X } from "lucide-react";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/CartContext";
import MiniCart from "../header/MiniCart";
import { MobileMenu } from "../header/MobileMenu";
import { SearchExpanded } from "../header/SearchExpanded";
import { SearchDropdown } from "../header/SearchDropdown";
import { DesktopNavigation } from "../header/DesktopNavigation";
import { useStorefrontMenus } from "../../hooks/useStorefrontMenus";
import { useStorefrontCategories } from "../../hooks/useStorefrontCategories";
import { FavoritesDrawer } from "../favorites/FavoritesDrawer";
import { AuthModal } from "../favorites/AuthModal";
import { AccountDrawer } from "../account/AccountDrawer";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/features/customers/hooks/useFavorites";
import { useStoreAnnouncements } from "../../hooks/useStoreAnnouncements";
import { useSearchHistory } from "../../hooks/useSearchHistory";
import { AnnouncementBar } from "./AnnouncementBar";
import { useCustomerAuth } from "@/features/auth";

interface StorefrontHeaderProps {
  storeName: string;
  storeSlug: string;
  storeId: string;
  logoUrl?: string | null;
  headerBgColor?: string | null;
  headerTextColor?: string | null;
  headerLayout?: string | null;
  headerShowFavorites?: boolean;
  headerShowSearch?: boolean;
  headerMobileLogoPosition?: string | null;
}

export function StorefrontHeader({
  storeName,
  storeSlug,
  storeId,
  logoUrl,
  headerBgColor = "#ffffff",
  headerTextColor = "#000000",
  headerLayout = "default",
  headerShowFavorites = true,
  headerShowSearch = true,
  headerMobileLogoPosition = "center",
}: StorefrontHeaderProps) {
  const navigate = useNavigate();
  const { itemCount, setOnCartOpen } = useCart();
  const { data: menus } = useStorefrontMenus(storeId);
  const { data: categories = [] } = useStorefrontCategories(storeId);
  const { favorites } = useFavorites();
  const { data: announcementSettings } = useStoreAnnouncements(storeId);

  // Fetch social links for mobile menu
  const { data: storeSocialLinks } = useQuery({
    queryKey: ["store-social-links", storeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("instagram, facebook, tiktok, whatsapp")
        .eq("id", storeId)
        .single();
      return data;
    },
    enabled: !!storeId,
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  // Emit custom event when mini-cart opens (for chat proactive trigger)
  useEffect(() => {
    if (cartOpen) {
      window.dispatchEvent(new CustomEvent("minicart-opened"));
    }
  }, [cartOpen]);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [accountDrawerTab, setAccountDrawerTab] = useState<"login" | "signup">("login");
  const [desktopSearch, setDesktopSearch] = useState("");
  const [desktopSearchFocused, setDesktopSearchFocused] = useState(false);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const { addTerm: addSearchTerm } = useSearchHistory(storeId);
  const { buildPath } = useStorePath();

  const { isAuthenticated, customer: customerSession } = useCustomerAuth();
  const authUserName = customerSession?.nome?.split(" ")[0] || "";
  const authAvatarUrl = "";

  // Auto-open login drawer from ?login=true query param
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("login") === "true" && !isAuthenticated) {
      setAccountDrawerTab("login");
      setAccountDrawerOpen(true);
      searchParams.delete("login");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, isAuthenticated]);

  // Smart sticky header state
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollThreshold = 50; // minimum scroll before hiding

  // Smart sticky header logic
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Announcement bar only visible at the very top
      setIsAnnouncementVisible(currentScrollY < 10);
      
      // Always show header at the very top
      if (currentScrollY < scrollThreshold) {
        setIsHeaderVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      // Scrolling up - show header immediately (but NOT announcement bar)
      if (currentScrollY < lastScrollY.current) {
        setIsHeaderVisible(true);
      } 
      // Scrolling down - hide header (only after threshold)
      else if (currentScrollY > lastScrollY.current && currentScrollY > scrollThreshold) {
        setIsHeaderVisible(false);
        // Close mobile menu when scrolling down
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
        }
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mobileMenuOpen]);

  // Close desktop search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (desktopSearchRef.current && !desktopSearchRef.current.contains(e.target as Node)) {
        setDesktopSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Legacy supabase.auth listener removed — storefront uses store-isolated
  // custom JWT exclusively (purge runs once via CustomerAuthProvider).

  const handleAccountClick = () => {
    setAccountDrawerTab("login");
    setAccountDrawerOpen(true);
  };

  // Register cart open callback
  useState(() => {
    setOnCartOpen(() => setCartOpen(true));
  });

  // Count favorites for current store
  const storeFavoritesCount = favorites?.filter(
    (fav) => fav.product?.store?.slug === storeSlug
  ).length || 0;

  const handleFavoritesClick = () => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
    } else {
      setFavoritesOpen(true);
    }
  };

  const handleDesktopSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (desktopSearch.trim()) {
      addSearchTerm(desktopSearch.trim());
      navigate(buildPath(`/search?q=${encodeURIComponent(desktopSearch.trim())}`));
      setDesktopSearch("");
      setDesktopSearchFocused(false);
    }
  };

  const handleSearchFromDropdown = (term: string) => {
    addSearchTerm(term);
    navigate(buildPath(`/search?q=${encodeURIComponent(term)}`));
    setDesktopSearch("");
    setDesktopSearchFocused(false);
  };

  const handleLogin = () => {
    setMobileMenuOpen(false);
    setAccountDrawerTab("login");
    setAccountDrawerOpen(true);
  };

  const handleRegister = () => {
    setMobileMenuOpen(false);
    setAccountDrawerTab("signup");
    setAccountDrawerOpen(true);
  };

  const menuItems = menus?.header?.items || [];

  const getContainerClass = () => {
    switch (headerLayout) {
      case 'wide': return 'max-w-7xl';
      case 'full': return 'max-w-full';
      default: return 'max-w-6xl';
    }
  };

  const headerStyle = {
    backgroundColor: headerBgColor || '#ffffff',
    color: headerTextColor || '#000000',
  };

  const iconClass = "hover:opacity-70 transition-opacity";

  const hasAnnouncements = announcementSettings?.enabled && announcementSettings.announcements.length > 0;

  // Calculate announcement bar height
  const announcementBarHeight = hasAnnouncements ? 28 : 0;

  return (
    <>
      {/* Announcement Bar - Fixed at absolute top, only visible when at top of page */}
      {hasAnnouncements && (
        <div 
          className={`fixed top-0 left-0 right-0 z-50 transition-opacity duration-300 ${
            isAnnouncementVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <AnnouncementBar
            announcements={announcementSettings.announcements}
            bgColor={announcementSettings.bgColor}
            textColor={announcementSettings.textColor}
            speed={announcementSettings.speed}
          />
        </div>
      )}
      
      {/* Fixed container for header that shows on scroll up */}
      <div 
        className={`fixed left-0 right-0 z-40 transition-transform duration-300 ease-out ${
          isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
        style={{ top: isAnnouncementVisible && hasAnnouncements ? `${announcementBarHeight}px` : '0px' }}
      >
        
        <header 
          className="border-b"
          style={headerStyle}
        >
        {/* Main header - Mobile */}
        <div className="lg:hidden">
          <div className={`container mx-auto px-4 py-3 ${getContainerClass()}`}>
            <div className={`flex items-center ${headerMobileLogoPosition === 'center' ? 'justify-between' : 'gap-4'}`}>
              {/* Left: Menu + Search */}
              <div className="flex items-center gap-0.5 -ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (mobileMenuOpen) {
                      setMobileMenuOpen(false);
                    } else {
                      setSearchOpen(false);
                      setMobileMenuOpen(true);
                    }
                  }}
                  className={`${iconClass} [&_svg]:!size-[22px]`}
                  style={{ color: headerTextColor || '#000000' }}
                  aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
                >
                  {mobileMenuOpen ? <X /> : <Menu />}
                </Button>
                {headerShowSearch && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (searchOpen) {
                        setSearchOpen(false);
                      } else {
                        setMobileMenuOpen(false);
                        setSearchOpen(true);
                      }
                    }}
                    className={`${iconClass} [&_svg]:!size-[22px]`}
                    style={{ color: headerTextColor || '#000000' }}
                    aria-label={searchOpen ? "Fechar busca" : "Buscar"}
                  >
                    <Search />
                  </Button>
                )}
              </div>

              {/* Center or after left: Logo */}
              <Link 
                to={buildPath("/")}
                className={headerMobileLogoPosition === 'center' ? 'flex-shrink-0' : 'flex-1'}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={storeName}
                    className="h-8 max-w-[120px] object-contain"
                    width={120}
                    height={32}
                  />
                ) : (
                  <span 
                    className="font-bold text-lg truncate max-w-[100px]"
                    style={{ color: headerTextColor || '#000000' }}
                  >
                    {storeName}
                  </span>
                )}
              </Link>

              {/* Right: Account + Cart (swapped order) */}
              <div className="flex items-center gap-0.5 -mr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAccountClick}
                  className={`${iconClass} [&_svg]:!size-[22px]`}
                  style={{ color: headerTextColor || '#000000' }}
                  aria-label="Minha conta"
                >
                  <User />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCartOpen(true)}
                  className={`relative ${iconClass} [&_svg]:!size-[22px]`}
                  style={{ color: headerTextColor || '#000000' }}
                  aria-label="Carrinho"
                >
                  <div className="relative">
                    <ShoppingCart />
                    <span className="absolute -top-1.5 -right-2.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-[hsl(var(--store-secondary))] text-[hsl(var(--store-secondary-foreground))] text-[10px] font-semibold leading-none">
                      {itemCount}
                    </span>
                  </div>
                </Button>
              </div>
            </div>
          </div>

          {/* Search expanded (mobile) */}
          {headerShowSearch && (
            <SearchExpanded
              isOpen={searchOpen}
              onClose={() => setSearchOpen(false)}
              storeSlug={storeSlug}
              storeId={storeId}
            />
          )}
        </div>

        {/* Main header - Desktop */}
        <div className="hidden lg:block">
          <div className={`container mx-auto px-4 py-4 ${getContainerClass()}`}>
            <div className="flex items-center gap-8">
              {/* Logo */}
              <Link to={buildPath("/")} className="flex-shrink-0">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={storeName}
                    className="h-10 max-w-[180px] object-contain"
                    width={180}
                    height={40}
                  />
                ) : (
                  <div className="flex items-center gap-2" style={{ color: headerTextColor || '#000000' }}>
                    <Store className="h-[22px] w-[22px]" />
                    <span className="font-bold text-2xl">{storeName}</span>
                  </div>
                )}
              </Link>

              {/* Search - Desktop */}
              {headerShowSearch && (
                <div className="flex-1 max-w-2xl relative" ref={desktopSearchRef}>
                  <form onSubmit={handleDesktopSearch}>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Pesquisar produtos"
                        value={desktopSearch}
                        onChange={(e) => setDesktopSearch(e.target.value)}
                        onFocus={() => setDesktopSearchFocused(true)}
                        className="pl-12 pr-4 h-11 border focus-visible:ring-2"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                  <SearchDropdown
                    storeId={storeId}
                    storeSlug={storeSlug}
                    isFocused={desktopSearchFocused}
                    query={desktopSearch}
                    onClose={() => setDesktopSearchFocused(false)}
                    onSearch={handleSearchFromDropdown}
                  />
                </div>
              )}

              {/* Right actions (swapped: Account, Favorites, Cart) */}
              <div className={`flex items-center gap-2 ${!headerShowSearch ? 'ml-auto' : ''}`}>
                <Button
                  variant="ghost"
                  className={`gap-2 ${iconClass} [&_svg]:!size-[22px]`}
                  style={{ color: headerTextColor || '#000000' }}
                  onClick={handleAccountClick}
                >
                  <User />
                  <span className="hidden xl:inline">Minha conta</span>
                </Button>

                {headerShowFavorites && (
                  <Button
                    variant="ghost"
                    className={`relative gap-2 ${iconClass} [&_svg]:!size-[22px]`}
                    style={{ color: headerTextColor || '#000000' }}
                    onClick={handleFavoritesClick}
                  >
                    <div className="relative">
                      <Heart />
                      {storeFavoritesCount > 0 && (
                        <span className="absolute -top-1.5 -right-2.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-black text-white text-[10px] font-semibold leading-none">
                          {storeFavoritesCount}
                        </span>
                      )}
                    </div>
                    <span className="hidden xl:inline">Favoritos</span>
                  </Button>
                )}

                <Button
                  variant="ghost"
                  className={`relative gap-2 ${iconClass} [&_svg]:!size-[22px]`}
                  style={{ color: headerTextColor || '#000000' }}
                  onClick={() => setCartOpen(true)}
                >
                  <div className="relative">
                    <ShoppingCart />
                    <span className="absolute -top-1.5 -right-2.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-[hsl(var(--store-secondary))] text-[hsl(var(--store-secondary-foreground))] text-[10px] font-semibold leading-none">
                      {itemCount}
                    </span>
                  </div>
                  <span className="hidden xl:inline">Carrinho</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

          {/* Desktop navigation bar (secondary header) */}
          <DesktopNavigation
            storeSlug={storeSlug}
            storeId={storeId}
            menuItems={menuItems}
            categories={categories}
            whatsapp={storeSocialLinks?.whatsapp ?? null}
          />

          {/* Mobile menu - overlay, does NOT push content down */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t bg-background max-h-[calc(100vh-60px)] overflow-y-auto">
              <MobileMenu
                isOpen={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
                storeSlug={storeSlug}
                menuItems={menuItems}
                isLoggedIn={isAuthenticated}
                userName={authUserName}
                avatarUrl={authAvatarUrl}
                onLogin={handleLogin}
                onRegister={handleRegister}
                socialLinks={storeSocialLinks || undefined}
              />
            </div>
          )}
        </header>
      </div>

      {/* Spacer to push content below the fixed header */}
      <div style={{ height: hasAnnouncements ? 'calc(28px + 60px)' : '60px' }} className="lg:hidden" />
      <div style={{ height: hasAnnouncements ? 'calc(28px + 130px)' : '130px' }} className="hidden lg:block" />

      {/* Cart sidebar */}
      <MiniCart open={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Favorites drawer */}
      <FavoritesDrawer
        open={favoritesOpen}
        onClose={() => setFavoritesOpen(false)}
        storeSlug={storeSlug}
      />

      {/* Auth modal for favorites */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setFavoritesOpen(true)}
        storeId={storeId}
      />

      {/* Account drawer */}
      <AccountDrawer
        open={accountDrawerOpen}
        onClose={() => setAccountDrawerOpen(false)}
        onOpen={() => setAccountDrawerOpen(true)}
        storeSlug={storeSlug}
        storeId={storeId}
        initialTab={accountDrawerTab}
      />
    </>
  );
}
