import { GoogleGenAI } from "@google/genai";
import { auth } from "@/lib/auth";
import { Subject, Difficulty, QuestionType } from "@prisma/client";

const VALID_SUBJECTS = Object.values(Subject);
const VALID_DIFFICULTIES = Object.values(Difficulty);
const VALID_TYPES = Object.values(QuestionType);

// ─── Gemini extraction prompt ─────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert at parsing GATE (Graduate Aptitude Test in Engineering) Computer Science exam papers, including questions with figures, diagrams, and mathematical notation.

Extract ALL questions from the provided PDF and return a JSON array. For EACH question produce exactly this shape:

{
  "year": <integer — GATE exam year, read from header/footer, default 2024>,
  "subject": <one of: ENGINEERING_MATHS | DISCRETE_MATHS | ALGORITHMS | DATA_STRUCTURES | THEORY_OF_COMPUTATION | COMPILER_DESIGN | OPERATING_SYSTEMS | COMPUTER_NETWORKS | DATABASES | COMPUTER_ORGANIZATION | DIGITAL_LOGIC | PROGRAMMING_C | GENERAL_APTITUDE>,
  "topic": <specific topic, e.g. "Binary Trees", "Pipelining", "SQL Joins">,
  "marks": <1 or 2>,
  "difficulty": <"EASY" | "MEDIUM" | "HARD">,
  "questionType": <"MCQ" | "MSQ" | "NAT">,
  "questionText": <full question text — see diagram rules below>,
  "hasImage": <true if this question contains a diagram, figure, table, or circuit — false otherwise>,
  "imageDescription": <if hasImage is true: a self-contained plain-text description of the image that fully captures the information needed to answer the question. Otherwise null>,
  "options": <for MCQ/MSQ: [{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."}], for NAT: null>,
  "answer": <for MCQ: "A"/"B"/"C"/"D" string; for MSQ: ["A","C"] array; for NAT: numeric value>,
  "explanation": <brief explanation of why the answer is correct, or null>,
  "source": <e.g. "GATE CS 2023">,
  "paperSet": <"Set 1"/"Set 2" if multiple sets, else null>,
  "tags": <array of 1-3 lowercase keyword tags>
}

─── DIAGRAM / IMAGE RULES ───────────────────────────────────────────────────
When a question contains a figure, diagram, table, circuit, or automaton:
1. Set "hasImage": true
2. In "questionText": write the question text normally, replace the figure reference with [Figure: see imageDescription]
3. In "imageDescription": write a COMPLETE, SELF-CONTAINED description using plain text so someone could reconstruct the image and answer the question. Be very specific:

   - Automata / State machines: list every state, every transition (from → to on input), start state, accepting states
     Example: "NFA with states {q0,q1,q2}. q0 is start state. q2 is accepting state. Transitions: q0 -a-> q1, q0 -b-> q0, q1 -a-> q2, q1 -b-> q0, q2 -a-> q2, q2 -b-> q2"

   - Graphs / Trees: list vertices, edges, weights if any; describe tree structure with parent → children
     Example: "Directed graph with vertices {A,B,C,D,E}. Edges: A→B(w=4), A→C(w=2), B→D(w=3), C→D(w=1), D→E(w=5)"

   - Circuit diagrams / Logic gates: describe inputs, gate types in sequence, outputs
     Example: "Two-input AND gate whose output feeds into a NOT gate. Second input also feeds a separate OR gate with input X."

   - Tables: reproduce as plain text table with column headers and all rows
     Example: "Page reference string: 1,2,3,4,1,2,5,1,2,3,4,5. Number of frames: 3."

   - Code / Pseudocode: transcribe verbatim
   - Timing diagrams: describe signal values at each clock cycle

─── MATHEMATICAL NOTATION ───────────────────────────────────────────────────
Use plain ASCII math: ^ for exponent, * for multiply, Σ for sum, ∀ for forall,
∃ for exists, → for implies, ↔ for iff, ∧ for AND, ∨ for OR, ¬ for NOT, ∈ for in.

─── OUTPUT FORMAT ───────────────────────────────────────────────────────────
Return ONLY a valid JSON array — no markdown, no code fences, no explanation.
If no questions can be extracted, return [].`;

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return Response.json(
      { error: "GEMINI_API_KEY is not configured. Add it to your .env file." },
      { status: 503 }
    );
  }

  // ── Parse multipart form data ─────────────────────────────────────────────
  const formData = await request.formData();
  const file = formData.get("pdf") as File | null;

  if (!file) return Response.json({ error: "No PDF file provided" }, { status: 400 });
  if (!file.type.includes("pdf")) return Response.json({ error: "File must be a PDF" }, { status: 400 });

  const maxSize = 20 * 1024 * 1024; // 20 MB
  if (file.size > maxSize) {
    return Response.json({ error: "PDF must be under 20 MB" }, { status: 413 });
  }

  // ── Convert file to base64 ────────────────────────────────────────────────
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  // ── Call Gemini (new @google/genai SDK → v1 endpoint) ────────────────────
  // Try models in order — first that succeeds wins.
  const MODEL_CHAIN = [
    "gemini-2.0-flash-lite", // free tier, v1, fast
    "gemini-2.0-flash",      // free tier, v1, better quality
    "gemini-1.5-flash",      // fallback
  ];

  const ai = new GoogleGenAI({ apiKey });

  let raw: string | undefined;
  let lastError = "";

  for (const modelName of MODEL_CHAIN) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: "application/pdf", data: base64 } },
              { text: SYSTEM_PROMPT },
            ],
          },
        ],
      });
      raw = response.text ?? "";
      break; // success — stop trying
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      // If quota/not-found, try next model; else throw immediately
      if (!lastError.includes("429") && !lastError.includes("404") && !lastError.includes("quota")) {
        return Response.json({ error: `AI extraction failed: ${lastError}` }, { status: 502 });
      }
    }
  }

  if (raw === undefined) {
    return Response.json(
      { error: `All Gemini models failed. Last error: ${lastError}. Check your API key quota at https://ai.dev/rate-limit` },
      { status: 503 }
    );
  }

  // ── Strip markdown code fences if present ─────────────────────────────────
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // ── Parse JSON ────────────────────────────────────────────────────────────
  let extracted: unknown[];
  try {
    extracted = JSON.parse(cleaned);
    if (!Array.isArray(extracted)) throw new Error("Response is not an array");
  } catch {
    return Response.json(
      { error: "Failed to parse AI response as JSON. Try a cleaner PDF.", raw: cleaned.slice(0, 500) },
      { status: 422 }
    );
  }

  // ── Validate & sanitize each extracted question ───────────────────────────
  const valid: unknown[] = [];
  const skipped: Array<{ index: number; reason: string }> = [];

  for (let i = 0; i < extracted.length; i++) {
    const q = extracted[i] as Record<string, unknown>;

    // Required field checks
    if (!q.questionText || typeof q.questionText !== "string") {
      skipped.push({ index: i, reason: "Missing questionText" });
      continue;
    }
    if (!VALID_SUBJECTS.includes(q.subject as Subject)) {
      skipped.push({ index: i, reason: `Invalid subject: ${q.subject}` });
      continue;
    }
    if (!VALID_TYPES.includes(q.questionType as QuestionType)) {
      skipped.push({ index: i, reason: `Invalid questionType: ${q.questionType}` });
      continue;
    }
    if (q.answer === undefined || q.answer === null) {
      skipped.push({ index: i, reason: "Missing answer" });
      continue;
    }

    valid.push({
      subject:          q.subject,
      topic:            typeof q.topic === "string" ? q.topic : "Unknown",
      year:             typeof q.year === "number" ? Math.floor(q.year) : 2024,
      marks:            q.marks === 2 ? 2 : 1,
      difficulty:       VALID_DIFFICULTIES.includes(q.difficulty as Difficulty) ? q.difficulty : "MEDIUM",
      questionType:     q.questionType,
      questionText:     q.questionText.trim(),
      hasImage:         q.hasImage === true,
      imageDescription: typeof q.imageDescription === "string" ? q.imageDescription : null,
      options:          Array.isArray(q.options) ? q.options : null,
      answer:           q.answer,
      explanation:      typeof q.explanation === "string" ? q.explanation : null,
      source:           typeof q.source === "string" ? q.source : null,
      paperSet:         typeof q.paperSet === "string" ? q.paperSet : null,
      tags:             Array.isArray(q.tags) ? q.tags : [],
      isVerified:       false, // admin must verify after review
    });
  }

  return Response.json({
    extracted: valid,
    total:   extracted.length,
    valid:   valid.length,
    skipped,
  });
}
