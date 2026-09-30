import { createHash } from "node:crypto";
import {
  decodePDFRawStream,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFRef,
  PDFStream,
  ParseSpeeds,
  type PDFObject,
} from "pdf-lib";

export interface PdfInfo {
  pageCount: number;
  /** One hash per page, in page order. */
  fingerprints: string[];
}

const MAX_XOBJECT_DEPTH = 3;

// Resource names (/F1, /Im3, /Fm12 ...) are just labels a PDF writer may
// renumber on every export; what they point to is hashed separately.
const RESOURCE_NAME = /\/[^\s/<>[\](){}%]+/g;

/**
 * Hashes what's drawn on each page: its content stream(s) plus every
 * XObject (images, form XObjects - recursively) it uses. The XObjects
 * matter because a PDF writer may put a page's actual ink into a form
 * XObject and leave the content stream as just "q /Fm1 Do Q", identical on
 * every page. Drawing instructions are decoded and hashed with resource
 * names blanked out, so a re-export that merely renumbers fonts/images
 * doesn't change the fingerprint; image data is hashed as stored. When
 * Goodnotes still re-exports an unchanged page differently, link
 * relocation falls back to page position and marks the link "unsicher".
 */
export async function analyzePdf(bytes: Uint8Array): Promise<PdfInfo> {
  const doc = await PDFDocument.load(bytes, {
    ignoreEncryption: true,
    updateMetadata: false,
    throwOnInvalidObject: false,
    // Yields to the event loop while parsing so a 200 MB Heft doesn't
    // stall the WebDAV requests of the same backup run.
    parseSpeed: ParseSpeeds.Medium,
  });
  const context = doc.context;
  const xObjectHashes = new Map<string, string>();

  function resolve(obj: PDFObject | undefined): PDFObject | undefined {
    return obj instanceof PDFRef ? context.lookup(obj) : obj;
  }

  function streamBytes(obj: PDFObject | undefined): Uint8Array | null {
    const resolved = resolve(obj);
    if (!(resolved instanceof PDFStream)) return null;
    try {
      return resolved.getContents();
    } catch {
      return null;
    }
  }

  /** A content stream's operators, decoded, with resource names blanked. */
  function drawingInstructions(obj: PDFObject | undefined): Buffer | null {
    const resolved = resolve(obj);
    if (!(resolved instanceof PDFStream)) return null;
    let bytes: Uint8Array | null = null;
    if (resolved instanceof PDFRawStream) {
      try {
        bytes = decodePDFRawStream(resolved).decode();
      } catch {
        bytes = null;
      }
    }
    bytes ??= streamBytes(resolved);
    if (!bytes) return null;
    return Buffer.from(Buffer.from(bytes).toString("latin1").replace(RESOURCE_NAME, "/"), "latin1");
  }

  function hashResources(resources: PDFObject | undefined, hash: ReturnType<typeof createHash>, depth: number) {
    const dict = resolve(resources);
    if (!(dict instanceof PDFDict)) return;
    const xObjects = resolve(dict.get(PDFName.of("XObject")));
    if (!(xObjects instanceof PDFDict)) return;
    // Sorted, since renumbered names would otherwise reorder them.
    const hashes = xObjects.entries().map(([, value]) => hashXObject(value, depth));
    for (const digest of hashes.sort()) hash.update(digest);
  }

  function hashXObject(value: PDFObject, depth: number): string {
    const key = value instanceof PDFRef ? value.toString() : null;
    const cached = key ? xObjectHashes.get(key) : undefined;
    if (cached) return cached;

    const hash = createHash("sha256");
    const resolved = resolve(value);
    const isForm =
      resolved instanceof PDFStream &&
      resolved.dict.get(PDFName.of("Subtype"))?.toString() === "/Form";
    const bytes = isForm ? drawingInstructions(resolved) : streamBytes(resolved);
    if (bytes) hash.update(bytes);
    if (isForm && depth < MAX_XOBJECT_DEPTH) {
      hashResources(resolved.dict.get(PDFName.of("Resources")), hash, depth + 1);
    }
    const digest = hash.digest("hex");
    if (key) xObjectHashes.set(key, digest);
    return digest;
  }

  const fingerprints = doc.getPages().map((page) => {
    const hash = createHash("sha256");
    const contents = resolve(page.node.Contents());
    if (contents instanceof PDFArray) {
      for (let i = 0; i < contents.size(); i++) {
        const bytes = drawingInstructions(contents.get(i));
        if (bytes) hash.update(bytes);
      }
    } else {
      const bytes = drawingInstructions(contents);
      if (bytes) hash.update(bytes);
    }
    hashResources(page.node.Resources(), hash, 1);
    return hash.digest("hex").slice(0, 32);
  });

  return { pageCount: fingerprints.length, fingerprints };
}
