"use client";

import React, { useEffect, useState } from "react";

interface Hotel {
  id: string;
  hotelName: string;
  contactPhone: string;
  email?: string;
  address?: string;
  pricePerKg?: number;
}

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
  price?: number; // Price for PROTECTORS items
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
  emailSendCount?: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  LINEN: "თეთრეული",
  TOWELS: "პირსახოცები",
  PROTECTORS: "დამცავები",
};

// Helper function to get item order index
const getItemOrder = (category: string, itemNameKa: string): number => {
  let items: Omit<DailySheetItem, "id" | "totalWeight">[];
  if (category === "LINEN") {
    items = LINEN_ITEMS;
  } else if (category === "TOWELS") {
    items = TOWEL_ITEMS;
  } else if (category === "PROTECTORS") {
    items = PROTECTOR_ITEMS;
  } else {
    return 999; // Unknown category, put at end
  }
  
  const index = items.findIndex(item => item.itemNameKa === itemNameKa);
  return index === -1 ? 999 : index;
};

// Function to sort items by predefined order
const sortItemsByOrder = (items: DailySheetItem[]): DailySheetItem[] => {
  return [...items].sort((a, b) => {
    if (a.category !== b.category) {
      return 0; // Categories are already grouped
    }
    return getItemOrder(a.category, a.itemNameKa) - getItemOrder(b.category, b.itemNameKa);
  });
};

