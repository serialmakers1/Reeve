// Reeve Customer Stories — canonical testimonial pool + universal section copy.
//
// ⚠️ PROTOTYPE CONTENT — these are hypothetical stories for a design/marketing
// experiment. They are NOT verified real customer reviews. Replace with consented,
// real customer testimonials before production publication. Do NOT add "Verified"
// badges, star ratings, review counts, or Review/AggregateRating schema.
//
// This is the single source of truth for the React <TestimonialsSection />.
// A byte-identical copy of this text + order is duplicated (as plain JS) in
// scripts/prerender.mjs so the same stories appear in the prerendered static HTML.
// If you edit any quote, name, order or field here, update scripts/prerender.mjs too.

export type AvatarVariant = 1 | 2 | 3 | 4 | 5 | 6;

export interface Testimonial {
  /** Stable slug id (used for React keys and cross-referencing). */
  id: string;
  /** Verbatim prototype quote — do not rewrite. */
  quote: string;
  name: string;
  initials: string;
  role: string;
  ownerLocation: string;
  propertyType: string;
  propertyLocation: string;
  /** Service label shown in the card pill (uniform styling — never colour-coded). */
  service: string;
  /** Deterministic avatar palette (1–6); fixed so the same person is always the same colour. */
  avatarVariant: AvatarVariant;
}

/** Universal section copy — identical on every page. No per-page variants. */
export const SECTION_COPY = {
  eyebrow: "CUSTOMER STORIES",
  heading: "What property owners say about Reeve",
  supporting:
    "Experiences from property owners in Bangalore, elsewhere in India and overseas.",
} as const;

/**
 * The fixed universal pool AND render order (the array order is the display order).
 * First three intentionally span Property Management → NRI Sale → Tenant placement.
 */
