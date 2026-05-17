import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  /** Numeric value (e.g. 19.90) */
  value: string | number;
  /** Called with the numeric value */
  onChange: (value: string | number) => void;
  /** Number of decimal places (default 2) */
  decimals?: number;
}

/**
 * Formats a numeric value to Brazilian decimal format (comma separator).
 * User types only digits; the component auto-places the comma.
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, decimals = 2, placeholder, ...props }, ref) => {
    const formatDisplay = (val: string | number): string => {
      if (val === '' || val === null || val === undefined) return '';
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(num)) return '';
      return num.toFixed(decimals).replace('.', ',');
    };

    const [displayValue, setDisplayValue] = React.useState(() => formatDisplay(value));

    // Sync from external value changes
    React.useEffect(() => {
      const formatted = formatDisplay(value);
      // Only update if the numeric value actually changed
      const currentNumeric = parseDisplayToNumber(displayValue);
      const externalNumeric = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(externalNumeric) && displayValue === '') return;
      if (!isNaN(externalNumeric) && Math.abs((currentNumeric || 0) - externalNumeric) > 0.001) {
        setDisplayValue(formatted);
      }
    }, [value]);

    const parseDisplayToNumber = (display: string): number | null => {
      if (!display) return null;
      const digits = display.replace(/\D/g, '');
      if (!digits) return null;
      return parseInt(digits, 10) / Math.pow(10, decimals);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawInput = e.target.value;
      
      // Extract only digits
      const digits = rawInput.replace(/\D/g, '');
      
      if (digits === '' || digits === '0'.repeat(digits.length)) {
        if (digits === '') {
          setDisplayValue('');
          onChange('');
          return;
        }
      }

      const numericValue = parseInt(digits, 10) / Math.pow(10, decimals);
      const formatted = numericValue.toFixed(decimals).replace('.', ',');
      
      setDisplayValue(formatted);
      onChange(numericValue);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Select all on focus for easy replacement
      setTimeout(() => e.target.select(), 0);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Clean up display on blur
      if (displayValue) {
        const num = parseDisplayToNumber(displayValue);
        if (num !== null) {
          setDisplayValue(num.toFixed(decimals).replace('.', ','));
        }
      }
      props.onBlur?.(e);
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder || `0,${'0'.repeat(decimals)}`}
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
export type { CurrencyInputProps };
