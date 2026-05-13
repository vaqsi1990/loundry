/**
 * ინვოისის ხელახალი გაგზავნისას ერთნაირი ჩანაწერები იჭრება ერთი „ნიშნით“:
 * მყიდველი (trim+lower), სერვისის კალენდარული დღე (dueDate ან createdAt), ჯამი ცენტებამდე.
 */

export type RevenueInvoiceDedupeRow = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: number | null;
  amount: number;
  totalWeightKg: number | null;
  protectorsAmount: number | null;
  paidAmount: number | null;
  status: string;
  createdAt: Date;
  dueDate: Date;
  customerEmail: string | null;
};

/** Prisma select — იგივე ველები admin / legal / physical ინვოისებზე დედუპლიკაციისთვის. */
export const prismaInvoiceDedupeSelect = {
  id: true,
  invoiceNumber: true,
  customerName: true,
  totalAmount: true,
  amount: true,
  totalWeightKg: true,
  protectorsAmount: true,
  paidAmount: true,
  status: true,
  createdAt: true,
  dueDate: true,
  customerEmail: true,
} as const;

/** გადახდილი თანხების ჯამი ინვოისებიდან (რესენდის დუბლიკატები ერთხელ ითვლება). */
export function sumDedupedInvoicesPaidAmount(
  adminRows: RevenueInvoiceDedupeRow[],
  legalRows: RevenueInvoiceDedupeRow[],
  physicalRows: RevenueInvoiceDedupeRow[]
): number {
  const rows = [
    ...dedupeInvoicesByResendFingerprint(adminRows),
    ...dedupeInvoicesByResendFingerprint(legalRows),
    ...dedupeInvoicesByResendFingerprint(physicalRows),
  ];
  return rows.reduce((sum, inv) => sum + Number(inv.paidAmount ?? 0), 0);
}

export function invoiceResendFingerprint(inv: RevenueInvoiceDedupeRow): string {
  const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.createdAt);
  const dayKey = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
  const total = Number(inv.totalAmount ?? inv.amount ?? 0);
  const cents = Math.round(total * 100);
  const name = (inv.customerName || "").trim().toLowerCase();
  return `${name}|${dayKey}|${cents}`;
}

function groupInvoicesByFingerprint(rows: RevenueInvoiceDedupeRow[]): Map<string, RevenueInvoiceDedupeRow[]> {
  const map = new Map<string, RevenueInvoiceDedupeRow[]>();
  for (const inv of rows) {
    const key = invoiceResendFingerprint(inv);
    const arr = map.get(key) ?? [];
    arr.push(inv);
    map.set(key, arr);
  }
  return map;
}

/** რჩება უმაღლესი paidAmount, ტოლობისას — უახლესი createdAt. */
function sortGroupForCanonical(group: RevenueInvoiceDedupeRow[]): RevenueInvoiceDedupeRow[] {
  return [...group].sort((a, b) => {
    const pa = Number(a.paidAmount ?? 0);
    const pb = Number(b.paidAmount ?? 0);
    if (pb !== pa) return pb - pa;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function dedupeInvoicesByResendFingerprint(rows: RevenueInvoiceDedupeRow[]): RevenueInvoiceDedupeRow[] {
  const map = groupInvoicesByFingerprint(rows);
  const out: RevenueInvoiceDedupeRow[] = [];
  for (const group of map.values()) {
    const sorted = sortGroupForCanonical(group);
    out.push(sorted[0]);
  }
  out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return out;
}

export type DuplicateInvoiceRemovalPlan = {
  fingerprint: string;
  kept: RevenueInvoiceDedupeRow;
  removed: RevenueInvoiceDedupeRow[];
};

export function planDuplicateInvoiceRemovals(rows: RevenueInvoiceDedupeRow[]): DuplicateInvoiceRemovalPlan[] {
  const map = groupInvoicesByFingerprint(rows);
  const plans: DuplicateInvoiceRemovalPlan[] = [];
  for (const [key, group] of map) {
    if (group.length < 2) continue;
    const sorted = sortGroupForCanonical(group);
    plans.push({
      fingerprint: key,
      kept: sorted[0],
      removed: sorted.slice(1),
    });
  }
  return plans;
}
