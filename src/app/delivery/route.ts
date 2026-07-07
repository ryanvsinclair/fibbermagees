import { getHtmlPage, htmlResponse } from "@/lib/html-page";

export async function GET() {
  const html = await getHtmlPage("delivery");
  return htmlResponse(html);
}