const LINEN_ITEMS: Omit<DailySheetItem, "id" | "totalWeight">[] = [
  { category: "LINEN", itemNameKa: "კონვერტი დიდი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "LINEN", itemNameKa: "კონვერტი საშუალო", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "LINEN", itemNameKa: "კონვერტი პატარა", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "LINEN", itemNameKa: "კონვერტი საბავშვო", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "LINEN", itemNameKa: "ზეწარი დიდი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "LINEN", itemNameKa: "ზეწარი საშუალო", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "LINEN", itemNameKa: "ზეწარი პატარა", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "LINEN", itemNameKa: "ზეწარი საბავშვო", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "LINEN", itemNameKa: "ბალიშის პირი დიდი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "LINEN", itemNameKa: "ბალიშის პირი პატარა", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "LINEN", itemNameKa: "ბალიშის პირი საბავშვო", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "LINEN", itemNameKa: "ბალიშის დამცავი დიდი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "LINEN", itemNameKa: "ბალიშის დამცავი პატარა", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
];

const TOWEL_ITEMS: Omit<DailySheetItem, "id" | "totalWeight">[] = [
  { category: "TOWELS", itemNameKa: "დიდი პირსახოცი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "TOWELS", itemNameKa: "პატარა პირსახოცი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "TOWELS", itemNameKa: "სახის პირსახოცი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "TOWELS", itemNameKa: "ფეხის პირსახოცი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "TOWELS", itemNameKa: "ხალათი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
];

// Protector prices per item
const PROTECTOR_PRICES: Record<string, number> = {
  "საბანი დიდი": 15,
  "საბანი პატარა": 10,
  "მატრასის დამცავი დიდი": 15,
  "მატრასის დამცავი პატარა": 10,
  "ბალიში დიდი": 7,
  "ბალიში პატარა": 5,
  "ბალიში საბავშვო": 5,
};

const PROTECTOR_ITEMS: Omit<DailySheetItem, "id" | "totalWeight">[] = [
  { category: "PROTECTORS", itemNameKa: "საბანი დიდი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0, price: 15 },
  { category: "PROTECTORS", itemNameKa: "საბანი პატარა", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0, price: 10 },
  { category: "PROTECTORS", itemNameKa: "მატრასის დამცავი დიდი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0, price: 15 },
  { category: "PROTECTORS", itemNameKa: "მატრასის დამცავი პატარა", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0, price: 10 },
  { category: "PROTECTORS", itemNameKa: "ბალიში დიდი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0, price: 7 },
  { category: "PROTECTORS", itemNameKa: "ბალიში პატარა", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0, price: 5 },
  { category: "PROTECTORS", itemNameKa: "ბალიში საბავშვო", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0, price: 5 },
];

export default function DailySheetsSection() {
  const [sheets, setSheets] = useState<DailySheet[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedHotel, setSelectedHotel] = useState<string>("");
  const [expandedSheets, setExpandedSheets] = useState<Set<string>>(new Set()); // Track which sheets are expanded
  const [emailModal, setEmailModal] = useState<{ open: boolean; sheetId: string | null }>({
    open: false,
    sheetId: null,
  });
  const [modalEmail, setModalEmail] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    hotelName: "",
    description: "",
    notes: "",
    sheetType: "STANDARD" as "INDIVIDUAL" | "STANDARD",
    totalWeight: null as number | null,
    pricePerKg: null as number | null,
    totalPrice: null as number | null, // For PROTECTORS manual price
    items: [] as DailySheetItem[],
  });

  useEffect(() => {
    fetchSheets();
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    try {
      const response = await fetch("/api/admin/our-hotels");
      if (!response.ok) {
        throw new Error("სასტუმროების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      // Normalize shape from our-hotels API and sort by hotelName alphabetically
      const normalizedHotels = Array.isArray(data)
        ? data.map((hotel: any) => ({
            id: hotel.id,
            hotelName: hotel.hotelName,
            contactPhone: hotel.mobileNumber,
            email: hotel.email,
            pricePerKg: hotel.pricePerKg,
          }))
        : [];
      // Sort hotels alphabetically by hotelName
      normalizedHotels.sort((a, b) => a.hotelName.localeCompare(b.hotelName, 'ka', { sensitivity: 'base' }));
      setHotels(normalizedHotels);
    } catch (err) {
      console.error("Hotels fetch error:", err);
      setError("სასტუმროების ჩატვირთვა ვერ მოხერხდა");
    }
  };

  const fetchSheets = async () => {
    try {
      const response = await fetch("/api/admin/daily-sheets");
      if (!response.ok) {
        throw new Error("დღის ფურცლების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      console.log("Fetched sheets:", data);
      console.log("Sheets count:", data?.length || 0);
      if (data && data.length > 0) {
        console.log("First sheet date:", data[0].date, "type:", typeof data[0].date);
      }
      setSheets(data || []);
    } catch (err) {
      console.error("Fetch sheets error:", err);
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setLoading(false);
    }
  };

  const deriveHotelEmail = (hotelName: string | null | undefined) => {
    if (!hotelName) return null;
    const hotel = hotels.find(h => h.hotelName === hotelName);
    return hotel?.email || null;
  };

  useEffect(() => {
    if (!emailModal.open || !emailModal.sheetId) return;
    const sheet = sheets.find(s => s.id === emailModal.sheetId);
    if (!sheet) return;
    const email = deriveHotelEmail(sheet.hotelName);
    if (email !== modalEmail) {
      setModalEmail(email);
    }
  }, [emailModal.open, emailModal.sheetId, sheets, hotels, modalEmail]);

  const initializeItems = () => {
    const allItems: DailySheetItem[] = [
      ...LINEN_ITEMS,
      ...TOWEL_ITEMS,
      ...PROTECTOR_ITEMS,
    ].map(item => ({
      ...item,
      id: undefined,
      totalWeight: item.weight ,
    }));
    return allItems;
  };

  const handleItemChange = (index: number, field: keyof DailySheetItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };
    
    // Calculate totalWeight when weight changes
    if (field === "weight") {
      newItems[index].totalWeight = (newItems[index].weight || 0);
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.hotelName) {
      setError("გთხოვთ აირჩიოთ სასტუმრო");
      return;
    }

    try {
      const url = editingId ? `/api/admin/daily-sheets/${editingId}` : "/api/admin/daily-sheets";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "ოპერაცია ვერ მოხერხდა");
      }

      await fetchSheets();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const handleSendEmail = async () => {
    if (!emailModal.sheetId) {
      setError("ფურცლის ID არ არის მითითებული");
      return;
    }
    setError("");
    try {
      const res = await fetch("/api/admin/daily-sheets/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetId: emailModal.sheetId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "გაგზავნა ვერ მოხერხდა");
      }
      await fetchSheets(); // refresh to show updated send count
      setEmailModal({ open: false, sheetId: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
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

  const handleEdit = (sheet: DailySheet) => {
    setEditingId(sheet.id);
    setFormData({
      date: getDateString(sheet.date),
      hotelName: sheet.hotelName || "",
      description: sheet.description || "",
      notes: sheet.notes || "",
      sheetType: (sheet.sheetType || "INDIVIDUAL") as "INDIVIDUAL" | "STANDARD",
      totalWeight: sheet.totalWeight,
      pricePerKg: sheet.pricePerKg,
      totalPrice: sheet.totalPrice || null,
      items:
        sheet.items.length > 0
          ? sheet.items.map((i) => ({
              ...i,
              totalWeight: i.totalWeight ?? (i.weight || 0),
            }))
          : initializeItems(),
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("დარწმუნებული ხართ რომ გსურთ წაშლა?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/daily-sheets/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("წაშლა ვერ მოხერხდა");
      }

      await fetchSheets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      hotelName: "",
      description: "",
      notes: "",
      sheetType: "STANDARD" as "INDIVIDUAL" | "STANDARD",
      totalWeight: null,
      pricePerKg: null,
      totalPrice: null,
      items: initializeItems(),
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleNewSheet = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      hotelName: "",
      description: "",
      notes: "",
      sheetType: "STANDARD" as "INDIVIDUAL" | "STANDARD",
      totalWeight: null,
      pricePerKg: null,
      totalPrice: null,
      items: initializeItems(),
    });
    setEditingId(null);
    setShowAddForm(true);
  };

  // Helper function to get date string in YYYY-MM-DD format without timezone issues
  const getDateString = (date: string | Date): string => {
    if (typeof date === 'string') {
      return date.split("T")[0];
    }
    const d = new Date(date);
    // Use UTC methods to avoid timezone conversion
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const filteredSheets = sheets.filter(sheet => {
    const dateMatch = !selectedDate || getDateString(sheet.date) === selectedDate;
    const hotelMatch = !selectedHotel || sheet.hotelName === selectedHotel;
    return dateMatch && hotelMatch;
  });

  const formatDateGe = (date: string | Date) => {
    const d = new Date(date);
    const weekdays = ["კვირა", "ორშაბათი", "სამშაბათი", "ოთხშაბათი", "ხუთშაბათი", "პარასკევი", "შაბათი"];
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
    return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  if (loading) {
    return <div className="text-center py-8 text-black">იტვირთება...</div>;
  }

  const renderSectionRows = (items: DailySheetItem[], sheetType: string = "INDIVIDUAL", hasProtectors: boolean = false, hasLinenOrTowels: boolean = false) =>
    items.map((item, idx) => {
      const isProtector = item.category === "PROTECTORS";
      const isLinenOrTowel = item.category === "LINEN" || item.category === "TOWELS";
      const itemPrice = item.price || PROTECTOR_PRICES[item.itemNameKa] || 0;
      const itemTotalPrice = isProtector ? (itemPrice * (item.received || 0)) : 0;
      const showPriceColumn = hasProtectors || hasLinenOrTowels;
      
      return (
        <tr key={`${item.itemNameKa}-${idx}`} className="bg-white">
          <td className="border border-gray-300 px-2 py-1">{item.itemNameKa}</td>
          {sheetType === "INDIVIDUAL" && (
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
          {sheetType === "STANDARD" && (
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
        return sum + (price * (item.received || 0));
      }, 0);
  };

  const renderSheetTable = (sheet: DailySheet) => {
    const categories = ["LINEN", "TOWELS", "PROTECTORS"];
    const totals = calculateTotals(sheet.items);
    const hasProtectors = sheet.items.some(item => item.category === "PROTECTORS");
    const hasLinenOrTowels = sheet.items.some(item => item.category === "LINEN" || item.category === "TOWELS");
    const showPriceColumn = hasProtectors || hasLinenOrTowels;
    
    // Calculate total price: LINEN/TOWELS price + PROTECTORS price
    let calculatedTotalPrice: string | null = null;
    let linenTowelsPrice = 0;
    let protectorsPrice = 0;
    
    // Calculate LINEN/TOWELS price
    if (hasLinenOrTowels) {
      const weightForPrice = sheet.sheetType === "STANDARD" && sheet.totalWeight 
        ? sheet.totalWeight 
        : totals.totalWeight;
      if (sheet.pricePerKg && weightForPrice) {
        linenTowelsPrice = sheet.pricePerKg * weightForPrice;
      }
    }
    
    // Calculate PROTECTORS price (for both STANDARD and INDIVIDUAL)
    // Use manual totalPrice if provided, otherwise calculate from items
    if (hasProtectors) {
      if (sheet.sheetType === "STANDARD" && sheet.totalPrice) {
        protectorsPrice = sheet.totalPrice;
      } else {
        // Calculate from items: price * received
        protectorsPrice = calculateProtectorsPrice(sheet.items);
      }
    }
    
    // Total sum
    const totalSum = linenTowelsPrice + protectorsPrice;
    if (totalSum > 0) {
      calculatedTotalPrice = totalSum.toFixed(2);
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 md:text-[18px] text-[16px]">
          <thead>
            <tr className="bg-orange-100">
              <th className="border border-gray-300 px-2 py-1  md:text-[18px] text-[16px] text-left font-semibold">დასახელება</th>
              {sheet.sheetType === "INDIVIDUAL" && (
                <>
                  <th className="border border-gray-300 px-2 py-1  md:text-[18px] text-[16px] text-center font-semibold">წონა (კგ)</th>
                  <th className="border border-gray-300 px-2 py-1  md:text-[18px] text-[16px] text-center font-semibold">მიღებული (ც.)</th>
                  <th className="border border-gray-300 px-2 py-1  md:text-[18px] text-[16px] text-center font-semibold">რეცხვის რაოდენობა (ც.)</th>
                  <th className="border border-gray-300 px-2 py-1  md:text-[18px] text-[16px] text-center font-semibold">გაგზავნილი (ც.)</th>
                  <th className="border border-gray-300 px-2 py-1  md:text-[18px] text-[16px] text-center font-semibold">დეფიციტი (ც.)</th>
                  <th className="border border-gray-300 px-2 py-1  md:text-[18px] text-[16px] text-center font-semibold">სულ წონა (კგ)</th>
                  {showPriceColumn && (
                    <th className="border border-gray-300 px-2 py-1  md:text-[18px] text-[16px] text-center font-semibold"> 1 ც-ის ფასი (₾) *</th>
                  )}
                </>
              )}
              {sheet.sheetType === "STANDARD" && (
                <>
                  <th className="border border-gray-300 px-2 py-1  md:text-[18px] text-[16px] text-center font-semibold">მიღებული (ც.)</th>
                  <th className="border border-gray-300 px-2 py-1  md:text-[18px] text-[16px] text-center font-semibold">გაგზავნილი (ც.)</th>
                  <th className="border border-gray-300 px-2 py-1  md:text-[18px] text-[16px] text-center font-semibold">დეფიციტი (ც.)</th>
                  {showPriceColumn && (
                    <th className="border border-gray-300 px-2 py-1  md:text-[18px] text-[16px] text-center font-semibold"> 1 ც-ის ფასი (₾) *</th>
                  )}
                </>
              )}
              <th className="border border-gray-300 px-2 py-1  md:text-[18px] text-[16px] text-center font-semibold">შენიშვნა</th>
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
                  {renderSectionRows(sortedItems, sheet.sheetType, hasProtectors, hasLinenOrTowels)}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold">
              <td className="border border-gray-300 px-2 py-1 text-left">ჯამი</td>
              {sheet.sheetType === "INDIVIDUAL" && (
                <>
                  <td className="border border-gray-300 px-2 py-1 text-center">-</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{totals.received}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{totals.washCount}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{totals.dispatched}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{totals.shortage}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{totals.totalWeight.toFixed(2)}</td>
                  {showPriceColumn && (
                    <td className="border border-gray-300 px-2 py-1 text-center">
                      {protectorsPrice > 0 ? protectorsPrice.toFixed(2) : "-"}
                    </td>
                  )}
                </>
              )}
              {sheet.sheetType === "STANDARD" && (
                <>
                  <td className="border border-gray-300 px-2 py-1 text-center">{totals.received}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{totals.dispatched}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{totals.shortage}</td>
                  {showPriceColumn && (
                    <td className="border border-gray-300 px-2 py-1 text-center">
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

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">დღის ფურცელი</h2>
        <button
          onClick={handleNewSheet}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + ახალი ფურცელი
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex items-end gap-4 flex-wrap">
        <div>
          <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
            თარიღის ფილტრი
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-black"
          />
        </div>
        <div>
          <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
            დასახელებები
          </label>
          <select
            value={selectedHotel}
            onChange={(e) => setSelectedHotel(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-black min-w-[200px]"
          >
            <option value="">ყველა სასტუმრო</option>
            {hotels.map((hotel) => (
              <option key={hotel.id} value={hotel.hotelName}>
                {hotel.hotelName}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            setSelectedDate("");
            setSelectedHotel("");
          }}
          className="bg-gray-200 text-black px-4 py-2 rounded-lg hover:bg-gray-300 h-[42px]"
        >
          ყველა
        </button>
      </div>

      {/* Add/Edit Form (Modal) */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-10 px-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-7xl">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-black">
                {editingId ? "ფურცლის რედაქტირება" : "ახალი დღის ფურცელი"}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-black text-xl leading-none"
                aria-label="დახურვა"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[16px] font-medium text-black mb-1">
                    თარიღი *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                  />
                </div>
                <div>
                  <label className="block text-[16px] font-medium text-black mb-1">
                    სასტუმრო *
                  </label>
                  <select
                    required
                    value={formData.hotelName}
                    onChange={(e) => {
                      const selectedHotel = hotels.find(h => h.hotelName === e.target.value);
                      setFormData({ 
                        ...formData, 
                        hotelName: e.target.value,
                        pricePerKg: selectedHotel?.pricePerKg !== undefined && selectedHotel?.pricePerKg !== null 
                          ? selectedHotel.pricePerKg 
                          : null
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                  >
                    <option value="">აირჩიეთ სასტუმრო</option>
                    {hotels.map((hotel) => (
                      <option key={hotel.id} value={hotel.hotelName}>
                        {hotel.hotelName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[16px] font-medium text-black mb-1">
                    ფურცლის ტიპი *
                  </label>
                  <select
                    required
                    value={formData.sheetType}
                    onChange={(e) => setFormData({ ...formData, sheetType: e.target.value as "INDIVIDUAL" | "STANDARD" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                  >
                    <option value="INDIVIDUAL">ინდივიდუალური</option>
                    <option value="STANDARD">სტანდარტული</option>
                  </select>
                </div>
              </div>

              {/* Notes Field */}


              {/* Items Table */}
              <div className="mt-6">
                <div className="overflow-x-auto">
                  {(() => {
                    const hasProtectors = formData.items.some(item => item.category === "PROTECTORS");
                    const hasLinenOrTowels = formData.items.some(item => item.category === "LINEN" || item.category === "TOWELS");
                    const showPriceColumn = hasProtectors || hasLinenOrTowels;
                    
                    // Map function that uses showPriceColumn
                    const renderCategoryRows = (category: string) => {
                      const sectionItems = formData.items.filter((i) => i.category === category);
                      const sortedItems = sortItemsByOrder(sectionItems);
                      const isProtectors = category === "PROTECTORS";
                      const colSpanValue = formData.sheetType === "INDIVIDUAL" ? (showPriceColumn ? 9 : 8) : (showPriceColumn ? 6 : 5);
                      
                      return (
                        <React.Fragment key={category}>
                          <tr>
                            <td colSpan={colSpanValue} className="bg-orange-100 border border-gray-300 px-2 py-1 font-semibold">
                              {CATEGORY_LABELS[category]}
                            </td>
                          </tr>
                          {sortedItems.map((item, index) => {
                            const actualIndex = formData.items.findIndex((i) => i === item);
                            const isLinenOrTowel = item.category === "LINEN" || item.category === "TOWELS";
                            return (
                              <tr key={`${item.itemNameKa}-${actualIndex}`} className="bg-white">
                                <td className="border border-gray-300 px-2 py-1">
                                  {item.itemNameKa}
                                </td>
                                {formData.sheetType === "INDIVIDUAL" && (
                                  <>
                                    <td className="border border-gray-300 px-2 py-1">
                                      <input
                                        type="number"
                                        step="0.001"
                                        value={item.weight}
                                        onChange={(e) => handleItemChange(actualIndex, "weight", parseFloat(e.target.value) || 0)}
                                        className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                      />
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1">
                                      <input
                                        type="number"
                                        value={item.received}
                                        onChange={(e) => handleItemChange(actualIndex, "received", parseInt(e.target.value) || 0)}
                                        className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                      />
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1">
                                      <input
                                        type="number"
                                        value={item.washCount}
                                        onChange={(e) => handleItemChange(actualIndex, "washCount", parseInt(e.target.value) || 0)}
                                        className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                      />
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1">
                                      <input
                                        type="number"
                                        value={item.dispatched}
                                        onChange={(e) => handleItemChange(actualIndex, "dispatched", parseInt(e.target.value) || 0)}
                                        className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                      />
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1">
                                      <input
                                        type="number"
                                        value={item.shortage}
                                        onChange={(e) => handleItemChange(actualIndex, "shortage", parseInt(e.target.value) || 0)}
                                        className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                      />
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1 text-center bg-gray-50">
                                      {item.totalWeight.toFixed(2)}
                                    </td>
                                    {showPriceColumn && (
                                      <td className="border border-gray-300 px-2 py-1">
                                        {isProtectors ? (
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={item.price !== undefined && item.price !== null ? item.price : (PROTECTOR_PRICES[item.itemNameKa] || "")}
                                            onChange={(e) => handleItemChange(actualIndex, "price", parseFloat(e.target.value) || 0)}
                                            className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                          />
                                        ) : isLinenOrTowel ? (
                                          <span className="text-center block">0</span>
                                        ) : (
                                          "-"
                                        )}
                                      </td>
                                    )}
                                  </>
                                )}
                                {formData.sheetType === "STANDARD" && (
                                  <>
                                    <td className="border border-gray-300 px-2 py-1">
                                      <input
                                        type="number"
                                        value={item.received}
                                        onChange={(e) => handleItemChange(actualIndex, "received", parseInt(e.target.value) || 0)}
                                        className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                      />
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1">
                                      <input
                                        type="number"
                                        value={item.dispatched}
                                        onChange={(e) => handleItemChange(actualIndex, "dispatched", parseInt(e.target.value) || 0)}
                                        className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                      />
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1">
                                      <input
                                        type="number"
                                        value={item.shortage}
                                        onChange={(e) => handleItemChange(actualIndex, "shortage", parseInt(e.target.value) || 0)}
                                        className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                      />
                                    </td>
                                    {showPriceColumn && (
                                      <td className="border border-gray-300 px-2 py-1">
                                        {isProtectors ? (
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={item.price !== undefined && item.price !== null ? item.price : (PROTECTOR_PRICES[item.itemNameKa] || "")}
                                            onChange={(e) => handleItemChange(actualIndex, "price", parseFloat(e.target.value) || 0)}
                                            className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                          />
                                        ) : isLinenOrTowel ? (
                                          <span className="text-center block">0</span>
                                        ) : (
                                          "-"
                                        )}
                                      </td>
                                    )}
                                  </>
                                )}
                                <td className="border border-gray-300 px-2 py-1">
                                  <input
                                    type="text"
                                    value={item.comment || ""}
                                    onChange={(e) => handleItemChange(actualIndex, "comment", e.target.value)}
                                    className="w-full px-1 py-1 border-0 text-black bg-transparent"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    };
                    
                    return (
                      <table className="w-full border-collapse border border-gray-300  text-[16px]">
                        <thead>
                          <tr className="bg-orange-100">
                            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">დასახელება</th>
                            {formData.sheetType === "INDIVIDUAL" && (
                              <>
                                <th className="border border-gray-300 px-2 py-1 text-center font-semibold">წონა (კგ)</th>
                                <th className="border border-gray-300 px-2 py-1 text-center font-semibold">მიღებული (ც.)</th>
                                <th className="border border-gray-300 px-2 py-1 text-center font-semibold">რეცხვის რაოდენობა (ც.)</th>
                                <th className="border border-gray-300 px-2 py-1 text-center font-semibold">გაგზავნილი (ც.)</th>
                                <th className="border border-gray-300 px-2 py-1 text-center font-semibold">დეფიციტი (ც.)</th>
                                <th className="border border-gray-300 px-2 py-1 text-center font-semibold">სულ წონა (კგ)</th>
                                {showPriceColumn && (
                                  <th className="border border-gray-300 px-2 py-1 text-center font-semibold"> 1 ც-ის ფასი (₾) *</th>
                                )}
                              </>
                            )}
                            {formData.sheetType === "STANDARD" && (
                              <>
                                <th className="border border-gray-300 px-2 py-1 text-center font-semibold">მიღებული (ც.)</th>
                                <th className="border border-gray-300 px-2 py-1 text-center font-semibold">გაგზავნილი (ც.)</th>
                                <th className="border border-gray-300 px-2 py-1 text-center font-semibold">დეფიციტი (ც.)</th>
                                {showPriceColumn && (
                                  <th className="border border-gray-300 px-2 py-1 text-center font-semibold"> 1 ც-ის ფასი (₾) *</th>
                                )}
                              </>
                            )}
                            <th className="border border-gray-300 px-2 py-1 text-center font-semibold">შენიშვნა</th>
                          </tr>
                        </thead>
                        <tbody>
                          {["LINEN", "TOWELS", "PROTECTORS"].map((category) => renderCategoryRows(category))}
                        </tbody>
                    <tfoot>
                      {(() => {
                        const totals = calculateTotals(formData.items);
                        const hasProtectors = formData.items.some(item => item.category === "PROTECTORS");
                        const hasLinenOrTowels = formData.items.some(item => item.category === "LINEN" || item.category === "TOWELS");
                        const showPriceColumn = hasProtectors || hasLinenOrTowels;
                        const protectorsTotalPrice = hasProtectors ? calculateProtectorsPrice(formData.items) : 0;
                        return (
                          <tr className="bg-gray-50 font-semibold">
                            <td className="border border-gray-300 px-2 py-1 text-left">ჯამი</td>
                            {formData.sheetType === "INDIVIDUAL" && (
                              <>
                                <td className="border border-gray-300 px-2 py-1 text-center">-</td>
                                <td className="border border-gray-300 px-2 py-1 text-center">{totals.received}</td>
                                <td className="border border-gray-300 px-2 py-1 text-center">{totals.washCount}</td>
                                <td className="border border-gray-300 px-2 py-1 text-center">{totals.dispatched}</td>
                                <td className="border border-gray-300 px-2 py-1 text-center">{totals.shortage}</td>
                                <td className="border border-gray-300 px-2 py-1 text-center">{totals.totalWeight.toFixed(2)}</td>
                                {showPriceColumn && (
                                  <td className="border border-gray-300 px-2 py-1 text-center">
                                    {protectorsTotalPrice > 0 ? protectorsTotalPrice.toFixed(2) : "-"}
                                  </td>
                                )}
                              </>
                            )}
                            {formData.sheetType === "STANDARD" && (
                              <>
                                <td className="border border-gray-300 px-2 py-1 text-center">{totals.received}</td>
                                <td className="border border-gray-300 px-2 py-1 text-center">{totals.dispatched}</td>
                                <td className="border border-gray-300 px-2 py-1 text-center">{totals.shortage}</td>
                                {showPriceColumn && (
                                  <td className="border border-gray-300 px-2 py-1 text-center">
                                    {protectorsTotalPrice > 0 ? protectorsTotalPrice.toFixed(2) : "-"}
                                  </td>
                                )}
                              </>
                            )}
                            <td className="border border-gray-300 px-2 py-1 text-center">-</td>
                          </tr>
                        );
                      })()}
                    </tfoot>
                  </table>
                    );
                  })()}
                </div>
              </div>

              {formData.sheetType === "STANDARD" && (() => {
                const hasProtectors = formData.items.some(item => item.category === "PROTECTORS");
                const hasLinenOrTowels = formData.items.some(item => item.category === "LINEN" || item.category === "TOWELS");
                
                const linenTowelsPrice = formData.totalWeight && formData.pricePerKg 
                  ? formData.totalWeight * formData.pricePerKg 
                  : 0;
                // Calculate protectors price from items: price * received
                const protectorsPrice = hasProtectors ? calculateProtectorsPrice(formData.items) : 0;
                const totalSum = linenTowelsPrice + protectorsPrice;
                
                return (
                  <div className="mt-4 space-y-4">
                    {hasLinenOrTowels && (
                      <>
                        <div>
                          <label className="block text-[16px] font-medium text-black mb-1">
                            მთლიანი წონა (კგ) *
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            required={hasLinenOrTowels}
                            value={formData.totalWeight || ""}
                            onChange={(e) => setFormData({ ...formData, totalWeight: parseFloat(e.target.value) || null })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                            placeholder="შეიყვანეთ მთლიანი წონა"
                          />
                        </div>
                        <div>
                          <label className="block text-[16px] font-medium text-black mb-1">
                            1 ც-ის ფასი (₾) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            required={hasLinenOrTowels}
                            value={formData.pricePerKg !== null && formData.pricePerKg !== undefined ? formData.pricePerKg : ""}
                            onChange={(e) => {
                              const value = e.target.value === "" ? null : parseFloat(e.target.value);
                              setFormData({ ...formData, pricePerKg: isNaN(value as number) ? null : value });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                            placeholder="შეიყვანეთ 1 კგ-ის ფასი"
                          />
                        </div>
                      </>
                    )}
                    {hasProtectors && protectorsPrice > 0 && (
                      <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[16px] font-semibold text-black">დამცავების ფასი:</span>
                          <span className="text-[18px] font-bold text-purple-700">
                            {protectorsPrice.toFixed(2)} ₾
                          </span>
                        </div>
                      </div>
                    )}
                    {totalSum > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-md p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[16px] font-semibold text-black">ჯამი (მთლიანი ფასი):</span>
                          <span className="text-[18px] font-bold text-green-700">
                            {totalSum.toFixed(2)} ₾
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {formData.sheetType === "INDIVIDUAL" && (() => {
                const hasProtectors = formData.items.some(item => item.category === "PROTECTORS");
                const hasLinenOrTowels = formData.items.some(item => item.category === "LINEN" || item.category === "TOWELS");
                
                if (hasProtectors || hasLinenOrTowels) {
                  const totals = calculateTotals(formData.items);
                  const linenTowelsPrice = formData.pricePerKg && totals.totalWeight 
                    ? formData.pricePerKg * totals.totalWeight 
                    : 0;
                  // Calculate protectors price from items: price * received
                  const protectorsPrice = hasProtectors ? calculateProtectorsPrice(formData.items) : 0;
                  const totalSum = linenTowelsPrice + protectorsPrice;
                  
                  return (
                    <div className="mt-4 space-y-4">
                      {hasProtectors && protectorsPrice > 0 && (
                        <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                          <div className="flex justify-between items-center">
                            <span className="text-[16px] font-semibold text-black">დამცავების ფასი:</span>
                            <span className="text-[18px] font-bold text-purple-700">
                              {protectorsPrice.toFixed(2)} ₾
                            </span>
                          </div>
                        </div>
                      )}
                      {totalSum > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-md p-4">
                          <div className="flex justify-between items-center">
                            <span className="text-[16px] font-semibold text-black">ჯამი (მთლიანი ფასი):</span>
                            <span className="text-[18px] font-bold text-green-700">
                              {totalSum.toFixed(2)} ₾
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}

              <div className="flex space-x-2 mt-4">
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
        </div>
      )}

      {/* Sheets List */}
      <div className="space-y-6">
        {filteredSheets.map((sheet) => {
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
                      {sheet.hotelName}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                      <span>{formatDateGe(sheet.date)}</span>
                      <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold">
                        გაგზავნილი {sheet.emailSendCount ?? 0}x
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleEdit(sheet)}
                    className="text-blue-600 hover:underline px-2"
                  >
                    რედაქტირება
                  </button>
                  <button
                    onClick={() => handleDelete(sheet.id)}
                    className="text-red-600 hover:underline px-2"
                  >
                    წაშლა
                  </button>
                  <button
                    onClick={() => {
                      setEmailModal({ open: true, sheetId: sheet.id });
                      setModalEmail(deriveHotelEmail(sheet.hotelName));
                    }}
                    className="text-green-700 hover:underline px-2"
                  >
                    გაგზავნა მეილზე
                  </button>
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

      {filteredSheets.length === 0 && (
        <div className="text-center py-8 text-black">
          დღის ფურცლები არ მოიძებნა
        </div>
      )}

      {emailModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-black mb-4">გაგზავნა მეილზე</h3>
            <div className="space-y-3">
              <p className="text-[16px] text-gray-700 mb-4">
                ელფოსტა ავტომატურად გაიგზავნება სასტუმროს ელ.ფოსტაზე
                {modalEmail ? `: ${modalEmail}` : " (ელფოსტა არ მოიძებნა)"}
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={handleSendEmail}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  გაგზავნა
                </button>
                <button
                  onClick={() => setEmailModal({ open: false, sheetId: null })}
                  className="bg-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  გაუქმება
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
