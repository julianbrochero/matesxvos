import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogClient } from "./catalog-client";

const LOCATION_BY_SLUG: Record<string, "Buenos Aires" | "Villa Maria"> = {
  "buenos-aires": "Buenos Aires",
  "villa-maria": "Villa Maria",
};

type Params = {
  params: Promise<{ location: string }>;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { location } = await params;
  const locationName = LOCATION_BY_SLUG[location];
  return {
    title: locationName ? `Catálogo | Mates x Vos ${locationName}` : "Catálogo | Mates x Vos",
    description: "Mates, bombillas, yerbas y accesorios. Armá tu pedido y lo mandamos por WhatsApp.",
  };
}

export default async function CatalogPage({ params }: Params) {
  const { location } = await params;
  const locationName = LOCATION_BY_SLUG[location];
  if (!locationName) notFound();

  return <CatalogClient location={locationName} />;
}
