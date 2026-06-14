import { GoogleGenAI, type Part } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set");
}

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeminiOption {
  A?: string;
  B?: string;
  C?: string;
  D?: string;
  [key: string]: string | undefined;
}

export interface GeminiBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type GeminiSubject =
  | "ENGINEERING_MATHS"
  | "DISCRETE_MATHS"
  | "ALGORITHMS"
  | "DATA_STRUCTURES"
  | "THEORY_OF_COMPUTATION"
  | "COMPILER_DESIGN"
  | "OPERATING_SYSTEMS"
  | "COMPUTER_NETWORKS"
  | "DATABASES"
  | "COMPUTER_ORGANIZATION"
  | "DIGITAL_LOGIC"
  | "PROGRAMMING_C"
  | "GENERAL_APTITUDE";

export interface GeminiExtractedQuestion {
  pageNumber: number;           // which PDF page this question appears on
  questionNumber: number;
  questionText: string;
  questionType: "MCQ" | "MSQ" | "NAT";
  options?: GeminiOption;
  answer: string | string[] | null; // "A"/"B"/"C"/"D", ["A","C"], or "42.5"
  explanation: string | null;
  subject: GeminiSubject | null;
  topic: string | null;
  marks: 1 | 2 | null;
  difficulty: "EASY" | "MEDIUM" | "HARD" | null;
  continued: boolean;
  containsDiagram: boolean;
  diagramBoundingBox?: GeminiBoundingBox;
  extractionConfidence: number;
}

/** Result from a whole-PDF extraction (single API call) */
export interface GeminiFullResult {
  questions: GeminiExtractedQuestion[];
}

