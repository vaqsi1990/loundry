"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import React from "react";

interface DailySheetItem {
  id?: string;
  category: string;
  itemNameKa: string;
  weight: number;
  received: number;
  washCount: number;
  dispatched: number;
  shortage: number;
  totalWeight: number;
  price?: number;
  comment?: string;
}

interface DailySheet {
  id: string;
  date: string;
  hotelName: string | null;
  description: string | null;
  notes: string | null;
  pricePerKg: number | null;
  sheetType: string;
  totalWeight: number | null;
  totalPrice: number | null;
  items: DailySheetItem[];
  createdAt: string;
  confirmedBy?: string | null;
  confirmedAt?: string | null;
  emailSends?: Array<{
    id: string;
    confirmedAt: string | null;
    confirmedBy: string | null;
  }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  LINEN: "თეთრეული",
  TOWELS: "პირსახოცები",
  PROTECTORS: "დამცავები",
};

const PROTECTOR_PRICES: Record<string, number> = {
  "საბანი დიდი": 15,
  "საბანი პატარა": 10,
  "მატრასის დამცავი დიდი": 15,
  "მატრასის დამცავი პატარა": 10,
  "ბალიში დიდი": 7,
  "ბალიში პატარა": 5,
  "ბალიში საბავშვო": 5,
};

// Helper function to get item order index
const getItemOrder = (category: string, itemNameKa: string): number => {
  const LINEN_ITEMS = [
    "კონვერტი დიდი", "კონვერტი საშუალო", "კონვერტი პატარა", "კონვერტი საბავშვო",
    "ზეწარი დიდი", "ზეწარი საშუალო", "ზეწარი პატარა", "ზეწარი საბავშვო",
    "ბალიშის პირი დიდი", "ბალიშის პირი პატარა", "ბალიშის პირი საბავშვო",
    "ბალიშის დამცავი დიდი", "ბალიშის დამცავი პატარა",
  ];
  const TOWEL_ITEMS = [
    "დიდი პირსახოცი", "პატარა პირსახოცი", "სახის პირსახოცი", "ფეხის პირსახოცი", "ხალათი",
  ];
  const PROTECTOR_ITEMS = [
    "საბანი დიდი", "საბანი პატარა", "მატრასის დამცავი დიდი", "მატრასის დამცავი პატარა",
    "ბალიში დიდი", "ბალიში პატარა", "ბალიში საბავშვო",
  ];

  let items: string[] = [];
  if (category === "LINEN") items = LINEN_ITEMS;
  else if (category === "TOWELS") items = TOWEL_ITEMS;
  else if (category === "PROTECTORS") items = PROTECTOR_ITEMS;
  else return 999;

  const index = items.findIndex(item => item === itemNameKa);
  return index === -1 ? 999 : index;
};

// Function to sort items by predefined order
const sortItemsByOrder = (items: DailySheetItem[]): DailySheetItem[] => {
  return [...items].sort((a, b) => {
    if (a.category !== b.category) {
      return 0;
    }
    return getItemOrder(a.category, a.itemNameKa) - getItemOrder(b.category, b.itemNameKa);
  });
};

const calculateTotals = (items: DailySheetItem[]) =>
  items.reduce(
    (acc, item) => ({
      received: acc.received + (item.received || 0),
      washCount: acc.washCount + (item.washCount || 0),
      dispatched: acc.dispatched + (item.dispatched || 0),
      shortage: acc.shortage + (item.shortage || 0),
      totalWeight: acc.totalWeight + ((item.weight || 0)),
    }),
    { received: 0, washCount: 0, dispatched: 0, shortage: 0, totalWeight: 0 }
  );

const calculateProtectorsPrice = (items: DailySheetItem[]): number => {
  return items
    .filter(item => item.category === "PROTECTORS")
    .reduce((sum, item) => {
      const price = item.price || PROTECTOR_PRICES[item.itemNameKa] || 0;
      return sum + (price * (item.dispatched || 0));
    }, 0);
};

