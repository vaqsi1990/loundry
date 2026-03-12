import React from "react";

type Shift = "DAY" | "NIGHT";

type EmployeeRow = {
  employeeId: string;
  employeeName: string;
  employeePosition?: string;
  arrivalTime: string;
  departureTime: string;
  dailySalary: string;
  shift: Shift;
  workedKg: string;
};

interface EmployeeTablesProps {
  kgPrice: number | null;
  bulkWorkedKg: string;
  setBulkWorkedKg: (value: string) => void;
  laundryRows: EmployeeRow[];
  managerRows: EmployeeRow[];
  courierRows: EmployeeRow[];
  updateRow: (employeeId: string, shift: Shift, field: keyof EmployeeRow, value: string) => void;
  updateWorkedKgForAll: (value: string) => void;
  updateWorkedKg: (employeeId: string, shift: Shift, value: string) => void;
  saveRow: (employeeId: string, shift: Shift) => void;
  saving: { [key: string]: boolean };
  handleRemoveEmployeeFromTable: (employeeId: string, shift: Shift) => void;
  formatEmployeeRole: (position: string) => string;
}

interface RenderOpts {
  title: string;
  showKg: boolean;
  accent?: "orange" | "blue";
}

export function EmployeeTables({
  kgPrice,
  bulkWorkedKg,
  setBulkWorkedKg,
  laundryRows,
  managerRows,
  courierRows,
  updateRow,
  updateWorkedKgForAll,
  updateWorkedKg,
  saveRow,
  saving,
  handleRemoveEmployeeFromTable,
  formatEmployeeRole,
}: EmployeeTablesProps) {
  const renderEmployeeTable = (rows: EmployeeRow[], opts: RenderOpts) => {
    if (rows.length === 0) return null;

    const accentClasses =
      opts.accent === "orange"
        ? "border-orange-200 bg-orange-50 text-orange-900"
        : opts.accent === "blue"
        ? "border-blue-200 bg-blue-50 text-blue-900"
        : "border-gray-200 bg-gray-50 text-black";

    return (
      <div className="mb-8">
        <div className={`mb-3 px-4 py-3 rounded-lg border ${accentClasses}`}>
          <div className="font-semibold text-[16px] md:text-[18px]">{opts.title}</div>
          <div className="text-[13px] md:text-[14px] opacity-80">ჩანაწერები: {rows.length}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider border border-gray-300 w-48 max-w-48">
                  თანამშრომელი
                </th>
                <th className="px-4 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider border border-gray-300">
                  ცვლა
                </th>
                <th className="px-2 py-3 text-left text-[14px] md:text-[16px] font-medium text-black uppercase tracking-wider border border-gray-300 w-24">
                  მოსვლის საათი
                </th>
                <th className="px-2 py-3 text-left text-[14px] md:text-[16px] font-medium text-black uppercase tracking-wider border border-gray-300 w-24">
                  გამოსვლის საათი
                </th>
                <th className="px-2 py-3 text-left text-[14px] md:text-[16px] font-medium text-black uppercase tracking-wider border border-gray-300 w-28">
                  დღეში დარიცხული ხელფასი
                </th>
                {opts.showKg && (
                  <th className="px-2 py-3 text-left text-[14px] md:text-[16px] font-medium text-black uppercase tracking-wider border border-gray-300 w-24">
                    <div className="flex flex-row gap-4">
                      <span>კგ</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={bulkWorkedKg}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const cleaned = raw.replace(/[^\d.,]/g, "");
                          setBulkWorkedKg(cleaned);
                        }}
                        onBlur={() => {
                          updateWorkedKgForAll(bulkWorkedKg.trim());
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          e.preventDefault();
                          updateWorkedKgForAll(bulkWorkedKg.trim());
                          (e.currentTarget as HTMLInputElement).blur();
                        }}
                        className="w-20 px-1 py-1 border border-gray-200 rounded text-black text-[14px] md:text-[16px] text-right focus:outline-none focus:border-blue-500 bg-white"
                        placeholder="ყველას"
                      />
                    </div>
                  </th>
                )}
                <th className="px-4 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider border border-gray-300">
                  მოქმედებები
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((row) => {
                const salaryLocked =
                  (row.employeePosition === "LAUNDRY_WORKER" ||
                    row.employeePosition === "IRON") &&
                  kgPrice != null;
                return (
                  <tr key={`${row.employeeId}-${row.shift}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border border-gray-300 text-[16px] md:text-[18px] text-black w-48 max-w-48">
                      <div className="truncate" title={row.employeeName}>
                        <span className="flex items-center gap-2">
                          <span className="truncate">{row.employeeName}</span>
                          {row.employeePosition && (
                            <span className="shrink-0 text-[12px] md:text-[13px] px-2 py-0.5 rounded-full border border-gray-300 text-gray-700 bg-white">
                              {formatEmployeeRole(row.employeePosition)}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2 border border-gray-300 w-24">
                      <select
                        value={row.shift}
                        onChange={(e) =>
                          updateRow(
                            row.employeeId,
                            row.shift,
                            "shift",
                            e.target.value as Shift
                          )
                        }
                        className="w-20 px-1 py-1 border border-gray-200 rounded text-black text-[14px] md:text-[16px] text-center focus:outline-none focus:border-blue-500"
                      >
                        <option value="DAY">დღის</option>
                        <option value="NIGHT">ღამის</option>
                      </select>
                    </td>
                    <td className="px-2 py-2 border border-gray-300 w-24">
                      <input
                        type="text"
                        value={row.arrivalTime}
                        onChange={(e) => {
                          const value = e.target.value;
                          const formatted = value
                            .replace(/[^\d:]/g, "")
                            .replace(/^(\d{2})(\d)/, "$1:$2")
                            .substring(0, 5);
                          updateRow(row.employeeId, row.shift, "arrivalTime", formatted);
                        }}
                        onBlur={(e) => {
                          const value = e.target.value;
                          if (value && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
                            const parts = value.split(":");
                            if (parts.length === 2) {
                              const hours = parts[0].padStart(2, "0").substring(0, 2);
                              const minutes = parts[1].padStart(2, "0").substring(0, 2);
                              const hoursNum = parseInt(hours);
                              const minutesNum = parseInt(minutes);
                              if (
                                hoursNum >= 0 &&
                                hoursNum <= 23 &&
                                minutesNum >= 0 &&
                                minutesNum <= 59
                              ) {
                                updateRow(
                                  row.employeeId,
                                  row.shift,
                                  "arrivalTime",
                                  `${hours}:${minutes}`
                                );
                              }
                            }
                          }
                        }}
                        className="w-20 px-1 py-1 border border-gray-200 rounded text-black text-[14px] md:text-[16px] text-center focus:outline-none focus:border-blue-500"
                        placeholder="09:00"
                        maxLength={5}
                      />
                    </td>
                    <td className="px-4 py-2 border border-gray-300">
                      <input
                        type="text"
                        value={row.departureTime}
                        onChange={(e) => {
                          const value = e.target.value;
                          const formatted = value
                            .replace(/[^\d:]/g, "")
                            .replace(/^(\d{2})(\d)/, "$1:$2")
                            .substring(0, 5);
                          updateRow(row.employeeId, row.shift, "departureTime", formatted);
                        }}
                        onBlur={(e) => {
                          const value = e.target.value;
                          if (value && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
                            const parts = value.split(":");
                            if (parts.length === 2) {
                              const hours = parts[0].padStart(2, "0").substring(0, 2);
                              const minutes = parts[1].padStart(2, "0").substring(0, 2);
                              const hoursNum = parseInt(hours);
                              const minutesNum = parseInt(minutes);
                              if (
                                hoursNum >= 0 &&
                                hoursNum <= 23 &&
                                minutesNum >= 0 &&
                                minutesNum <= 59
                              ) {
                                updateRow(
                                  row.employeeId,
                                  row.shift,
                                  "departureTime",
                                  `${hours}:${minutes}`
                                );
                              }
                            }
                          }
                        }}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-black text-[16px] md:text-[18px] focus:outline-none focus:border-blue-500"
                        placeholder="18:00"
                        maxLength={5}
                      />
                    </td>
                    <td className="px-2 py-2 border border-gray-300 w-28">
                      <input
                        type="text"
                        inputMode="decimal"
                        step="0.01"
                        value={row.dailySalary}
                        onChange={(e) => {
                          if (salaryLocked) return;
                          updateRow(row.employeeId, row.shift, "dailySalary", e.target.value);
                        }}
                        readOnly={salaryLocked}
                        className="w-24 px-1 py-1 border border-gray-200 rounded text-black text-[14px] md:text-[16px] text-right focus:outline-none focus:border-blue-500 bg-white"
                        placeholder="0.00"
                      />
                    </td>
                    {opts.showKg && (
                      <td className="px-2 py-2 border border-gray-300 w-24">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.workedKg}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const cleaned = raw.replace(/[^\d.,]/g, "");
                            updateWorkedKg(row.employeeId, row.shift, cleaned);
                          }}
                          className="w-20 px-1 py-1 border border-gray-200 rounded text-black text-[14px] md:text-[16px] text-right focus:outline-none focus:border-blue-500 bg-white"
                          placeholder="კგ"
                        />
                      </td>
                    )}
                    <td className="px-4 py-2 w-28 border border-gray-300">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => saveRow(row.employeeId, row.shift)}
                          disabled={saving[row.employeeId]}
                          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-[16px] md:text-[18px]"
                        >
                          {saving[row.employeeId] ? "შენახვა..." : "შენახვა"}
                        </button>
                        <button
                          onClick={() =>
                            handleRemoveEmployeeFromTable(row.employeeId, row.shift)
                          }
                          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-[16px] md:text-[18px]"
                        >
                          წაშლა
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderEmployeeTable(managerRows, {
        title: "მენეჯერი და ასისტენტი",
        showKg: false,
      })}
      {renderEmployeeTable(laundryRows, {
        title: "მრეცხავები",
        showKg: true,
        accent: "orange",
      })}
      {renderEmployeeTable(courierRows, {
        title: "კურიერები",
        showKg: false,
        accent: "blue",
      })}
    </>
  );
}

