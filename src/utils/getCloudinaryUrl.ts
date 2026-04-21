const CLOUD_NAME = 'practice-projects';

/**
 * Converts a Cloudinary public_id to a full delivery URL.
 * Returns null if no publicId provided.
 */
export function getCloudinaryUrl(publicId: string | null | undefined): string | null {
  if (!publicId) return null;
  // Already a full URL (future-proofing)
  if (publicId.startsWith('http')) return publicId;
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/q_auto,f_auto,w_400,h_400,c_fill,g_face/${publicId}`;
}
