import { readFile } from "fs/promises";
import path from "path";

export type HtmlPageName = "home" | "menu" | "franchise" | "delivery";

export async function getHtmlPage(name: HtmlPageName): Promise<string> {
  const filePath = path.join(process.cwd(), "src/content", `${name}.html`);
  return readFile(filePath, "utf-8");
}

export function htmlResponse(html: string): Response {
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
