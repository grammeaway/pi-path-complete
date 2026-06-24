/**
 * Inline file-path autocompletion for Pi.
 *
 * While typing, if the token under the cursor is a clear path pattern
 * (./  ../  ~/  or a leading /), it lists matching directory entries as
 * autocomplete suggestions. Directories get a trailing "/" so you can keep
 * chaining. Anything else falls through to Pi's built-in provider.
 *
 * Drop-in: any *.ts/*.js in ~/.pi/agent/extensions/.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

// token = optional (. | .. | ~) then a slash then the rest, anchored to a
// word boundary so "foo/bar" (no ./ prefix) is left to the built-in provider.
const PATH_RE = /(?:^|\s)((?:\.{1,2}|~)?\/\S*)$/;
const MAX = 50;

function listPath(token: string, cwd: string) {
  const slash = token.lastIndexOf("/");
  const dirPart = token.slice(0, slash + 1); // e.g. "./src/"
  const partial = token.slice(slash + 1); // e.g. "comp"
  const expanded = dirPart.startsWith("~/") ? homedir() + dirPart.slice(1) : dirPart;
  const dir = resolve(cwd, expanded || ".");

  let entries: import("node:fs").Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return null; // not a real dir yet — stay quiet
  }

  const showHidden = partial.startsWith(".");
  const items = entries
    .filter((e) => e.name.startsWith(partial) && (showHidden || !e.name.startsWith(".")))
    .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
    .slice(0, MAX)
    .map((e) => {
      const isDir = e.isDirectory();
      const name = e.name + (isDir ? "/" : "");
      return { value: dirPart + name, label: name, description: isDir ? "dir" : "file" };
    });

  return items.length ? { items, prefix: token } : null;
}

export default function pathComplete(pi: ExtensionAPI) {
  let cwd = process.cwd();
  pi.on("session_start", (_e, ctx) => {
    cwd = ctx.sessionManager.getCwd();
    ctx.ui.addAutocompleteProvider((current: any) => {
      let mine = false; // ponytail: applyCompletion runs right after our getSuggestions
      return {
        triggerCharacters: ["/", ".", "~", ...(current.triggerCharacters ?? [])],
        async getSuggestions(lines: string[], line: number, col: number, opts: any) {
          const before = (lines[line] ?? "").slice(0, col);
          const m = PATH_RE.exec(before);
          // ponytail: a bare "/" as the first char is a slash-command, not a
          // path — leave it to the built-in command menu.
          const isCommand = m && m[1].startsWith("/") && line === 0 && m.index === 0;
          if (m && !isCommand) {
            const res = listPath(m[1], cwd);
            if (res) {
              mine = true;
              return res;
            }
          }
          mine = false;
          return current.getSuggestions(lines, line, col, opts);
        },
        applyCompletion(lines: string[], line: number, col: number, item: any, prefix: string) {
          if (!mine) return current.applyCompletion(lines, line, col, item, prefix);
          const text = lines[line] ?? "";
          const head = text.slice(0, col - prefix.length) + item.value;
          const newLines = [...lines];
          newLines[line] = head + text.slice(col);
          return { lines: newLines, cursorLine: line, cursorCol: head.length };
        },
        shouldTriggerFileCompletion: current.shouldTriggerFileCompletion?.bind(current),
      };
    });
  });
  pi.on("turn_start", (_e, ctx) => (cwd = ctx.sessionManager.getCwd()));
}
