export const PHOTO_CONFIG = {
  compression: {
    // Longest edge cap; browser-image-compression only downscales, never upscales,
    // so sources already under 1280 keep their original dimensions.
    maxWidthOrHeight: 1280,
    initialQuality: 0.70,
    useWebWorker: true,
    // Strip metadata. The library bakes EXIF orientation into the pixels first, so
    // output stays visually upright even without the orientation tag.
    preserveExif: false,
    // No maxSizeMB: one final optimized output; fileType is decided in photo.ts.
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
