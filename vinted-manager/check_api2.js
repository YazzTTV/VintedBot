const fs = require('fs');

async function main() {
  const fetch = (await import('node-fetch')).default;
  try {
    const res = await fetch('https://vinted-manager-flame.vercel.app/api/dressing?botAccountName=lenabalvade');
    const text = await res.text();
    console.log("Raw response:", text.substring(0, 500));
  } catch(e) {
    console.error(e);
  }
}
main();
