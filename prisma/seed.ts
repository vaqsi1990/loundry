"use strict";

import "dotenv/config";
import path from "path";
import fs from "fs/promises";
import { PrismaClient, Prisma } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

const prisma = new PrismaClient({ adapter });
const users = await readJsonArray<Prisma.UserCreateManyInput>("User.json");
const cleaned = stripFields(users, ["createdAt", "updatedAt", "emailVerified"]);
await prisma.user.createMany({ data: cleaned, skipDuplicates: true });

async function readJsonArray<T>(fileName: string): Promise<T[]> {
  const filePath = path.join(process.cwd(), "items", fileName);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T[];
}

// Remove fields that don't need to be seeded (e.g., timestamps)
function stripFields<T extends Record<string, any>>(records: T[], keys: string[]): T[] {
  return records.map((r) => {
    const clone: Record<string, any> = { ...r };
    keys.forEach((k) => {
      delete clone[k];
    });
    return clone as T;
  });
}

async function seedUsers() {
  const users = await readJsonArray<Prisma.UserCreateManyInput>("User.json");
  if (!users.length) return;
  const cleaned = stripFields(users, ["createdAt", "updatedAt", "emailVerified"]);
  await prisma.user.createMany({ data: cleaned, skipDuplicates: true });
}

async function seedEmployees() {
  const employees = await readJsonArray<Prisma.EmployeeCreateManyInput>("Employee.json");
  if (!employees.length) return;
  const cleaned = stripFields(employees, ["createdAt", "updatedAt"]);
  await prisma.employee.createMany({ data: cleaned, skipDuplicates: true });
}

async function seedInventory() {
  const inventory = await readJsonArray<Prisma.InventoryCreateManyInput>("Inventory.json");
  if (!inventory.length) return;
  const cleaned = stripFields(inventory, ["createdAt", "updatedAt", "lastRestocked", "receiptDate"]);
  await prisma.inventory.createMany({ data: cleaned, skipDuplicates: true });
}

async function seedInventoryMovements() {
  const movements = await readJsonArray<Prisma.InventoryMovementCreateManyInput>(
    "InventoryMovement.json"
  );
  if (!movements.length) return;

  const existing = await prisma.inventory.findMany({ select: { id: true } });
  const allowed = new Set(existing.map((i) => i.id));

  const filtered = movements.filter((m) => allowed.has(m.inventoryId));
  if (!filtered.length) return;

  const cleaned = stripFields(filtered, ["createdAt", "updatedAt"]);
  await prisma.inventoryMovement.createMany({ data: cleaned, skipDuplicates: true });
}

async function seedDailySheetItems() {
  // We only seed items that reference an existing daily sheet
  const items = await readJsonArray<Prisma.DailySheetItemCreateManyInput>("DailySheetItem.json");
  if (!items.length) return;

  const sheets = await prisma.dailySheet.findMany({ select: { id: true } });
  const allowed = new Set(sheets.map((s) => s.id));
  const filtered = items.filter((i) => allowed.has(i.dailySheetId));
  if (!filtered.length) return;

  const cleaned = stripFields(filtered, ["createdAt", "updatedAt"]);
  await prisma.dailySheetItem.createMany({ data: cleaned, skipDuplicates: true });
}

export async function main() {
  await seedUsers();
  await seedEmployees();
  await seedInventory();
  await seedInventoryMovements();
  await seedDailySheetItems();
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

