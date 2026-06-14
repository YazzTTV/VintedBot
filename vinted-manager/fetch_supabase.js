async function main() {
    const res = await fetch("https://atyvzcnajjnechlecccq.supabase.co/rest/v1/Article?select=id,nom,lienProduit", {
        headers: {
            "apikey": "sb_publishable_hwKaGkNr6wwWMCKSIbfaUA_3yeUegho",
            "Authorization": "Bearer sb_publishable_hwKaGkNr6wwWMCKSIbfaUA_3yeUegho"
        }
    })
    const data = await res.json()
    console.log(data)
}
main()
