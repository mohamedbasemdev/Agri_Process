import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const {
      ph,
      temperature,
      moisture,
      productName,
      minPh,
      maxPh,
      minTemperature,
      maxTemperature,
      minMoisture,
      maxMoisture,
    } = await req.json();

    if (
      ph == null ||
      temperature == null ||
      moisture == null ||
      !productName ||
      minPh == null ||
      maxPh == null ||
      minTemperature == null ||
      maxTemperature == null ||
      minMoisture == null ||
      maxMoisture == null
    ) {
      return NextResponse.json(
        { error: "Readings, productName and all quality limits are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing");
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // These limits are NOT invented by the AI here — they come from
    // the factory's own product record, set by a human and confirmed
    // in the Quality Lab UI before this check ever runs.
    const prompt = `You are a food-quality inspector.

Product: ${productName}

Quality limits (set by the factory's own quality manager for this product):
- pH: ${minPh} - ${maxPh}
- Temperature: ${minTemperature} - ${maxTemperature}°C
- Moisture: ${minMoisture} - ${maxMoisture}%

Actual readings:
- pH: ${ph}
- Temperature: ${temperature}°C
- Moisture: ${moisture}%

Compare the actual readings ONLY against the provided quality limits.
Do NOT invent, assume, or use any other standards.

Scoring rules:
- 100: all readings are comfortably within the limits
- 80-99: all readings are within limits but close to a boundary
- 50-79: one reading is slightly outside the limits
- 0-49: one or more readings are significantly outside the limits

Result rules:
- "passed" ONLY if ALL readings are within the provided limits.
- "failed" if ANY reading is outside the provided limits.

Return ONLY a JSON object, no markdown, no preamble, in exactly this shape:

{
  "score": <integer 0-100>,
  "result": "passed" | "failed",
  "notes": "<one short sentence explaining the result and mentioning the relevant reading if failed>"
}`;

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

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Gemini returned invalid JSON", rawResponse: text },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("AI quality check failed:", err);
    return NextResponse.json(
      { error: "AI evaluation failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}