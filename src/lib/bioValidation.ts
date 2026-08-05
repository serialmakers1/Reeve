export const BIO_MAX = 200;

const CONTACT_CODES = [
  "CONTAINS_URL",
  "CONTAINS_EMAIL",
  "CONTAINS_PHONE",
  "CONTAINS_SOCIAL_HANDLE",
  "BLOCKED_CONTENT",
];

export function mapBioError(message: string): string | null {
  if (message.includes("BIO_TOO_LONG"))
    return "Bio must be 200 characters or fewer.";
  if (CONTACT_CODES.some((code) => message.includes(code)))
    return "Bios can't include phone numbers, email addresses or external links.";
  if (message.includes("BLOCKED_WORD"))
    return "Please remove abusive or inappropriate language from your bio.";
  return null;
}
