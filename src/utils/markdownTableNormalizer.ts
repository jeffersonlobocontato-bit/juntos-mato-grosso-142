/**
 * Utility to normalize malformed Markdown tables
 * Fixes common issues like:
 * - Tables on a single line
 * - Missing separator rows
 * - Inconsistent spacing
 */

/**
 * Detects if content contains table-like patterns that need normalization
 */
export const detectMalformedTable = (content: string): boolean => {
  // Pattern: multiple | separated by content without newlines between rows
  const singleLineTablePattern = /\|[^|\n]+\|\s*\|[^|\n]+\|/;
  return singleLineTablePattern.test(content);
};

/**
 * Normalizes markdown tables by ensuring proper line breaks
 */
export const normalizeMarkdownTables = (content: string): string => {
  if (!content) return content;

  let normalized = content;

  // Pattern 1: Fix tables where rows are concatenated (| ... | | ... |)
  // This happens when AI generates table rows without newlines
  normalized = normalized.replace(/\|\s*\|\s*(?=[^-\n])/g, '|\n|');

  // Pattern 2: Ensure separator row exists after header
  // Look for header row followed directly by data row (missing |---|)
  const lines = normalized.split('\n');
  const result: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const nextLine = lines[i + 1]?.trim() || '';
    
    result.push(lines[i]);
    
    // Check if this looks like a header row and next line is data (not separator)
    if (isTableRow(line) && isTableRow(nextLine) && !isSeparatorRow(nextLine)) {
      // Check if there's no separator between header and data
      const columnCount = countColumns(line);
      if (columnCount > 0 && !hasSeparatorNearby(lines, i)) {
        // Insert separator row
        result.push('|' + ' --- |'.repeat(columnCount).slice(0, -1));
      }
    }
  }

  return result.join('\n');
};

/**
 * Checks if a line looks like a table row
 */
const isTableRow = (line: string): boolean => {
  if (!line) return false;
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2;
};

/**
 * Checks if a line is a separator row (|---|---|)
 */
const isSeparatorRow = (line: string): boolean => {
  if (!line) return false;
  return /^\|[\s:-]+\|/.test(line.trim()) && /[-:]{2,}/.test(line);
};

/**
 * Counts the number of columns in a table row
 */
const countColumns = (line: string): number => {
  if (!line) return 0;
  const matches = line.match(/\|/g);
  return matches ? Math.max(0, matches.length - 1) : 0;
};

/**
 * Checks if there's a separator row nearby (within 2 lines)
 */
const hasSeparatorNearby = (lines: string[], index: number): boolean => {
  for (let i = Math.max(0, index - 1); i <= Math.min(lines.length - 1, index + 2); i++) {
    if (isSeparatorRow(lines[i])) return true;
  }
  return false;
};

/**
 * Formats a detected inline table into proper markdown format
 * Input: "| A | B | | 1 | 2 | | 3 | 4 |"
 * Output: "| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |"
 */
export const formatInlineTable = (content: string): string => {
  // Split by pattern where one cell ends and another begins (| |)
  const parts = content.split(/\|\s*\|/).filter(p => p.trim());
  
  if (parts.length < 2) return content;

  const rows: string[] = [];
  
  for (const part of parts) {
    const trimmed = part.trim();
    // Ensure row starts and ends with |
    const row = trimmed.startsWith('|') ? trimmed : `|${trimmed}`;
    const finalRow = row.endsWith('|') ? row : `${row}|`;
    rows.push(finalRow);
  }

  if (rows.length >= 2) {
    // Insert separator after first row (header)
    const columnCount = countColumns(rows[0]);
    const separator = '|' + ' --- |'.repeat(columnCount).slice(0, -1);
    rows.splice(1, 0, separator);
  }

  return rows.join('\n');
};
