/** პოზიციები, რომლებსაც შეუძლიათ სისტემაში შესვლა (თანამშრომლის ფორმა). */
export const EMPLOYEE_POSITIONS_WITH_LOGIN = [
  "MANAGER",
  "MANAGER_ASSISTANT",
  "COURIER",
  "ACCOUNTANT",
] as const;

export type EmployeePositionWithLogin = (typeof EMPLOYEE_POSITIONS_WITH_LOGIN)[number];

export function canEmployeePositionLogin(position: string): boolean {
  return (EMPLOYEE_POSITIONS_WITH_LOGIN as readonly string[]).includes(position);
}

/** User.role ინვოისის თანამშრომლის პოზიციიდან (canLogin=true). */
export function userRoleFromEmployeePosition(
  position: string
): "MANAGER" | "MANAGER_ASSISTANT" | "COURIER" | "ACCOUNTANT" | null {
  switch (position) {
    case "MANAGER":
      return "MANAGER";
    case "MANAGER_ASSISTANT":
      return "MANAGER_ASSISTANT";
    case "COURIER":
      return "COURIER";
    case "ACCOUNTANT":
      return "ACCOUNTANT";
    default:
      return null;
  }
}

export function isAccountantRole(role: string | undefined | null): boolean {
  return normalizeRole(role) === "ACCOUNTANT";
}

function normalizeRole(role: string | undefined | null): string {
  if (role == null) return "";
  return String(role);
}

export function canAccessRevenuesApi(role: string | undefined | null): boolean {
  const r = normalizeRole(role);
  return (
    r === "ADMIN" ||
    r === "ACCOUNTANT" ||
    r === "MANAGER" ||
    r === "MANAGER_ASSISTANT"
  );
}

export function canAccessAccountantPanel(role: string | undefined | null): boolean {
  const r = normalizeRole(role);
  return r === "ADMIN" || r === "ACCOUNTANT";
}

export function canAccessAdminInvoicesForPayments(role: string | undefined | null): boolean {
  return canAccessRevenuesApi(role);
}

/** ინვოისები / ხარჯები — ადმინი, ბუღალტერი, მენეჯერი. */
export function canAccessFinanceStaffPages(role: string | undefined | null): boolean {
  return canAccessRevenuesApi(role);
}