export default function LegalDailySheetsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dailySheets, setDailySheets] = useState<DailySheet[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [expandedSheets, setExpandedSheets] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && session?.user?.id) {
      fetchDailySheets();
    }
  }, [status, session, router, selectedMonth, selectedDay]);

  const fetchDailySheets = async () => {
    try {
      let url = "/api/legal/daily-sheets";
      if (selectedDay) {
        url += `?day=${selectedDay}`;
      } else if (selectedMonth) {
        url += `?month=${selectedMonth}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("დღის ფურცლების ჩატვირთვა ვერ მოხერხდა");
      const data = await response.json();
      setDailySheets(data);
      
      // Extract available months
      const months = new Set<string>();
      data.forEach((sheet: DailySheet) => {
        const date = new Date(sheet.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        months.add(monthKey);
      });
      setAvailableMonths(Array.from(months).sort().reverse());
    } catch (err) {
      console.error("Error fetching daily sheets:", err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDailySheet = async (sheetId: string) => {
    try {
      const response = await fetch(`/api/legal/daily-sheets?id=${sheetId}`, {
        method: "PUT",
      });
      if (!response.ok) throw new Error("დადასტურება ვერ მოხერხდა");
      await fetchDailySheets();
      alert("დღის ფურცელი წარმატებით დაადასტურა");
    } catch (err) {
      alert("დადასტურებისას მოხდა შეცდომა");
    }
  };

  const toggleSheet = (sheetId: string) => {
    setExpandedSheets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sheetId)) {
        newSet.delete(sheetId);
      } else {
        newSet.add(sheetId);
      }
      return newSet;
    });
  };

  const formatDateGe = (date: string | Date) => {
    const d = new Date(date);
    const weekdays = ["კვირა", "ორშაბათი", "სამშაბათი", "ოთხშაბათი", "ხუთშაბათი", "პარასკევი", "შაბათი"];
    const months = [
      "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
      "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი",
    ];
    return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatMonthGe = (monthKey: string) => {
    const [year, monthNum] = monthKey.split("-");
    const months = [
      "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
      "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი",
    ];
    const monthIndex = parseInt(monthNum) - 1;
    return `${months[monthIndex]} ${year}`;
  };


  const renderSheetTable = (sheet: DailySheet) => {
    const categories = ["LINEN", "TOWELS", "PROTECTORS"];
    const totals = calculateTotals(sheet.items);
    const hasProtectors = sheet.items.some(item => item.category === "PROTECTORS");
    const hasLinenOrTowels = sheet.items.some(item => item.category === "LINEN" || item.category === "TOWELS");
    const showPriceColumn = hasProtectors || hasLinenOrTowels;
    
    // Calculate total price
    let calculatedTotalPrice: string | null = null;
    let linenTowelsPrice = 0;
    let protectorsPrice = 0;
    
    if (hasLinenOrTowels) {
      const weightForPrice = sheet.sheetType === "STANDARD" && sheet.totalWeight 
        ? sheet.totalWeight 
        : totals.totalWeight;
      if (sheet.pricePerKg && weightForPrice) {
        linenTowelsPrice = sheet.pricePerKg * weightForPrice;
      }
    }
    
    if (hasProtectors) {
      if (sheet.sheetType === "STANDARD" && sheet.totalPrice) {
        protectorsPrice = sheet.totalPrice;
      } else {
        protectorsPrice = calculateProtectorsPrice(sheet.items);
      }
    }
    
    const totalSum = linenTowelsPrice + protectorsPrice;
    if (totalSum > 0) {
      calculatedTotalPrice = totalSum.toFixed(2);
    }

    const renderSectionRows = (items: DailySheetItem[]) =>
      items.map((item, idx) => {
        const isProtector = item.category === "PROTECTORS";
        const isLinenOrTowel = item.category === "LINEN" || item.category === "TOWELS";
        const itemPrice = item.price || PROTECTOR_PRICES[item.itemNameKa] || 0;
        const itemTotalPrice = isProtector ? (itemPrice * (item.dispatched || 0)) : 0;
        
        return (
          <tr key={`${item.itemNameKa}-${idx}`} className="bg-white">
            <td className="border border-gray-300 px-2 py-1">{item.itemNameKa}</td>
            {sheet.sheetType === "INDIVIDUAL" && (
              <>
                <td className="border border-gray-300 px-2 py-1 text-center">{(item.weight || 0).toFixed(3)}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.received}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.washCount}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.dispatched}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.shortage}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{(item.totalWeight || 0).toFixed(2)}</td>
                {showPriceColumn && (
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {isProtector ? itemTotalPrice.toFixed(2) : (isLinenOrTowel ? "0" : "-")}
                  </td>
                )}
              </>
            )}
            {sheet.sheetType === "STANDARD" && (
              <>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.received}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.dispatched}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.shortage}</td>
                {showPriceColumn && (
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {isProtector ? itemTotalPrice.toFixed(2) : (isLinenOrTowel ? "0" : "-")}
                  </td>
                )}
              </>
            )}
            <td className="border border-gray-300 px-2 py-1">{item.comment || ""}</td>
          </tr>
        );
      });

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 md:text-[18px] text-[16px]">
          <thead>
            <tr className="bg-orange-100">
              <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-left font-semibold">დასახელება</th>
              {sheet.sheetType === "INDIVIDUAL" && (
                <>
                  <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">წონა (კგ)</th>
                  <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">მიღებული (ც.)</th>
                  <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">რეცხვის რაოდენობა (ც.)</th>
                  <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">გაგზავნილი (ც.)</th>
                  <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">დატოვებული (ც.)</th>
                  <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">სულ წონა (კგ)</th>
                  {showPriceColumn && (
                    <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">1 ც-ის ფასი (₾) *</th>
                  )}
                </>
              )}
              {sheet.sheetType === "STANDARD" && (
                <>
                  <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">მიღებული (ც.)</th>
                  <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">გაგზავნილი (ც.)</th>
                  <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">დატოვებული (ც.)</th>
                  {showPriceColumn && (
                    <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">1 ც-ის ფასი (₾) *</th>
                  )}
                </>
              )}
              <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">შენიშვნა</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => {
              const sectionItems = sheet.items.filter((i) => i.category === category);
              if (sectionItems.length === 0) return null;
              const sortedItems = sortItemsByOrder(sectionItems);
              return (
                <React.Fragment key={category}>
                  <tr>
                    <td colSpan={sheet.sheetType === "INDIVIDUAL" ? (showPriceColumn ? 9 : 8) : (showPriceColumn ? 6 : 5)} className="bg-orange-100 border border-gray-300 px-2 py-1 font-semibold">
                      {CATEGORY_LABELS[category]}
                    </td>
                  </tr>
                  {renderSectionRows(sortedItems)}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold">
              <td className="border border-gray-300 px-2 py-1 text-left text-black">ჯამი</td>
              {sheet.sheetType === "INDIVIDUAL" && (
                <>
                  <td className="border border-gray-300 px-2 py-1 text-center text-black">-</td>
                  <td className="border border-gray-300 px-2 py-1 text-center text-black">{totals.received}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center text-black">{totals.washCount}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center text-black">{totals.dispatched}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center text-black">{totals.shortage}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center text-black">{totals.totalWeight.toFixed(2)}</td>
                  {showPriceColumn && (
                    <td className="border border-gray-300 px-2 py-1 text-center text-black">
                      {protectorsPrice > 0 ? protectorsPrice.toFixed(2) : "-"}
                    </td>
                  )}
                </>
              )}
              {sheet.sheetType === "STANDARD" && (
                <>
                  <td className="border border-gray-300 px-2 py-1 text-center text-black">{totals.received}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center text-black">{totals.dispatched}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center text-black">{totals.shortage}</td>
                  {showPriceColumn && (
                    <td className="border border-gray-300 px-2 py-1 text-center text-black">
                      {protectorsPrice > 0 ? protectorsPrice.toFixed(2) : "-"}
                    </td>
                  )}
                </>
              )}
              <td className="border border-gray-300 px-2 py-1 text-center">-</td>
            </tr>
            {sheet.sheetType === "STANDARD" && sheet.totalWeight && (
              <tr className="bg-blue-50 font-semibold">
                <td colSpan={3} className="border border-gray-300 px-2 py-1 text-right">
                  მთლიანი წონა:
                </td>
                <td className="border border-gray-300 px-2 py-1 text-center">
                  {sheet.totalWeight.toFixed(2)} კგ
                </td>
                <td className="border border-gray-300 px-2 py-1 text-center">-</td>
              </tr>
            )}
            {sheet.pricePerKg && (
              <tr className="bg-blue-50 font-semibold">
                <td colSpan={sheet.sheetType === "INDIVIDUAL" ? 6 : 3} className="border border-gray-300 px-2 py-1 text-right">
                  1 კგ-ის ფასი:
                </td>
                <td className="border border-gray-300 px-2 py-1 text-center">
                  {sheet.pricePerKg.toFixed(2)} ₾
                </td>
                <td className="border border-gray-300 px-2 py-1 text-center">-</td>
              </tr>
            )}
            {hasProtectors && protectorsPrice > 0 && (
              <tr className="bg-purple-50 font-semibold">
                <td colSpan={sheet.sheetType === "INDIVIDUAL" ? (showPriceColumn ? 6 : 6) : (showPriceColumn ? 3 : 3)} className="border border-gray-300 px-2 py-1 text-right">
                  დამცავების ფასი:
                </td>
                <td className="border border-gray-300 px-2 py-1 text-center">
                  {protectorsPrice.toFixed(2)} ₾
                </td>
                {showPriceColumn && <td className="border border-gray-300 px-2 py-1 text-center">-</td>}
                <td className="border border-gray-300 px-2 py-1 text-center">-</td>
              </tr>
            )}
            {calculatedTotalPrice && (
              <tr className="bg-green-50 font-bold">
                <td colSpan={sheet.sheetType === "INDIVIDUAL" ? 6 : 3} className="border border-gray-300 px-2 py-1 text-right">
                  მთლიანი ფასი:
                </td>
                <td className="border border-gray-300 px-2 py-1 text-center">
                  {calculatedTotalPrice} ₾
                </td>
                <td className="border border-gray-300 px-2 py-1 text-center">-</td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    );
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-[18px] md:text-[20px] text-gray-600">იტვირთება...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;


  return (
    <div className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-10 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            href="/legal"
            className="text-blue-600 hover:underline text-[18px] mb-2 font-bold inline-block"
          >
            ← უკან
          </Link>
          <h1 className="text-center text-[18px] md:text-[24px] font-bold text-black">
            დღის ფურცლები
          </h1>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          {/* Filters */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] md:text-[16px] font-medium text-gray-700 mb-1">
                თვე
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setSelectedDay("");
                }}
                className="w-full px-3 py-2 border rounded-md text-[16px] md:text-[18px]"
              >
                <option value="">ყველა თვე</option>
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {formatMonthGe(month)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[14px] md:text-[16px] font-medium text-gray-700 mb-1">
                დღე
              </label>
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => {
                  setSelectedDay(e.target.value);
                  setSelectedMonth("");
                }}
                className="w-full px-3 py-2 border rounded-md text-[16px] md:text-[18px]"
              />
            </div>
          </div>

          {/* Sheets List */}
          <div className="space-y-6">
            {dailySheets.map((sheet) => {
              const isExpanded = expandedSheets.has(sheet.id);
              return (
                <div key={sheet.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* Header - Always visible */}
                  <div 
                    className="flex justify-between items-start p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleSheet(sheet.id)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        className="text-gray-500 hover:text-gray-700 focus:outline-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSheet(sheet.id);
                        }}
                      >
                        {isExpanded ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </button>
                      <div>
                        <h3 className="text-lg font-semibold text-black">
                          {formatDateGe(sheet.date)}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap mt-1">
                          {sheet.confirmedAt && (
                            <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 px-3 py-1 text-xs font-semibold">
                              ✓ დაადასტურა {new Date(sheet.confirmedAt).toLocaleDateString("ka-GE")}
                            </span>
                          )}
                          {!sheet.confirmedAt && (
                            <span className="inline-flex items-center rounded-full bg-yellow-50 text-yellow-700 px-3 py-1 text-xs font-semibold">
                              დადასტურება საჭიროა
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                      {!sheet.confirmedAt && (
                        <button
                          onClick={() => confirmDailySheet(sheet.id)}
                          className="bg-green-600 font-bold text-white px-4 py-2 rounded-lg text-[14px] md:text-[16px] hover:bg-green-700"
                        >
                          დადასტურება
                        </button>
                      )}
                  
                    </div>
                  </div>
                  {/* Content - Collapsible */}
                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-gray-200 pt-4">
                      {renderSheetTable(sheet)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {dailySheets.length === 0 && (
            <div className="text-center py-8 text-gray-600">
              დღის ფურცლები არ მოიძებნა
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
