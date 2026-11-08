"use server";
import { revalidatePath } from "next/cache";
import { createMutableClient } from "@/lib/supabase/server";
import type { CosmeticState } from "./model";

export async function cosmeticAction(ownerId: string, operation: "buy" | "equip", itemId: string): Promise<{ data?: CosmeticState; error?: "auth" | "coins" | "locked" | "unavailable" }> {
  if (!["buy", "equip"].includes(operation) || typeof itemId !== "string" || itemId.length > 80) return { error: "unavailable" };
  const client = await createMutableClient();
  const identity = await client.auth.getUser().catch(() => null);
  if (!identity?.data.user || identity.error || identity.data.user.id !== ownerId) return { error: "auth" };
  const { data, error } = await client.rpc("cosmetics_command", { p_operation: operation, p_item_id: itemId }).abortSignal(AbortSignal.timeout(12000));
  if (error) return { error: error.message === "Not enough coins" ? "coins" : error.code === "42501" ? "locked" : "unavailable" };
  revalidatePath("/", "layout");
  return { data: data as unknown as CosmeticState };
}
