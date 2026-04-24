"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";

interface DatePickerSectionProps {
  selectedDate: string;
  onChange: (date: string) => void;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isoToDMY(iso: string) {
  // Expected: YYYY-MM-DD
  const [y, m, d] = (iso || "").split("-");
  if (!y || !m || !d) return "";
  return `${pad2(Number(d))}/${pad2(Number(m))}/${y}`;
}

function dmyToIso(dmy: string): string | null {
  const cleaned = dmy.trim().replace(/[.\-]/g, "/");
  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  if (yyyy.length !== 4) return null;
  const d = Number(dd);
  const m = Number(mm);
  const y = Number(yyyy);
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return null;
  if (y < 1900 || y > 2100) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;

  const iso = `${y}-${pad2(m)}-${pad2(d)}`;
  const dt = new Date(`${iso}T00:00:00`);
  // Validate actual calendar date
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() + 1 !== m || dt.getUTCDate() !== d) return null;
  return iso;
}

function normalizeDMYInput(raw: string) {
  // Keep only digits and slashes; auto-insert slashes as DD/MM/YYYY.
  const digits = raw.replace(/[^\d]/g, "");
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  if (digits.length <= 2) return d;
  if (digits.length <= 4) return `${d}/${m}`;
  return `${d}/${m}/${y}`;
}

export function FormattedDateInput({
  value,
  onChange,
  disabled,
  required,
  className,
  placeholder = "დღე/თვე/წელი",
}: {
  value: string;
  onChange: (isoDate: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const id = useId();
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const formattedValue = useMemo(() => isoToDMY(value), [value]);
  const [draft, setDraft] = useState<string>(formattedValue);

  useEffect(() => {
    setDraft(formattedValue);
  }, [formattedValue]);

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        required={required}
        value={draft}
        onChange={(e) => {
          const next = normalizeDMYInput(e.target.value);
          setDraft(next);
          if (next.length === 10) {
            const iso = dmyToIso(next);
            if (iso) onChange(iso);
          }
        }}
        onBlur={() => {
          const iso = dmyToIso(draft);
          if (iso) {
            onChange(iso);
            setDraft(isoToDMY(iso));
          } else {
            // revert to last valid value from props
            setDraft(formattedValue);
          }
        }}
        placeholder={placeholder}
        className={className}
      />

      {/* Hidden native picker to keep "calendar" UX */}
      <input
        ref={dateInputRef}
        id={id}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute right-0 top-0 h-full w-10 opacity-0 cursor-pointer"
        disabled={disabled}
        required={required}
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          const el = dateInputRef.current;
          if (!el) return;
          // Chrome/Edge: showPicker(); fallback: focus
          (el as any).showPicker?.();
          el.focus();
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black disabled:opacity-50"
        aria-label="კალენდრის გახსნა"
      >
        📅
      </button>
    </div>
  );
}

export function DatePickerSection({ selectedDate, onChange }: DatePickerSectionProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <label className="block text-[16px] md:text-[18px] font-medium text-black mb-2">
        თარიღი
      </label>
      <FormattedDateInput
        value={selectedDate}
        onChange={onChange}
        className="px-3 py-2 border border-gray-300 rounded-md text-black"
      />
    </div>
  );
}

