import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, User, LogIn, UserPlus, Heart, Package, HelpCircle, Instagram, Facebook } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { useStorePath } from "@/contexts/StoreSlugContext";
import type { StorefrontMenuItem } from "../../hooks/useStorefrontMenus";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  storeSlug: string;
  menuItems: StorefrontMenuItem[];
  isLoggedIn?: boolean;
  userName?: string;
  avatarUrl?: string;
  onLogin?: () => void;
  onRegister?: () => void;
  socialLinks?: {
    instagram?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
    whatsapp?: string | null;
  };
}

export function MobileMenu({
  isOpen,
  onClose,
  storeSlug,
  menuItems,
  isLoggedIn = false,
  userName,
  avatarUrl,
  onLogin,
  onRegister,
  socialLinks,
}: MobileMenuProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { buildPath } = useStorePath();

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const buildUrl = (item: StorefrontMenuItem): string => {
    if (item.link_type === "category" && item.link_reference_id) {
      // Use stored url (contains slug) if available, fallback to reference id
      if (item.url && item.url.startsWith("/")) return buildPath(item.url);
      return buildPath(`/category/${item.link_reference_id}`);
    }
    if (item.link_type === "product" && item.link_reference_id) {
      if (item.url && item.url.startsWith("/")) return buildPath(item.url);
      return buildPath(`/product/${item.link_reference_id}`);
    }
    if (item.url) {
      if (item.url.startsWith("/")) {
        return buildPath(item.url);
      }
      return item.url;
    }
    return "#";
  };

  const hasSocialLinks = socialLinks?.instagram || socialLinks?.facebook || socialLinks?.tiktok;

  return (
    <div className="bg-background shadow-lg">

      {/* Account section */}
      <div className="px-4 py-4 bg-muted/40 border-b">
        {isLoggedIn ? (
          <Link
            to={buildPath(`/customer`)}
            onClick={onClose}
            className="flex items-center gap-3 group"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName || "Cliente"}
                className="h-11 w-11 rounded-full object-cover ring-2 ring-[hsl(var(--store-primary)/0.2)]"
              />
            ) : (
              <div className="h-11 w-11 rounded-full bg-[hsl(var(--store-primary))] flex items-center justify-center text-[hsl(var(--store-primary-foreground))] font-semibold text-lg">
                {(userName || "C")[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold group-hover:text-[hsl(var(--store-primary))] transition-colors">
                Olá, {userName || "Cliente"}
              </p>
              <p className="text-xs text-muted-foreground">
                Acesse sua conta para ver seus pedidos
              </p>
            </div>
            <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground group-hover:text-[hsl(var(--store-primary))] transition-colors" />
          </Link>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm">Bem-vindo</p>
                <p className="text-xs text-muted-foreground">
                  Entre para ver suas compras e favoritos
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={onLogin}
                size="sm"
                className="flex-1 bg-[hsl(var(--store-primary))] text-[hsl(var(--store-primary-foreground))] hover:bg-[hsl(var(--store-primary)/0.9)]"
              >
                <LogIn className="h-3.5 w-3.5 mr-1.5" />
                Entrar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onRegister}
                className="flex-1"
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Cadastrar
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav>

        {/* Main menu items from dashboard */}
        {menuItems.length > 0 && (
          <div className="py-1">
            {menuItems.map((item, index) => {
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedItems.has(item.id);
              const isLast = index === menuItems.length - 1;

              return (
                <div key={item.id}>
                  {hasChildren ? (
                    /* Parent item with children — link + expand toggle */
                    <>
                      <div className="flex items-center hover:bg-muted/50 transition-colors">
                        <Link
                          to={buildUrl(item)}
                          onClick={onClose}
                          target={item.open_in_new_tab ? "_blank" : undefined}
                          rel={item.open_in_new_tab ? "noopener noreferrer" : undefined}
                          className="flex-1 px-4 py-3.5 text-sm font-medium hover:text-[hsl(var(--store-primary))] transition-colors"
                        >
                          {item.title}
                        </Link>
                        <button
                          onClick={() => toggleItem(item.id)}
                          className="px-4 py-3.5 text-muted-foreground hover:text-[hsl(var(--store-primary))] transition-colors"
                          aria-label={isExpanded ? "Recolher submenu" : "Expandir submenu"}
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform duration-200 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </div>
                      {/* Sub-items */}
                      {isExpanded && (
                        <div className="bg-muted/20 border-t border-b border-border/40">
                          {item.children!.map((child) => (
                            <Link
                              key={child.id}
                              to={buildUrl(child)}
                              onClick={onClose}
                              target={child.open_in_new_tab ? "_blank" : undefined}
                              rel={child.open_in_new_tab ? "noopener noreferrer" : undefined}
                              className="flex items-center px-8 py-3 text-sm text-foreground/80 hover:text-[hsl(var(--store-primary))] hover:bg-muted/30 transition-colors border-b border-border/20 last:border-0"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current mr-3 opacity-40" />
                              {child.title}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    /* Leaf item — direct link */
                    <Link
                      to={buildUrl(item)}
                      onClick={onClose}
                      target={item.open_in_new_tab ? "_blank" : undefined}
                      rel={item.open_in_new_tab ? "noopener noreferrer" : undefined}
                      className="flex items-center px-4 py-3.5 text-sm font-medium hover:bg-muted/50 hover:text-[hsl(var(--store-primary))] transition-colors"
                    >
                      {item.title}
                    </Link>
                  )}
                  {/* Divider between items (not after last) */}
                  {!isLast && !isExpanded && (
                    <div className="mx-4 border-b border-border/30" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Divider before account links */}
        <div className="border-t border-border/60 mx-0 my-0" />

        {/* Account & utility links */}
        <div className="py-1">
          {socialLinks?.whatsapp && (
            <>
              <a
                href={`https://wa.me/${socialLinks.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3.5 text-sm text-muted-foreground hover:text-[hsl(var(--store-primary))] hover:bg-muted/50 transition-colors"
              >
                <WhatsAppIcon className="h-4 w-4" />
                WhatsApp
              </a>
              <div className="mx-4 border-b border-border/30" />
            </>
          )}
          <Link
            to={buildPath(`/customer/favorites`)}
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3.5 text-sm text-muted-foreground hover:text-[hsl(var(--store-primary))] hover:bg-muted/50 transition-colors"
          >
            <Heart className="h-4 w-4" />
            Meus Favoritos
          </Link>
          <div className="mx-4 border-b border-border/30" />

          <Link
            to={buildPath(`/customer/orders`)}
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3.5 text-sm text-muted-foreground hover:text-[hsl(var(--store-primary))] hover:bg-muted/50 transition-colors"
          >
            <Package className="h-4 w-4" />
            Meus Pedidos
          </Link>
        </div>

        {/* Social links */}
        {hasSocialLinks && (
          <>
            <div className="border-t border-border/60" />
            <div className="px-4 py-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Siga-nos</p>
              <div className="flex items-center gap-2">
                {socialLinks?.instagram && (
                  <a
                    href={socialLinks.instagram.startsWith('http') ? socialLinks.instagram : `https://instagram.com/${socialLinks.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {socialLinks?.facebook && (
                  <a
                    href={socialLinks.facebook.startsWith('http') ? socialLinks.facebook : `https://facebook.com/${socialLinks.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {socialLinks?.tiktok && (
                  <a
                    href={socialLinks.tiktok.startsWith('http') ? socialLinks.tiktok : `https://tiktok.com/@${socialLinks.tiktok}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors"
                    aria-label="TikTok"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V9.14a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.01-.57Z"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </>
        )}
      </nav>
    </div>
  );
}
