const { Pool } = require('pg');
const pool = new Pool({
  host: 'demserver.3bbddns.com',
  port: 47309,
  user: 'postgres',
  password: 'sml',
  database: 'smlerpmaindemo'
});

(async () => {
  try {
    const tablesRes = await pool.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log('\n📋 All tables in smlerpmaindemo:\n');
    tablesRes.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.tablename}`);
    });
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
})();
