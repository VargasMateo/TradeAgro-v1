import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
  });

  const [cols]: any = await connection.query('DESCRIBE tbl_clientes');
  console.log('--- tbl_clientes ---');
  console.table(cols.map((c: any) => ({ Field: c.Field, Type: c.Type })));

  const [colsCampos]: any = await connection.query('DESCRIBE tbl_campos');
  console.log('--- tbl_campos ---');
  console.table(colsCampos.map((c: any) => ({ Field: c.Field, Type: c.Type })));

  await connection.end();
}
check().catch(console.error);
