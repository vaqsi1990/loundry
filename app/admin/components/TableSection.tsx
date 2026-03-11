"use client";

import { useState, useEffect, Fragment } from "react";

interface Employee {
  id: string;
  name: string;
  phone: string;
  position: string;
}

interface TimeEntry {
  id: string;
  employeeId: string;
  date: string;
  arrivalTime: string | null;
  departureTime: string | null;
  dailySalary: number | null;
  workedKg: number | null;
  shift: "DAY" | "NIGHT";
  employee: Employee;
}

interface EmployeeRow {
  employeeId: string;
  employeeName: string;
  arrivalTime: string;
  departureTime: string;
  dailySalary: string;
  shift: "DAY" | "NIGHT";
  workedKg: string;
}

export default function TableSection() {
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [employeeRows, setEmployeeRows] = useState<EmployeeRow[]>([]);
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});
  const [showAddEmployeesPopup, setShowAddEmployeesPopup] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [popupShifts, setPopupShifts] = useState<Record<string, "DAY" | "NIGHT">>({});
  
  // Popup states
  const [showDayPopup, setShowDayPopup] = useState(false);
  const [showMonthPopup, setShowMonthPopup] = useState(false);
  const [popupSelectedDate, setPopupSelectedDate] = useState("");
  const [popupSelectedMonth, setPopupSelectedMonth] = useState("");
  const [popupTimeEntries, setPopupTimeEntries] = useState<TimeEntry[]>([]);
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupDayStep, setPopupDayStep] = useState<"date" | "employees" | "table">("date");
  const [popupMonthStep, setPopupMonthStep] = useState<"date" | "employees" | "table">("date");
  const [popupSelectedEmployeeId, setPopupSelectedEmployeeId] = useState<string | null>(null);
  
  // Calendar view states
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [calendarDate, setCalendarDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [calendarTimeEntries, setCalendarTimeEntries] = useState<Map<string, TimeEntry[]>>(new Map());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [kgPrice, setKgPrice] = useState<number | null>(null);

  // Load initial data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      // Load saved date from localStorage
      const savedDate = localStorage.getItem("tableSelectedDate");
      if (savedDate) {
        setSelectedDate(savedDate);
      }
      
      // Fetch all employees for the "Add Employees" popup
      await fetchAllEmployees();
      
      // Time entries will be loaded by the useEffect that watches selectedDate
    };
    
    loadInitialData();
  }, []);

  // Note: employeeRows are now date-specific, so we don't save them to Prisma table-configuration
  // They are loaded from time entries for each date, or can be manually added

  // Save selected date to localStorage
  useEffect(() => {
    if (selectedDate) {
      localStorage.setItem("tableSelectedDate", selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDate) {
      fetchTimeEntries();
    }
  }, [selectedDate]);

  // Load kg price for automatic salary calculation
  useEffect(() => {
    const fetchKgPrice = async () => {
      try {
        const res = await fetch("/api/admin/kgprice");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.value != null) {
          setKgPrice(data.value);
        }
      } catch {
        // Ignore kg price errors here, allow manual salary input
      }
    };
    fetchKgPrice();
  }, []);

  // Fetch calendar entries when view mode changes or calendar date changes
  useEffect(() => {
    if (viewMode === "calendar") {
      fetchCalendarEntries();
    }
  }, [viewMode, calendarDate]);

  const fetchAllEmployees = async (): Promise<Employee[]> => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/employees");
      if (!response.ok) {
        throw new Error("თანამშრომლების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setAllEmployees(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeEntries = async () => {
    if (!selectedDate) return;
    
    try {
      const response = await fetch(`/api/admin/employee-time-entries?date=${selectedDate}`);
      if (!response.ok) {
        throw new Error("დროის ჩანაწერების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setTimeEntries(data);

      // If there are time entries for this date, show only those employees
      // If no time entries, show empty table
      if (data.length > 0) {
        const rows: EmployeeRow[] = data.map((entry: TimeEntry) => ({
          employeeId: entry.employeeId,
          employeeName: entry.employee.name,
          arrivalTime: entry.arrivalTime || "",
          departureTime: entry.departureTime || "",
          dailySalary: entry.dailySalary?.toString() || "",
          shift: entry.shift || "DAY",
          workedKg: entry.workedKg != null ? entry.workedKg.toString() : "",
        }));
        setEmployeeRows(rows);
      } else {
        // No time entries for this date - show empty table
        // This will clear the table when switching to a date with no entries
        setEmployeeRows([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
      setEmployeeRows([]);
    }
  };

  const fetchCalendarEntries = async () => {
    try {
      setLoading(true);
      // Get first and last day of the month
      const year = calendarDate.getFullYear();
      const month = calendarDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      // Fetch entries for the entire month
      const startDate = firstDay.toISOString().split("T")[0];
      const endDate = lastDay.toISOString().split("T")[0];
      
      const response = await fetch(`/api/admin/employee-time-entries?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) {
        throw new Error("კალენდრის მონაცემების ჩატვირთვა ვერ მოხერხდა");
      }
      const data: TimeEntry[] = await response.json();
      
      // Group entries by date
      const entriesByDate = new Map<string, TimeEntry[]>();
      data.forEach((entry) => {
        const dateKey = entry.date.split("T")[0];
        if (!entriesByDate.has(dateKey)) {
          entriesByDate.set(dateKey, []);
        }
        entriesByDate.get(dateKey)!.push(entry);
      });
      
      setCalendarTimeEntries(entriesByDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (
    employeeId: string,
    shift: "DAY" | "NIGHT",
    field: keyof EmployeeRow,
    value: string
  ) => {
    setEmployeeRows((prev) =>
      prev.map((row) =>
        row.employeeId === employeeId && row.shift === shift
          ? { ...row, [field]: value }
          : row
      )
    );
  };

  const updateWorkedKg = (
    employeeId: string,
    shift: "DAY" | "NIGHT",
    value: string
  ) => {
    setEmployeeRows((prev) =>
      prev.map((row) => {
        if (row.employeeId !== employeeId || row.shift !== shift) return row;
        let dailySalary = row.dailySalary;
        const normalized = value.replace(",", ".").trim();
        const kg = parseFloat(normalized);
        if (!normalized) {
          dailySalary = "";
        } else if (!Number.isNaN(kg) && kgPrice != null && kgPrice > 0) {
          dailySalary = (kg * kgPrice).toFixed(2);
        }
        return {
          ...row,
          workedKg: value,
          dailySalary,
        };
      })
    );
  };

  const saveRow = async (employeeId: string, shift: "DAY" | "NIGHT") => {
    const row = employeeRows.find(
      (r) => r.employeeId === employeeId && r.shift === shift
    );
    if (!row) return;

    setSaving({ ...saving, [employeeId]: true });
    setError("");

    try {
      const response = await fetch("/api/admin/employee-time-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: row.employeeId,
          date: selectedDate,
          arrivalTime: row.arrivalTime || null,
          departureTime: row.departureTime || null,
          dailySalary: row.dailySalary || null,
          workedKg: row.workedKg || null,
          shift: row.shift,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "შენახვა ვერ მოხერხდა");
      }

      // Refresh time entries
      await fetchTimeEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setSaving({ ...saving, [employeeId]: false });
    }
  };

  const saveAll = async () => {
    setError("");
    const savePromises = employeeRows.map((row) =>
      fetch("/api/admin/employee-time-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: row.employeeId,
          date: selectedDate,
          arrivalTime: row.arrivalTime || null,
          departureTime: row.departureTime || null,
          dailySalary: row.dailySalary || null,
          workedKg: row.workedKg || null,
          shift: row.shift,
        }),
      })
    );

    try {
      const responses = await Promise.all(savePromises);
      const errors = responses.filter((r) => !r.ok);
      if (errors.length > 0) {
        throw new Error("ზოგიერთი ჩანაწერის შენახვა ვერ მოხერხდა");
      }
      await fetchTimeEntries();
      alert("ყველა ჩანაწერი წარმატებით შეინახა");
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const fetchPopupDayData = async () => {
    if (!popupSelectedDate) return;
    setPopupLoading(true);
    try {
      const response = await fetch(`/api/admin/employee-time-entries?date=${popupSelectedDate}`);
      if (!response.ok) {
        throw new Error("მონაცემების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setPopupTimeEntries(data);
      setPopupDayStep("employees");
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setPopupLoading(false);
    }
  };

  const fetchPopupMonthData = async () => {
    if (!popupSelectedMonth) return;
    setPopupLoading(true);
    try {
      const response = await fetch(`/api/admin/employee-time-entries?month=${popupSelectedMonth}`);
      if (!response.ok) {
        throw new Error("მონაცემების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setPopupTimeEntries(data);
      setPopupMonthStep("employees");
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setPopupLoading(false);
    }
  };

  const handleEmployeeSelect = (employeeId: string, isMonth: boolean = false) => {
    setPopupSelectedEmployeeId(employeeId);
    if (isMonth) {
      setPopupMonthStep("table");
    } else {
      setPopupDayStep("table");
    }
  };

  const handleAddEmployees = async () => {
    // Always fetch fresh employees to include newly added ones
    await fetchAllEmployees();
    setSelectedEmployeeIds(new Set());
    setPopupShifts({});
    setShowAddEmployeesPopup(true);
  };

  const handleToggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployeeIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  };

  const handleAddSelectedEmployees = () => {
    const employeesToAdd = allEmployees.filter((emp) => {
      if (!selectedEmployeeIds.has(emp.id)) return false;
      const selectedShift = popupShifts[emp.id] || "DAY";
      // Allow adding same employee again with different shift.
      // Block only exact duplicate: same employee + same shift already in table.
      return !employeeRows.some(
        (row) => row.employeeId === emp.id && row.shift === selectedShift
      );
    });

    const newRows: EmployeeRow[] = employeesToAdd.map((emp) => ({
      employeeId: emp.id,
      employeeName: emp.name,
      arrivalTime: "",
      departureTime: "",
      dailySalary: "",
      shift: popupShifts[emp.id] || "DAY",
      workedKg: "",
    }));

    const updatedRows = [...employeeRows, ...newRows];
    setEmployeeRows(updatedRows);
    
    setSelectedEmployeeIds(new Set());
    setShowAddEmployeesPopup(false);
    
    // Don't call fetchTimeEntries here - we want to keep manually added employees
    // Time entries will be loaded when date changes
  };

  const handleRemoveEmployeeFromTable = async (
    employeeId: string,
    shift: "DAY" | "NIGHT"
  ) => {
    if (!selectedDate) {
      setError("თარიღი აუცილებელია");
      return;
    }

    // Find employee row and name for confirmation message
    const employee = employeeRows.find(
      (row) => row.employeeId === employeeId && row.shift === shift
    );
    const employeeName = employee?.employeeName || "თანამშრომელი";

    // Show confirmation dialog
    const confirmed = window.confirm(
      `დარწმუნებული ხართ, რომ გსურთ წაშლა ${employeeName}?`
    );

    if (!confirmed) {
      return; // User cancelled
    }

    try {
      // Delete from Prisma (specific shift for this row)
      const response = await fetch(
        `/api/admin/employee-time-entries?employeeId=${employeeId}&date=${selectedDate}&shift=${shift}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "წაშლა ვერ მოხერხდა");
      }

      // Remove from UI
      const newRows = employeeRows.filter(
        (row) => !(row.employeeId === employeeId && row.shift === shift)
      );
      setEmployeeRows(newRows);
      
      // Refresh time entries to update the table
      await fetchTimeEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ka-GE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString("ka-GE", {
      year: "numeric",
      month: "long",
    });
  };

  if (loading) {
    return <div className="text-center py-8 text-black">იტვირთება...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">თანამშრომლების ტაბელი</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleAddEmployees}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
          >
            + თანამშრომლების დამატება
          </button>
        
          <button
            onClick={() => {
              setShowMonthPopup(true);
              setPopupMonthStep("date");
              setPopupSelectedMonth("");
              setPopupSelectedEmployeeId(null);
              setPopupTimeEntries([]);
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            თვეების მიხედვით
          </button>
          {employeeRows.length > 0 && (
            <button
              onClick={saveAll}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              ყველას შენახვა
            </button>
          )}
        </div>
      </div>

      {/* Date Picker */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <label className="block text-[16px] md:text-[18px] font-medium text-black mb-2">
          თარიღი
        </label>
          <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-black"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        {employeeRows.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            ტაბელი ცარიელია. დაამატეთ თანამშრომლები
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider border border-gray-300">
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
                <th className="px-2 py-3 text-left text-[14px] md:text-[16px] font-medium text-black uppercase tracking-wider border border-gray-300 w-24">
                  კგ
                </th>
                <th className="px-2 py-3 text-left text-[14px] md:text-[16px] font-medium text-black uppercase tracking-wider border border-gray-300 w-28">
                  დღეში დარიცხული ხელფასი
                </th>
                <th className="px-4 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider border border-gray-300">
                  მოქმედებები
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employeeRows.map((row) => (
                <tr key={`${row.employeeId}-${row.shift}`} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border border-gray-300 text-[16px] md:text-[18px] text-black">
                    {row.employeeName}
                  </td>
                  <td className="px-2 py-2 border border-gray-300 w-24">
                    <select
                      value={row.shift}
                      onChange={(e) =>
                        updateRow(
                          row.employeeId,
                          row.shift,
                          "shift",
                          e.target.value as "DAY" | "NIGHT"
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
                        // Allow only numbers and colon, format as HH:mm
                        const formatted = value
                          .replace(/[^\d:]/g, "")
                          .replace(/^(\d{2})(\d)/, "$1:$2")
                          .substring(0, 5);
                        updateRow(row.employeeId, row.shift, "arrivalTime", formatted);
                      }}
                      onBlur={(e) => {
                        // Validate and format on blur
                        const value = e.target.value;
                        if (value && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
                          // If invalid format, try to fix it
                          const parts = value.split(':');
                          if (parts.length === 2) {
                            const hours = parts[0].padStart(2, '0').substring(0, 2);
                            const minutes = parts[1].padStart(2, '0').substring(0, 2);
                            const hoursNum = parseInt(hours);
                            const minutesNum = parseInt(minutes);
                            if (hoursNum >= 0 && hoursNum <= 23 && minutesNum >= 0 && minutesNum <= 59) {
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
                            if (hoursNum >= 0 && hoursNum <= 23 && minutesNum >= 0 && minutesNum <= 59) {
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
                  <td className="px-2 py-2 border border-gray-300 w-24">
                    <input
                      type="number"
                      step="0.01"
                      value={row.workedKg}
                      onChange={(e) => updateWorkedKg(row.employeeId, row.shift, e.target.value)}
                      className="w-20 px-1 py-1 border border-gray-200 rounded text-black text-[14px] md:text-[16px] text-right focus:outline-none focus:border-blue-500"
                      placeholder="კგ"
                    />
                  </td>
                  <td className="px-2 py-2 border border-gray-300 w-28">
                    <input
                      type="number"
                      step="0.01"
                      value={row.dailySalary}
                      onChange={(e) =>
                        kgPrice == null
                          ? updateRow(row.employeeId, row.shift, "dailySalary", e.target.value)
                          : null
                      }
                      readOnly={kgPrice != null}
                      className="w-24 px-1 py-1 border border-gray-200 rounded text-black text-[14px] md:text-[16px] text-right focus:outline-none focus:border-blue-500 bg-white"
                      placeholder="0.00"
                    />
                  </td>
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
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Employees Popup */}
      {showAddEmployeesPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-black">თანამშრომლების დამატება</h2>
              <button
                onClick={() => {
                  setShowAddEmployeesPopup(false);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-black">იტვირთება...</div>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-[16px] md:text-[18px] text-black mb-4">
                    აირჩიეთ თანამშრომლები checkbox-ებით ტაბელში დასამატებლად:
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {allEmployees.map((emp) => {
                      const hasDay = employeeRows.some(
                        (row) => row.employeeId === emp.id && row.shift === "DAY"
                      );
                      const hasNight = employeeRows.some(
                        (row) => row.employeeId === emp.id && row.shift === "NIGHT"
                      );
                      const selectedShift = popupShifts[emp.id] || "DAY";
                      const isShiftInTable = employeeRows.some(
                        (row) => row.employeeId === emp.id && row.shift === selectedShift
                      );
                      const isSelected = selectedEmployeeIds.has(emp.id);
                      return (
                        <div
                          key={emp.id}
                          className={`flex items-center p-3 border rounded-md ${
                            hasDay && hasNight ? "bg-gray-100 opacity-60" : "bg-white hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            id={`emp-${emp.id}`}
                            checked={isSelected}
                            onChange={() => handleToggleEmployeeSelection(emp.id)}
                            disabled={isShiftInTable && (hasDay && hasNight)}
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                          />
                          <div className="ml-3 flex-1 flex items-center justify-between gap-4">
                            <label
                              htmlFor={`emp-${emp.id}`}
                              className={`text-[16px] md:text-[18px] text-black cursor-pointer ${
                                hasDay && hasNight ? "text-gray-500" : ""
                              }`}
                            >
                              {emp.name}
                              {hasDay && hasNight && (
                                <span className="ml-2 text-sm text-gray-400">(უკვე დამატებულია)</span>
                              )}
                            </label>
                            <div className="flex items-center gap-2">
                              <span className="text-[14px] text-gray-600">ცვლა:</span>
                              <select
                                value={popupShifts[emp.id] || "DAY"}
                                onChange={(e) =>
                                  setPopupShifts((prev) => ({
                                    ...prev,
                                    [emp.id]: e.target.value as "DAY" | "NIGHT",
                                  }))
                                }
                                disabled={hasDay && hasNight}
                                className="px-2 py-1 border border-gray-300 rounded text-[14px] text-black bg-white"
                              >
                                <option value="DAY">დღის</option>
                                <option value="NIGHT">ღამის</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {allEmployees.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      თანამშრომლები არ მოიძებნა
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-[16px] md:text-[18px] text-black">
                    არჩეული: {selectedEmployeeIds.size} თანამშრომელი
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setShowAddEmployeesPopup(false);
                        setSelectedEmployeeIds(new Set());
                      }}
                      className="bg-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-400"
                    >
                      დახურვა
                    </button>
                    <button
                      onClick={handleAddSelectedEmployees}
                      disabled={selectedEmployeeIds.size === 0}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      დამატება ({selectedEmployeeIds.size})
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Day Popup */}
      {showDayPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-black">დღეების მიხედვით</h2>
              <button
                onClick={() => {
                  setShowDayPopup(false);
                  setPopupSelectedDate("");
                  setPopupTimeEntries([]);
                  setPopupDayStep("date");
                  setPopupSelectedEmployeeId(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {popupDayStep === "date" && (
              <div className="mb-4">
                <label className="block text-[16px] md:text-[18px] font-medium text-black mb-2">
                  აირჩიეთ დღე
                </label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    value={popupSelectedDate}
                    onChange={(e) => setPopupSelectedDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-black"
                  />
                  <button
                    onClick={fetchPopupDayData}
                    disabled={!popupSelectedDate || popupLoading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {popupLoading ? "იტვირთება..." : "გაგრძელება"}
                  </button>
                </div>
              </div>
            )}

            {popupDayStep === "employees" && popupTimeEntries.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-black mb-4">
                  {formatDate(popupSelectedDate)} - თანამშრომლების არჩევა:
                </h3>
                <div className="flex flex-wrap gap-3">
                  {(() => {
                    // Get unique employees from time entries
                    const uniqueEmployees = new Map<string, Employee>();
                    popupTimeEntries.forEach((entry) => {
                      if (!uniqueEmployees.has(entry.employeeId)) {
                        uniqueEmployees.set(entry.employeeId, entry.employee);
                      }
                    });
                    return Array.from(uniqueEmployees.values()).map((emp) => (
                      <button
                        key={emp.id}
                        onClick={() => handleEmployeeSelect(emp.id, false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-black bg-white hover:bg-gray-50 text-[16px] md:text-[18px]"
                      >
                        {emp.name}
                      </button>
                    ));
                  })()}
                </div>
                <button
                  onClick={() => setPopupDayStep("date")}
                  className="mt-4 text-blue-600 hover:underline"
                >
                  ← უკან
                </button>
              </div>
            )}

            {popupDayStep === "table" && popupSelectedEmployeeId && (
              <div>
                <button
                  onClick={() => setPopupDayStep("employees")}
                  className="mb-4 text-blue-600 hover:underline"
                >
                  ← უკან
                </button>
                <div className="overflow-x-auto">
                  <h3 className="text-lg font-semibold text-black mb-2">
                    {(() => {
                      const selectedEmp = allEmployees.find((e: Employee) => e.id === popupSelectedEmployeeId);
                      return `${selectedEmp?.name || ""} - ${formatDate(popupSelectedDate)}`;
                    })()}
                  </h3>
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider border border-gray-300">
                          თანამშრომელი
                        </th>
                        <th className="px-4 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider border border-gray-300">
                          მოსვლის საათი
                        </th>
                        <th className="px-4 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider border border-gray-300">
                          გამოსვლის საათი
                        </th>
                        <th className="px-4 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider border border-gray-300">
                          დღეში დარიცხული ხელფასი
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {popupTimeEntries
                        .filter((entry) => entry.employeeId === popupSelectedEmployeeId)
                        .map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 border border-gray-300 text-[16px] md:text-[18px] text-black">
                              {entry.employee.name}
                            </td>
                            <td className="px-4 py-2 border border-gray-300 text-[16px] md:text-[18px] text-black">
                              {entry.arrivalTime || "-"}
                            </td>
                            <td className="px-4 py-2 border border-gray-300 text-[16px] md:text-[18px] text-black">
                              {entry.departureTime || "-"}
                            </td>
                            <td className="px-4 py-2 border border-gray-300 text-[16px] md:text-[18px] text-black">
                              {entry.dailySalary ? entry.dailySalary.toFixed(2) : "-"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {popupTimeEntries.length === 0 && popupSelectedDate && !popupLoading && popupDayStep === "employees" && (
          <div className="text-center py-8 text-gray-500">
                ამ დღეს ჩანაწერები არ მოიძებნა
              </div>
            )}
          </div>
        </div>
      )}

      {/* Month Popup */}
      {showMonthPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-black">თვეების მიხედვით</h2>
              <button
                onClick={() => {
                  setShowMonthPopup(false);
                  setPopupSelectedMonth("");
                  setPopupTimeEntries([]);
                  setPopupMonthStep("date");
                  setPopupSelectedEmployeeId(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {popupMonthStep === "date" && (
              <div className="mb-4">
                <label className="block text-[16px] md:text-[18px] font-medium text-black mb-2">
                  აირჩიეთ თვე
                </label>
                <div className="flex space-x-2">
                  <input
                    type="month"
                    value={popupSelectedMonth}
                    onChange={(e) => setPopupSelectedMonth(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-black"
                  />
                  <button
                    onClick={fetchPopupMonthData}
                    disabled={!popupSelectedMonth || popupLoading}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {popupLoading ? "იტვირთება..." : "გაგრძელება"}
                  </button>
                </div>
              </div>
            )}

            {popupMonthStep === "employees" && popupTimeEntries.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-black mb-4">
                  {formatMonth(popupSelectedMonth)} - თანამშრომლების არჩევა:
                </h3>
                <div className="flex flex-wrap gap-3">
                  {(() => {
                    // Get unique employees from time entries
                    const uniqueEmployees = new Map<string, Employee>();
                    popupTimeEntries.forEach((entry) => {
                      if (!uniqueEmployees.has(entry.employeeId)) {
                        uniqueEmployees.set(entry.employeeId, entry.employee);
                      }
                    });
                    return Array.from(uniqueEmployees.values()).map((emp) => (
                      <button
                        key={emp.id}
                        onClick={() => handleEmployeeSelect(emp.id, true)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-black bg-white hover:bg-gray-50 text-[16px] md:text-[18px]"
                      >
                        {emp.name}
                      </button>
                    ));
                  })()}
                </div>
                <button
                  onClick={() => setPopupMonthStep("date")}
                  className="mt-4 text-blue-600 hover:underline"
                >
                  ← უკან
                </button>
              </div>
            )}

            {popupMonthStep === "table" && popupSelectedEmployeeId && (
              <div>
                <button
                  onClick={() => setPopupMonthStep("employees")}
                  className="mb-4 text-blue-600 hover:underline"
                >
                  ← უკან
                </button>
                <div className="overflow-x-auto">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 gap-2">
                    <h3 className="text-lg font-semibold text-black">
                      {(() => {
                        const selectedEmp = allEmployees.find(
                          (e: Employee) => e.id === popupSelectedEmployeeId
                        );
                        const employeeEntries = popupTimeEntries
                          .filter((entry) => entry.employeeId === popupSelectedEmployeeId)
                          .sort(
                            (a, b) =>
                              new Date(a.date).getTime() - new Date(b.date).getTime()
                          );
                        const monthLabel =
                          employeeEntries.length > 0
                            ? formatMonth(employeeEntries[0].date.slice(0, 7))
                            : formatMonth(popupSelectedMonth);
                        return `${selectedEmp?.name || ""} - ${monthLabel}`;
                      })()}
                    </h3>
                    <p className="text-sm text-gray-600">
                      იხილეთ ჩანაწერები დღის და ღამის ცვლების მიხედვით.
                    </p>
                  </div>
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider border border-gray-300">
                          თარიღი
                        </th>
                        <th className="px-4 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider border border-gray-300">
                          ცვლა
                        </th>
                        <th className="px-4 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider border border-gray-300">
                          მოსვლის საათი
                        </th>
                        <th className="px-4 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider border border-gray-300">
                          გამოსვლის საათი
                        </th>
                        <th className="px-4 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider border border-gray-300">
                          დღეში დარიცხული ხელფასი
                        </th>
                        <th className="px-4 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider border border-gray-300">
                          თვის ჯამი
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        const employeeEntries = popupTimeEntries
                          .filter((entry) => entry.employeeId === popupSelectedEmployeeId)
                          .sort(
                            (a, b) =>
                              new Date(a.date).getTime() - new Date(b.date).getTime()
                          );
                        const totalSalary = employeeEntries.reduce(
                          (sum, e) => sum + (e.dailySalary || 0),
                          0
                        );
                        
                        return (
                          <>
                            {employeeEntries.map((entry) => (
                              <tr key={entry.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 border border-gray-300 text-[16px] md:text-[18px] text-black">
                                  {formatDate(entry.date)}
                                </td>
                                <td className="px-4 py-2 border border-gray-300 text-[16px] md:text-[18px] text-black">
                                  {entry.shift === "NIGHT" ? "ღამის" : "დღის"}
                                </td>
                                <td className="px-4 py-2 border border-gray-300 text-[16px] md:text-[18px] text-black">
                                  {entry.arrivalTime || "-"}
                                </td>
                                <td className="px-4 py-2 border border-gray-300 text-[16px] md:text-[18px] text-black">
                                  {entry.departureTime || "-"}
                                </td>
                                <td className="px-4 py-2 border border-gray-300 text-[16px] md:text-[18px] text-black">
                                  {entry.dailySalary ? entry.dailySalary.toFixed(2) : "-"}
                                </td>
                                {entry === employeeEntries[0] && (
                                  <td
                                    rowSpan={employeeEntries.length}
                                    className="px-4 py-2 border border-gray-300 text-[16px] md:text-[18px] text-black font-semibold align-top"
                                  >
                                    {totalSalary.toFixed(2)}
                                  </td>
                                )}
                              </tr>
                            ))}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {popupTimeEntries.length === 0 && popupSelectedMonth && !popupLoading && popupMonthStep === "employees" && (
              <div className="text-center py-8 text-gray-500">
                ამ თვეში ჩანაწერები არ მოიძებნა
          </div>
        )}
      </div>
        </div>
      )}
    </div>
  );
}
