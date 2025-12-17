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
  employee: Employee;
}

interface EmployeeRow {
  employeeId: string;
  employeeName: string;
  arrivalTime: string;
  departureTime: string;
  dailySalary: string;
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

  useEffect(() => {
    if (selectedDate && employeeRows.length > 0) {
      fetchTimeEntries();
    }
  }, [selectedDate, employeeRows.length]);

  const fetchAllEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/employees");
      if (!response.ok) {
        throw new Error("თანამშრომლების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setAllEmployees(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeEntries = async () => {
    try {
      const response = await fetch(`/api/admin/employee-time-entries?date=${selectedDate}`);
      if (!response.ok) {
        throw new Error("დროის ჩანაწერების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setTimeEntries(data);

      // Update existing employee rows with time entry data
      setEmployeeRows((prevRows) =>
        prevRows.map((row) => {
          const entry = data.find((e: TimeEntry) => e.employeeId === row.employeeId);
          return {
            ...row,
            arrivalTime: entry?.arrivalTime || row.arrivalTime || "",
            departureTime: entry?.departureTime || row.departureTime || "",
            dailySalary: entry?.dailySalary?.toString() || row.dailySalary || "",
          };
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const updateRow = (employeeId: string, field: keyof EmployeeRow, value: string) => {
    setEmployeeRows(
      employeeRows.map((row) =>
        row.employeeId === employeeId ? { ...row, [field]: value } : row
      )
    );
  };

  const saveRow = async (employeeId: string) => {
    const row = employeeRows.find((r) => r.employeeId === employeeId);
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
    if (allEmployees.length === 0) {
      await fetchAllEmployees();
    }
    setSelectedEmployeeIds(new Set());
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
    const employeesToAdd = allEmployees.filter(
      (emp) => selectedEmployeeIds.has(emp.id) && !employeeRows.some((row) => row.employeeId === emp.id)
    );

    const newRows: EmployeeRow[] = employeesToAdd.map((emp) => ({
      employeeId: emp.id,
      employeeName: emp.name,
      arrivalTime: "",
      departureTime: "",
      dailySalary: "",
    }));

    setEmployeeRows([...employeeRows, ...newRows]);
    setSelectedEmployeeIds(new Set());
    setShowAddEmployeesPopup(false);
    
    // If date is selected, try to load existing time entries
    if (selectedDate) {
      fetchTimeEntries();
    }
  };

  const handleRemoveEmployeeFromTable = (employeeId: string) => {
    setEmployeeRows(employeeRows.filter((row) => row.employeeId !== employeeId));
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
              setShowDayPopup(true);
              setPopupDayStep("date");
              setPopupSelectedDate("");
              setPopupSelectedEmployeeId(null);
              setPopupTimeEntries([]);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            დღეების მიხედვით
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
                  მოსვლის საათი
                </th>
                <th className="px-4 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider border border-gray-300">
                  გამოსვლის საათი
                </th>
                <th className="px-4 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider border border-gray-300">
                  დღეში დარიცხული ხელფასი
                </th>
                <th className="px-4 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider border border-gray-300">
                  მოქმედებები
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employeeRows.map((row) => (
                <tr key={row.employeeId} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border border-gray-300 text-[16px] md:text-[18px] text-black">
                    {row.employeeName}
                  </td>
                  <td className="px-4 py-2 border border-gray-300">
                    <input
                      type="text"
                      value={row.arrivalTime}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers and colon, format as HH:mm
                        const formatted = value
                          .replace(/[^\d:]/g, '')
                          .replace(/^(\d{2})(\d)/, '$1:$2')
                          .substring(0, 5);
                        updateRow(row.employeeId, "arrivalTime", formatted);
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
                              updateRow(row.employeeId, "arrivalTime", `${hours}:${minutes}`);
                            }
                          }
                        }
                      }}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-black text-[16px] md:text-[18px] focus:outline-none focus:border-blue-500"
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
                        // Allow only numbers and colon, format as HH:mm
                        const formatted = value
                          .replace(/[^\d:]/g, '')
                          .replace(/^(\d{2})(\d)/, '$1:$2')
                          .substring(0, 5);
                        updateRow(row.employeeId, "departureTime", formatted);
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
                              updateRow(row.employeeId, "departureTime", `${hours}:${minutes}`);
                            }
                          }
                        }
                      }}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-black text-[16px] md:text-[18px] focus:outline-none focus:border-blue-500"
                      placeholder="18:00"
                      maxLength={5}
                    />
                  </td>
                  <td className="px-4 py-2 border border-gray-300">
                    <input
                      type="number"
                      step="0.01"
                      value={row.dailySalary}
                      onChange={(e) => updateRow(row.employeeId, "dailySalary", e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-black text-[16px] md:text-[18px] focus:outline-none focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-4 py-2 border border-gray-300">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => saveRow(row.employeeId)}
                        disabled={saving[row.employeeId]}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-[16px] md:text-[18px]"
                      >
                        {saving[row.employeeId] ? "შენახვა..." : "შენახვა"}
                      </button>
                      <button
                        onClick={() => handleRemoveEmployeeFromTable(row.employeeId)}
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
                      const isInTable = employeeRows.some((row) => row.employeeId === emp.id);
                      const isSelected = selectedEmployeeIds.has(emp.id);
                      return (
                        <div
                          key={emp.id}
                          className={`flex items-center p-3 border rounded-md ${
                            isInTable ? "bg-gray-100 opacity-60" : "bg-white hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            id={`emp-${emp.id}`}
                            checked={isSelected}
                            onChange={() => handleToggleEmployeeSelection(emp.id)}
                            disabled={isInTable}
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                          />
                          <label
                            htmlFor={`emp-${emp.id}`}
                            className={`ml-3 text-[16px] md:text-[18px] text-black cursor-pointer flex-1 ${
                              isInTable ? "text-gray-500" : ""
                            }`}
                          >
                            {emp.name}
                            {isInTable && <span className="ml-2 text-sm text-gray-400">(უკვე დამატებულია)</span>}
                          </label>
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
                  <h3 className="text-lg font-semibold text-black mb-2">
                    {(() => {
                      const selectedEmp = allEmployees.find((e: Employee) => e.id === popupSelectedEmployeeId);
                      return `${selectedEmp?.name || ""} - ${formatMonth(popupSelectedMonth)}`;
                    })()}
                  </h3>
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider border border-gray-300">
                          თარიღი
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
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                        const totalSalary = employeeEntries.reduce((sum, e) => sum + (e.dailySalary || 0), 0);
                        
                        return (
                          <>
                            {employeeEntries.map((entry) => (
                              <tr key={entry.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 border border-gray-300 text-[16px] md:text-[18px] text-black">
                                  {formatDate(entry.date)}
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
