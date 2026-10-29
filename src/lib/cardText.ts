/** Question/answer text is stored as Markdown (`**bold**`, `*italic*`,
 * `++underline++`, `~~strike~~`, `- lists`...), so cards, backups, and
 * sync stay plain strings, and older plain-text cards are already valid. */
import type { JSONContent } from "@tiptap/core";
import { MarkdownManager } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";

/** The schema shared by the editor and the card display. Every StarterKit
 * node stays loaded even though the toolbar only offers a few of them:
 * Markdown syntax with no matching node (a line like "# Title") would
 * otherwise be silently dropped when parsed. */
export const cardTextExtensions = [
  StarterKit.configure({
    link: { openOnClick: false, autolink: false, linkOnPaste: false },
  }),
];

/** Single newlines become line breaks, matching how plain-text cards were
 * shown before formatting existed. */
export const cardMarkedOptions = { breaks: true };

const markdown = new MarkdownManager({
  extensions: cardTextExtensions,
  markedOptions: cardMarkedOptions,
});

// Cards re-render often (swipes, flips), so parse each distinct text once.
const parseCache = new Map<string, JSONContent>();
const PARSE_CACHE_LIMIT = 500;

export function parseCardText(text: string): JSONContent {
  let doc = parseCache.get(text);
  if (!doc) {
    doc = markdown.parse(text);
    if (parseCache.size >= PARSE_CACHE_LIMIT) parseCache.clear();
    parseCache.set(text, doc);
  }
  return doc;
}

function collectText(node: JSONContent, out: string[]) {
  if (node.type === "text") out.push(node.text ?? "");
  else if (node.type === "hardBreak") out.push("\n");
  node.content?.forEach((child, index) => {
    if (index > 0 && child.type !== "text" && child.type !== "hardBreak") out.push("\n");
    collectText(child, out);
  });
}

/** The text as displayed, with all formatting removed. */
export function cardTextToPlain(text: string): string {
  const out: string[] = [];
  collectText(parseCardText(text), out);
  return out.join("");
}

/** True when the text has nothing visible -- e.g. only empty paragraphs,
 * which the editor stores as `&nbsp;` to keep blank lines. */
export function isCardTextBlank(text: string): boolean {
  return cardTextToPlain(text).replace(/ /g, " ").trim() === "";
}
