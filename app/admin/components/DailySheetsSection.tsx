"use client";

import React, { useEffect, useState } from "react";
import { getApiPath } from "@/lib/api-helper";
import { FormattedDateInput } from "./ui/DatePickerSection";

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
  roomNumber?: string | null;
  shiftType?: string | null;
  description: string | null;
  notes: string | null;
  pricePerKg: number | null;
  sheetType: string;
  totalWeight: number | null;
  totalPrice: number | null;
  items: DailySheetItem[];
  createdAt: string;
  emailSendCount?: number;
  confirmedBy?: string | null;
  confirmedAt?: string | null;
  confirmedByUser?: {
    name: string | null;
    email: string;
    role: string;
  } | null;
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
  "პლედი": 5,
  "მძიმე წონა": 2.5,
};

const PROTECTOR_ITEMS: Omit<DailySheetItem, "id" | "totalWeight">[] = [
  { category: "PROTECTORS", itemNameKa: "საბანი დიდი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0, price: 15 },
  { category: "PROTECTORS", itemNameKa: "საბანი პატარა", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0, price: 10 },
  { category: "PROTECTORS", itemNameKa: "მატრასის დამცავი დიდი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0, price: 15 },
  { category: "PROTECTORS", itemNameKa: "მატრასის დამცავი პატარა", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0, price: 10 },
  { category: "PROTECTORS", itemNameKa: "ბალიში დიდი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0, price: 7 },
  { category: "PROTECTORS", itemNameKa: "ბალიში პატარა", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0, price: 5 },
  { category: "PROTECTORS", itemNameKa: "ბალიში საბავშვო", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0, price: 5 },
  { category: "PROTECTORS", itemNameKa: "პლედი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0, price: 5 },
  { category: "PROTECTORS", itemNameKa: "მძიმე წონა", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0, price: 2.5 },
];

export default function DailySheetsSection() {
  const [sheets, setSheets] = useState<DailySheet[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedHotel, setSelectedHotel] = useState<string>("");
  const [allMonths, setAllMonths] = useState<string[]>([]);
  const [expandedSheets, setExpandedSheets] = useState<Set<string>>(new Set()); // Track which sheets are expanded
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [emailModal, setEmailModal] = useState<{ open: boolean; sheetId: string | null }>({
    open: false,
    sheetId: null,
  });
  const [modalEmail, setModalEmail] = useState<string | null>(null);
  const [editingWeight, setEditingWeight] = useState<{ sheetId: string | null; value: string }>({
    sheetId: null,
    value: "",
  });
  const [savingWeightId, setSavingWeightId] = useState<string | null>(null);
  const [numericDrafts, setNumericDrafts] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    hotelName: "",
    shiftType: "DAY" as "" | "DAY" | "NIGHT",
    description: "",
    notes: "",
    sheetType: "STANDARD" as "INDIVIDUAL" | "STANDARD",
    totalWeight: null as number | null,
    pricePerKg: null as number | null,
    totalPrice: null as number | null, // For PROTECTORS manual price
    items: [] as DailySheetItem[],
  });

  const getDraftValue = (key: string, fallback: string) =>
    Object.prototype.hasOwnProperty.call(numericDrafts, key) ? numericDrafts[key] : fallback;

  const isAllowedDecimalDraft = (value: string) => /^-?\d*(?:[.,]\d*)?$/.test(value);
  const setDecimalDraft = (key: string, next: string) => {
    if (next === "" || isAllowedDecimalDraft(next)) {
      setNumericDrafts((prev) => ({ ...prev, [key]: next }));
    }
  };

  const setIntegerDraft = (key: string, next: string) => {
    // Don't block typing; we'll sanitize/parse on commit.
    setNumericDrafts((prev) => ({ ...prev, [key]: next }));
  };

  const commitDecimalDraft = (
    key: string,
    opts: { allowNull: boolean; onCommit: (n: number | null) => void }
  ) => {
    const raw = (numericDrafts[key] ?? "").trim();
    if (raw === "") {
      opts.onCommit(opts.allowNull ? null : 0);
      setNumericDrafts((prev) => {
        const { [key]: _removed, ...rest } = prev;
        return rest;
      });
      return;
    }

    const normalized = raw.replace(",", ".");
    const parsed = parseFloat(normalized);
    if (!Number.isFinite(parsed)) return;

    opts.onCommit(parsed);
    setNumericDrafts((prev) => {
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const commitIntegerDraft = (
    key: string,
    opts: { allowNull: boolean; onCommit: (n: number | null) => void }
  ) => {
    const raw = (numericDrafts[key] ?? "").trim();
    if (raw === "") {
      opts.onCommit(opts.allowNull ? null : 0);
      setNumericDrafts((prev) => {
        const { [key]: _removed, ...rest } = prev;
        return rest;
      });
      return;
    }

    const digitsOnly = raw.replace(/[^\d]/g, "");
    if (digitsOnly === "") return;

    const parsed = parseInt(digitsOnly, 10);
    if (!Number.isFinite(parsed)) return;

    opts.onCommit(parsed);
    setNumericDrafts((prev) => {
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  };

  useEffect(() => {
    fetchSheets();
    fetchHotels();
  }, []);

  useEffect(() => {
    console.log("Hotels state updated:", hotels.length, "hotels");
    if (hotels.length > 0) {
      console.log("Sample hotel:", hotels[0]);
    }
  }, [hotels]);

  const fetchHotels = async () => {
    try {
      const apiPath = getApiPath("our-hotels");
      const response = await fetch(apiPath);
      if (!response.ok) {
        throw new Error("სასტუმროების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      console.log("Fetched hotels from API:", data?.length || 0, "hotels");
      // Normalize shape from our-hotels API and sort by hotelName alphabetically
      const normalizedHotels = Array.isArray(data)
        ? data
            .filter((hotel: any) => {
              // Only filter out hotels that are null/undefined or have no hotelName
              const isValid = hotel && hotel.hotelName && hotel.hotelName.trim() !== "";
              if (!isValid) {
                console.warn("Filtered out invalid hotel:", hotel);
              }
              return isValid;
            })
            .map((hotel: any) => ({
              id: hotel.id,
              hotelName: hotel.hotelName.trim(),
              contactPhone: hotel.mobileNumber || "",
              email: hotel.email || "",
              pricePerKg: hotel.pricePerKg || 0,
            }))
        : [];
      console.log("Normalized hotels:", normalizedHotels.length, "hotels");
      // Sort hotels alphabetically by hotelName
      normalizedHotels.sort((a, b) => {
        if (!a.hotelName) return 1;
        if (!b.hotelName) return -1;
        return a.hotelName.localeCompare(b.hotelName, 'ka', { sensitivity: 'base' });
      });
      setHotels(normalizedHotels);
      console.log("Set hotels state:", normalizedHotels.length, "hotels");
    } catch (err) {
      console.error("Hotels fetch error:", err);
      setError("სასტუმროების ჩატვირთვა ვერ მოხერხდა");
    }
  };

  const fetchSheets = async () => {
    try {
      setLoading(true);
      setError("");
      const apiPath = getApiPath("daily-sheets");
      const response = await fetch(apiPath);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error("API error response:", errorMessage, "Status:", response.status);
        throw new Error(errorMessage || "დღის ფურცლების ჩატვირთვა ვერ მოხერხდა");
      }
      
      const data = await response.json();
      console.log("Fetched sheets:", data);
      console.log("Sheets count:", data?.length || 0);
      if (data && data.length > 0) {
        console.log("First sheet date:", data[0].date, "type:", typeof data[0].date);
      }
      
      if (!Array.isArray(data)) {
        console.error("Expected array but got:", typeof data, data);
        throw new Error("მონაცემები არასწორი ფორმატისაა");
      }
      
      const sheetsData: DailySheet[] = data || [];
      setSheets(sheetsData);

      // Extract available months from daily sheet dates
      const months = new Set<string>();
      sheetsData.forEach((sheet) => {
        const d = new Date(sheet.date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        months.add(`${year}-${month}`);
      });
      setAllMonths(Array.from(months).sort().reverse());
    } catch (err) {
      console.error("Fetch sheets error:", err);
      const errorMessage = err instanceof Error ? err.message : "დაფიქსირდა შეცდომა";
      setError(errorMessage);
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

  const startEditHeaderWeight = (sheet: DailySheet, currentWeight: number) => {
    if (sheet.sheetType !== "STANDARD") return;
    setEditingWeight({
      sheetId: sheet.id,
      value: currentWeight.toFixed(3),
    });
  };

  const handleHeaderWeightSave = async (sheet: DailySheet) => {
    if (editingWeight.sheetId !== sheet.id) return;

    const rawValue = editingWeight.value.replace(",", ".").trim();
    const parsed = parseFloat(rawValue);

    if (!rawValue || isNaN(parsed) || parsed <= 0) {
      setError("გთხოვთ შეიყვანოთ სწორი წონა");
      return;
    }

    setError("");
    setSavingWeightId(sheet.id);

    try {
      const url = `/api/admin/daily-sheets/${sheet.id}`;

      const body = {
        date: sheet.date,
        hotelName: sheet.hotelName,
        roomNumber: sheet.roomNumber ?? null,
        description: sheet.description,
        notes: sheet.notes,
        sheetType: sheet.sheetType,
        shiftType: sheet.shiftType ?? null,
        totalWeight: parsed,
        pricePerKg: sheet.pricePerKg,
        totalPrice: sheet.totalPrice,
        items: sheet.items.map((item) => ({
          ...item,
          totalWeight: item.totalWeight ?? item.weight ?? 0,
        })),
      };

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "წონის განახლება ვერ მოხერხდა");
      }

      await fetchSheets();
      setEditingWeight({ sheetId: null, value: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setSavingWeightId(null);
    }
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
      const apiPath = getApiPath("daily-sheets", "send-email");
      const res = await fetch(apiPath, {
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
      shiftType: (sheet.shiftType as "" | "DAY" | "NIGHT") || "",
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
      const apiPath = getApiPath("daily-sheets");
      const response = await fetch(`${apiPath}/${id}`, {
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
      shiftType: "DAY" as "" | "DAY" | "NIGHT",
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
      shiftType: "DAY" as "" | "DAY" | "NIGHT",
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
  
  // Helper to get YYYY-MM key from date
  const getMonthKey = (date: string | Date): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  const formatMonthGe = (monthKey: string) => {
    const [year, monthNum] = monthKey.split("-");
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
    const monthIndex = parseInt(monthNum, 10) - 1;
    return `${months[monthIndex]} ${year}`;
  };

  const filteredSheets = sheets.filter(sheet => {
    const monthKey = getMonthKey(sheet.date);
    const monthMatch = !selectedMonth || monthKey === selectedMonth;
    const hotelMatch = !selectedHotel || sheet.hotelName === selectedHotel;
    return monthMatch && hotelMatch;
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

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(monthKey)) {
        next.delete(monthKey);
      } else {
        next.add(monthKey);
      }
      return next;
    });
  };

  // Group filtered sheets by month for accordion-style display
  const sheetsByMonth = filteredSheets.reduce<Record<string, DailySheet[]>>((acc, sheet) => {
    const key = getMonthKey(sheet.date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(sheet);
    return acc;
  }, {});

  const toggleDay = (dayKey: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayKey)) {
        next.delete(dayKey);
      } else {
        next.add(dayKey);
      }
      return next;
    });
  };

  const renderSectionRows = (items: DailySheetItem[], sheetType: string = "INDIVIDUAL", hasProtectors: boolean = false, hasLinenOrTowels: boolean = false) =>
    items.map((item, idx) => {
      const isProtector = item.category === "PROTECTORS";
      const isLinenOrTowel = item.category === "LINEN" || item.category === "TOWELS";
      const itemPrice = item.price || PROTECTOR_PRICES[item.itemNameKa] || 0;
      // დამცავებისთვის: ფასი * გაგზავნილი რაოდენობა (dispatched)
      const itemTotalPrice = isProtector ? (itemPrice * (item.dispatched || 0)) : 0;
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

  // დამცავების ჯამის გამოთვლა:
  // ფორმულა: თითოეული დამცავისთვის = (ფასი * გაგზავნილი რაოდენობა)
  // ჯამი = ყველა დამცავის ჯამი
  // მაგალითი: საბანი დიდი (15₾) * 2 ცალი (გაგზავნილი) = 30₾
  //           + ბალიში დიდი (7₾) * 3 ცალი (გაგზავნილი) = 21₾
  //           = სულ: 51₾
  const calculateProtectorsPrice = (items: DailySheetItem[]): number => {
    return items
      .filter(item => item.category === "PROTECTORS") // მხოლოდ დამცავები
      .reduce((sum, item) => {
        // აიღე ფასი: ან item.price-დან, ან PROTECTOR_PRICES-დან, ან 0
        const price = item.price || PROTECTOR_PRICES[item.itemNameKa] || 0;
        // დაუმატე ჯამს: ფასი * გაგზავნილი რაოდენობა (dispatched)
        return sum + (price * (item.dispatched || 0));
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
    
    // დამცავების ფასის გამოთვლა (STANDARD და INDIVIDUAL ტიპებისთვის)
    // თუ STANDARD ტიპია და totalPrice არის, გამოიყენე ის
    // წინააღმდეგ შემთხვევაში გამოთვალე პროდუქტებიდან: ფასი * მიღებული
    if (hasProtectors) {
      if (sheet.sheetType === "STANDARD" && sheet.totalPrice) {
        // STANDARD ტიპისთვის: გამოიყენე ხელით შეყვანილი totalPrice
        protectorsPrice = sheet.totalPrice;
      } else {
        // INDIVIDUAL ტიპისთვის ან თუ totalPrice არ არის: გამოთვალე პროდუქტებიდან
        // calculateProtectorsPrice ფუნქცია: თითოეული დამცავისთვის (ფასი * მიღებული)
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
            <tr className="bg-white">
              <th className="border border-gray-300 px-2 py-1 text-black  md:text-[18px] text-[16px] text-left font-semibold">დასახელება</th>
              {sheet.sheetType === "INDIVIDUAL" && (
                <>
                  <th className="border border-gray-300 px-2 py-1 text-black  md:text-[18px] text-[16px] text-center font-semibold">წონა (კგ)</th>
                  <th className="border border-gray-300 px-2 py-1 text-black  md:text-[18px] text-[16px] text-center font-semibold">მიღებული (ც.)</th>
                  <th className="border border-gray-300 px-2 py-1 text-black  md:text-[18px] text-[16px] text-center font-semibold">რეცხვის რაოდენობა (ც.)</th>
                  <th className="border border-gray-300 px-2 py-1 text-black  md:text-[18px] text-[16px] text-center font-semibold">გაგზავნილი (ც.)</th>
                  <th className="border border-gray-300 px-2 py-1 text-black  md:text-[18px] text-[16px] text-center font-semibold">დატოვებული (ც.)</th>
                  <th className="border border-gray-300 px-2 py-1 text-black  md:text-[18px] text-[16px] text-center font-semibold">სულ წონა (კგ)</th>
                  {showPriceColumn && (
                    <th className="border border-gray-300 px-2 py-1  md:text-[18px] text-[16px] text-center font-semibold"> 1 ც-ის ფასი (₾) *</th>
                  )}
                </>
              )}
              {sheet.sheetType === "STANDARD" && (
                <>
                  <th className="border border-gray-300 px-2 py-1 text-black  md:text-[18px] text-[16px] text-center font-semibold">მიღებული (ც.)</th>
                  <th className="border border-gray-300 px-2 py-1 text-black  md:text-[18px] text-[16px] text-center font-semibold">გაგზავნილი (ც.)</th>
                  <th className="border border-gray-300 px-2 py-1 text-black  md:text-[18px] text-[16px] text-center font-semibold">დატოვებული (ც.)</th>
                  {showPriceColumn && (
                    <th className="border border-gray-300 px-2 py-1 text-black  md:text-[18px] text-[16px] text-center font-semibold"> 1 ც-ის ფასი (₾) *</th>
                  )}
                </>
              )}
              <th className="border border-gray-300 px-2 py-1 text-black  md:text-[18px] text-[16px] text-center font-semibold">შენიშვნა</th>
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
            <tr className="bg-white font-semibold">
              <td className="border border-gray-300 px-2 py-1 text-left text-black">ჯამი</td>
              {sheet.sheetType === "INDIVIDUAL" && (
                <>
                  <td className="border border-gray-300 px-2 py-1 text-center text-black  ">-</td>
                  <td className="border border-gray-300 px-2 py-1 text-center text-black ">{totals.received}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center text-black ">{totals.washCount}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center text-black ">{totals.dispatched}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center text-black ">{totals.shortage}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center text-black ">{totals.totalWeight.toFixed(2)}</td>
                  {showPriceColumn && (
                    <td className="border border-gray-300 px-2 py-1 text-center text-black ">
                      {protectorsPrice > 0 ? protectorsPrice.toFixed(2) : "-"}
                    </td>
                  )}
                </>
              )}
              {sheet.sheetType === "STANDARD" && (
                <>
                  <td className="border border-gray-300 px-2 py-1 text-center text-black ">{totals.received}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center text-black ">{totals.dispatched}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center text-black ">{totals.shortage}</td>
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
              <tr className=" font-semibold">
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
              <tr className=" font-semibold">
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
              <tr className="bg-white font-semibold">
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
              <tr className="bg-white font-bold">
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
        <div className="bg-white border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex items-end gap-4 flex-wrap">
        <div>
          <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
            თვე
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-black min-w-[200px]"
          >
            <option value="">ყველა თვე</option>
            {allMonths.map((month) => (
              <option key={month} value={month}>
                {formatMonthGe(month)}
              </option>
            ))}
          </select>
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
            setSelectedMonth("");
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[16px] font-medium text-black mb-1">
                    თარიღი *
                  </label>
                  <FormattedDateInput
                    value={formData.date}
                    required
                    onChange={(date) => setFormData({ ...formData, date })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                  />
                </div>
                <div>
                  <label className="block text-[16px] font-medium text-black mb-1">
                    სასტუმრო * ({hotels.length} სასტუმრო)
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white"
                    style={{ 
                      appearance: 'auto',
                      WebkitAppearance: 'menulist',
                      MozAppearance: 'menulist'
                    }}
                  >
                    <option value="">აირჩიეთ სასტუმრო</option>
                    {hotels.length > 0 ? (
                      hotels.map((hotel) => (
                        <option key={hotel.id} value={hotel.hotelName}>
                          {hotel.hotelName}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>სასტუმროები იტვირთება...</option>
                    )}
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
                <div>
                  <label className="block text-[16px] font-medium text-black mb-1">
                    ცვლა
                  </label>
                  <select
                    value={formData.shiftType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shiftType: e.target.value as "" | "DAY" | "NIGHT",
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white"
                    style={{
                      appearance: "auto",
                      WebkitAppearance: "menulist",
                      MozAppearance: "menulist",
                    }}
                  >
                    <option value="">არჩეული არაა</option>
                    <option value="DAY">დღის ცვლა</option>
                    <option value="NIGHT">ღამის ცვლა</option>
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
                                        type="text"
                                        inputMode="decimal"
                                        value={getDraftValue(`item-${actualIndex}-weight`, String(item.weight ?? ""))}
                                        onChange={(e) => {
                                          const next = e.target.value;
                                          setDecimalDraft(`item-${actualIndex}-weight`, next);
                                          const normalized = next.replace(",", ".");
                                          if (
                                            normalized !== "" &&
                                            !normalized.endsWith(".") &&
                                            !normalized.endsWith(",") &&
                                            Number.isFinite(parseFloat(normalized))
                                          ) {
                                            handleItemChange(actualIndex, "weight", parseFloat(normalized));
                                          }
                                          if (normalized === "") handleItemChange(actualIndex, "weight", 0);
                                        }}
                                        onBlur={() =>
                                          commitDecimalDraft(`item-${actualIndex}-weight`, {
                                            allowNull: false,
                                            onCommit: (n) => handleItemChange(actualIndex, "weight", n ?? 0),
                                          })
                                        }
                                        className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                      />
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={getDraftValue(`item-${actualIndex}-received`, String(item.received ?? ""))}
                                        onChange={(e) => {
                                          const next = e.target.value;
                                          setDecimalDraft(`item-${actualIndex}-received`, next);
                                          const normalized = next.replace(",", ".");
                                          if (
                                            normalized !== "" &&
                                            !normalized.endsWith(".") &&
                                            !normalized.endsWith(",") &&
                                            Number.isFinite(parseFloat(normalized))
                                          ) {
                                            handleItemChange(actualIndex, "received", parseFloat(normalized));
                                          }
                                          if (normalized === "") handleItemChange(actualIndex, "received", 0);
                                        }}
                                        onBlur={() =>
                                          commitDecimalDraft(`item-${actualIndex}-received`, {
                                            allowNull: false,
                                            onCommit: (n) => handleItemChange(actualIndex, "received", n ?? 0),
                                          })
                                        }
                                        className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                      />
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={getDraftValue(`item-${actualIndex}-washCount`, String(item.washCount ?? ""))}
                                        onChange={(e) => {
                                          const next = e.target.value;
                                          setDecimalDraft(`item-${actualIndex}-washCount`, next);
                                          const normalized = next.replace(",", ".");
                                          if (
                                            normalized !== "" &&
                                            !normalized.endsWith(".") &&
                                            !normalized.endsWith(",") &&
                                            Number.isFinite(parseFloat(normalized))
                                          ) {
                                            handleItemChange(actualIndex, "washCount", parseFloat(normalized));
                                          }
                                          if (normalized === "") handleItemChange(actualIndex, "washCount", 0);
                                        }}
                                        onBlur={() =>
                                          commitDecimalDraft(`item-${actualIndex}-washCount`, {
                                            allowNull: false,
                                            onCommit: (n) => handleItemChange(actualIndex, "washCount", n ?? 0),
                                          })
                                        }
                                        className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                      />
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={getDraftValue(`item-${actualIndex}-dispatched`, String(item.dispatched ?? ""))}
                                        onChange={(e) => {
                                          const next = e.target.value;
                                          setDecimalDraft(`item-${actualIndex}-dispatched`, next);
                                          const normalized = next.replace(",", ".");
                                          if (
                                            normalized !== "" &&
                                            !normalized.endsWith(".") &&
                                            !normalized.endsWith(",") &&
                                            Number.isFinite(parseFloat(normalized))
                                          ) {
                                            handleItemChange(actualIndex, "dispatched", parseFloat(normalized));
                                          }
                                          if (normalized === "") handleItemChange(actualIndex, "dispatched", 0);
                                        }}
                                        onBlur={() =>
                                          commitDecimalDraft(`item-${actualIndex}-dispatched`, {
                                            allowNull: false,
                                            onCommit: (n) => handleItemChange(actualIndex, "dispatched", n ?? 0),
                                          })
                                        }
                                        className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                      />
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={getDraftValue(`item-${actualIndex}-shortage`, String(item.shortage ?? ""))}
                                        onChange={(e) => {
                                          const next = e.target.value;
                                          setDecimalDraft(`item-${actualIndex}-shortage`, next);
                                          const normalized = next.replace(",", ".");
                                          if (
                                            normalized !== "" &&
                                            !normalized.endsWith(".") &&
                                            !normalized.endsWith(",") &&
                                            Number.isFinite(parseFloat(normalized))
                                          ) {
                                            handleItemChange(actualIndex, "shortage", parseFloat(normalized));
                                          }
                                          if (normalized === "") handleItemChange(actualIndex, "shortage", 0);
                                        }}
                                        onBlur={() =>
                                          commitDecimalDraft(`item-${actualIndex}-shortage`, {
                                            allowNull: false,
                                            onCommit: (n) => handleItemChange(actualIndex, "shortage", n ?? 0),
                                          })
                                        }
                                        className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                      />
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1 text-center bg-white">
                                      {item.totalWeight.toFixed(2)}
                                    </td>
                                    {showPriceColumn && (
                                      <td className="border border-gray-300 px-2 py-1">
                                        {isProtectors ? (
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            value={getDraftValue(
                                              `item-${actualIndex}-price`,
                                              String(
                                                item.price !== undefined && item.price !== null
                                                  ? item.price
                                                  : PROTECTOR_PRICES[item.itemNameKa] || ""
                                              )
                                            )}
                                            onChange={(e) => {
                                              const next = e.target.value;
                                              setDecimalDraft(`item-${actualIndex}-price`, next);
                                              const normalized = next.replace(",", ".");
                                              if (
                                                normalized !== "" &&
                                                !normalized.endsWith(".") &&
                                                !normalized.endsWith(",") &&
                                                Number.isFinite(parseFloat(normalized))
                                              ) {
                                                handleItemChange(actualIndex, "price", parseFloat(normalized));
                                              }
                                              if (normalized === "") handleItemChange(actualIndex, "price", 0);
                                            }}
                                            onBlur={() =>
                                              commitDecimalDraft(`item-${actualIndex}-price`, {
                                                allowNull: false,
                                                onCommit: (n) => handleItemChange(actualIndex, "price", n ?? 0),
                                              })
                                            }
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
                                        type="text"
                                        inputMode="decimal"
                                        value={getDraftValue(`item-${actualIndex}-received`, String(item.received ?? ""))}
                                        onChange={(e) => {
                                          const next = e.target.value;
                                          setDecimalDraft(`item-${actualIndex}-received`, next);
                                          const normalized = next.replace(",", ".");
                                          if (
                                            normalized !== "" &&
                                            !normalized.endsWith(".") &&
                                            !normalized.endsWith(",") &&
                                            Number.isFinite(parseFloat(normalized))
                                          ) {
                                            handleItemChange(actualIndex, "received", parseFloat(normalized));
                                          }
                                          if (normalized === "") handleItemChange(actualIndex, "received", 0);
                                        }}
                                        onBlur={() =>
                                          commitDecimalDraft(`item-${actualIndex}-received`, {
                                            allowNull: false,
                                            onCommit: (n) => handleItemChange(actualIndex, "received", n ?? 0),
                                          })
                                        }
                                        className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                      />
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={getDraftValue(`item-${actualIndex}-dispatched`, String(item.dispatched ?? ""))}
                                        onChange={(e) => {
                                          const next = e.target.value;
                                          setDecimalDraft(`item-${actualIndex}-dispatched`, next);
                                          const normalized = next.replace(",", ".");
                                          if (
                                            normalized !== "" &&
                                            !normalized.endsWith(".") &&
                                            !normalized.endsWith(",") &&
                                            Number.isFinite(parseFloat(normalized))
                                          ) {
                                            handleItemChange(actualIndex, "dispatched", parseFloat(normalized));
                                          }
                                          if (normalized === "") handleItemChange(actualIndex, "dispatched", 0);
                                        }}
                                        onBlur={() =>
                                          commitDecimalDraft(`item-${actualIndex}-dispatched`, {
                                            allowNull: false,
                                            onCommit: (n) => handleItemChange(actualIndex, "dispatched", n ?? 0),
                                          })
                                        }
                                        className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                      />
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={getDraftValue(`item-${actualIndex}-shortage`, String(item.shortage ?? ""))}
                                        onChange={(e) => {
                                          const next = e.target.value;
                                          setDecimalDraft(`item-${actualIndex}-shortage`, next);
                                          const normalized = next.replace(",", ".");
                                          if (
                                            normalized !== "" &&
                                            !normalized.endsWith(".") &&
                                            !normalized.endsWith(",") &&
                                            Number.isFinite(parseFloat(normalized))
                                          ) {
                                            handleItemChange(actualIndex, "shortage", parseFloat(normalized));
                                          }
                                          if (normalized === "") handleItemChange(actualIndex, "shortage", 0);
                                        }}
                                        onBlur={() =>
                                          commitDecimalDraft(`item-${actualIndex}-shortage`, {
                                            allowNull: false,
                                            onCommit: (n) => handleItemChange(actualIndex, "shortage", n ?? 0),
                                          })
                                        }
                                        className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                      />
                                    </td>
                                    {showPriceColumn && (
                                      <td className="border border-gray-300 px-2 py-1">
                                        {isProtectors ? (
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            value={getDraftValue(
                                              `item-${actualIndex}-price`,
                                              String(
                                                item.price !== undefined && item.price !== null
                                                  ? item.price
                                                  : PROTECTOR_PRICES[item.itemNameKa] || ""
                                              )
                                            )}
                                            onChange={(e) => {
                                              const next = e.target.value;
                                              setDecimalDraft(`item-${actualIndex}-price`, next);
                                              const normalized = next.replace(",", ".");
                                              if (
                                                normalized !== "" &&
                                                !normalized.endsWith(".") &&
                                                !normalized.endsWith(",") &&
                                                Number.isFinite(parseFloat(normalized))
                                              ) {
                                                handleItemChange(actualIndex, "price", parseFloat(normalized));
                                              }
                                              if (normalized === "") handleItemChange(actualIndex, "price", 0);
                                            }}
                                            onBlur={() =>
                                              commitDecimalDraft(`item-${actualIndex}-price`, {
                                                allowNull: false,
                                                onCommit: (n) => handleItemChange(actualIndex, "price", n ?? 0),
                                              })
                                            }
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
                          <tr className="bg-white">
                            <th className="border border-gray-300 px-2 py-1 text-left font-semibold">დასახელება</th>
                            {formData.sheetType === "INDIVIDUAL" && (
                              <>
                                <th className="border border-gray-300 px-2 py-1 text-center font-semibold">წონა (კგ)</th>
                                <th className="border border-gray-300 px-2 py-1 text-center font-semibold">მიღებული (ც.)</th>
                                <th className="border border-gray-300 px-2 py-1 text-center font-semibold">რეცხვის რაოდენობა (ც.)</th>
                                <th className="border border-gray-300 px-2 py-1 text-center font-semibold">გაგზავნილი (ც.)</th>
                                <th className="border border-gray-300 px-2 py-1 text-center font-semibold">დატოვებული (ც.)</th>
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
                                <th className="border border-gray-300 px-2 py-1 text-center font-semibold">დატოვებული (ც.)</th>
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
                          <tr className="bg-white font-semibold">
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
                            type="text"
                            inputMode="decimal"
                            required={hasLinenOrTowels}
                            value={getDraftValue("form-totalWeight", formData.totalWeight !== null ? String(formData.totalWeight) : "")}
                            onChange={(e) => {
                              const next = e.target.value;
                              setDecimalDraft("form-totalWeight", next);
                              const normalized = next.replace(",", ".");
                              if (
                                normalized !== "" &&
                                !normalized.endsWith(".") &&
                                !normalized.endsWith(",") &&
                                Number.isFinite(parseFloat(normalized))
                              ) {
                                setFormData({ ...formData, totalWeight: parseFloat(normalized) });
                              }
                              if (normalized === "") setFormData({ ...formData, totalWeight: null });
                            }}
                            onBlur={() =>
                              commitDecimalDraft("form-totalWeight", {
                                allowNull: true,
                                onCommit: (n) => setFormData({ ...formData, totalWeight: n }),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                            placeholder="შეიყვანეთ მთლიანი წონა"
                          />
                        </div>
                        <div>
                          <label className="block text-[16px] font-medium text-black mb-1">
                            1 კგ-ის ფასი (₾) *
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            required={hasLinenOrTowels}
                            value={getDraftValue(
                              "form-pricePerKg",
                              formData.pricePerKg !== null && formData.pricePerKg !== undefined ? String(formData.pricePerKg) : ""
                            )}
                            onChange={(e) => {
                              const next = e.target.value;
                              setDecimalDraft("form-pricePerKg", next);
                              const normalized = next.replace(",", ".");
                              if (
                                normalized !== "" &&
                                !normalized.endsWith(".") &&
                                !normalized.endsWith(",") &&
                                Number.isFinite(parseFloat(normalized))
                              ) {
                                setFormData({ ...formData, pricePerKg: parseFloat(normalized) });
                              }
                              if (normalized === "") setFormData({ ...formData, pricePerKg: null });
                            }}
                            onBlur={() =>
                              commitDecimalDraft("form-pricePerKg", {
                                allowNull: true,
                                onCommit: (n) => setFormData({ ...formData, pricePerKg: n }),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                            placeholder="შეიყვანეთ 1 კგ-ის ფასი"
                          />
                        </div>
                      </>
                    )}
                    {hasProtectors && protectorsPrice > 0 && (
                      <div className="bg-white border border-purple-200 rounded-md p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[16px] font-semibold text-black">დამცავების ფასი:</span>
                          <span className="text-[18px] font-bold text-purple-700">
                            {protectorsPrice.toFixed(2)} ₾
                          </span>
                        </div>
                      </div>
                    )}
                    {totalSum > 0 && (
                      <div className="bg-white border border-green-200 rounded-md p-4">
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
                        <div className="bg-white border border-purple-200 rounded-md p-4">
                          <div className="flex justify-between items-center">
                            <span className="text-[16px] font-semibold text-black">დამცავების ფასი:</span>
                            <span className="text-[18px] font-bold text-purple-700">
                              {protectorsPrice.toFixed(2)} ₾
                            </span>
                          </div>
                        </div>
                      )}
                      {totalSum > 0 && (
                        <div className="bg-white border border-green-200 rounded-md p-4">
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

      {/* Sheets List grouped by month */}
      <div className="space-y-6">
        {Object.keys(sheetsByMonth)
          .sort((a, b) => b.localeCompare(a)) // Newest month first
          .map((monthKey) => {
            const monthSheets = sheetsByMonth[monthKey];
            const isMonthExpanded = expandedMonths.has(monthKey);
            return (
              <div key={monthKey} className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                {/* Month header */}
                <div
                  className="flex justify-between items-center px-6 py-4 cursor-pointer bg-gray-100 hover:bg-gray-200 transition-colors"
                  onClick={() => toggleMonth(monthKey)}
                >
                  <div className="flex items-center gap-3">
                    <button
                      className="text-gray-600 hover:text-gray-800 focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMonth(monthKey);
                      }}
                    >
                      {isMonthExpanded ? (
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
                      <h3 className="text-lg font-bold text-black">
                        {formatMonthGe(monthKey)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        ფურცლები: {monthSheets.length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Month content */}
                {isMonthExpanded && (
                  <div className="p-4 space-y-4 bg-white">
                    {(() => {
                      // Group month sheets by exact date
                      const sheetsByDay = monthSheets.reduce<Record<string, DailySheet[]>>((acc, sheet) => {
                        const dayKey = getDateString(sheet.date);
                        if (!acc[dayKey]) acc[dayKey] = [];
                        acc[dayKey].push(sheet);
                        return acc;
                      }, {});

                      return Object.keys(sheetsByDay)
                        .sort((a, b) => b.localeCompare(a)) // newest day first
                        .map((dayKey) => {
                          const daySheets = sheetsByDay[dayKey];
                          const isDayExpanded = expandedDays.has(dayKey);
                          const dayTotalWeight = daySheets.reduce((sum, sheet) => {
                            const totals = calculateTotals(sheet.items);
                            const sheetWeight =
                              sheet.sheetType === "STANDARD" && sheet.totalWeight
                                ? sheet.totalWeight
                                : totals.totalWeight;
                            return sum + sheetWeight;
                          }, 0);
                          return (
                            <div key={dayKey} className="border border-gray-200 rounded-lg overflow-hidden">
                              {/* Day header */}
                              <div
                                className="flex justify-between items-center px-4 py-3 cursor-pointer bg-white hover:bg-white transition-colors"
                                onClick={() => toggleDay(dayKey)}
                              >
                                <div className="flex items-center gap-3">
                                  <button
                                    className="text-gray-500 hover:text-gray-700 focus:outline-none"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleDay(dayKey);
                                    }}
                                  >
                                    {isDayExpanded ? (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    )}
                                  </button>
                                  <div>
                                    <h4 className="font-semibold text-black">
                                      {formatDateGe(dayKey)}
                                    </h4>
                                    <p className="text-xs text-gray-600">
                                      ფურცლები ამ დღისთვის: {daySheets.length}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-xs md:text-sm font-semibold text-black">
                                  დღის წონა: {dayTotalWeight.toFixed(2)} კგ
                                </div>
                              </div>

                              {/* Day content: sheets list */}
                              {isDayExpanded && (
                                <div className="p-4 space-y-4 bg-white">
                                  {daySheets
                                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                    .map((sheet) => {
                                      const isExpanded = expandedSheets.has(sheet.id);
                                      const headerTotals = calculateTotals(sheet.items);
                                      const headerTotalWeight =
                                        sheet.sheetType === "STANDARD" && sheet.totalWeight
                                          ? sheet.totalWeight
                                          : headerTotals.totalWeight;
                                      return (
                                        <div key={sheet.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                          {/* Header - Always visible */}
                                          <div 
                                            className="flex justify-between items-start p-6 cursor-pointer hover:bg-white transition-colors"
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
                                                <h3 className="text-lg font-semibold text-black flex items-center gap-2">
                                                  <span>{sheet.hotelName}</span>
                                                </h3>
                                                <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                                                  {sheet.shiftType && (
                                                    <span className="inline-flex items-center rounded-full  text-black px-3 py-1 text-4 font-semibold">
                                                      ცვლა: {sheet.shiftType === "DAY" ? "დღის" : "ღამის"}
                                                    </span>
                                                  )}
                                                  <span className="inline-flex items-center rounded-full  text-blue-700 px-3 py-1 text-xs font-semibold">
                                                    გაგზავნილი {sheet.emailSendCount ?? 0}x
                                                  </span>
                                                  {sheet.confirmedAt && sheet.confirmedByUser && (
                                                    <span className="inline-flex items-center rounded-full bg-white text-green-700 px-3 py-1 text-xs font-semibold border border-gray-200">
                                                      ✓ დაადასტურა: {sheet.confirmedByUser.name || sheet.confirmedByUser.email} ({new Date(sheet.confirmedAt).toLocaleDateString("ka-GE")})
                                                    </span>
                                                  )}
                                                  {!sheet.confirmedAt && (
                                                    <span className="inline-flex items-center rounded-full bg-white text-yellow-700 px-3 py-1 text-xs font-semibold border border-gray-200">
                                                      დადასტურება საჭიროა
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              {sheet.sheetType === "STANDARD" ? (
                                                editingWeight.sheetId === sheet.id ? (
                                                  <div
                                                    className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1"
                                                    onClick={(e) => e.stopPropagation()}
                                                  >
                                                    <input
                                                      type="number"
                                                      step="0.001"
                                                      className="w-24 bg-transparent border border-gray-300 rounded-full px-2 py-0.5 text-center text-gray-800 md:text-[18px] text-[16px]"
                                                      value={editingWeight.value}
                                                      onChange={(e) =>
                                                        setEditingWeight((prev) => ({
                                                          ...prev,
                                                          value: e.target.value,
                                                        }))
                                                      }
                                                    />
                                                    <span className="text-xs text-gray-600">კგ</span>
                                                    <button
                                                      type="button"
                                                      disabled={savingWeightId === sheet.id}
                                                      onClick={() => handleHeaderWeightSave(sheet)}
                                                      className="text-xs font-semibold text-green-700 hover:text-green-800 disabled:opacity-50"
                                                    >
                                                      შენახვა
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingWeight({ sheetId: null, value: "" });
                                                      }}
                                                      className="text-xs font-semibold text-red-600 hover:text-red-700"
                                                    >
                                                      გაუქმება
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      startEditHeaderWeight(sheet, headerTotalWeight);
                                                    }}
                                                    className="inline-flex text-center mx-auto items-center rounded-full bg-gray-100 text-gray-800 px-3 py-1 md:text-[18px] text-[16px] font-semibold hover:bg-gray-200"
                                                  >
                                                    წონა: {headerTotalWeight.toFixed(2)} კგ
                                                  </button>
                                                )
                                              ) : (
                                                <span className="inline-flex text-center mx-auto items-center rounded-full bg-gray-100 text-gray-800 px-3 py-1 md:text-[18px] text-[16px] font-semibold">
                                                  წონა: {headerTotalWeight.toFixed(2)} კგ
                                                </span>
                                              )}
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
                                              {((sheet.emailSendCount ?? 0) === 0) ? (
                                                <button
                                                  onClick={() => {
                                                    setEmailModal({ open: true, sheetId: sheet.id });
                                                    setModalEmail(deriveHotelEmail(sheet.hotelName));
                                                  }}
                                                  className="text-green-700 hover:underline px-2"
                                                >
                                                  გაგზავნა მეილზე
                                                </button>
                                              ) : (
                                                <button
                                                  disabled
                                                  className="text-gray-400 px-2 cursor-not-allowed"
                                                  title="ეს დღის ფურცელი უკვე გაგზავნილია"
                                                >
                                                  უკვე გაგზავნილია
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
                              )}
                            </div>
                          );
                        });
                    })()}
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
