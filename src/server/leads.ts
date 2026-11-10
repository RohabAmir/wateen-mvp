import "server-only";
import { z } from "zod";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { assert } from "./errors";

export const SEGMENTS = ["Fine & casual dining", "QSR", "Cafes & roasteries", "Cloud kitchens", "Catering", "Hotel restaurants"] as const;

export const leadSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  company: z.string().trim().min(2, "Enter your restaurant or company").max(120),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().regex(/^[+\d\s()-]{8,20}$/, "Enter a valid phone number"),
  branches: z.coerce.number().int().min(1, "At least one branch").max(500),
  segment: z.enum(SEGMENTS),
  message: z.string().trim().max(1000).optional(),
});

export async function createLead(input: unknown) {
  const d = leadSchema.parse(input);
  return db.lead.create({ data: { ...d, message: d.message || null } });
}

export async function updateLeadStatus(user: User, id: string, status: "NEW" | "CONTACTED" | "QUALIFIED") {
  assert(user.role === "ADMIN", "Only platform admins manage leads", 403);
  return db.lead.update({ where: { id }, data: { status } });
}
