const fetch = require('node-fetch');

async function main() {
  const res = await fetch('http://localhost:3000/api/dressing?botAccountName=lenabalvade');
  const json = await res.json();
  const items = json.data;
  console.log("Total items:", items.length);
  const orange = items.find(i => i.title.toLowerCase().includes('oranje'));
  if (orange) {
    console.log("Orange dress:", orange);
  } else {
    console.log("Orange dress not found");
  }
}

main().catch(console.error);
