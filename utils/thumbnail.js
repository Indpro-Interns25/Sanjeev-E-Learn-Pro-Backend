const DEFAULT_COURSE_THUMBNAIL =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80';

const MAX_THUMBNAIL_LENGTH = 500000;
const MAX_URL_LENGTH = 2000;

function normalizeThumbnail(thumbnail) {
  if (thumbnail === undefined || thumbnail === null) return null;

  const trimmed = String(thumbnail).trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('data:image/')) {
    return trimmed.length <= MAX_THUMBNAIL_LENGTH ? trimmed : DEFAULT_COURSE_THUMBNAIL;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.length <= MAX_URL_LENGTH ? trimmed : DEFAULT_COURSE_THUMBNAIL;
  }

  return DEFAULT_COURSE_THUMBNAIL;
}

module.exports = {
  DEFAULT_COURSE_THUMBNAIL,
  normalizeThumbnail,
};
