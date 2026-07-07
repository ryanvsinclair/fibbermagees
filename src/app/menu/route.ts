import { getHtmlPage, htmlResponse } from "@/lib/html-page";

export async function GET() {
  const html = await getHtmlPage("menu");
  return htmlResponse(html);
}
