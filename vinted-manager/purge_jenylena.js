const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.atyvzcnajjnechlecccq:GaetNoah!VintedManager@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
});

async function purge() {
  try {
    await client.connect();

    console.log("Recherche des donnees de jenylena38...");

    // 1. Trouver l'article lie
    const vos = await client.query(`SELECT "articleId" FROM "VintedOrderSynced" WHERE "buyerLogin" ILIKE '%jenylena%';`);
    const articleIds = vos.rows.map(r => r.articleId).filter(id => id);

    // 1.5 Supprimer les Expeditions liees
    const ventes = await client.query(`SELECT id, "parcelId" FROM "Vente" WHERE "pseudoAcheteur" ILIKE '%jenylena%';`);
    for (const v of ventes.rows) {
        await client.query(`DELETE FROM "Expedition" WHERE "venteId" = $1;`, [v.id]);
        if (v.parcelId) {
            await client.query(`DELETE FROM "ParcelTracking" WHERE id = $1;`, [v.parcelId]);
        }
    }

    // 2. Supprimer la Vente
    const resVente = await client.query(`DELETE FROM "Vente" WHERE "pseudoAcheteur" ILIKE '%jenylena%';`);
    console.log(`[OK] ${resVente.rowCount} Vente(s) supprimee(s).`);

    // 3. Supprimer le VintedOrderSynced
    const resVos = await client.query(`DELETE FROM "VintedOrderSynced" WHERE "buyerLogin" ILIKE '%jenylena%';`);
    console.log(`[OK] ${resVos.rowCount} VintedOrderSynced supprime(s).`);

    // 4. Supprimer l'Article (car c'etait une Urgence)
    for (const id of articleIds) {
        // Aussi supprimer l'expedition et parcel lies a la vente (cascading au cas ou)
        await client.query(`DELETE FROM "Article" WHERE id = $1;`, [id]);
        console.log(`[OK] Article ${id} supprime.`);
    }

  } catch (err) {
    console.error("Erreur:", err);
  } finally {
    await client.end();
  }
}

purge();