/** Result from a single-page extraction (fallback) */
export interface GeminiPageResult {
  questions: GeminiExtractedQuestion[];
  pageHasQuestions: boolean;
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const SUBJECT_GUIDE = `Subject classification guide (GATE CS):
- ENGINEERING_MATHS     → Calculus, Linear Algebra, Probability, Statistics, Numerical Methods
- DISCRETE_MATHS        → Graph Theory, Combinatorics, Set Theory, Logic, Relations, Functions
- ALGORITHMS            → Sorting, Searching, Dynamic Programming, Greedy, Complexity Analysis, NP
- DATA_STRUCTURES       → Arrays, Linked Lists, Trees, Heaps, Hash Tables, Stacks, Queues, Graphs
- THEORY_OF_COMPUTATION → DFA, NFA, PDA, Turing Machines, Decidability, Regular/Context-free languages
- COMPILER_DESIGN       → Lexical Analysis, Parsing (LL/LR), Semantic Analysis, Code Generation, Optimization
- OPERATING_SYSTEMS     → Processes, Threads, Scheduling, Memory Management, Paging, Deadlocks, File Systems
- COMPUTER_NETWORKS     → TCP/IP, OSI, Routing, Congestion Control, DNS, HTTP, Sockets
- DATABASES             → SQL, ER Diagrams, Normalization, Transactions, ACID, Indexing, Query Optimization
- COMPUTER_ORGANIZATION → CPU Architecture, Pipelining, Cache, Memory Hierarchy, I/O, Instruction Sets
- DIGITAL_LOGIC         → Boolean Algebra, Logic Gates, Flip-Flops, Counters, K-Maps, Combinational Circuits
- PROGRAMMING_C         → C Pointers, Arrays, Structs, Recursion, Memory, Bit Manipulation, Output prediction
- GENERAL_APTITUDE      → Verbal, Quantitative Aptitude, Logical Reasoning, Data Interpretation`;

const QUESTION_SCHEMA = `{
  "pageNumber": number,
  "questionNumber": number,
  "questionText": string,
  "questionType": "MCQ" | "MSQ" | "NAT",
  "options": { "A": string, "B": string, "C": string, "D": string } | null,
  "answer": string | string[] | null,
  "explanation": string | null,
  "subject": "ENGINEERING_MATHS"|"DISCRETE_MATHS"|"ALGORITHMS"|"DATA_STRUCTURES"|"THEORY_OF_COMPUTATION"|"COMPILER_DESIGN"|"OPERATING_SYSTEMS"|"COMPUTER_NETWORKS"|"DATABASES"|"COMPUTER_ORGANIZATION"|"DIGITAL_LOGIC"|"PROGRAMMING_C"|"GENERAL_APTITUDE"|null,
  "topic": string | null,
  "marks": 1 | 2 | null,
  "difficulty": "EASY" | "MEDIUM" | "HARD" | null,
  "continued": boolean,
  "containsDiagram": boolean,
  "diagramBoundingBox": { "x": number, "y": number, "width": number, "height": number } | null,
  "extractionConfidence": number
}`;

/** Prompt for single whole-PDF extraction — 1 API call for all pages */
function buildFullPdfPrompt(totalPages: number): string {
  return `You are an expert GATE CS examiner, solver, and content tagger.

This PDF has ${totalPages} pages. Extract EVERY question from ALL pages, SOLVE each one, and fill ALL metadata.

Return ONLY valid JSON — no markdown, no code fences, no text outside the JSON.

═══ EXTRACTION RULES ═══
1. Extract question text exactly as printed. Do NOT paraphrase.
2. Record the exact page number each question appears on ("pageNumber": 1-${totalPages}).
3. If a question spans two pages, set "continued": true on the first occurrence.
4. Preserve all option text (A, B, C, D) verbatim.
5. If text is unreadable, write "[unclear]".
6. Detect diagrams, graphs, circuit diagrams, automata, parse trees, tables.
   If present, estimate bounding box as normalized 0-1 coords from page top-left.
7. questionType: "MCQ" = one correct, "MSQ" = multiple correct, "NAT" = numeric answer.

═══ SOLVING RULES ═══
8. Solve every question:
   - MCQ  → answer: "A" | "B" | "C" | "D"
   - MSQ  → answer: ["A","C"] etc.
   - NAT  → answer: numeric string e.g. "42" or "3.14"
   - If unsolvable (needs diagram not visible): answer: null
9. explanation: 2-6 sentence step-by-step solution. For NAT, show computation.

═══ CLASSIFICATION RULES ═══
${SUBJECT_GUIDE}

10. subject: pick single best-matching subject from the list above.
11. topic: specific subtopic, e.g. "Binary Search Trees", "TCP Slow Start", "Dijkstra's Algorithm".
12. marks: GATE rules — questions 1-10 → 1 mark, questions 11+ → 2 marks.
13. difficulty: EASY (direct recall), MEDIUM (2-3 steps), HARD (multi-step / tricky edge cases).
14. extractionConfidence: 0.0-1.0 for text extraction quality only.

═══ JSON SCHEMA ═══
{
  "questions": [
    ${QUESTION_SCHEMA}
  ]
}`;
}

/** Prompt for single-page extraction (fallback) */
function buildPagePrompt(pageNumber: number, totalPages: number): string {
  return `You are an expert GATE CS examiner, solver, and content tagger.

Analyze ONLY page ${pageNumber} of ${totalPages} of this PDF.
Extract every question on this page, SOLVE each one, and fill ALL metadata.

Return ONLY valid JSON — no markdown, no code fences.

═══ EXTRACTION RULES ═══
1. Extract question text exactly as printed.
2. If continued from previous/to next page, set "continued": true.
3. Preserve option text verbatim.
4. Unreadable text → "[unclear]".
5. Detect diagrams/graphs/tables/circuits. Estimate bounding box if present (0-1 normalized).
6. questionType: MCQ / MSQ / NAT.
7. No questions on page → pageHasQuestions: false.

═══ SOLVING RULES ═══
8. Solve: MCQ → "A"/"B"/"C"/"D", MSQ → ["A","C"], NAT → "42". Diagram-only → null.
9. explanation: 2-6 sentence step-by-step solution.

═══ CLASSIFICATION RULES ═══
${SUBJECT_GUIDE}

10. subject / topic / marks / difficulty as per GATE conventions.
11. extractionConfidence: 0-1 for text quality.

═══ JSON SCHEMA ═══
{
  "pageHasQuestions": boolean,
  "questions": [
    ${QUESTION_SCHEMA}
  ]
}`;
}

// ─── JSON helpers ─────────────────────────────────────────────────────────────

function repairJson(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim()
    .replace(/,\s*([}\]])/g, "$1");
}

