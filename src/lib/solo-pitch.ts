import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { soloPitches, brands, type SoloPitch } from "@/db/schema";

export type SoloPitchBrand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
};

export type SoloPitchWithBrand = SoloPitch & { brand: SoloPitchBrand };

const brandCols = { id: brands.id, name: brands.name, slug: brands.slug, logoUrl: brands.logoUrl };

export async function getAllSoloPitches(): Promise<SoloPitchWithBrand[]> {
  const rows = await db
    .select({ pitch: soloPitches, brand: brandCols })
    .from(soloPitches)
    .innerJoin(brands, eq(soloPitches.brandId, brands.id))
    .orderBy(desc(soloPitches.createdAt));
  return rows.map((r) => ({ ...r.pitch, brand: r.brand }));
}

export async function getSoloPitchById(id: string): Promise<SoloPitchWithBrand | null> {
  const [row] = await db
    .select({ pitch: soloPitches, brand: brandCols })
    .from(soloPitches)
    .innerJoin(brands, eq(soloPitches.brandId, brands.id))
    .where(eq(soloPitches.id, id))
    .limit(1);
  return row ? { ...row.pitch, brand: row.brand } : null;
}

export async function getSoloPitchesForBrand(brandId: string): Promise<SoloPitch[]> {
  return db.select().from(soloPitches).where(eq(soloPitches.brandId, brandId)).orderBy(desc(soloPitches.createdAt));
}
