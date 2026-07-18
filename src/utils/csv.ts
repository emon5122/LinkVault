/**
 * RFC-4180-ish CSV parsing and serialization. Handles quoted fields, embedded commas/newlines,
 * and escaped double-quotes. Pure + unit-tested; used by the import/export service.
 */

/** Serialize a single field, quoting it when it contains a comma, quote, or newline. */
function encodeField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Convert a matrix of rows into CSV text (CRLF line endings for Excel compatibility). */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((row) => row.map((cell) => encodeField(cell == null ? '' : String(cell))).join(','))
    .join('\r\n');
}

/** Parse CSV text into a matrix of string cells. Tolerant of both LF and CRLF line endings. */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const text = input;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ',') {
      endField();
      i += 1;
      continue;
    }
    if (char === '\r') {
      // Swallow CRLF as a single line break.
      if (text[i + 1] === '\n') i += 1;
      endRow();
      i += 1;
      continue;
    }
    if (char === '\n') {
      endRow();
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  // Flush the final field/row unless the input ended exactly on a newline.
  if (field !== '' || row.length > 0) {
    endRow();
  }

  return rows;
}

/**
 * Parse CSV that has a header row into an array of records keyed by (trimmed, lower-cased) header.
 * Empty trailing rows are ignored.
 */
export function parseCsvRecords(input: string): Record<string, string>[] {
  const matrix = parseCsv(input).filter((r) => r.some((c) => c.trim() !== ''));
  if (matrix.length === 0) return [];

  const headers = matrix[0].map((h) => h.trim().toLowerCase());
  return matrix.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = cells[index] ?? '';
    });
    return record;
  });
}
