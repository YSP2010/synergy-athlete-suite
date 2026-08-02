import { unzipSync } from "fflate";
import { safeRelativePath, sniffFileType } from "./detect";

export interface ExtractedEntry {
  relativePath: string;
  bytes: Uint8Array;
}

export interface UnzipLimits {
  /** Maximale Verschachtelungstiefe (Haupt-ZIP = Ebene 1). */
  maxDepth: number;
  /** Maximale Gesamtgröße aller entpackten Dateien in Bytes (Zip-Bomben-Schutz). */
  maxTotalBytes: number;
  /** Maximale Anzahl an Einträgen. */
  maxEntries: number;
}

export const DEFAULT_UNZIP_LIMITS: UnzipLimits = {
  maxDepth: 3,
  maxTotalBytes: 1_500_000_000,
  maxEntries: 20_000,
};

export interface UnzipResult {
  entries: ExtractedEntry[];
  /** Einträge, die wegen Limits/Pfad-Traversal verworfen wurden. */
  rejected: { relativePath: string; reason: string }[];
  truncated: boolean;
}

/**
 * Entpackt ein ZIP rekursiv (verschachtelte Archive im Garmin-Konto-Export)
 * mit Schutz gegen Zip-Bomben und Pfad-Traversal.
 */
export function unzipRecursive(
  bytes: Uint8Array,
  limits: UnzipLimits = DEFAULT_UNZIP_LIMITS,
  prefix = "",
  depth = 1,
  state = { total: 0, count: 0, truncated: false },
): UnzipResult {
  const entries: ExtractedEntry[] = [];
  const rejected: { relativePath: string; reason: string }[] = [];

  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch (e) {
    rejected.push({
      relativePath: prefix || "(archiv)",
      reason: `zip_unreadable: ${(e as Error).message}`,
    });
    return { entries, rejected, truncated: state.truncated };
  }

  for (const [rawName, content] of Object.entries(files)) {
    if (rawName.endsWith("/")) continue; // Ordnereintrag
    const safe = safeRelativePath(rawName);
    if (!safe) {
      rejected.push({ relativePath: rawName, reason: "path_traversal" });
      continue;
    }
    const relativePath = prefix ? `${prefix}/${safe}` : safe;

    if (state.count >= limits.maxEntries || state.total + content.length > limits.maxTotalBytes) {
      state.truncated = true;
      rejected.push({ relativePath, reason: "limit_exceeded" });
      continue;
    }
    state.count += 1;
    state.total += content.length;

    if (sniffFileType(content) === "zip") {
      if (depth >= limits.maxDepth) {
        rejected.push({ relativePath, reason: "max_depth" });
        continue;
      }
      const inner = unzipRecursive(content, limits, relativePath, depth + 1, state);
      entries.push(...inner.entries);
      rejected.push(...inner.rejected);
      continue;
    }

    entries.push({ relativePath, bytes: content });
  }

  return { entries, rejected, truncated: state.truncated };
}
