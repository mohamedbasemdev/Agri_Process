import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { productName, category } = await req.json();

    if (!productName) {
      return NextResponse.json({ error: "productName is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const prompt = `You are a food-safety and quality consultant.

Product: ${productName}
Category: ${category ?? "unspecified"}

Based on standard food-industry practice for this type of product,
suggest reasonable acceptable ranges for pH, storage/process temperature,
and moisture content that a small food factory could use as its internal
quality-control limits.

Return ONLY a JSON object, no markdown, no preamble, in exactly this shape:

{
  "min_ph": <number>,
  "max_ph": <number>,
  "min_temperature": <number>,
  "max_temperature": <number>,
  "min_moisture": <number>,
  "max_moisture": <number>,
  "reasoning": "<one short sentence explaining why these ranges fit this product>"
}

If moisture isn't a meaningful control point for this product (e.g. a liquid
beverage), still return numeric min_moisture/max_moisture as your best estimate —
the user can ignore or edit them.`;

    const maxRetries = 3;
    let response: Response | null = null;
    let data: unknown = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );

      data = await response.json();

      if (response.ok) break;

      if ((response.status === 503 || response.status === 429) && attempt < maxRetries) {
        const delay = Math.min(attempt * 2000, 6000);
        console.log(`Gemini unavailable. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      break;
    }

    if (!response?.ok) {
      console.error("Gemini API error:", data);
      return NextResponse.json(
        { error: "Gemini API error", details: data },
        { status: response?.status || 500 }
      );
    }

    const geminiData = data as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ error: "Gemini returned no text" }, { status: 500 });
    }

    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Suggest limits failed:", err);
    return NextResponse.json(
      { error: "AI suggestion failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}