const VALID_SUBJECTS = new Set<string>([
  "ENGINEERING_MATHS", "DISCRETE_MATHS", "ALGORITHMS", "DATA_STRUCTURES",
  "THEORY_OF_COMPUTATION", "COMPILER_DESIGN", "OPERATING_SYSTEMS",
  "COMPUTER_NETWORKS", "DATABASES", "COMPUTER_ORGANIZATION",
  "DIGITAL_LOGIC", "PROGRAMMING_C", "GENERAL_APTITUDE",
]);

function coerceAnswer(raw: unknown): string | string[] | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return String(raw);
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw.map(String);
  return null;
}

function parseQuestion(qObj: Record<string, unknown>, index: number, defaultPageNumber = 1): GeminiExtractedQuestion {
  const rawSubject = qObj.subject as string | null;
  const subject = rawSubject && VALID_SUBJECTS.has(rawSubject)
    ? (rawSubject as GeminiSubject) : null;
  const rawMarks = qObj.marks;
  const marks: 1 | 2 | null = rawMarks === 1 ? 1 : rawMarks === 2 ? 2 : null;
  const rawDifficulty = qObj.difficulty as string | null;
  const difficulty = (["EASY", "MEDIUM", "HARD"].includes(rawDifficulty ?? ""))
    ? (rawDifficulty as "EASY" | "MEDIUM" | "HARD") : null;

  return {
    pageNumber: typeof qObj.pageNumber === "number" ? qObj.pageNumber : defaultPageNumber,
    questionNumber: typeof qObj.questionNumber === "number" ? qObj.questionNumber : index + 1,
    questionText: typeof qObj.questionText === "string" ? qObj.questionText : "",
    questionType: (["MCQ", "MSQ", "NAT"].includes(qObj.questionType as string)
      ? qObj.questionType : "MCQ") as "MCQ" | "MSQ" | "NAT",
    options: typeof qObj.options === "object" && qObj.options !== null
      ? (qObj.options as GeminiOption) : undefined,
    answer: coerceAnswer(qObj.answer),
    explanation: typeof qObj.explanation === "string" ? qObj.explanation : null,
    subject,
    topic: typeof qObj.topic === "string" ? qObj.topic : null,
    marks,
    difficulty,
    continued: typeof qObj.continued === "boolean" ? qObj.continued : false,
    containsDiagram: typeof qObj.containsDiagram === "boolean" ? qObj.containsDiagram : false,
    diagramBoundingBox:
      typeof qObj.diagramBoundingBox === "object" && qObj.diagramBoundingBox !== null
        ? (qObj.diagramBoundingBox as GeminiBoundingBox) : undefined,
    extractionConfidence:
      typeof qObj.extractionConfidence === "number"
        ? Math.min(1, Math.max(0, qObj.extractionConfidence)) : 0.75,
  };
}

function validateFullResult(obj: unknown): GeminiFullResult {
  if (typeof obj !== "object" || obj === null) throw new Error("Not an object");
  const r = obj as Record<string, unknown>;
  if (!Array.isArray(r.questions)) r.questions = [];
  const questions = (r.questions as unknown[]).map((q, i) => {
    if (typeof q !== "object" || q === null) throw new Error(`Q${i} not object`);
    return parseQuestion(q as Record<string, unknown>, i, 1);
  });
  return { questions };
}

function validatePageResult(obj: unknown, pageNumber: number): GeminiPageResult {
  if (typeof obj !== "object" || obj === null) throw new Error("Not an object");
  const r = obj as Record<string, unknown>;
  if (typeof r.pageHasQuestions !== "boolean") r.pageHasQuestions = true;
  if (!Array.isArray(r.questions)) r.questions = [];
  const questions = (r.questions as unknown[]).map((q, i) => {
    if (typeof q !== "object" || q === null) throw new Error(`Q${i} not object`);
    return parseQuestion(q as Record<string, unknown>, i, pageNumber);
  });
  return { pageHasQuestions: r.pageHasQuestions as boolean, questions };
}

function parseGeminiFullJson(rawText: string): GeminiFullResult {
  const cleaned = repairJson(rawText);
  try {
    return validateFullResult(JSON.parse(cleaned));
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in Gemini full-PDF response");
    return validateFullResult(JSON.parse(match[0]));
  }
}

