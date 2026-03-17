/**
 * Safely parse a fetch response as JSON.
 * Returns {} when the body is empty or not valid JSON
 * (e.g. Vercel 504/413 plain-text error responses).
 */
export async function safeResJson(res: Response): Promise<any> {
  try {
    const text = await res.text();
    if (!text.trim()) return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}
