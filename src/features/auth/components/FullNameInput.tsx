import { useState } from "react";
import { Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FullNameInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  label?: string;
  placeholder?: string;
}

/**
 * Validation aligned with checkout (StepPayment.tsx):
 * - At least 2 words (first name + surname)
 * - Total length ≥ 3 characters
 */
export function isFullNameValid(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.split(/\s+/).filter((n) => n.length > 0).length >= 2 && trimmed.length >= 3;
}

export function FullNameInput({
  id,
  value,
  onChange,
  disabled,
  autoFocus,
  label = "Nome completo",
  placeholder = "Ex: João Silva",
}: FullNameInputProps) {
  // Mirrors checkout (StepPayment.tsx): no validation UI until the user
  // leaves the field once. After that, it updates live as they type.
  const [validated, setValidated] = useState(false);
  const isEmpty = value.trim().length === 0;
  const isValid = isFullNameValid(value);
  const showState = validated;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            // Only start showing validation after the user has typed something
            // and then left the field — exactly like checkout.
            if (!isEmpty) setValidated(true);
          }}
          required
          disabled={disabled}
          autoFocus={autoFocus}
          className={cn(
            "pr-10",
            showState && !isValid && "border-destructive focus-visible:ring-destructive"
          )}
        />
        {showState && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isValid ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <X className="w-4 h-4 text-destructive" />
            )}
          </div>
        )}
      </div>
      {showState && !isValid && (
        <p className="text-xs text-destructive">
          {isEmpty ? "Preencha este campo" : "Digite seu nome e sobrenome"}
        </p>
      )}
    </div>
  );
}
