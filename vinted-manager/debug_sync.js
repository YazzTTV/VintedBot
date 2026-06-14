async function check() {
    const res = await fetch('https://vinted-manager-flame.vercel.app/api/ventes')
    const json = await res.json()
    console.log(json)
}
check()
