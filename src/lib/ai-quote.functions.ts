import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({ notes: z.string().min(1).max(8000) });

const SYSTEM_PROMPT = `You are an expert estimator for trade services. Read the job notes and return strictly a JSON object matching:

{ "items": [{ "description": string, "quantity": number, "unitRate": number, "total": number }], "client": { "name": string, "email": string, "phone": string, "address": string, "city": string, "postalCode": string }, "scopeSummary": string }

If unit rates or quantities are implied or missing, make a realistic industry-standard estimation based on the trade context.

Also extract any client details mentioned in the notes into the "client" object: client name, email, phone, street address, city, and postal/ZIP code. Put only the street line in "address", the city in "city", and either a postal code or ZIP code in "postalCode". Use an empty string for every detail that is not mentioned.

Write "scopeSummary" as one or two concise, professional sentences focused only on the work to be completed. Exclude client names, emails, phone numbers, addresses, dictation command words, conversational filler, prices, rates, currency codes, and currency symbols.

Line-item descriptions must describe only the work or material. Never include currency codes, currency symbols, exchange-rate wording, or labels such as "estimated CAD", "estimated USD", or "priced in EUR" in a description.`;

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
  postalCode: string;
};

export type AiQuoteResult = {
  items: AiLineItem[];
  client: AiClient;
  scopeSummary: string;
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
                    postalCode: { type: "string" },
                  },
                  required: ["name", "email", "phone", "address", "city", "postalCode"],
                },
                scopeSummary: { type: "string" },
              },
              required: ["items", "client", "scopeSummary"],
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
    return { items: parsed, client: parseClient(text), scopeSummary: parseScopeSummary(text) };
  });

function parseScopeSummary(text: string): string {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const raw = JSON.parse(trimmed) as { scopeSummary?: unknown };
    return typeof raw.scopeSummary === "string" ? raw.scopeSummary.trim() : "";
  } catch {
    return "";
  }
}

function cleanDescription(value: string): string {
  const currency = "(?:USD|CAD|EUR|GBP|AUD|MXN)";
  return value
    .replace(new RegExp(`\\s*[\\(\\[]\\s*(?:estimated\\s+)?${currency}(?:\\s*[$€£])?\\s*[\\)\\]]`, "gi"), "")
    .replace(new RegExp(`\\s*[-–—,:]\\s*(?:estimated\\s+|priced\\s+in\\s+)?${currency}(?:\\s*[$€£])?\\s*$`, "gi"), "")
    .trim();
}

function parseClient(text: string): AiClient {
  const empty: AiClient = { name: "", email: "", phone: "", address: "", city: "", postalCode: "" };
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
      postalCode: str(r["postalCode"]) || str(r["zipCode"]),
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
