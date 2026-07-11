export const PHOTO_CONFIG = {
  compression: {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  },
  upload: {
    minCount: 3,
    maxCount: 15,
    // Raw file size before compression; enforced client-side before HEIC conversion
    // to prevent memory crashes on large iPhone photos.
    maxSizeMBRaw: 15,
    acceptedFormats: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ] as const,
    // For <input accept=""> attribute
    acceptAttribute:
      "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif",
  },
  sections: {
    suggestions: [
      "Living Room",
      "Bedroom",
      "Kitchen",
      "Bathroom",
      "Balcony",
      "Exterior",
      "Amenities",
      "Floor Plan",
    ] as const,
    // Owner-typed custom names are stored per property on property_images.section.
    // Not added to shared suggestions list.
  },
} as const;

export type PhotoAcceptedFormat =
  (typeof PHOTO_CONFIG.upload.acceptedFormats)[number];
