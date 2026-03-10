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
    const res = await pool.query(`
      SELECT 
        ic_code,
        barcode,
        unit_code,
        price,
        price_2,
        price_3,
        price_4
      FROM ic_inventory_barcode
      WHERE price > 0 OR price_2 > 0 OR price_3 > 0 OR price_4 > 0
      LIMIT 5
    `);
    
    console.log('\n📊 Sample data with prices:\n');
    res.rows.forEach((row, i) => {
      console.log(`${i + 1}. IC Code: ${row.ic_code}`);
      console.log(`   Barcode: ${row.barcode}`);
      console.log(`   Unit: ${row.unit_code}`);
      console.log(`   Prices: ${row.price} | ${row.price_2} | ${row.price_3} | ${row.price_4}\n`);
    });
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
})();
