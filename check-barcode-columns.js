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
    const colsRes = await pool.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'ic_inventory_barcode'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 All columns in ic_inventory_barcode:\n');
    colsRes.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.column_name} (${row.data_type})`);
    });
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
})();
