const { Client } = require('pg');

async function main() {
  console.log('Starting...');
  const client = new Client({
    host: 'demserver.3bbddns.com',
    port: 47309,
    user: 'postgres',
    password: 'sml',
    database: 'demo'
  });
  
  await client.connect();
  console.log('Connected');
  
  // Find price-related tables  
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND (table_name ILIKE '%price%' OR table_name ILIKE '%ic_%')
    ORDER BY table_name
  `);
  console.log('Tables:', tables.rows.map(r => r.table_name));
  
  // Check ic_inventory_barcode structure
  const barcodeStruct = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'ic_inventory_barcode' 
    ORDER BY column_name
  `);
  console.log('ic_inventory_barcode columns:', barcodeStruct.rows.map(r => r.column_name));
  
  // Check barcode sample
  const barcodeResult = await client.query(`
    SELECT * FROM ic_inventory_barcode WHERE ic_code = '05-1026' LIMIT 3
  `);
  console.log('ic_inventory_barcode sample:', barcodeResult.rows);
  
  await client.end();
  console.log('Done');
}

main().catch(e => { console.error('ERROR:', e); process.exit(1); });
