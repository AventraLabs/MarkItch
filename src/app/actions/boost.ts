"use server";

import { refresh } from "next/cache";
import { requireAdminUser } from "@/lib/moderation";
import { activateBoost, rejectBoost } from "@/lib/boost";

export async function activateBoostAction(formData: FormData) {
  await requireAdminUser();
  const boostId = formData.get("boostId");
  if (typeof boostId !== "string" || !boostId) return;
  await activateBoost(boostId);
  refresh();
}

export async function rejectBoostAction(formData: FormData) {
  await requireAdminUser();
  const boostId = formData.get("boostId");
  if (typeof boostId !== "string" || !boostId) return;
  await rejectBoost(boostId);
  refresh();
}
