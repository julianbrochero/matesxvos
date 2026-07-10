import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/server";
import { mapProduct } from "@/lib/supabase/mappers";
import { seedProducts } from "@/lib/domain";

const VALID_LOCATIONS = ["Buenos Aires", "Villa Maria"];

export type PublicCatalogProduct = {
  id: string;
  name: string;
  brand: string;
  imageUrl?: string;
  price: number;
  stock: number;
};

function toPublicProduct(product: { id: string; name: string; brand: string; imageUrl?: string; price: number; stock: number }): PublicCatalogProduct {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    imageUrl: product.imageUrl,
    price: product.price,
    stock: product.stock,
  };
}

export async function GET(request: NextRequest) {
  const location = request.nextUrl.searchParams.get("location") ?? "";
  if (!VALID_LOCATIONS.includes(location)) {
    return NextResponse.json({ error: "Ubicacion invalida" }, { status: 400 });
  }

  if (!isSupabaseConfigured) {
    const products = seedProducts
      .filter((product) => product.location === location && product.stock > 0)
      .map(toPublicProduct);
    return NextResponse.json({ products });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("products")
    .select("*")
    .eq("location", location)
    .gt("stock", 0)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const products = data.map(mapProduct).map(toPublicProduct);
  return NextResponse.json({ products });
}
