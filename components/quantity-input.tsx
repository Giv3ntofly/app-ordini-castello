"use client";
import { Minus, Plus } from "lucide-react";
import { useId } from "react";
import type { Product } from "@/types/product";
import { quantityError, quantityValue } from "@/lib/order";
export function QuantityInput({
  product,
  value,
  onChange,
  compact = false,
}: {
  product: Product;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const id = useId();
  const error = quantityError(value, product);
  const quantity = !error ? quantityValue(value) : 0;
  const step = product.multiploMinimo ?? 1;
  const label =
    product.unita === "kg"
      ? "Quantità in kg"
      : product.unita === "confezioni"
        ? "Confezioni"
        : "Quantità";
  return (
    <div className={`quantity-field ${compact ? "compact" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div
        className={`stepper ${product.quantitaDecimale ? "decimal" : ""} ${error ? "invalid" : ""}`}
      >
        {!product.quantitaDecimale && (
          <button
            type="button"
            aria-label={`Diminuisci ${product.codice}`}
            onClick={() => onChange(String(Math.max(0, quantity - step)))}
            disabled={quantity <= 0}
          >
            <Minus size={16} />
          </button>
        )}
        <input
          id={id}
          aria-label={`${label} ${product.codice}`}
          inputMode={product.quantitaDecimale ? "decimal" : "numeric"}
          autoComplete="off"
          value={value}
          placeholder="0"
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {!product.quantitaDecimale && (
          <button
            type="button"
            aria-label={`Aumenta ${product.codice}`}
            onClick={() => onChange(String(quantity + step))}
            disabled={!Number.isSafeInteger(quantity + step)}
          >
            <Plus size={16} />
          </button>
        )}
      </div>
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}
