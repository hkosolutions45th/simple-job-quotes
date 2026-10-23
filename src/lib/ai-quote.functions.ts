import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { formatPostalCode } from "./quote";

const Input = z.object({ notes: z.string().min(1).max(8000) });

const SYSTEM_PROMPT = `You are an expert estimator for trade services. Read the job notes and return strictly a JSON object matching:

{ "items": [{ "description": string, "quantity": number, "unitRate": number, "total": number }], "client": { "name": string, "email": string, "phone": string, "address": string, "city": string, "province": string, "postalCode": string } }

If unit rates or quantities are implied or missing, make a realistic industry-standard estimation based on the trade context.

Also extract any client details mentioned in the notes into the "client" object: client name, email, phone, street address, city, state/province, and postal/ZIP code. Put only the street line in "address", the city in "city", state/province in "province", and either a postal code or ZIP code in "postalCode". Use an empty string for every detail that is not mentioned.

Line-item descriptions must be short titles describing only the work or material. Put quantity and pricing only in their dedicated numeric fields. Never append parenthetical or bracketed currency, measurement, unit, quantity, pricing, estimation, supply-only, or rate notes to a description. For example, return "Supply and install composite deck railing", never "Supply and install composite deck railing (linear feet; estimated CAD)".`;

export type AiLineItem = {
  description: string;
  quantity: number;
  unitRate: number;
  total: number;
};

export type AiClient = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
};

export type AiQuoteResult = {
  items: AiLineItem[];
  client: AiClient;
};

export const generateQuoteItems = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<AiQuoteResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        instructions: SYSTEM_PROMPT,
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: `Job notes:\n${data.notes}` }],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "line_items",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      description: { type: "string" },
                      quantity: { type: "number" },
                      unitRate: { type: "number" },
                      total: { type: "number" },
                    },
                    required: ["description", "quantity", "unitRate", "total"],
                  },
                },
                client: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    name: { type: "string" },
                    email: { type: "string" },
                    phone: { type: "string" },
                    address: { type: "string" },
                    city: { type: "string" },
                    province: { type: "string" },
                    postalCode: { type: "string" },
                  },
                  required: ["name", "email", "phone", "address", "city", "province", "postalCode"],
                },
              },
              required: ["items", "client"],
            },
          },
        },
      }),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("AI is busy right now — try again in a moment.");
      if (res.status === 402 || res.status === 403)
        throw new Error("AI credits are unavailable for this workspace.");
      throw new Error(`AI request failed (${res.status}). ${detail.slice(0, 200)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload) as {
            type?: string;
            delta?: string;
            response?: { output_text?: string };
          };
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
            text += evt.delta;
          } else if (evt.type === "response.completed" && evt.response?.output_text) {
            if (!text) text = evt.response.output_text;
          }
        } catch {
          /* ignore keep-alive / partial frames */
        }
      }
    }

    const parsed = safeParse(text);
    if (!parsed.length) throw new Error("The AI couldn't find any line items in those notes.");
    return { items: parsed, client: parseClient(text) };
  });

function cleanDescription(value: string): string {
  const currency = "(?:USD|CAD|EUR|GBP|AUD|MXN)";
  const unit = "\\b(?:linear\\s*(?:feet|foot|ft)|square\\s*(?:feet|foot|ft)|sq\\.?\\s*ft|feet|foot|ft|hours?|hrs?|days?|yards?|yds?|metres?|meters?|kilometres?|kilometers?|km|inches?|centimetres?|centimeters?|cm|litres?|liters?|gallons?|gal|pounds?|lbs?|tons?|tonnes?|bundles?|units?|pieces?|pcs?|coats?|loads?|each|ea)\\b";
  return value
    .replace(
      new RegExp(
        `\\s*[\\(\\[][^\\)\\]]*(?:${currency}|(?:estimated|estimate|priced)\\s+(?:in\\s+)?${currency}|${unit})[^\\)\\]]*[\\)\\]]`,
        "gi",
      ),
      "",
    )
    .replace(
      new RegExp(
        `\\s*[\\(\\[]\\s*(?:(?:estimated|estimate|priced)\\s+)?(?:[$€£]\\s*)?${currency}(?:\\s*[$€£])?\\s*[\\)\\]]`,
        "gi",
      ),
      "",
    )
    .replace(
      new RegExp(
        `\\s*[-–—,:]\\s*(?:(?:estimated|estimate|priced)\\s+(?:in\\s+)?)?(?:[$€£]\\s*)?${currency}(?:\\s*[$€£])?\\s*$`,
        "gi",
      ),
      "",
    )
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

function parseClient(text: string): AiClient {
  const empty: AiClient = { name: "", email: "", phone: "", address: "", city: "", province: "", postalCode: "" };
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const raw = JSON.parse(trimmed) as { client?: unknown };
    const c = raw?.client;
    if (!c || typeof c !== "object") return empty;
    const r = c as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    return {
      name: str(r["name"]),
      email: str(r["email"]),
      phone: str(r["phone"]),
      address: str(r["address"]),
      city: str(r["city"]),
      province: str(r["province"]),
      postalCode: formatPostalCode(str(r["postalCode"]) || str(r["zipCode"])),
    };
  } catch {
    return empty;
  }
}

function safeParse(text: string): AiLineItem[] {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let raw: unknown;
  try {
    raw = JSON.parse(trimmed);
  } catch {
    return [];
  }
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { items?: unknown }).items)
      ? (raw as { items: unknown[] }).items
      : [];

  return list.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const e = entry as Record<string, unknown>;
    const description = typeof e["description"] === "string" ? cleanDescription(e["description"].trim()) : "";
    const quantity = Number(e["quantity"]);
    const unitRate = Number(e["unitRate"]);
    if (!description) return [];
    const q = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    const r = Number.isFinite(unitRate) && unitRate >= 0 ? unitRate : 0;
    return [{ description, quantity: q, unitRate: r, total: Number((q * r).toFixed(2)) }];
  });
}
