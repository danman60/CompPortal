/**
 * Highlights matching text in a string by wrapping matches in a span with yellow background
 * @param text - The full text to search in
 * @param query - The search query to highlight
 * @returns React element with highlighted matches
 */
export function highlightText(text: string, query: string): React.ReactNode {
  if (!query || !text) return text;

  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={index}
            className="bg-yellow-400 text-black px-0.5 rounded"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
