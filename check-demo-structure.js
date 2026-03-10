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
    console.log('\n📋 ============ smlerpmaindemo STRUCTURE ============\n');

    // 1. List all tables
    const tablesRes = await pool.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log(`📊 TOTAL TABLES: ${tablesRes.rows.length}\n`);
    
    // 2. Look for ic_ tables
    const icTables = tablesRes.rows.filter(r => r.tablename.startsWith('ic_'));
    console.log(`🔍 IC_ TABLES (${icTables.length}):`);
    icTables.forEach(r => console.log(`   • ${r.tablename}`));

    // 3. Check for ic_inventory_barcode
    console.log('\n🎯 CHECKING FOR ic_inventory_barcode:\n');
    const barcodeTableCheck = tablesRes.rows.find(r => r.tablename === 'ic_inventory_barcode');
    
    if (barcodeTableCheck) {
      console.log('✅ ic_inventory_barcode EXISTS!\n');
      
      // Get columns
      const columnsRes = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'ic_inventory_barcode'
        ORDER BY ordinal_position
      `);
      
      console.log('📝 COLUMNS:');
      columnsRes.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)';
        console.log(`   • ${col.column_name} (${col.data_type}) ${nullable}`);
      });

      // Get sample data
      const sampleRes = await pool.query(`
        SELECT * FROM ic_inventory_barcode LIMIT 1
      `);
      
      if (sampleRes.rows.length > 0) {
        console.log('\n📊 SAMPLE ROW:');
        console.table(sampleRes.rows[0]);
      } else {
        console.log('\n⚠️ No data in ic_inventory_barcode');
      }
    } else {
      console.log('❌ ic_inventory_barcode NOT FOUND!\n');
      console.log('Available ic_ tables:');
      icTables.forEach(t => console.log(`   • ${t.tablename}`));
    }

    // Also check ic_inventory
    console.log('\n🔎 CHECKING ic_inventory:\n');
    const invTableCheck = tablesRes.rows.find(r => r.tablename === 'ic_inventory');
    if (invTableCheck) {
      console.log('✅ ic_inventory EXISTS!\n');
      const colsRes = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'ic_inventory'
        ORDER BY ordinal_position
      `);
      console.log('📝 COLUMNS (first 20):');
      colsRes.rows.slice(0, 20).forEach(col => {
        console.log(`   • ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('❌ ic_inventory NOT FOUND!');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
})();
