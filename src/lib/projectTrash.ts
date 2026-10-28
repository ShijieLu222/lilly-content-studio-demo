const STORAGE = "lilly-deleted-projects-v1";
let cachedIds: string[] = [];

function readIds(): string[] {
  const raw = localStorage.getItem(STORAGE);
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string"))
    throw new Error("已删除创作记录无法读取，请刷新后重试。");
  return [...new Set(value as string[])];
}

export function getTrashedProjectIds(): string[] {
  try {
    cachedIds = readIds();
  } catch {
    // A temporary storage failure must not reveal known deleted projects.
    // Mutations below use the strict reader and never report false success.
  }
  return [...cachedIds];
}

export function isProjectDeleted(id: string): boolean {
  return getTrashedProjectIds().includes(id);
}

function changeTrash(id: string, deleted: boolean): void {
  if (!id.trim() || id.length > 150)
    throw new Error("创作标识无效，请刷新后重试。");
  const ids = new Set(readIds());
  if (deleted) ids.add(id);
  else ids.delete(id);
  const next = [...ids];
  localStorage.setItem(STORAGE, JSON.stringify(next));
  cachedIds = next;
}

export function trashProject(id: string): void {
  changeTrash(id, true);
}

export function restoreProject(id: string): void {
  changeTrash(id, false);
}
