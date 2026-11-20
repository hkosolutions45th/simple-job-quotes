import { useState, type InputHTMLAttributes } from "react";
import { normalizeNumericDraft, numericDraftValue } from "@/lib/numeric-input";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "onFocus" | "onBlur"> & {
  value: number;
  onValueChange: (value: number) => void;
};

/** Editing text is local; quote state remains numeric and authoritative for calculations. */
export function QuoteNumericInput({ value, onValueChange, ...props }: Props) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      pattern="[0-9]*[.]?[0-9]*"
      value={draft ?? String(value)}
      onFocus={() => setDraft(String(value))}
      onChange={(event) => {
        const next = normalizeNumericDraft(event.target.value);
        if (next === null) return;
        setDraft(next);
        onValueChange(numericDraftValue(next));
      }}
      onBlur={() => setDraft(null)}
    />
  );
}