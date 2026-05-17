import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
}

const checks = [
  { label: "6+ caracteres", test: (p: string) => p.length >= 6 },
  { label: "Letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Número", test: (p: string) => /[0-9]/.test(p) },
  { label: "Caractere especial", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const score = useMemo(
    () => checks.filter((c) => c.test(password)).length,
    [password]
  );

  if (!password) return null;

  const level =
    score <= 1 ? { label: "Fraca", color: "bg-destructive" } :
    score === 2 ? { label: "Razoável", color: "bg-orange-400" } :
    score === 3 ? { label: "Boa", color: "bg-yellow-400" } :
    { label: "Forte", color: "bg-green-500" };

  return (
    <div className="space-y-2 pt-1">
      {/* Bar */}
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              i < score ? level.color : "bg-border"
            )}
          />
        ))}
      </div>
      {/* Label */}
      <p className={cn(
        "text-xs transition-colors",
        score <= 1 ? "text-destructive" :
        score === 2 ? "text-orange-500" :
        score === 3 ? "text-yellow-600" :
        "text-green-600"
      )}>
        Força: {level.label}
      </p>
    </div>
  );
}
