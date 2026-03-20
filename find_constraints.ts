import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function findConstraints() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
  });

  const [rows]: any = await connection.query(`
    SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE REFERENCED_TABLE_NAME = 'tbl_clientes'
  `);
  console.log('Tables referencing tbl_clientes:', rows);

  const [rows2]: any = await connection.query(`
    SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME
    FROM information_schema.STATISTICS
    WHERE TABLE_NAME = 'tbl_clientes'
  `);
  console.log('Indices for tbl_clientes:', rows2);

  await connection.end();
}
findConstraints().catch(console.error);
