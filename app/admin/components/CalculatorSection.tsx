"use client";

import { useState, useEffect } from "react";

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  isRecurring: boolean;
}

interface InvoiceSummary {
  hotelName: string | null;
  totalWeightKg: number;
  totalAmount: number;
}

export default function CalculatorSection() {
  // State for expense/weight calculator
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string>("");
  const [totalWeight, setTotalWeight] = useState<number>(0);
  const [costPerKg, setCostPerKg] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculatedExpenseIds, setCalculatedExpenseIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;
  const [availableMonths, setAvailableMonths] = useState<Array<{ month: string; count: number }>>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  // Fetch expenses and invoices data
  useEffect(() => {
    fetchAvailableMonths();
    fetchExpenses();
    fetchInvoices();
  }, []);

  useEffect(() => {
    fetchExpenses();
    setCurrentPage(1); // Reset to page 1 when month changes
  }, [selectedMonth]);

  const fetchAvailableMonths = async () => {
    try {
      const response = await fetch("/api/admin/expenses?months=true");
      if (!response.ok) {
        throw new Error("თვეების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setAvailableMonths(data.months || []);
    } catch (err) {
      console.error("Months fetch error:", err);
    }
  };

  const fetchExpenses = async () => {
    try {
      const url = selectedMonth
        ? `/api/admin/expenses?view=monthly&month=${selectedMonth}`
        : "/api/admin/expenses";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("ხარჯების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setExpenses(data || []);
    } catch (err) {
      console.error("Expenses fetch error:", err);
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/invoices");
      if (!response.ok) {
        throw new Error("ინვოისების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setInvoices(data || []);
      
      // Calculate total weight from all invoices
      const total = (data || []).reduce((sum: number, inv: InvoiceSummary) => {
        return sum + (inv.totalWeightKg || 0);
      }, 0);
      setTotalWeight(total);
    } catch (err) {
      console.error("Invoices fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExpenseSelect = (expenseId: string) => {
    // If selecting a different expense, clear previous calculations
    if (selectedExpenseId && selectedExpenseId !== expenseId) {
      setCalculatedExpenseIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(selectedExpenseId);
        return newSet;
      });
    }
    
    setSelectedExpenseId(expenseId);
    if (expenseId && totalWeight > 0) {
      const expense = expenses.find((e) => e.id === expenseId);
      if (expense) {
        const result = expense.amount / totalWeight;
        setCostPerKg(result);
        // Add to calculated expenses set
        setCalculatedExpenseIds((prev) => new Set(prev).add(expenseId));
      }
    } else {
      setCostPerKg(null);
    }
  };

  const handleCalculateCostPerKg = () => {
    if (selectedExpenseId && totalWeight > 0) {
      const expense = expenses.find((e) => e.id === selectedExpenseId);
      if (expense) {
        const result = expense.amount / totalWeight;
        setCostPerKg(result);
      }
    }
  };

  const selectedExpense = expenses.find((e) => e.id === selectedExpenseId);

  // Filter expenses by search query
  const filteredExpenses = expenses.filter((expense) =>
    expense.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split("-").map(Number);
    const months = [
      "იანვარი",
      "თებერვალი",
      "მარტი",
      "აპრილი",
      "მაისი",
      "ივნისი",
      "ივლისი",
      "აგვისტო",
      "სექტემბერი",
      "ოქტომბერი",
      "ნოემბერი",
      "დეკემბერი",
    ];
    return `${months[month - 1]} ${year}`;
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">კალკულატორი</h2>
      </div>

      {/* Expense to Weight Calculator */}
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-black mb-4">
          ხარჯის გაყოფა წონაზე (კგ)
        </h3>
        
        <div className="space-y-4">
          {/* Total Weight Display */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-gray-600 text-sm mb-1">სულ წონა (კგ) ინვოისებიდან:</div>
            <div className="text-2xl font-bold text-black">
              {loading ? "იტვირთება..." : totalWeight.toFixed(2)} კგ
            </div>
          </div>

          {/* Expense Selection Table with Result */}
          <div>
            {/* Table Section */}
            <div>
              <div className="flex flex-col gap-3 mb-2">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <label className="block text-[16px] md:text-[18px] font-medium text-black">
                    აირჩიეთ ხარჯი:
                  </label>
                  <div className="flex flex-col md:flex-row gap-3 flex-1">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
                    >
                      <option value="">ყველა თვე</option>
                      {availableMonths.map((month) => (
                        <option key={month.month} value={month.month}>
                          {formatMonth(month.month)} ({month.count})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="ძებნა სახელის მიხედვით..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                     
                      <th className="px-6 py-3 text-left text-[14px] md:text-[16px] font-medium text-black uppercase tracking-wider">
                        სახელი
                      </th>
                      <th className="px-6 py-3 text-left text-[14px] md:text-[16px] font-medium text-black uppercase tracking-wider">
                        თარიღი
                      </th>
                      <th className="px-6 py-3 text-left text-[14px] md:text-[16px] font-medium text-black uppercase tracking-wider">
                        თანხა
                      </th>
                      <th className="px-6 py-3 text-left text-[14px] md:text-[16px] font-medium text-black uppercase tracking-wider">
                        მოქმედება
                      </th>
                      <th className="px-6 py-3 text-left text-[14px] md:text-[16px] font-medium text-black uppercase tracking-wider">
                        გამოთვლილი თანხა
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-black">
                          ხარჯები არ მოიძებნა
                        </td>
                      </tr>
                    ) : (
                      <>
                        {paginatedExpenses.map((expense) => {
                          const calculatedAmount = totalWeight > 0 ? expense.amount / totalWeight : 0;
                          const isCalculated = calculatedExpenseIds.has(expense.id);
                          return (
                            <tr
                              key={expense.id}
                              className={`hover:bg-gray-50 cursor-pointer ${
                                selectedExpenseId === expense.id ? "bg-blue-100" : ""
                              }`}
                              onClick={() => handleExpenseSelect(expense.id)}
                            >
                              
                              <td className="px-6 py-4 whitespace-nowrap text-[14px] md:text-[16px] text-black">
                                {expense.description}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-[14px] md:text-[16px] text-black">
                                {new Date(expense.date).toLocaleDateString("ka-GE")}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-[14px] md:text-[16px] text-black font-semibold">
                                {expense.amount.toFixed(2)} ₾
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-[14px] md:text-[16px]">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExpenseSelect(expense.id);
                                  }}
                                  className={`w-full md:w-auto bg-gray-200 text-black md:text-[18px] text-[16px] px-6 py-2 rounded-lg cursor-pointer transition hover:bg-gray-300 ${
                                    selectedExpenseId === expense.id
                                      ? "bg-green-200 hover:bg-green-300"
                                      : ""
                                  }`}
                                >
                                  {selectedExpenseId === expense.id ? "არჩეული" : "გამოთვლა"}
                                </button>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-[14px] md:text-[16px] text-black font-semibold">
                                {isCalculated && totalWeight > 0
                                  ? calculatedAmount.toFixed(4) + " ₾/კგ"
                                  : "0 ₾/კგ"}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Total Row */}
                        <tr className="bg-gray-100 font-bold">
                          <td className="px-6 py-4 whitespace-nowrap text-[14px] md:text-[16px] text-black font-semibold">
                            {totalWeight > 0 && calculatedExpenseIds.size > 0
                              ? filteredExpenses
                                  .filter((exp) => calculatedExpenseIds.has(exp.id))
                                  .reduce((sum, exp) => sum + (exp.amount / totalWeight), 0)
                                  .toFixed(4) + " ₾/კგ"
                              : "0.0000 ₾/კგ"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-[14px] md:text-[16px] text-black">
                            სულ
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-[14px] md:text-[16px] text-black">
                            {filteredExpenses.length} ხარჯი
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-[14px] md:text-[16px] text-black font-semibold">
                            {filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)} ₾
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-[14px] md:text-[16px]">
                            -
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-700">
                    გვერდი {currentPage} {totalPages}-დან ({filteredExpenses.length} ხარჯი)
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      წინა
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-4 py-2 rounded-lg transition ${
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-black hover:bg-gray-300"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      შემდეგი
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

          {selectedExpenseId && totalWeight === 0 && !loading && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              წონა არ არის ხელმისაწვდომი. შეამოწმეთ ინვოისები.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

