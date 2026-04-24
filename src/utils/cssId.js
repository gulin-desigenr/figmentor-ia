const accentMap = {
  'á':'a','à':'a','ã':'a','â':'a','ä':'a',
  'é':'e','è':'e','ê':'e','ë':'e',
  'í':'i','ì':'i','î':'i','ï':'i',
  'ó':'o','ò':'o','õ':'o','ô':'o','ö':'o',
  'ú':'u','ù':'u','û':'u','ü':'u',
  'ç':'c','ñ':'n',
  'Á':'a','À':'a','Ã':'a','Â':'a','Ä':'a',
  'É':'e','È':'e','Ê':'e','Ë':'e',
  'Í':'i','Ì':'i','Î':'i','Ï':'i',
  'Ó':'o','Ò':'o','Õ':'o','Ô':'o','Ö':'o',
  'Ú':'u','Ù':'u','Û':'u','Ü':'u',
  'Ç':'c','Ñ':'n'
};

export function sanitizeCssId(name) {
  if (!name || typeof name !== 'string') return '';

  let result = name
    .split('')
    .map(char => accentMap[char] || char)
    .join('');

  result = result
    .toLowerCase()
    .replace(/\[.*?\]/g, '')   // remove [TAG] prefix
    .trim()
    .replace(/\s+/g, '-')      // spaces to hyphens
    .replace(/[^a-z0-9-]/g, '') // remove non-alphanumeric
    .replace(/-+/g, '-')       // collapse multiple hyphens
    .replace(/^-+|-+$/g, '')   // trim leading/trailing hyphens
    .substring(0, 64);

  return result;
}
