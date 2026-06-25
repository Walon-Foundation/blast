import { codeToHtml } from "shiki";

interface CodeBlockProps {
  code: string;
  lang?: string;
}

export async function CodeBlock({ code, lang = "bash" }: CodeBlockProps) {
  const html = await codeToHtml(code.trim(), {
    lang,
    theme: "github-dark",
  });

  return (
    <div
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
      className="leading-none"
    />
  );
}
