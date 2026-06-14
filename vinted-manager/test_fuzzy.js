function slugify(text) {
  return text.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '').replace(/-+$/, '');
}

function fuzzyMatch(title1, title2) {
  const words1 = slugify(title1).split('-').filter(w => w.length > 3)
  const words2 = slugify(title2).split('-').filter(w => w.length > 3)
  
  if (words1.length === 0 || words2.length === 0) return false
  
  const common = words1.filter(w => words2.includes(w))
  
  if (words1.length <= 2) return common.length === words1.length;
  
  const threshold = Math.ceil(words1.length * 0.75);
  return common.length >= threshold;
}

const titles = [
    "Travachic Robe mini à manches courtes imprimée tissée pour femmes",
    "EMERY ROSE Robe casual à col rond, manches courtes",
    "Serisse Robe droite sans manches à volants et rayures",
    "EMERY ROSE Robe midi décontractée sans manches à rayures",
    "INAWLY Robe mi-longue d'été décontractée pour femmes",
    "Breezaya Robe courte plissée simple et décontractée"
]

const scraped = [
    "Travachic Robe mini à manches courtes imprimée tis",
    "EMERY ROSE Robe casual à col rond, manches courtes",
    "Serisse Robe droite sans manches à volants et rayu",
    "EMERY ROSE Robe midi décontractée sans manches à r",
    "INAWLY Robe mi-longue d'été décontractée pour femm",
    "Breezaya Robe courte plissée simple et décontracté"
]

for (let i = 0; i < scraped.length; i++) {
    const s = scraped[i];
    const t = titles[i];
    console.log(`Matching: \n  ${s}\n  ${t}\nResult: ${fuzzyMatch(s, t)}\n`);
}
