"use client";

import { useEffect, useState, useRef } from "react";

interface Salary {
  id: string;
  employeeId: string | null;
  employeeName: string;
  firstName: string | null;
  lastName: string | null;
  personalId: string | null;
  accruedAmount: number | null;
  issuedAmount: number | null;
  remainingAmount: number | null;
  amount: number;
  month: number;
  year: number;
  status: string;
  notes: string | null;
  createdAt: string;
}

interface Employee {
  id: string;
  name: string;
  personalId: string | null;
  phone: string;
  position: string;
}

export default function SalariesSection() {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [isAutoCreating, setIsAutoCreating] = useState(false);
  const [editingIssuedAmount, setEditingIssuedAmount] = useState<{ [key: string]: string | undefined }>({});
  const lastAutoCreateRef = useRef<string>("");
  const [accruedAmountsFromTable, setAccruedAmountsFromTable] = useState<{ [key: string]: number }>({});
  
  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    firstName: "",
    lastName: "",
    personalId: "",
    accruedAmount: "",
    issuedAmount: "",
    amount: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: "PENDING",
    notes: "",
  });

  useEffect(() => {
    fetchSalaries();
  }, [filterMonth, filterYear]);

  // Fetch accrued amounts from table for all employees
  useEffect(() => {
    if (filterMonth && filterYear && employees.length > 0) {
      fetchAccruedAmountsFromTable();
    }
  }, [filterMonth, filterYear, employees.length]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Clear editing state when salaries are updated
  useEffect(() => {
    setEditingIssuedAmount({});
  }, [salaries.length]);

  // Auto-create salaries for all employees with time entries when month/year changes
  useEffect(() => {
    const key = `${filterMonth}-${filterYear}`;
    if (filterMonth && filterYear && employees.length > 0 && !isAutoCreating && !loading && lastAutoCreateRef.current !== key) {
      // Small delay to ensure data is loaded
      const timer = setTimeout(() => {
        lastAutoCreateRef.current = key;
        autoCreateSalaries();
      }, 1500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMonth, filterYear]);

  // Auto-calculate accrued amount when employee, month, or year changes
  useEffect(() => {
    if (formData.employeeId && formData.month && formData.year) {
      calculateAccruedAmount(formData.employeeId, formData.month, formData.year).then((accrued) => {
        if (accrued !== null && accrued > 0) {
          setFormData((prev) => ({
            ...prev,
            accruedAmount: accrued.toString(),
          }));
        }
      });
    }
  }, [formData.employeeId, formData.month, formData.year]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/admin/employees");
      if (!response.ok) {
        throw new Error("თანამშრომლების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setEmployees(data);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const autoCreateSalaries = async () => {
    if (!filterMonth || !filterYear || employees.length === 0 || isAutoCreating) return;
    
    setIsAutoCreating(true);
    try {
      const monthStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}`;
      const response = await fetch(`/api/admin/employee-time-entries?month=${monthStr}`);
      if (!response.ok) {
        setIsAutoCreating(false);
        return;
      }
      const timeEntries = await response.json();
      
      if (timeEntries.length === 0) {
        setIsAutoCreating(false);
        return;
      }
      
      // Get unique employee IDs from time entries with their data
      const employeeDataMap = new Map<string, { employee: any; accruedAmount: number }>();
      
      for (const entry of timeEntries) {
        const employeeId = entry.employeeId;
        if (!employeeDataMap.has(employeeId)) {
          employeeDataMap.set(employeeId, {
            employee: entry.employee,
            accruedAmount: 0
          });
        }
        const data = employeeDataMap.get(employeeId)!;
        data.accruedAmount += entry.dailySalary || 0;
      }
      
      // Get existing salary employee IDs for this month/year (check both employeeId and name match)
      const existingSalaries = salaries.filter(
        s => s.month === filterMonth && s.year === filterYear
      );
      const existingSalaryEmployeeIds = new Set(
        existingSalaries.map(s => s.employeeId).filter(Boolean)
      );
      const existingSalaryNames = new Set(
        existingSalaries.map(s => s.employeeName?.toLowerCase().trim()).filter(Boolean)
      );
      
      // Create salaries for employees that have time entries but no salary yet
      const salariesToCreate: any[] = [];
      for (const [employeeId, data] of employeeDataMap.entries()) {
        const employee = employees.find(emp => emp.id === employeeId);
        if (!employee) continue;
        
        // Check if salary already exists for this employee (by ID or by name for this month/year)
        const employeeNameLower = employee.name.toLowerCase().trim();
        const alreadyExists = existingSalaryEmployeeIds.has(employeeId) || 
                            existingSalaryNames.has(employeeNameLower);
        
        if (!alreadyExists && data.accruedAmount > 0) {
          
          // Split name into first and last name
          const nameParts = employee.name.trim().split(/\s+/);
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";
          
          // Create salary
          const issuedAmount = 0;
          const remainingAmount = data.accruedAmount - issuedAmount;
          
          const salaryData = {
            employeeId: employee.id,
            employeeName: employee.name,
            firstName: firstName,
            lastName: lastName,
            personalId: employee.personalId || null,
            accruedAmount: data.accruedAmount,
            issuedAmount: null,
            remainingAmount: remainingAmount,
            amount: data.accruedAmount,
            month: filterMonth,
            year: filterYear,
            status: "PENDING",
            notes: null,
          };
          
          salariesToCreate.push(salaryData);
        }
      }
      
      // Create all salaries at once
      for (const salaryData of salariesToCreate) {
        try {
          const createResponse = await fetch("/api/admin/salaries", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(salaryData),
          });
          
          if (!createResponse.ok) {
            const errorData = await createResponse.json();
            console.error(`Error creating salary for employee ${salaryData.employeeId}:`, errorData);
          }
        } catch (err) {
          console.error(`Error creating salary for employee ${salaryData.employeeId}:`, err);
        }
      }
      
      // Refresh salaries list
      await fetchSalaries();
    } catch (err) {
      console.error("Error auto-creating salaries:", err);
    } finally {
      setIsAutoCreating(false);
    }
  };

  const fetchAccruedAmountsFromTable = async () => {
    try {
      const monthStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}`;
      const response = await fetch(`/api/admin/employee-time-entries?month=${monthStr}`);
      if (!response.ok) {
        return;
      }
      const timeEntries = await response.json();
      
      // Group by employee and sum dailySalary
      const amounts: { [key: string]: number } = {};
      for (const entry of timeEntries) {
        const employeeId = entry.employeeId;
        if (!amounts[employeeId]) {
          amounts[employeeId] = 0;
        }
        amounts[employeeId] += entry.dailySalary || 0;
      }
      
      setAccruedAmountsFromTable(amounts);
    } catch (err) {
      console.error("Error fetching accrued amounts from table:", err);
    }
  };

  const calculateAccruedAmount = async (employeeId: string, month: number, year: number) => {
    try {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const response = await fetch(`/api/admin/employee-time-entries?month=${monthStr}&employeeId=${employeeId}`);
      if (!response.ok) {
        return null;
      }
      const timeEntries = await response.json();
      
      // Sum dailySalary for all entries (already filtered by employeeId in API)
      const totalAccrued = timeEntries.reduce((sum: number, entry: any) => {
        return sum + (entry.dailySalary || 0);
      }, 0);
      
      return totalAccrued > 0 ? totalAccrued : null;
    } catch (err) {
      console.error("Error calculating accrued amount:", err);
      return null;
    }
  };

  const handleEmployeeSelect = async (employeeId: string) => {
    const employee = employees.find((emp) => emp.id === employeeId);
    if (employee) {
      // Split name into first and last name (simple approach - take first word as first name, rest as last name)
      const nameParts = employee.name.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      
      // Calculate accrued amount from table entries
      const accruedAmount = await calculateAccruedAmount(employeeId, formData.month, formData.year);
      
      setFormData({
        ...formData,
        employeeId: employee.id,
        employeeName: employee.name,
        firstName: firstName,
        lastName: lastName,
        personalId: employee.personalId || "",
        accruedAmount: accruedAmount ? accruedAmount.toString() : formData.accruedAmount,
      });
    }
  };

  const fetchSalaries = async () => {
    try {
      const response = await fetch(`/api/admin/salaries?month=${filterMonth}&year=${filterYear}`);
      if (!response.ok) {
        throw new Error("ხელფასების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setSalaries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const url = editingId ? `/api/admin/salaries/${editingId}` : "/api/admin/salaries";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          employeeId: formData.employeeId || null,
          amount: formData.amount ? parseFloat(formData.amount) : (formData.accruedAmount ? parseFloat(formData.accruedAmount) : 0),
          accruedAmount: formData.accruedAmount ? parseFloat(formData.accruedAmount) : null,
          issuedAmount: formData.issuedAmount ? parseFloat(formData.issuedAmount) : null,
          remainingAmount: (() => {
            const accrued = formData.accruedAmount ? parseFloat(formData.accruedAmount) : 0;
            const issued = formData.issuedAmount ? parseFloat(formData.issuedAmount) : 0;
            return accrued - issued;
          })(),
          personalId: formData.personalId || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "ოპერაცია ვერ მოხერხდა");
      }

      await fetchSalaries();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const handleUpdateIssuedAmount = async (salaryId: string, issuedAmount: number) => {
    try {
      const salary = salaries.find(s => s.id === salaryId);
      if (!salary) return;

      const accruedAmount = salary.accruedAmount || 0;
      const finalIssuedAmount = issuedAmount > 0 ? issuedAmount : null;
      const remainingAmount = accruedAmount - (finalIssuedAmount || 0);

      const response = await fetch(`/api/admin/salaries/${salaryId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...salary,
          issuedAmount: finalIssuedAmount,
          remainingAmount: remainingAmount,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "განახლება ვერ მოხერხდა");
      }

      await fetchSalaries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("დარწმუნებული ხართ რომ გსურთ წაშლა?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/salaries/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("წაშლა ვერ მოხერხდა");
      }

      await fetchSalaries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: "",
      employeeName: "",
      firstName: "",
      lastName: "",
      personalId: "",
      accruedAmount: "",
      issuedAmount: "",
      amount: "",
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      status: "PENDING",
      notes: "",
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleEdit = (salary: Salary) => {
    setFormData({
      employeeId: salary.employeeId || "",
      employeeName: salary.employeeName,
      firstName: salary.firstName || "",
      lastName: salary.lastName || "",
      personalId: salary.personalId || "",
      accruedAmount: salary.accruedAmount?.toString() || "",
      issuedAmount: salary.issuedAmount?.toString() || "",
      amount: salary.amount.toString(),
      month: salary.month,
      year: salary.year,
      status: salary.status,
      notes: salary.notes || "",
    });
    setEditingId(salary.id);
    setShowAddForm(true);
  };

  const getMonthName = (month: number) => {
    const months = [
      "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
      "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"
    ];
    return months[month - 1];
  };

  // Remove duplicates - keep only the first salary for each employee
  const seenEmployees = new Set<string>();
  const uniqueSalaries = salaries.filter((salary) => {
    const key = salary.employeeId || salary.employeeName?.toLowerCase().trim() || salary.id;
    if (seenEmployees.has(key)) {
      return false; // Skip duplicate
    }
    seenEmployees.add(key);
    return true; // Keep first occurrence
  });

  const totalAmount = uniqueSalaries.reduce((sum, s) => sum + s.amount, 0);
  const paidAmount = uniqueSalaries.filter(s => s.status === "PAID").reduce((sum, s) => sum + s.amount, 0);

  if (loading) {
    return <div className="text-center py-8 text-black">იტვირთება...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">ხელფასები</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filter */}
      <div className="mb-4 flex space-x-4">
        <div>
          <label className="block text-sm font-medium text-black mb-1">თვე</label>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-black"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {getMonthName(m)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-black mb-1">წელი</label>
          <input
            type="number"
            value={filterYear}
            onChange={(e) => setFilterYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-black"
            min="2020"
            max="2100"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">სულ ხელფასები</div>
          <div className="text-2xl font-bold text-black">{uniqueSalaries.length}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">სულ თანხა</div>
          <div className="text-2xl font-bold text-black">{totalAmount.toFixed(2)} ₾</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">გადახდილი</div>
          <div className="text-2xl font-bold text-black">{paidAmount.toFixed(2)} ₾</div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-black mb-4">
            {editingId ? "რედაქტირება" : "ახალი ხელფასი"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                თანამშრომელი (ავტომატურად შეივსება)
              </label>
              <select
                value={formData.employeeId}
                onChange={(e) => handleEmployeeSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              >
                <option value="">-- აირჩიეთ თანამშრომელი --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.personalId ? `(${emp.personalId})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                  სახელი *
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => {
                    const firstName = e.target.value;
                    const employeeName = firstName && formData.lastName 
                      ? `${firstName} ${formData.lastName}` 
                      : formData.employeeName;
                    setFormData({ ...formData, firstName, employeeName });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                />
              </div>
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                  გვარი *
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => {
                    const lastName = e.target.value;
                    const employeeName = formData.firstName && lastName 
                      ? `${formData.firstName} ${lastName}` 
                      : formData.employeeName;
                    setFormData({ ...formData, lastName, employeeName });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                />
              </div>
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                თანამშრომლის სახელი (სრული)
              </label>
              <input
                type="text"
                value={formData.employeeName || (formData.firstName && formData.lastName ? `${formData.firstName} ${formData.lastName}` : '')}
                onChange={(e) => {
                  const newEmployeeName = e.target.value;
                  setFormData({ ...formData, employeeName: newEmployeeName });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                placeholder="ავტომატურად შეივსება სახელისა და გვარისგან"
              />
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                პირადობის ნომერი (პ/ნ)
              </label>
              <input
                type="text"
                value={formData.personalId}
                onChange={(e) => setFormData({ ...formData, personalId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                placeholder="პ/ნ"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[16px] md:text-[18px] font-medium text-black">
                    დარიცხული თანხა *
                  </label>
                  {formData.employeeId && (
                    <button
                      type="button"
                      onClick={async () => {
                        const accrued = await calculateAccruedAmount(formData.employeeId, formData.month, formData.year);
                        if (accrued !== null) {
                          setFormData({ ...formData, accruedAmount: accrued.toString() });
                        } else {
                          alert("ამ თვისთვის ტაბელში ჩანაწერები არ მოიძებნა");
                        }
                      }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      ტაბელიდან გამოთვლა
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.accruedAmount}
                  onChange={(e) => setFormData({ ...formData, accruedAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                  placeholder="ავტომატურად შეივსება ტაბელიდან"
                />
              </div>
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                  გაცემული თანხა *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.issuedAmount}
                  onChange={(e) => setFormData({ ...formData, issuedAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                  თვე *
                </label>
                <select
                  required
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {getMonthName(m)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                  წელი *
                </label>
                <input
                  type="number"
                  required
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                  min="2020"
                  max="2100"
                />
              </div>
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                სტატუსი *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              >
                <option value="PENDING">მოლოდინში</option>
                <option value="PAID">გადახდილი</option>
                <option value="CANCELLED">გაუქმებული</option>
              </select>
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                შენიშვნები
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                {editingId ? "განახლება" : "დამატება"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                გაუქმება
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Salaries List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                სახელი გვარი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                პ/ნ
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                დარიცხული თანხა
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                გაცემული თანხა
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                დარჩენილი თანხა
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                მოქმედებები
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {uniqueSalaries.map((salary) => (
              <tr key={salary.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {salary.firstName && salary.lastName
                    ? `${salary.firstName} ${salary.lastName}`
                    : salary.employeeName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {salary.personalId || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black font-semibold">
                  {(() => {
                    // Get accrued amount from table if available, otherwise use stored value
                    const employeeId = salary.employeeId;
                    const accruedFromTable = employeeId ? accruedAmountsFromTable[employeeId] : null;
                    const accruedAmount = accruedFromTable !== undefined && accruedFromTable !== null 
                      ? accruedFromTable 
                      : (salary.accruedAmount || 0);
                    return accruedAmount > 0 ? `${accruedAmount.toFixed(2)} ₾` : '-';
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black font-semibold">
                  <input
                    type="number"
                    step="0.01"
                    value={editingIssuedAmount[salary.id] !== undefined 
                      ? editingIssuedAmount[salary.id] 
                      : (salary.issuedAmount?.toString() || '')}
                    onChange={(e) => {
                      setEditingIssuedAmount({
                        ...editingIssuedAmount,
                        [salary.id]: e.target.value
                      });
                    }}
                    onBlur={(e) => {
                      const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                      handleUpdateIssuedAmount(salary.id, value);
                      const newEditing = { ...editingIssuedAmount };
                      delete newEditing[salary.id];
                      setEditingIssuedAmount(newEditing);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    className="w-24 px-2 py-1 border border-gray-300 rounded-md text-black"
                    placeholder="0.00"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black font-semibold">
                  {(() => {
                    // Get accrued amount from table if available, otherwise use stored value
                    const employeeId = salary.employeeId;
                    const accruedFromTable = employeeId ? accruedAmountsFromTable[employeeId] : null;
                    const accruedAmount = accruedFromTable !== undefined && accruedFromTable !== null 
                      ? accruedFromTable 
                      : (salary.accruedAmount || 0);
                    const issuedAmount = salary.issuedAmount || 0;
                    const remainingAmount = accruedAmount - issuedAmount;
                    return remainingAmount !== 0 ? `${remainingAmount.toFixed(2)} ₾` : '-';
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px]">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(salary)}
                      className="text-blue-600 hover:underline"
                    >
                     უწყისი
                    </button>
                    <button
                      onClick={() => handleDelete(salary.id)}
                      className="text-red-600 hover:underline"
                    >
                      წაშლა
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {uniqueSalaries.length === 0 && (
        <div className="text-center py-8 text-black">
          ხელფასები არ მოიძებნა
        </div>
      )}
    </div>
  );
}

