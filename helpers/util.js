function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function slugifyUrl(url) {
  return String(url || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
}

module.exports = {
  sleep,
  slugifyUrl,
};
