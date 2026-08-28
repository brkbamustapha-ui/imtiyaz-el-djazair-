import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";

/* -------------------------------------------------------------------------
 * Writing assistant for the admin.
 *
 * The API key is read here, on the server, and nowhere else: this module is
 * marked `server-only`, so importing it from a client component is a build
 * error rather than a leak. The browser never sees the key, never talks to
 * Anthropic directly, and can only reach the model through
 * /admin/api/ai, which checks the session first.
 * ---------------------------------------------------------------------- */

const MODEL = "claude-opus-5";

/** Where a key pasted into the dashboard is kept. */
const KEY_SETTING = "aiApiKey";

/**
 * The API key, from the environment or from the dashboard.
 *
 * ANTHROPIC_API_KEY is read first and is the better place for it. But this site
 * is administered by someone who does not have — and should not need — access
 * to the hosting provider's environment variables, and a feature that can only
 * be switched on by editing a deploy config is a feature they do not have. So a
 * key can also be pasted into Admin -> AI Assistant and is kept in the
 * database, on the same server side, and read only here.
 *
 * It is never returned to the browser: the settings form shows whether a key is
 * present and its last four characters, never the key itself.
 */
async function apiKey(): Promise<string | null> {
  const fromEnv = process.env.ANTHROPIC_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  try {
    const row = await db.siteSetting.findUnique({ where: { key: KEY_SETTING } });
    const stored = row ? (JSON.parse(row.valueJson) as { value?: string }).value : null;
    return stored?.trim() || null;
  } catch {
    return null;
  }
}

/** No key configured is a normal state, not an error: the rest of the admin works. */
export async function isAiConfigured(): Promise<boolean> {
  return Boolean(await apiKey());
}

/** What the settings card shows: enough to recognise the key, never the key. */
export async function aiKeyHint(): Promise<{ set: boolean; source: "env" | "database" | null; last4: string }> {
  const fromEnv = process.env.ANTHROPIC_API_KEY?.trim();
  if (fromEnv) return { set: true, source: "env", last4: fromEnv.slice(-4) };
  const key = await apiKey();
  if (!key) return { set: false, source: null, last4: "" };
  return { set: true, source: "database", last4: key.slice(-4) };
}

/** Stores a key pasted into the dashboard. Passing an empty string removes it. */
export async function saveAiKey(rawKey: string): Promise<void> {
  const key = rawKey.trim();
  if (!key) {
    await db.siteSetting.deleteMany({ where: { key: KEY_SETTING } });
    return;
  }
  await db.siteSetting.upsert({
    where: { key: KEY_SETTING },
    create: { key: KEY_SETTING, valueJson: JSON.stringify({ value: key }) },
    update: { valueJson: JSON.stringify({ value: key }) },
  });
}

export const AI_TASKS = [
  "improve",
  "professional",
  "shorten",
  "expand",
  "fix",
  "summarize",
  "title",
  "translate_en",
  "translate_fr",
  "translate_ar",
  "instagram",
  "tiktok",
  "custom",
] as const;

export type AiTask = (typeof AI_TASKS)[number];

export function isAiTask(value: string): value is AiTask {
  return (AI_TASKS as readonly string[]).includes(value);
}

const INSTRUCTIONS: Record<AiTask, string> = {
  improve:
    "Rewrite the text so it reads better: clearer, better rhythm, no filler. Keep the same language, the same facts and roughly the same length.",
  professional:
    "Rewrite the text in a professional, confident institutional register suitable for a school's website. Keep the same language and the same facts. No marketing hyperbole.",
  shorten:
    "Rewrite the text to be significantly shorter while keeping every fact it states. Keep the same language.",
  expand:
    "Develop the text into a fuller paragraph, using only what the text already states or clearly implies. Add no new facts, figures, names or claims. Keep the same language.",
  fix: "Correct spelling, grammar, punctuation and typography. Change nothing else — not the wording, not the tone, not the meaning. Keep the same language.",
  summarize:
    "Summarise the text in two or three sentences, in the same language, keeping only what it actually says.",
  title:
    "Propose 5 possible titles for this section, one per line, no numbering and no commentary. Same language as the text. Each under 60 characters.",
  translate_en: "Translate the text into English. Translate only — add nothing, remove nothing.",
  translate_fr: "Translate the text into French. Translate only — add nothing, remove nothing.",
  translate_ar: "Translate the text into Arabic. Translate only — add nothing, remove nothing.",
  instagram:
    "Write an Instagram caption based on the text. Warm but professional, 3 to 5 short lines, then a final line of 5 to 8 relevant hashtags. Same language as the text.",
  tiktok:
    "Write a short TikTok description based on the text: one or two punchy lines, then 4 to 6 hashtags. Same language as the text.",
  custom: "",
};

/**
 * The one rule that matters for a real school's website: the assistant edits
 * what it is given, it does not invent. A model asked to "make this sound
 * professional" will otherwise cheerfully add a founding year, a pass rate or
 * a student count that nobody has ever measured — and the owner would paste it
 * straight onto the live site.
 */
const SYSTEM = [
  "You help the owner of Imtiyaz El Djazair, a school and exam centre in Algeria, write and edit the text of their website.",
  "",
  "Absolute rule: never invent facts. Do not add statistics, dates, founding years, student or teacher numbers, prices, exam results, accreditations, awards, partner names, testimonials, addresses, phone numbers or email addresses that are not already present in the text you are given. If the text is thin, write something shorter rather than filling it out with invented detail.",
  "",
  "The school's partners and sponsors — British Council / IELTS, Manchester City, Toles Legal and others — are partners or sponsors. Never describe any of them as owning, running or accrediting the school unless the source text says so.",
  "",
  "Reply with the finished text only. No preamble, no explanation, no quotation marks around the whole answer, no markdown code fences.",
].join("\n");

export type AiResult = { ok: true; text: string } | { ok: false; error: string };

export async function runAiTask({
  task,
  text,
  instruction,
}: {
  task: AiTask;
  text: string;
  instruction?: string;
}): Promise<AiResult> {
  const key = await apiKey();
  if (!key) {
    return { ok: false, error: "not_configured" };
  }

  const directive =
    task === "custom"
      ? (instruction ?? "").trim()
      : INSTRUCTIONS[task];

  if (!directive) {
    return { ok: false, error: "missing_instruction" };
  }

  const client = new Anthropic({ apiKey: key });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      // Rewriting a paragraph is a light, well-specified task: low effort keeps
      // the round trip inside a serverless request without costing quality.
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `${directive}\n\n--- TEXT ---\n${text}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, error: "refused" };
    }

    const out = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!out) return { ok: false, error: "empty" };
    return { ok: true, text: out };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return { ok: false, error: "bad_key" };
    if (error instanceof Anthropic.RateLimitError) return { ok: false, error: "rate_limited" };
    if (error instanceof Anthropic.APIError) return { ok: false, error: `api_${error.status}` };
    return { ok: false, error: "network" };
  }
}
