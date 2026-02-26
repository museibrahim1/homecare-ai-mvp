/**
 * Strip AI-generated separator lines (====, ----) from text.
 * Keeps actual content intact.
 */
export function stripSeparators(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^[=\-]{4,}\s*$/.test(line.trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
