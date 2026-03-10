const { Pool } = require('pg');

const pool = new Pool({
  host: 'demserver.3bbddns.com',
  port: 47309,
  user: 'postgres',
  password: 'sml',
  database: 'demo'
});

(async () => {
  try {
    // Test query similar to what the app does
    const sql = `
      SELECT 
        barcode,
        COALESCE(unit_code, '') as unit_code,
        COALESCE(price, '0') as price,
        COALESCE(price_2, '0') as price_2,
        COALESCE(price_3, '0') as price_3,
        COALESCE(price_4, '0') as price_4
      FROM ic_inventory_barcode
      LIMIT 10
    `;
    
    const res = await pool.query(sql);
    
    console.log(`\n✅ Query successful! Found ${res.rowCount} rows\n`);
    res.rows.slice(0, 5).forEach((row, i) => {
      console.log(`${i + 1}. Barcode: ${row.barcode}, Unit: ${row.unit_code}, Price: ${row.price}`);
    });
    
  } catch (err) {
    console.error('❌ Query error:', err.message);
  } finally {
    await pool.end();
  }
})();
