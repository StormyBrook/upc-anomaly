import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const upc = searchParams.get("upc")?.trim();

  if (!upc) {
    return NextResponse.json({ error: "Missing UPC param" }, { status: 400 });
  }

  try {
    // 1. Check Open Food Facts API
    const offRes = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(upc)}.json`,
      {
        headers: {
          "User-Agent": "UPC-Anomaly-Art - Web - Version 1.0",
        },
        next: { revalidate: 3600 },
      }
    );

    if (offRes.ok) {
      const data = await offRes.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const name =
          p.product_name ||
          p.product_name_en ||
          p.generic_name ||
          p.brands;

        if (name && typeof name === "string" && name.trim().length > 0) {
          return NextResponse.json({
            found: true,
            productName: name.trim(),
            brand: p.brands || null,
            categories: p.categories || null,
            source: "OpenFoodFacts",
          });
        }
      }
    }

    // 2. Check Open Library / UPCDatabase public API fallback or return false
    const upcDbRes = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(upc)}`,
      {
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 3600 },
      }
    );

    if (upcDbRes.ok) {
      const dbData = await upcDbRes.json();
      if (dbData.items && dbData.items.length > 0) {
        const item = dbData.items[0];
        if (item.title) {
          return NextResponse.json({
            found: true,
            productName: item.title,
            brand: item.brand || null,
            source: "UPCItemDB",
          });
        }
      }
    }

    return NextResponse.json({
      found: false,
      productName: null,
    });
  } catch (error) {
    console.error("Error fetching barcode lookup:", error);
    return NextResponse.json({
      found: false,
      productName: null,
    });
  }
}
