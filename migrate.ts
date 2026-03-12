import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
  });

  console.log('Starting migration...');

  try {
    // 1. Update tbl_clientes
    console.log('Updating tbl_clientes...');
    
    // Rename columns if they exist from previous step
    try {
        await connection.query('ALTER TABLE tbl_clientes CHANGE COLUMN registered_at created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    } catch (e) { /* already renamed or doesn't exist */ }
    
    try {
        await connection.query('ALTER TABLE tbl_clientes CHANGE COLUMN registered_by created_by VARCHAR(50)');
    } catch (e) { /* already renamed or doesn't exist */ }

    // Add columns one by one for robustness
    const columnsToAdd = [
        { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
        { name: 'created_by', type: 'VARCHAR(50)' },
        { name: 'email', type: 'VARCHAR(100)' },
        { name: 'telefono', type: 'VARCHAR(50)' },
        { name: 'direccion', type: 'VARCHAR(255)' }
    ];

    for (const col of columnsToAdd) {
        try {
            await connection.query(`ALTER TABLE tbl_clientes ADD COLUMN ${col.name} ${col.type}`);
            console.log(`Added column ${col.name} to tbl_clientes`);
        } catch (e) {
            // Already exists or other error
        }
    }

    // 2. Create tbl_campos
    console.log('Creating tbl_campos...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tbl_campos (
        id VARCHAR(20) PRIMARY KEY,
        client_id VARCHAR(7),
        name VARCHAR(100),
        lat DECIMAL(10, 8),
        \`long\` DECIMAL(11, 8),
        lot_names TEXT,
        FOREIGN KEY (client_id) REFERENCES tbl_clientes(id_cliente)
      );
    `);

    // In case table already existed without lat/long, add them
    try {
        await connection.query('ALTER TABLE tbl_campos ADD COLUMN lat DECIMAL(10, 8), ADD COLUMN \`long\` DECIMAL(11, 8)');
    } catch (e) {
        // Ignore if they already exist
    }

    // Optional: remove old location column if it exists
    try {
        await connection.query('ALTER TABLE tbl_campos DROP COLUMN location');
    } catch (e) {
        // Ignore if it doesn't exist
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
