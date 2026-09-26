"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { db } from "@/db";
import { brands, brandMembers, users } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { getBrandForUser } from "@/lib/brand";
import { uploadImage, ALLOWED_IMAGE_TYPES } from "@/lib/storage";
import { CreateBrandSchema, IndustryComplianceSchema } from "@/lib/validation";

export type BrandFormState = { errors?: Record<string, string[]> } | undefined;
export type UpdateBrandFormState = { errors?: Record<string, string[]>; success?: boolean } | undefined;

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 60);
  return base || "marke";
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 1;
  // Small table, small N — a loop is simpler and clearer than a clever query.
  while (true) {
    const [clash] = await db.select({ id: brands.id }).from(brands).where(eq(brands.slug, candidate)).limit(1);
    if (!clash) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

export async function createBrand(_prevState: BrandFormState, formData: FormData): Promise<BrandFormState> {
  const user = await requireUser();

  // Phase 8: only Acro accounts can own a brand — Assent accounts watch
  // and vote, never post. This is the one gate that matters: every other
  // Acro-only action (invite, reply, upload) already requires a brand via
  // getBrandForUser, so once brand creation is gated here, everything
  // downstream is gated for free.
  const [dbUser] = await db.select({ accountType: users.accountType }).from(users).where(eq(users.id, user.id)).limit(1);
  if (dbUser?.accountType !== "acro") {
    return { errors: { _form: ["Nur Acro-Accounts können eine Marke erstellen."] } };
  }

  // One brand per user for Phase 2 — brand_members exists as its own table
  // so lifting this to teams later doesn't need a migration.
  const [existingMembership] = await db
    .select({ id: brandMembers.id })
    .from(brandMembers)
    .where(eq(brandMembers.userId, user.id))
    .limit(1);
  if (existingMembership) {
    return { errors: { _form: ["Du hast bereits eine Marke erstellt."] } };
  }

  const parsed = CreateBrandSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    website: formData.get("website"),
    category: formData.get("category"),
    country: formData.get("country"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // Phase 46: Branchen-Compliance-Attestierung (Rechtskonformitäts-Audit) —
  // nur bei der Erstellung, siehe brands.industryComplianceConfirmedAt.
  const compliance = IndustryComplianceSchema.safeParse({ industryCompliance: formData.get("industryCompliance") });
  if (!compliance.success) {
    return { errors: compliance.error.flatten().fieldErrors };
  }

  let logoUrl: string | null = null;
  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    if (logoFile.size > MAX_LOGO_BYTES) {
      return { errors: { logo: ["Logo darf maximal 2 MB groß sein."] } };
    }
    if (!ALLOWED_IMAGE_TYPES.includes(logoFile.type)) {
      return { errors: { logo: ["Erlaubt: PNG, JPEG, WEBP oder SVG."] } };
    }
    const uploaded = await uploadImage(logoFile, "logos");
    logoUrl = uploaded.url;
  }

  const slug = await uniqueSlug(parsed.data.name);

  const [brand] = await db
    .insert(brands)
    .values({
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      website: parsed.data.website || null,
      category: parsed.data.category,
      country: parsed.data.country,
      logoUrl,
      industryComplianceConfirmedAt: new Date(),
    })
    .returning({ id: brands.id, slug: brands.slug });

  await db.insert(brandMembers).values({ brandId: brand.id, userId: user.id, role: "owner" });

  redirect(`/brands/${brand.slug}`);
}

/**
 * Phase 43: there was never any way to edit a brand's own name/description/
 * category/website/logo after creating it — Luca noticed his profile shows
 * "MarkItch" but Settings only let him change "Test" (the *account*'s own
 * name, a completely different field). Reuses CreateBrandSchema — same
 * rules should apply going in either direction. The slug (the `/brands/…`
 * URL) deliberately never changes here, even on a rename — regenerating it
 * would break every link/QR code/share already pointing at this brand.
 */
export async function updateBrand(_prevState: UpdateBrandFormState, formData: FormData): Promise<UpdateBrandFormState> {
  const user = await requireUser();
  const brand = await getBrandForUser(user.id);
  if (!brand) {
    return { errors: { _form: ["Du hast keine Marke."] } };
  }

  const parsed = CreateBrandSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    website: formData.get("website"),
    category: formData.get("category"),
    country: formData.get("country"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  let logoUrl = brand.logoUrl;
  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    if (logoFile.size > MAX_LOGO_BYTES) {
      return { errors: { logo: ["Logo darf maximal 2 MB groß sein."] } };
    }
    if (!ALLOWED_IMAGE_TYPES.includes(logoFile.type)) {
      return { errors: { logo: ["Erlaubt: PNG, JPEG, WEBP oder SVG."] } };
    }
    const uploaded = await uploadImage(logoFile, "logos");
    logoUrl = uploaded.url;
  }

  await db
    .update(brands)
    .set({
      name: parsed.data.name,
      description: parsed.data.description || null,
      website: parsed.data.website || null,
      category: parsed.data.category,
      country: parsed.data.country,
      logoUrl,
      updatedAt: new Date(),
    })
    .where(eq(brands.id, brand.id));

  refresh();
  return { success: true };
}
