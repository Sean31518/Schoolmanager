/**
 * WebDAV paths are stored without leading/trailing slash, relative to the
 * user's root ("" is the root itself), e.g. "GoodNotes/Schule/Q1/Mathe.pdf".
 * Accepts a request path or an absolute Destination URL (Goodnotes sends
 * the full URL incl. host - only the path part matters, the host is the
 * reverse proxy's anyway). Returns null for anything that would escape the
 * root or can't be decoded.
 */
export function normalizeDavPath(raw: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(raw, "http://dav.invalid").pathname;
  } catch {
    return null;
  }
  const segments: string[] = [];
  for (const encoded of pathname.split("/")) {
    if (encoded === "") continue;
    let segment: string;
    try {
      segment = decodeURIComponent(encoded);
    } catch {
      return null;
    }
    if (segment === "." || segment === ".." || /[/\\\0]/.test(segment)) return null;
    segments.push(segment.normalize("NFC"));
  }
  return segments.join("/");
}

export function parentPath(path: string) {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

export function baseName(path: string) {
  return path.slice(path.lastIndexOf("/") + 1);
}

/** Every ancestor folder of path, outermost first, excluding the root. */
export function ancestorPaths(path: string) {
  const segments = path.split("/").filter(Boolean);
  const result: string[] = [];
  for (let i = 1; i < segments.length; i++) result.push(segments.slice(0, i).join("/"));
  return result;
}

export function isInside(path: string, folder: string) {
  return folder === "" ? path !== "" : path.startsWith(folder + "/");
}

export function hrefFor(path: string, isCollection: boolean) {
  const href = "/" + path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  return isCollection && !href.endsWith("/") ? href + "/" : href;
}
