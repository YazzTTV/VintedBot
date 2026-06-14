const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.atyvzcnajjnechlecccq:GaetNoah!VintedManager@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
});

async function run() {
  try {
    await client.connect();
    
    // On trouve la Vente pour jenylena38 (un seul n)
    const res = await client.query(`
        SELECT id, "articleId" 
        FROM "Vente" 
        WHERE "pseudoAcheteur" ILIKE '%jenylena%';
    `);
    
    console.log("Found ventes:", res.rows);

    for (let vente of res.rows) {
        // 1. Delete associated Expeditions
        await client.query(`DELETE FROM "Expedition" WHERE "venteId" = $1`, [vente.id]);
        
        // 2. Set Article back to STOCK
        await client.query(`UPDATE "Article" SET statut = 'STOCK' WHERE id = $1`, [vente.articleId]);
        
        // 3. Delete the Vente
        await client.query(`DELETE FROM "Vente" WHERE id = $1`, [vente.id]);
        
        console.log(`Deleted Vente ${vente.id} and set Article ${vente.articleId} to STOCK.`);
    }

    // Also delete from VintedOrderSynced
    const resOrders = await client.query(`
        DELETE FROM "VintedOrderSynced"
        WHERE "buyerLogin" ILIKE '%jenylena%'
        RETURNING id;
    `);
    console.log("Deleted from VintedOrderSynced:", resOrders.rows.length);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
