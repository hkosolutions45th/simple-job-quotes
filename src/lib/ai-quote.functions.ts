import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({ notes: z.string().min(1).max(8000) });

const SYSTEM_PROMPT = `You are an expert estimator for trade services. Read the job notes and extract line items. Return strictly a JSON array with objects matching:

[{ "description": string, "quantity": number, "unitRate": number, "total": number }]

If unit rates or quantities are implied or missing, make a realistic industry-standard estimation based on the trade context.`;

export type AiLineItem = {
  description: string;
  quantity: number;
  unitRate: number;
  total: number;
};

export const generateQuoteItems = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<{ items: AiLineItem[] }> => {
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
        reasoning: { effort: "low" },
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
              },
              required: ["items"],
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
    return { items: parsed };
  });

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
    const description = typeof e["description"] === "string" ? e["description"].trim() : "";
    const quantity = Number(e["quantity"]);
    const unitRate = Number(e["unitRate"]);
    if (!description) return [];
    const q = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    const r = Number.isFinite(unitRate) && unitRate >= 0 ? unitRate : 0;
    return [{ description, quantity: q, unitRate: r, total: Number((q * r).toFixed(2)) }];
  });
}
