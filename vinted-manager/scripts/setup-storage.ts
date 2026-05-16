import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log(`Connecting to Supabase at ${supabaseUrl}...`);
    
    const bucketName = 'sourcing-images';
    
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
        console.error("Error listing buckets:", listError);
        return;
    }
    
    const exists = buckets.some(b => b.name === bucketName);
    
    if (exists) {
        console.log(`✅ Bucket '${bucketName}' already exists.`);
    } else {
        console.log(`Creating bucket '${bucketName}'...`);
        const { data, error } = await supabase.storage.createBucket(bucketName, {
            public: true, // Public access for displaying in manager
            fileSizeLimit: 5 * 1024 * 1024, // 5MB
            allowedMimeTypes: ['image/jpeg', 'image/png']
        });
        
        if (error) {
            console.error("Error creating bucket:", error);
        } else {
            console.log(`🎉 Bucket '${bucketName}' successfully created!`);
        }
    }
}

main();
