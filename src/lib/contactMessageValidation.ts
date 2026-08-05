export function mapContactMessageError(code: string | null | undefined): string | null {
  if (!code) return null;
  if (code === "message_contains_phone")
    return "Your message can't include phone numbers.";
  if (code === "message_contains_email")
    return "Your message can't include email addresses.";
  if (code === "message_contains_url")
    return "Your message can't include links or web addresses.";
  if (code === "message_contains_contact_handle")
    return "Contact handles aren't allowed in this message.";
  if (code === "message_contains_contact_channel")
    return "Please remove WhatsApp or Telegram contact details.";
  if (code === "message_blocked_content")
    return "This message contains content that isn't allowed.";
  if (code === "message_too_long")
    return "Your message must be 200 characters or fewer.";
  return null;
}
