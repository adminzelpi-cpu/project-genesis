import { useState, useEffect } from "react";
import { HexColorPicker as ReactColorful } from "react-colorful";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface HexColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
  /** Show only the swatch (no hex input beside it) */
  swatchOnly?: boolean;
}

export function HexColorPicker({ value, onChange, className, swatchOnly = false }: HexColorPickerProps) {
  const [localValue, setLocalValue] = useState(value);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleHexInput = (hex: string) => {
    setLocalValue(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onChange(hex);
    }
  };

  const handlePickerChange = (hex: string) => {
    setLocalValue(hex);
    onChange(hex);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="h-9 w-9 rounded-md border border-border shadow-sm cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            style={{ backgroundColor: value }}
            aria-label="Escolher cor"
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start" sideOffset={8}>
          <ReactColorful color={value} onChange={handlePickerChange} />
          <div className="mt-3 flex items-center gap-2">
            <div
              className="h-8 w-8 rounded border border-border shrink-0"
              style={{ backgroundColor: value }}
            />
            <Input
              value={localValue}
              onChange={(e) => handleHexInput(e.target.value)}
              placeholder="#000000"
              className="font-mono text-xs h-8"
              maxLength={7}
            />
          </div>
        </PopoverContent>
      </Popover>
      {!swatchOnly && (
        <Input
          value={localValue}
          onChange={(e) => handleHexInput(e.target.value)}
          placeholder="#000000"
          className="font-mono text-xs"
          maxLength={7}
        />
      )}
    </div>
  );
}
