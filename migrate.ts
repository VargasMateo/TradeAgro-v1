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
    await connection.query(`
      ALTER TABLE tbl_clientes 
      ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS registered_by VARCHAR(50);
    `).catch(err => {
        if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
            console.log('Columns already exist in tbl_clientes');
        } else {
            // IF NOT EXISTS is not supported in all MySQL versions for ADD COLUMN
            // so we just catch the error if it already exists
            if (err.message.includes('Duplicate column name')) {
                console.log('Columns already exist.');
            } else {
                throw err;
            }
        }
    });

    // 2. Create tbl_campos
    console.log('Creating tbl_campos...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tbl_campos (
        id VARCHAR(20) PRIMARY KEY,
        client_id VARCHAR(7),
        name VARCHAR(100),
        lat DECIMAL(10, 8),
        long DECIMAL(11, 8),
        lot_names TEXT,
        FOREIGN KEY (client_id) REFERENCES tbl_clientes(id_cliente)
      );
    `);

    // In case table already existed without lat/long, add them
    try {
        await connection.query('ALTER TABLE tbl_campos ADD COLUMN lat DECIMAL(10, 8), ADD COLUMN long DECIMAL(11, 8)');
    } catch (e) {
        // Ignore if they already exist
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
