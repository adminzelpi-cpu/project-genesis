import { Minus, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
  size?: "sm" | "md";
  isLoading?: boolean;
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  className,
  size = "md",
  isLoading = false,
}: QuantitySelectorProps) {
  const handleDecrease = () => {
    if (value > min && !isLoading) {
      onChange(value - 1);
    }
  };

  const handleIncrease = () => {
    if (value < max && !isLoading) {
      onChange(value + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLoading) return;
    const newValue = parseInt(e.target.value) || min;
    onChange(Math.min(max, Math.max(min, newValue)));
  };

  const sizeClasses = {
    sm: {
      button: "w-7 h-8",
      input: "w-8 h-8 text-sm",
      icon: "w-3 h-3",
    },
    md: {
      button: "w-7 h-9",
      input: "w-10 h-9 text-sm",
      icon: "w-3 h-3",
    },
  };

  const s = sizeClasses[size];

  return (
    <div 
      className={cn(
        "inline-flex items-center border border-border w-fit transition-opacity",
        isLoading && "opacity-70",
        className
      )}
      style={{ borderRadius: 'var(--store-button-radius, 0.375rem)' }}
    >
      <button
        type="button"
        onClick={handleDecrease}
        disabled={value <= min || isLoading}
        className={cn(
          s.button,
          "flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        )}
        style={{ borderRadius: 'var(--store-button-radius, 0.375rem) 0 0 var(--store-button-radius, 0.375rem)' }}
        aria-label="Diminuir quantidade"
      >
        <Minus className={s.icon} />
      </button>
      <div className={cn(s.input, "relative flex items-center justify-center border-x border-border bg-transparent")}>
        {isLoading ? (
          <Loader2 className={cn(s.icon, "animate-spin text-muted-foreground")} />
        ) : (
          <input
            type="number"
            value={value}
            onChange={handleInputChange}
            min={min}
            max={max}
            tabIndex={-1}
            className={cn(
              "w-full h-full text-center bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            )}
            aria-label="Quantidade"
          />
        )}
      </div>
      <button
        type="button"
        onClick={handleIncrease}
        disabled={value >= max || isLoading}
        className={cn(
          s.button,
          "flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        )}
        style={{ borderRadius: '0 var(--store-button-radius, 0.375rem) var(--store-button-radius, 0.375rem) 0' }}
        aria-label="Aumentar quantidade"
      >
        <Plus className={s.icon} />
      </button>
    </div>
  );
}
