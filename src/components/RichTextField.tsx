import { useEffect, useRef, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { Markdown } from "@tiptap/markdown";
import { Placeholder } from "@tiptap/extensions";
import { Bold, Italic, List, ListOrdered, Strikethrough, Underline } from "lucide-react";
import { cardMarkedOptions, cardTextExtensions, cardTextToPlain } from "../lib/cardText";

/** Typing shortcuts kept on: `**bold**`, `- ` for a list, etc. The rest
 * (`# ` heading, `> ` quote, ``` code block) would create formatting the
 * toolbar can't undo, so they're left off. */
const ENABLED_RULES = ["bold", "italic", "strike", "underline", "bulletList", "orderedList"];

interface FormatButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

function FormatButton({ label, active, onClick, children }: FormatButtonProps) {
  return (
    <button
      type="button"
      // Keep focus (and the selection) in the field while clicking.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`cursor-pointer rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800 ${
        active
          ? "bg-slate-100 text-action dark:bg-slate-800"
          : "text-text-secondary-light hover:text-text-primary-light dark:text-text-secondary-dark dark:hover:text-text-primary-dark"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      strike: editor.isActive("strike"),
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
    }),
  });
  const chain = () => editor.chain().focus();

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 px-1 py-0.5 dark:border-slate-700">
      <FormatButton label="Bold (Ctrl+B)" active={active.bold} onClick={() => chain().toggleBold().run()}>
        <Bold size={13} />
      </FormatButton>
      <FormatButton label="Italic (Ctrl+I)" active={active.italic} onClick={() => chain().toggleItalic().run()}>
        <Italic size={13} />
      </FormatButton>
      <FormatButton
        label="Underline (Ctrl+U)"
        active={active.underline}
        onClick={() => chain().toggleUnderline().run()}
      >
        <Underline size={13} />
      </FormatButton>
      <FormatButton
        label="Strikethrough (Ctrl+Shift+S)"
        active={active.strike}
        onClick={() => chain().toggleStrike().run()}
      >
        <Strikethrough size={13} />
      </FormatButton>
      <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
      <FormatButton
        label="Bulleted list"
        active={active.bulletList}
        onClick={() => chain().toggleBulletList().run()}
      >
        <List size={13} />
      </FormatButton>
      <FormatButton
        label="Numbered list"
        active={active.orderedList}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <ListOrdered size={13} />
      </FormatButton>
    </div>
  );
}

interface RichTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
}

/** A Tiptap editor with a small formatting toolbar. The value is Markdown
 * (see `lib/cardText`), which `FormattedText` renders on cards. It grows
 * to fit its content, like the textarea it replaced. */
export function RichTextField({ value, onChange, placeholder, required }: RichTextFieldProps) {
  // The Markdown this field last produced. Resetting the editor's content
  // on every keystroke would reset the caret, so only an outside change --
  // one that doesn't match this -- is pushed into the editor.
  const lastValue = useRef(value);

  const editor = useEditor({
    extensions: [
      ...cardTextExtensions,
      Markdown.configure({ markedOptions: cardMarkedOptions }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    contentType: "markdown",
    enableInputRules: ENABLED_RULES,
    enablePasteRules: ENABLED_RULES,
    editorProps: {
      attributes: {
        class:
          "rich-text min-h-[2rem] px-2.5 py-1.5 text-sm text-text-primary-light focus:outline-none dark:text-text-primary-dark",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": placeholder,
        ...(required ? { "aria-required": "true" } : {}),
      },
    },
    onUpdate: ({ editor }) => {
      const next = editor.isEmpty ? "" : editor.getMarkdown();
      lastValue.current = next;
      onChange(next);
    },
  });

  useEffect(() => {
    if (!editor || value === lastValue.current) return;
    lastValue.current = value;
    editor.commands.setContent(value, { contentType: "markdown", emitUpdate: false });
  }, [editor, value]);

  return (
    <div className="relative rounded-md border border-slate-200 focus-within:border-action dark:border-slate-700">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
      {/* The editor can't take part in form validation, so this invisible
       * input carries `required` -- the browser focuses it and shows its
       * "please fill out" bubble under the field, as before. */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          inputMode="none"
          required
          value={cardTextToPlain(value).replace(/ /g, " ").trim()}
          onChange={() => {}}
          className="pointer-events-none absolute bottom-0 left-2.5 h-px w-px opacity-0"
        />
      )}
    </div>
  );
}
