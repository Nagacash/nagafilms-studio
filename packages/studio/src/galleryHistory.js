/** Stable key for a gallery history entry */
export function historyEntryKey(entry, idx) {
  if (entry?.id != null) return String(entry.id);
  if (entry?.url) return entry.url;
  if (entry?.timestamp != null) return String(entry.timestamp);
  return `idx-${idx}`;
}

/** Return a new list with one entry removed */
export function removeHistoryEntry(list, entry, idx) {
  const key = historyEntryKey(entry, idx);
  return list.filter((e, i) => historyEntryKey(e, i) !== key);
}

/** Best-effort DB cleanup when a generation row id is stored on the entry */
export async function deleteGenerationRecord(generationId) {
  if (!generationId) return;
  try {
    await fetch(`/api/generations/${generationId}`, {
      method: "DELETE",
      credentials: "include",
    });
  } catch {
    /* local gallery removal still succeeds */
  }
}
