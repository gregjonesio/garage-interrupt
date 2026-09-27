// Owner complaints are free text typed by members of the public. NHTSA redacts
// them, but not perfectly. A complaint whose text still carries something that
// identifies a person is left out of the stream entirely.
const IDENTIFYING: Record<string, RegExp> = {
  email: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
  phone: /(?<!\d)(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?!\d)/,
  // 17 characters from the VIN alphabet, with at least one letter and one digit.
  vin: /\b(?=[A-HJ-NPR-Z0-9]{17}\b)(?=[A-HJ-NPR-Z0-9]*\d)(?=[A-HJ-NPR-Z0-9]*[A-HJ-NPR-Z])[A-HJ-NPR-Z0-9]{17}\b/,
  ssn: /(?<!\d)\d{3}-\d{2}-\d{4}(?!\d)/,
  case_number: /\b(?:claim|case|ticket|reference|confirmation)\s*(?:number|no\.?|#)\s*(?:is|was|:)?\s*#?\s*[A-Z0-9][A-Z0-9-]{4,}/i,
  street_address: /\b\d{2,5}\s+(?:[NSEW]\.?\s+)?[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\s(?:Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd\.|Drive|Dr\.|Lane|Ln\.|Court|Ct\.)/,
};

// Returns the kinds of identifying detail found, empty when there are none.
export function identifyingDetails(text: string): string[] {
  return Object.entries(IDENTIFYING)
    .filter(([, re]) => re.test(text))
    .map(([name]) => name);
}
