const fs = require('fs')
async function main() {
    const res = await fetch('https://vinted-manager-flame.vercel.app/api/tracking/debug')
    const json = await res.json()
    fs.writeFileSync('debug_data.json', JSON.stringify(json, null, 2))
}
main()
