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
    const res = await pool.query(`
      SELECT data_code, data_database_name, data_name, data_group
      FROM sml_database_list
      ORDER BY data_code
    `);
    
    console.log('\n📋 Available databases in sml_database_list:\n');
    res.rows.forEach((row) => {
      console.log(`Code: ${row.data_code}`);
      console.log(`  Database: ${row.data_database_name}`);
      console.log(`  Name: ${row.data_name}`);
      console.log(`  Group: ${row.data_group}\n`);
    });
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
})();
