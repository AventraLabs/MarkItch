"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import {
  banUser,
  isAdminEmail,
  removeReportedContent,
  resolveReport,
  unbanUser,
  type ReportTargetType,
} from "@/lib/moderation";

async function requireAdmin() {
  const user = await requireUser();
  if (!isAdminEmail(user.email)) {
    redirect("/");
  }
}

export async function resolveReportAction(formData: FormData) {
  await requireAdmin();
  const reportId = formData.get("reportId");
  if (typeof reportId !== "string" || !reportId) return;
  await resolveReport(reportId);
  refresh();
}

/** Deletes/nulls the reported content itself, then resolves the report. */
export async function removeContentAction(formData: FormData) {
  await requireAdmin();
  const reportId = formData.get("reportId");
  const targetType = formData.get("targetType");
  const targetId = formData.get("targetId");
  if (typeof reportId !== "string" || !reportId || typeof targetType !== "string" || typeof targetId !== "string" || !targetId) {
    return;
  }
  await removeReportedContent(targetType as ReportTargetType, targetId);
  await resolveReport(reportId);
  refresh();
}

/** Bans the content's owner and, if called from a report row, resolves that report too. */
export async function banUserAction(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId) return;
  await banUser(userId);
  const reportId = formData.get("reportId");
  if (typeof reportId === "string" && reportId) await resolveReport(reportId);
  refresh();
}

export async function unbanUserAction(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId) return;
  await unbanUser(userId);
  refresh();
}
