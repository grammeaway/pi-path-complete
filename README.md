# pi-path-complete

Disclaimer: Extension written fully by Pi itself.

Inline file-path autocompletion for the
[pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) coding agent.

While typing, if the token under the cursor is a clear path pattern (`./`,
`../`, `~/`, or a leading `/`), it lists matching directory entries as
autocomplete suggestions. Directories get a trailing `/` so you can keep
chaining into them. Anything else falls through to Pi's built-in provider.

## Install

```bash
pi install npm:@grammeaway/pi-path-complete
```

To try it without permanently installing:

```bash
pi -e npm:@grammeaway/pi-path-complete
```

## Notes

- **Triggers** on tokens starting with `./`, `../`, `~/`, or `/`. A bare `/` as
  the first character on the first line is treated as a slash-command and left
  to Pi's built-in command menu.
- **Hidden files** (dotfiles) are only listed once you type the leading `.`.
- Directories sort before files and are suffixed with `/`.
- Results are capped at 50 entries.
