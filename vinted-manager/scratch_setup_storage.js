const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use SERVICE ROLE key to bypass RLS for management

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log(`Connecting to Supabase at ${supabaseUrl}...`);
    
    // Check existing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
        console.error("Error listing buckets:", listError);
        return;
    }
    
    const bucketName = 'vinted-labels';
    const exists = buckets.some(b => b.name === bucketName);
    
    if (exists) {
        console.log(`✅ Bucket '${bucketName}' already exists.`);
    } else {
        console.log(`Creating bucket '${bucketName}'...`);
        // Create public: true, file size limit: 10MB (allowedMimeTypes: application/pdf)
        const { data, error } = await supabase.storage.createBucket(bucketName, {
            public: false, // Secure by default
            fileSizeLimit: 10 * 1024 * 1024, // 10MB
            allowedMimeTypes: ['application/pdf']
        });
        
        if (error) {
            console.error("Error creating bucket:", error);
        } else {
            console.log(`🎉 Bucket '${bucketName}' successfully created!`);
        }
    }
}

main();
