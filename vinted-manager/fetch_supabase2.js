async function main() {
    const res = await fetch("https://atyvzcnajjnechlecccq.supabase.co/rest/v1/SourcingProduct?select=title,url", {
        headers: {
            "apikey": "sb_publishable_hwKaGkNr6wwWMCKSIbfaUA_3yeUegho",
            "Authorization": "Bearer sb_publishable_hwKaGkNr6wwWMCKSIbfaUA_3yeUegho"
        }
    })
    const data = await res.json()
    console.log(JSON.stringify(data, null, 2))
}
main()
