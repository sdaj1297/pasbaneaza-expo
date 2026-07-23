function cleanText(value) {
  if (value == null) return '';
  return String(value)
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .replace(/\?{3}/g, "'")
    .trim();
}

function stripHtml(value) {
  return cleanText(String(value || '').replace(/<[^>]*>/g, ' '));
}

function extractFirstImageUrl(html) {
  const match = String(html || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || '';
}

module.exports = {
  cleanText,
  extractFirstImageUrl,
  stripHtml,
};
