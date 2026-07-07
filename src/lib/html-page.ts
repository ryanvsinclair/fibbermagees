import { readFile } from "fs/promises";
import path from "path";
import { injectPageLoader } from "./page-loader";
import { injectPagePrefetch } from "./page-prefetch";

export type HtmlPageName = "home" | "menu" | "franchise" | "delivery";

export async function getHtmlPage(name: HtmlPageName): Promise<string> {
  const filePath = path.join(process.cwd(), "src/content", `${name}.html`);
  const html = await readFile(filePath, "utf-8");
  return injectPagePrefetch(injectPageLoader(html));
}

export function htmlResponse(html: string): Response {
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
