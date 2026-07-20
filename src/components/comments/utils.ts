export interface MappedError {
  text: string;
  profileLink?: boolean;
}

export function mapCommentError(msg: string): MappedError {
  if (msg === "NOT_AUTHENTICATED") return { text: "Please log in first" };
  if (msg.startsWith("VERIFICATION_INCOMPLETE")) {
    const which = msg.split(":")[1] || "email";
    return { text: `Verify your ${which} to continue`, profileLink: true };
  }
  if (msg === "PROPERTY_NOT_AVAILABLE") return { text: "This property is no longer accepting comments" };
  if (msg === "PROPERTY_NOT_FOUND") return { text: "This property is no longer available" };
  if (msg === "PARENT_NOT_FOUND") return { text: "The comment you're replying to was removed" };
  if (msg === "CONTAINS_URL") return { text: "Links aren't allowed in comments — mention the place by name instead" };
  if (msg === "CONTAINS_EMAIL") return { text: "Please don't share email addresses here — use the contact request flow" };
  if (msg === "CONTAINS_PHONE") return { text: "Please don't share phone numbers here — use the contact request flow" };
  if (msg === "NON_ENGLISH") return { text: "Please write in English" };
  if (msg === "CONTAINS_EMOJI") return { text: "Emojis aren't supported yet" };
  if (msg === "BLOCKED_WORD") return { text: "This comment can't be posted — it contains disallowed content" };
  if (msg === "PATTERN_SPAM") return { text: "This looks like spam — try rephrasing" };
  if (msg === "RATE_LIMIT_HOUR") return { text: "You're posting too fast. Try again in an hour." };
  if (msg === "RATE_LIMIT_DAY") return { text: "You've reached today's comment limit. Try again tomorrow." };
  return { text: "Something went wrong. Please try again." };
}
