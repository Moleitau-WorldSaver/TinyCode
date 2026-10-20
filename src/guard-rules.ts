/** A single rule for the destructive-command guard. */
export interface Rule {
  test: (input: string) => boolean;
  reason: string;
}

/** Hard-block rules: the model is never consulted, the call is denied outright. */
export const BLACKLIST: Rule[] = [
  { test: (c) => /\brm\s+(-[a-zA-Z]*[rf][a-zA-Z]*\s*)+/.test(c), reason: "recursive delete" },
  { test: (c) => /\bgit\s+push\b[^\n]*(--force|-f)\b/.test(c), reason: "force push" },
  { test: (c) => /\bgit\s+reset\s+--hard\b/.test(c), reason: "git reset --hard" },
  { test: (c) => /\bgit\s+clean\s+-[a-zA-Z]*f[a-zA-Z]*\b/.test(c), reason: "git clean -f" },
  { test: (c) => /\bsudo\b/.test(c), reason: "privilege escalation" },
  { test: (c) => /\b(shutdown|reboot|halt|poweroff)\b/.test(c), reason: "system power control" },
  { test: (c) => /\b(dd|mkfs)\b/.test(c), reason: "raw disk write" },
];

/** Escalate-to-user rules: ambiguous but potentially destructive, so ask Y/N. */
export const DANGEROUS: Rule[] = [
  { test: (c) => /\brm\b/.test(c), reason: "deletes files" },
  { test: (c) => /\bsed\s+-i\b/.test(c), reason: "in-place file modification" },
];

/**
 * True when a path escapes the working directory: absolute, `~`, `file://`, or a
 * `..` segment that climbs out of cwd.
 */
export function escapesCwd(path: string): boolean {
  if (path === "~" || path.startsWith("~/") || path.startsWith("~\\")) return true;
  if (path.startsWith("file://")) return true;
  if (path.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(path)) return true;
  return path.split(/[\\/]/).includes("..");
}
