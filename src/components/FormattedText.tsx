import { useMemo } from "react";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import { cardTextExtensions, parseCardText } from "../lib/cardText";

interface FormattedTextProps {
  text: string;
}

/** Renders stored Markdown card text with the same schema the editor
 * uses. Built from React elements rather than HTML, so card text can
 * never inject markup. */
export function FormattedText({ text }: FormattedTextProps) {
  const content = useMemo(
    () => renderToReactElement({ content: parseCardText(text), extensions: cardTextExtensions }),
    [text],
  );
  return <div className="rich-text">{content}</div>;
}
