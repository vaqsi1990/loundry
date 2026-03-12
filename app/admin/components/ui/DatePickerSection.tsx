import React from "react";

interface DatePickerSectionProps {
  selectedDate: string;
  onChange: (date: string) => void;
}

export function DatePickerSection({ selectedDate, onChange }: DatePickerSectionProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <label className="block text-[16px] md:text-[18px] font-medium text-black mb-2">
        თარიღი
      </label>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md text-black"
      />
    </div>
  );
}

