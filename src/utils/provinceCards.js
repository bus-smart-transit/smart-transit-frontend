/**
 * 2026-11-06 (passenger redesign): the "Provinces we serve" cards from the server's region settings
 * ({ "Province name": ["Town", ...] }). A photo is found by the name's slug in public/images/provinces. An entry
 * whose only town is itself is a city of its own (shown apart, "the city we call home"); nothing is hard-coded.
 */
export function slugOf(name) {
  return String(name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function provinceCards(provinces) {
  const provinceRows = [];
  const cities = [];
  for (const [name, towns] of Object.entries(provinces ?? {})) {
    const list = Array.isArray(towns) ? towns : [];
    const isCity = list.length === 1 && list[0] === name;
    const card = {
      name,
      image: `/images/provinces/${slugOf(name)}.jpg`,
      note: isCity ? 'City' : `${list.length} ${list.length === 1 ? 'town or city' : 'towns and cities'}`,
    };
    (isCity ? cities : provinceRows).push(card);
  }
  return { provinces: provinceRows, cities };
}
