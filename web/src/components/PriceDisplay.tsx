interface PriceDisplayProps {
  cents: number;
  className?: string;
  prefix?: string;
}

export function PriceDisplay({
  cents,
  className = "",
  prefix = "$",
}: PriceDisplayProps) {
  const dollars = Math.floor(cents / 100);
  const remainder = cents % 100;
  const formatted = `${prefix}${dollars.toLocaleString("en-US")}${remainder > 0 ? `.${String(remainder).padStart(2, "0")}` : ""}`;

  return (
    <span className={`font-mono tabular-nums tracking-tight ${className}`}>
      {formatted}
    </span>
  );
}
