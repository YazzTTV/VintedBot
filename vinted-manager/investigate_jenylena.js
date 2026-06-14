const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.atyvzcnajjnechlecccq:GaetNoah!VintedManager@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
});

async function run() {
  try {
    await client.connect();
    
    // Find Vente
    const res = await client.query(`
        SELECT id, "articleId", "prixVente", "beneficeNet"
        FROM "Vente" 
        WHERE "pseudoAcheteur" ILIKE '%jenylena%';
    `);
    
    console.log("Vente:", res.rows);

    if (res.rows.length > 0) {
        // Find Article
        const art = await client.query(`
            SELECT id, "nom", "lienProduit", "statut", "notes", "prixAchatUnitaire"
            FROM "Article"
            WHERE id = $1;
        `, [res.rows[0].articleId]);
        console.log("Article:", art.rows);
    }
    
    // Find VintedOrderSynced
    const vos = await client.query(`
        SELECT id, title, "buyerLogin", status, "articleId"
        FROM "VintedOrderSynced"
        WHERE "buyerLogin" ILIKE '%jenylena%';
    `);
    console.log("VintedOrderSynced:", vos.rows);

    // Also check BotActionQueue
    const actions = await client.query(`
        SELECT * FROM "BotActionQueue" ORDER BY "createdAt" DESC LIMIT 3;
    `);
    console.log("Recent BotActionQueue:", actions.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
