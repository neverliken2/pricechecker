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
    const tablesRes = await pool.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log('\n📋 All tables in demo:\n');
    tablesRes.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.tablename}`);
    });
    
    // Check for ic_inventory_barcode specifically
    const hasBarcodeTable = tablesRes.rows.some(row => row.tablename === 'ic_inventory_barcode');
    console.log(`\n${hasBarcodeTable ? '✅' : '❌'} ic_inventory_barcode: ${hasBarcodeTable ? 'FOUND' : 'NOT FOUND'}`);
    
    if (hasBarcodeTable) {
      const colsRes = await pool.query(`
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_name = 'ic_inventory_barcode'
        ORDER BY ordinal_position
      `);
      console.log('\n📊 Columns in ic_inventory_barcode:');
      colsRes.rows.forEach(row => {
        console.log(`  - ${row.column_name} (${row.data_type})`);
      });
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
})();
