export type ParsedQuery = {
  include: string[];
  exclude: string[];
};

const NON_DECOMPOSING_FOLDS: Record<string, string> = {
  ł: "l",
  Ł: "L",
  ø: "o",
  Ø: "O",
  æ: "ae",
  Æ: "AE",
  œ: "oe",
  Œ: "OE",
  ß: "ss",
  ẞ: "SS",
  đ: "d",
  Đ: "D",
  þ: "th",
  Þ: "TH",
  ð: "d",
  Ð: "D",
  ı: "i",
  ŋ: "n",
  Ŋ: "N",
};

export function foldDiacritics(value: string): string {
  const preFolded = value.replace(
    /[łŁøØæÆœŒßẞđĐþÞðÐıŋŊ]/g,
    (char) => NON_DECOMPOSING_FOLDS[char] ?? char,
  );
  return preFolded
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function parseSearchQuery(raw: string): ParsedQuery {
  const include: string[] = [];
  const exclude: string[] = [];

  const pattern = /(-)?"([^"]+)"|(-)?(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw)) !== null) {
    const isExcluded = Boolean(match[1] ?? match[3]);
    const value = match[2] ?? match[4] ?? "";
    const folded = foldDiacritics(value.trim());
    if (!folded) continue;
    if (isExcluded) {
      exclude.push(folded);
    } else {
      include.push(folded);
    }
  }

  return { include, exclude };
}

export function matchesFoldedHaystack(
  haystack: string,
  parsed: ParsedQuery,
): boolean {
  for (const token of parsed.include) {
    if (!haystack.includes(token)) return false;
  }
  for (const token of parsed.exclude) {
    if (haystack.includes(token)) return false;
  }
  return true;
}

export type SearchableFields = {
  heading: string;
  tags: string;
  typeLabel: string;
  summary: string;
  meta: string;
  text: string;
};

export function scoreSearchFields(
  fields: SearchableFields,
  parsed: ParsedQuery,
): number {
  let score = 0;
  for (const token of parsed.include) {
    if (fields.heading.includes(token)) score += 5;
    if (fields.tags.includes(token)) score += 4;
    if (fields.typeLabel.includes(token)) score += 4;
    if (fields.summary.includes(token)) score += 2;
    if (fields.meta.includes(token)) score += 1;
    if (fields.text.includes(token)) score += 1;
  }
  return score;
}

export type HighlightRange = {
  start: number;
  end: number;
};

export function findHighlightRanges(
  text: string,
  foldedTokens: string[],
): HighlightRange[] {
  if (!text || foldedTokens.length === 0) return [];

  const foldedChars: string[] = [];
  const foldedToOriginal: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    const folded = foldDiacritics(text[index] ?? "");
    for (const char of folded) {
      foldedChars.push(char);
      foldedToOriginal.push(index);
    }
  }
  const foldedText = foldedChars.join("");
  if (!foldedText) return [];

  const ranges: HighlightRange[] = [];
  for (const token of foldedTokens) {
    if (!token) continue;
    let from = 0;
    while (from <= foldedText.length - token.length) {
      const found = foldedText.indexOf(token, from);
      if (found === -1) break;
      const start = foldedToOriginal[found] ?? 0;
      const lastFolded = found + token.length - 1;
      const end = (foldedToOriginal[lastFolded] ?? start) + 1;
      ranges.push({ start, end });
      from = found + token.length;
    }
  }

  ranges.sort((left, right) => left.start - right.start || left.end - right.end);
  const merged: HighlightRange[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}
