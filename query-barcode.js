const { Pool } = require('pg');
const pool = new Pool({
  host: 'demserver.3bbddns.com',
  port: 47309,
  user: 'postgres',
  password: 'sml',
  database: 'next'
});

(async () => {
  try {
    // Try searching in ic_inventory
    const res = await pool.query(`
      SELECT * 
      FROM ic_inventory
      WHERE code = '01-0005'
    `);
    
    console.log('\n📦 Product 01-0005:');
    if (res.rows.length > 0) {
      console.log('Found in ic_inventory:');
      const row = res.rows[0];
      Object.keys(row).forEach(key => {
        console.log(`  ${key}: ${row[key]}`);
      });
    } else {
      console.log('❌ Not found in ic_inventory');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
})();
