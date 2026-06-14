/**
 * SERVER-ONLY PDF utilities.
 *
 * - getPdfPageCount: uses pdf-lib (pure JS, zero native deps, no Web Workers)
 * - cropImage: uses sharp for diagram extraction
 */
import "server-only";

export interface BoundingBox {
  x: number; // normalized 0-1
  y: number;
  width: number;
  height: number;
}

/**
 * Count the pages in a PDF buffer using pdf-lib.
 * pdf-lib is pure JavaScript — no Web Workers, no pdfjs, no canvas.
 */
export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.load(pdfBuffer, {
    // Ignore encryption so we can still count pages on encrypted PDFs
    ignoreEncryption: true,
  });
  return doc.getPageCount();
}

/**
 * Crop a region from a PNG image buffer using sharp.
 * Used after Gemini returns a bounding box for a diagram.
 */
export async function cropImage(
  imageBuffer: Buffer,
  bbox: BoundingBox,
  imgWidth: number,
  imgHeight: number
): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharp = require("sharp") as typeof import("sharp");

  const pad = 0.05;
  const left = Math.max(0, (bbox.x - pad) * imgWidth);
  const top = Math.max(0, (bbox.y - pad) * imgHeight);
  const right = Math.min(imgWidth, (bbox.x + bbox.width + pad) * imgWidth);
  const bottom = Math.min(imgHeight, (bbox.y + bbox.height + pad) * imgHeight);

  const w = Math.floor(right - left);
  const h = Math.floor(bottom - top);

  if (w <= 0 || h <= 0) return imageBuffer;

  return sharp(imageBuffer)
    .extract({ left: Math.floor(left), top: Math.floor(top), width: w, height: h })
    .png()
    .toBuffer();
}