function parseGeminiPageJson(rawText: string, pageNumber: number): GeminiPageResult {
  const cleaned = repairJson(rawText);
  try {
    return validatePageResult(JSON.parse(cleaned), pageNumber);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`No JSON found in Gemini response for page ${pageNumber}`);
    return validatePageResult(JSON.parse(match[0]), pageNumber);
  }
}

// ─── Retry helper ─────────────────────────────────────────────────────────────

function extract429DelayMs(err: Error, defaultMs: number): number {
  const match = err.message.match(/retry in (\d+(?:\.\d+)?)s/i);
  if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 1500;
  return defaultMs;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  base429WaitMs = 30_000
): Promise<T> {
  let last: Error | undefined;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err instanceof Error ? err : new Error(String(err));
      const is429 = last.message.includes("429") || last.message.includes("RESOURCE_EXHAUSTED");
      if (i < attempts) {
        const waitMs = is429 ? extract429DelayMs(last, base429WaitMs) : 1500 * i;
        console.log(
          `[gemini] Retry ${i}/${attempts - 1} after ${Math.round(waitMs / 1000)}s (${is429 ? "429 rate limit" : "error"})`
        );
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
  }
  throw last;
}

// ─── Gemini Files API ─────────────────────────────────────────────────────────

export interface GeminiFileRef {
  uri: string;
  mimeType: string;
  name: string;
}

export async function uploadPdfToGemini(
  pdfBuffer: Buffer,
  fileName: string
): Promise<GeminiFileRef> {
  const blob = new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" });
  const uploadedFile = await genai.files.upload(
    { file: blob, config: { mimeType: "application/pdf", displayName: fileName } }
  );
  if (!uploadedFile.uri) throw new Error("Gemini Files API returned no URI");

  let file = uploadedFile;
  let retries = 15;
  while (file.state === "PROCESSING" && retries-- > 0) {
    await new Promise((r) => setTimeout(r, 2000));
    file = await genai.files.get({ name: uploadedFile.name! });
  }
  if (file.state === "FAILED") throw new Error(`Gemini file processing failed: ${file.name}`);

  return { uri: file.uri!, mimeType: "application/pdf", name: file.name! };
}

export async function deleteGeminiFile(fileName: string): Promise<void> {
  try {
    await genai.files.delete({ name: fileName });
  } catch {
    // Best-effort cleanup — don't throw
  }
}

// ─── Extraction functions ─────────────────────────────────────────────────────

/**
 * PRIMARY: Extract + solve ALL questions from the entire PDF in ONE Gemini call.
 * Uses 1 API call per PDF (vs. N calls for N-page approach).
 * Automatically retries with the correct delay on 429 rate-limit errors.
 */
export async function extractAllQuestionsFromPdf(
  fileRef: GeminiFileRef,
  totalPages: number
): Promise<GeminiFullResult> {
  return withRetry(
    async () => {
      const response = await genai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
          role: "user",
          parts: [
            { fileData: { fileUri: fileRef.uri, mimeType: fileRef.mimeType } },
            { text: buildFullPdfPrompt(totalPages) },
          ],
        }],
        config: {
          temperature: 0.1,
          maxOutputTokens: 65536, // full GATE paper + explanations comfortably fits
        },
      });
      const rawText = response.text ?? "";
      if (!rawText.trim()) throw new Error("Empty Gemini response for full PDF");
      return parseGeminiFullJson(rawText);
    },
    3,
    65_000 // free tier typically resets within 60s
  );
}

/**
 * FALLBACK: Extract + solve questions from a single page.
 * Kept for debugging / per-page retry if full-PDF call fails.
 */
export async function extractQuestionsFromPdfPage(
  fileRef: GeminiFileRef,
  pageNumber: number,
  totalPages: number
): Promise<GeminiPageResult> {
  return withRetry(
    async () => {
      const response = await genai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
          role: "user",
          parts: [
            { fileData: { fileUri: fileRef.uri, mimeType: fileRef.mimeType } },
            { text: buildPagePrompt(pageNumber, totalPages) },
          ],
        }],
        config: { temperature: 0.1, maxOutputTokens: 16384 },
      });
      const rawText = response.text ?? "";
      if (!rawText.trim()) throw new Error(`Empty Gemini response for page ${pageNumber}`);
      return parseGeminiPageJson(rawText, pageNumber);
    },
    3,
    65_000
  );
}
