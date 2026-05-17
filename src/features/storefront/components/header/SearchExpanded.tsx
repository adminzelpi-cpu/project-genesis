import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStorePath } from "@/contexts/StoreSlugContext";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchDropdown } from "./SearchDropdown";
import { useSearchHistory } from "../../hooks/useSearchHistory";

interface SearchExpandedProps {
  isOpen: boolean;
  onClose: () => void;
  storeSlug: string;
  storeId?: string;
}

export function SearchExpanded({ isOpen, onClose, storeSlug, storeId }: SearchExpandedProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { buildPath } = useStorePath();
  const { addTerm } = useSearchHistory(storeId);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setIsFocused(true);
    } else {
      setIsFocused(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      addTerm(query.trim());
      navigate(buildPath(`/search?q=${encodeURIComponent(query.trim())}`));
      onClose();
      setQuery("");
    }
  };

  const handleSearchFromDropdown = (term: string) => {
    addTerm(term);
    navigate(buildPath(`/search?q=${encodeURIComponent(term)}`));
    onClose();
    setQuery("");
  };

  if (!isOpen) return null;

  return (
    <div className="border-b bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-2 relative">
        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="search"
            placeholder="O que você está buscando?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            className="h-10 pl-10 pr-12 text-sm border focus-visible:ring-1"
          />
          <Button
            type="submit"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
          >
            <Search className="h-4 w-4" />
          </Button>
        </form>
        {storeId && (
          <SearchDropdown
            storeId={storeId}
            storeSlug={storeSlug}
            isFocused={isFocused}
            query={query}
            onClose={() => setIsFocused(false)}
            onSearch={handleSearchFromDropdown}
          />
        )}
      </div>
    </div>
  );
}
