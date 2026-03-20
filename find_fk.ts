import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function findFK() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
  });

  const [rows]: any = await connection.query(`
    SELECT CONSTRAINT_NAME 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_NAME = 'tbl_campos' 
    AND COLUMN_NAME = 'client_id' 
    AND REFERENCED_TABLE_NAME = 'tbl_clientes'
  `);
  console.log('FKs for tbl_campos.client_id:', rows);

  const [rows2]: any = await connection.query(`
    SELECT CONSTRAINT_NAME 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_NAME = 'tbl_campos' 
    AND REFERENCED_TABLE_NAME = 'tbl_clientes'
  `);
  console.log('All FKs for tbl_campos referring to tbl_clientes:', rows2);

  await connection.end();
}
findFK().catch(console.error);
