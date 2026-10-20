/** A single rule for the destructive-command guard. */
export interface Rule {
  name: string;
  test: (input: string) => boolean;
  reason: string;
}

/** Hard-block rules: the model is never consulted, the call is denied outright. */
export const BLACKLIST: Rule[] = [
  {
    name: "recursive-delete",
    test: (c) => /\brm\s+(-[a-zA-Z]*[rf][a-zA-Z]*\s*)+/.test(c),
    reason: "recursive delete",
  },
  {
    name: "force-push",
    test: (c) => /\bgit\s+push\b[^\n]*(--force|-f)\b/.test(c),
    reason: "force push",
  },
  {
    name: "hard-reset",
    test: (c) => /\bgit\s+reset\s+--hard\b/.test(c),
    reason: "git reset --hard",
  },
  {
    name: "git-clean",
    test: (c) => /\bgit\s+clean\s+-[a-zA-Z]*f[a-zA-Z]*\b/.test(c),
    reason: "git clean -f",
  },
  {
    name: "sudo",
    test: (c) => /\bsudo\b/.test(c),
    reason: "privilege escalation",
  },
  {
    name: "power-control",
    test: (c) => /\b(shutdown|reboot|halt|poweroff)\b/.test(c),
    reason: "system power control",
  },
  {
    name: "raw-disk-write",
    test: (c) => /\b(dd|mkfs)\b/.test(c),
    reason: "raw disk write",
  },
];

/** Escalate-to-user rules: ambiguous but potentially destructive, so ask Y/N. */
export const DANGEROUS: Rule[] = [
  {
    name: "delete-file",
    test: (c) => /\brm\b/.test(c),
    reason: "deletes files",
  },
  {
    name: "in-place-edit",
    test: (c) => /\bsed\s+-i\b/.test(c),
    reason: "in-place file modification",
  },
  {
    name: "truncate-redirect",
    test: (c) => />\s*\S/.test(c),
    reason: "overwrites a file via shell redirect",
  },
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
