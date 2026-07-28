# Search Analytics — Phase 13

## Canonical Events

| Event | Exact firing condition | Key extra properties | Product decision/question |
|---|---|---|---|
| `search_context_submitted` | User taps "Show properties" in `SearchSetupPanel` (valid mode + city) | `listing_mode`, `selected_location_count`, `property_type` | How often do users change their search context? What modes/cities dominate? |
| `search_results_loaded` | First page of results completes (no error) for a new criteria state (context + filters, sort excluded) | `result_count_bucket`, `filter_groups`, `view_mode` | Do searches return results? Which filter combinations reduce results to zero? |
| `no_results_viewed` | Same trigger as `search_results_loaded` when `result_count_bucket = "0"` | Same as above | Which criteria states reliably produce no results → input for coverage/supply gaps |
| `listing_opened` | User taps a property card (List/Split) or opens from Map preview | `property_id`, `source_surface` | Which surface drives the most property opens? Map vs list contribution? |
| `map_opened` | Map becomes visible: entering fullscreen map, OR entering desktop Split when map was not previously visible | `view_mode`, `filter_groups` | Do users engage with the map? Does map use correlate with listing opens? |
| `favourite_completed` | Successful favourite ADD — DB write confirmed (`toggleFavourite` returns `true`) and it was an add (not remove) | `property_id`, `source_surface`, `search_session_id` | Favourite rate per surface. Search→favourite conversion funnel. |
| `contact_requested` | Contact request successfully created — edge function returns `{ id: ... }` without error | `property_id`, `source_surface="property_detail"`, `search_session_id` | Qualified conversion: listing_opened → contact_requested. Impact of search context on conversion. |

## Common Properties (all events)

```
search_session_id      opaque UUID, null for direct property-detail visits
listing_mode           "rent" | "buy" | null
city_id                always null (no canonical city ID in search context)
selected_location_count  integer (0 = city-wide)
property_type          controlled string | null
filter_groups          array of active group names (see below)
result_count_bucket    "0" | "1-5" | "6-20" | "21+" | "unknown"
view_mode              "list" | "split" | "map"  (mobile split → "list")
device_class           "mobile" | "tablet" | "desktop"
```

## Search Session Lifecycle

- **Starts**: when user explicitly submits a valid search context via `SearchSetupPanel`
- **Continues**: filter changes, sort changes, view mode changes, pagination, map pans, Search → PropertyDetail → Search (browser back), Search → Login → Search
- **Scope**: single browser tab (`sessionStorage`)
- **Key**: `reeve_search_session_id`
- **Lazy create**: if the first analytics event in a tab is `search_results_loaded` (deep-linked search), a session ID is created lazily
- **Null**: property-detail visits without a search origin use `search_session_id: null`

## filter_groups

Contains active filter **group names only** — never the selected values.

| Group name | Trigger condition |
|---|---|
| `budget` | minPrice or maxPrice set |
| `bhk` | one or more BHK values selected |
| `furnishing` | one or more furnishing values selected |
| `parking` | 4-wheeler or 2-wheeler parking filter set |
| `amenities` | one or more amenity filters set |
| `video_walkthrough` | hasVideoWalkthrough = true |
| `response_rate` | minResponseRate set |
| `experience_feedback` | hasExperienceFeedback = true |
| `availability` | availableBy date set (rent) |
| `listed_within` | listedWithin days set |
| `brokerage` | zeroRentBrokerage or maxBrokerage set |
| `deposit` | maxDeposit set (rent) |
| `lock_in` | maxLockIn set (rent) |
| `notice_period` | maxNotice set (rent) |
| `annual_increase` | maxAnnualIncrease set (rent) |
| `move_in_charges` | maxMoveInCharges set (rent) |
| `pet_policy` | one or more pet policy values (rent) |
| `area` | carpet area or super-built-up range set (buy) |
| `possession` | possessionStatus or possessionBefore set (buy) |
| `negotiable` | negotiable = true (buy) |
| `rera` | reraDisclosed = true (buy) |
| `khata` | one or more khata types (buy) |
| `property_tax` | propertyTaxPaid = true (buy) |

## Result Count Bucket

Uses the **currently loaded** result count — no RPC total is available.

| Bucket | Meaning |
|---|---|
| `"0"` | No results |
| `"1-5"` | 1 to 5 loaded |
| `"6-20"` | 6 to 20 loaded |
| `"21+"` | More than 20 loaded (may have additional pages) |
| `"unknown"` | Count not yet applicable (e.g. context just submitted) |

## Privacy Boundary

**Never send to PostHog:**
- Raw locality/neighbourhood/search strings
- Building names, street addresses, flat numbers
- Latitude, longitude, map bounds, coordinates
- Listed rent, deposit, or any price values
- User names, phone numbers, email addresses
- Free-text fields (messages, notes, comments)
- Full search URL or `fromSearch` string
- Complete filter values (only group names are sent)

## Derived Analyses

### Filter effectiveness
```
search_results_loaded grouped by filter_groups
→ which filter combinations produce non-zero vs zero result_count_buckets
```

### Map usefulness
```
map_opened → listing_opened WHERE source_surface = "map"
under the same search_session_id
```

### No-results recovery
```
no_results_viewed → subsequent search_results_loaded WHERE result_count_bucket ≠ "0"
under the same search_session_id
```

### Qualified conversion
```
listing_opened → favourite_completed    (same search_session_id)
listing_opened → contact_requested      (same search_session_id)
```