export const TESTIMONIALS: Testimonial[] = [
  {
    id: "managed-repair-transparency",
    service: "REEVE MANAGED",
    name: "Neha R.",
    initials: "NR",
    role: "Property Owner",
    ownerLocation: "Bangalore",
    propertyType: "2 BHK",
    propertyLocation: "Whitefield, Bangalore",
    avatarVariant: 1,
    quote:
      "I had no issue paying for property management, I just wanted to know what I was paying for. With my flat in Whitefield, every repair now comes with the vendor bill and photos. Once a plumbing job crossed ₹3,000, they asked me before doing it. That sounds basic, but after my earlier experience it made a big difference.",
  },
  {
    id: "nri-sale-pune",
    service: "NRI PROPERTY SALE",
    name: "Sameer P.",
    initials: "SP",
    role: "NRI Property Owner",
    ownerLocation: "Dubai",
    propertyType: "Apartment",
    propertyLocation: "Pune, Maharashtra",
    avatarVariant: 5,
    quote:
      "I was selling a flat in Pune while living in Dubai and thought the main problem would be finding a buyer. The document review actually found an old municipal record issue first. Reeve coordinated with the advocate and CA and kept the paperwork moving from India. It took some time to clear, but I knew what was pending instead of just hearing ‘it’s in process.’",
  },
  {
    id: "let-koramangala",
    service: "REEVE LET",
    name: "Rohan D.",
    initials: "RD",
    role: "Property Owner",
    ownerLocation: "Bangalore",
    propertyType: "2 BHK",
    propertyLocation: "Koramangala, Bangalore",
    avatarVariant: 2,
    quote:
      "I didn’t want to pay a broker one month’s rent just for bringing a tenant. Reeve photographed my Koramangala apartment, handled the enquiries and did the viewings, while I still chose who I wanted to rent to. The first interested family backed out, so it took a little longer than we hoped, but the updates were regular and the final handover was properly recorded.",
  },
  {
    id: "khata-mumbai-jayanagar",
    service: "KHATA & MUTATION",
    name: "Ananya S.",
    initials: "AS",
    role: "Property Owner",
    ownerLocation: "Mumbai",
    propertyType: "Apartment",
    propertyLocation: "Jayanagar, Bangalore",
    avatarVariant: 5,
    quote:
      "My Khata application had already come back twice because my name was written differently across the old record and sale deed. Reeve didn’t promise a shortcut. They first explained what was mismatching, coordinated the correction documents and followed the resubmission. The authority still took its own time, but I stopped guessing what the rejection actually meant.",
  },
  {
    id: "watch-london-indiranagar",
    service: "REEVE WATCH",
    name: "Priya N.",
    initials: "PN",
    role: "NRI Property Owner",
    ownerLocation: "London",
    propertyType: "2 BHK",
    propertyLocation: "Indiranagar, Bangalore",
    avatarVariant: 4,
    quote:
      "Our Indiranagar flat stays locked most of the year because we live in London. On one monthly visit, the photos showed a new seepage patch near the balcony door that obviously wasn’t there the previous month. Reeve got a quote and asked before arranging the repair. For me the useful part is having twelve dated checks, not just someone saying they visited.",
  },
  {
    id: "nri-rent-tds-toronto",
    service: "NRI RENT & TDS",
    name: "Rahul B.",
    initials: "RB",
    role: "NRI Landlord",
    ownerLocation: "Toronto",
    propertyType: "Apartment",
    propertyLocation: "Chennai, Tamil Nadu",
    avatarVariant: 1,
    quote:
      "We had been receiving rent from our Chennai apartment for years, but the TDS side was honestly a mess. The tenant had some records, our CA had others, and I wasn’t sure what was missing. Reeve got everyone on the same thread, helped reconstruct the documents and coordinated the CA work. It wasn’t instant, but at least the numbers finally matched.",
  },
  {
    id: "managed-remote-mumbai",
    service: "REEVE MANAGED",
    name: "Kunal M.",
    initials: "KM",
    role: "Property Owner",
    ownerLocation: "Mumbai",
    propertyType: "3 BHK",
    propertyLocation: "HSR Layout, Bangalore",
    avatarVariant: 2,
    quote:
      "I live in Mumbai and the apartment is in HSR Layout, so small things used to become long WhatsApp chains with the tenant and society. Now I get one monthly statement even when nothing happened, and the quarterly inspection photos are all in one place. I don’t have to keep asking whether someone actually visited.",
  },
  {
    id: "nri-sale-bangalore-london",
    service: "NRI PROPERTY SALE",
    name: "Nisha V.",
    initials: "NV",
    role: "NRI Property Owner",
    ownerLocation: "London",
    propertyType: "Apartment",
    propertyLocation: "Indiranagar, Bangalore",
    avatarVariant: 6,
    quote:
      "I’m in London and the property is in Bangalore. What helped most was having one person coordinating the photographer, buyer visits, advocate and CA instead of me calling everyone separately. I still decided the price and which offer to take. There were a few document questions before registration, but they were raised early rather than at the last minute.",
  },
  {
    id: "let-dubai-whitefield",
    service: "REEVE LET",
    name: "Kavita A.",
    initials: "KA",
    role: "NRI Property Owner",
    ownerLocation: "Dubai",
    propertyType: "2 BHK",
    propertyLocation: "Whitefield, Bangalore",
    avatarVariant: 3,
    quote:
      "I’m based in Dubai and couldn’t fly to Bangalore just to show the apartment to people. The team handled the listing and viewings, sent me the serious options, and I made the final tenant decision from here. The agreement and move-in record were also taken care of. It felt like I was still in control without physically being there.",
  },
  {
    id: "managed-nri-singapore",
    service: "REEVE MANAGED",
    name: "Arjun S.",
    initials: "AS",
    role: "NRI Property Owner",
    ownerLocation: "Singapore",
    propertyType: "2 BHK",
    propertyLocation: "Sarjapur Road, Bangalore",
    avatarVariant: 3,
    quote:
      "Managing the flat from Singapore was getting tiring because every tenant issue ended up with my brother in Bangalore. Reeve took over the day-to-day communication and repairs, but the rent still comes straight to me. I especially like that they don’t handle the deposit. I can see what is happening without putting the money through another company.",
  },
  {
    id: "khata-inherited-dubai-jpnagar",
    service: "KHATA & MUTATION",
    name: "Deepak R.",
    initials: "DR",
    role: "NRI Property Owner",
    ownerLocation: "Dubai",
    propertyType: "Family property",
    propertyLocation: "JP Nagar, Bangalore",
    avatarVariant: 6,
    quote:
      "I inherited the JP Nagar property with my sister and all of us agreed on what needed to be done, but the municipal record was still in our father’s name. Reeve reviewed the deed, old Khata and tax papers, then coordinated the steps and advocate input where needed. There was some back and forth on documents, but we had one person tracking it throughout.",
  },
  {
    id: "managed-vacant-rate",
    service: "REEVE MANAGED",
    name: "Ritu K.",
    initials: "RK",
    role: "Property Owner",
    ownerLocation: "Delhi",
    propertyType: "3 BHK",
    propertyLocation: "Bellandur, Bangalore",
    avatarVariant: 4,
    quote:
      "My tenant moved out earlier than expected and I assumed I would need to cancel management and start again later. Instead, the monthly rate dropped when the flat became empty and the same team continued looking after it. They later handled the tenant search too. There was no new onboarding, which saved a lot of unnecessary back and forth.",
  },
];

/** Diagonal gradient stops per avatarVariant (135–145deg). Deterministic, never random. */
export const AVATAR_PALETTES: Record<AvatarVariant, [string, string]> = {
  1: ["#4F46E5", "#7C3AED"],
  2: ["#0284C7", "#4F46E5"],
  3: ["#0F766E", "#14B8A6"],
  4: ["#059669", "#10B981"],
  5: ["#EA580C", "#F59E0B"],
  6: ["#E11D48", "#8B5CF6"],
};
