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

  try {
    // Start robust cross-table migration
    console.log('Starting cross-table migration...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. Handle work_orders dependencies
    try { 
        await connection.query('ALTER TABLE work_orders CHANGE COLUMN id id VARCHAR(36)');
    } catch (e) {}
    console.log('Updating work_orders...');
    try { await connection.query('ALTER TABLE work_orders DROP FOREIGN KEY fk_trabajos_cliente'); } catch (e) {}
    try { 
        await connection.query('ALTER TABLE work_orders CHANGE COLUMN id_cliente clientId VARCHAR(36)');
    } catch (e) {
        try { 
            await connection.query('ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS clientId VARCHAR(36)');
            await connection.query('UPDATE work_orders SET clientId = id_cliente WHERE clientId IS NULL');
        } catch (err) {}
    }

    // 2. Handle tbl_auditoria dependencies
    try { 
        await connection.query('ALTER TABLE tbl_auditoria CHANGE COLUMN id id VARCHAR(36)');
    } catch (e) {}
    console.log('Updating tbl_auditoria...');
    try { await connection.query('ALTER TABLE tbl_auditoria DROP FOREIGN KEY fk_auditoria_cliente'); } catch (e) {}
    try { 
        await connection.query('ALTER TABLE tbl_auditoria CHANGE COLUMN id_cliente clientId VARCHAR(36)');
    } catch (e) {
        try { 
            await connection.query('ALTER TABLE tbl_auditoria ADD COLUMN IF NOT EXISTS clientId VARCHAR(36)');
            await connection.query('UPDATE tbl_auditoria SET clientId = id_cliente WHERE clientId IS NULL');
        } catch (err) {}
    }

    // 3. Update tbl_clientes (Robust Sync)
    console.log('Updating tbl_clientes (Robust Sync)...');
    const clientMappings = [
        { old: 'id_cliente', new: 'id', type: 'VARCHAR(36)' },
        { old: 'razon_social', new: 'displayName', type: 'VARCHAR(100)' },
        { old: 'iva', new: 'ivaCondition', type: 'VARCHAR(50)' },
        { old: 'telefono', new: 'phoneNumber', type: 'VARCHAR(50)' },
        { old: 'deleted_at', new: 'deletedAt', type: 'TIMESTAMP NULL' },
        { old: 'created_by', new: 'createdBy', type: 'VARCHAR(50)' },
        { old: 'created_at', new: 'createdAt', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ];

    for (const mapping of clientMappings) {
        try {
            await connection.query(`ALTER TABLE tbl_clientes CHANGE COLUMN ${mapping.old} ${mapping.new} ${mapping.type}`);
            console.log(`Renamed client column ${mapping.old} to ${mapping.new}`);
        } catch (e) {
            try {
                await connection.query(`ALTER TABLE tbl_clientes ADD COLUMN IF NOT EXISTS ${mapping.new} ${mapping.type}`);
                await connection.query(`UPDATE tbl_clientes SET ${mapping.new} = ${mapping.old} WHERE ${mapping.new} IS NULL AND ${mapping.old} IS NOT NULL`);
            } catch (err) {}
        }
    }

    try { await connection.query('ALTER TABLE tbl_clientes ADD COLUMN IF NOT EXISTS businessName VARCHAR(100)'); } catch (e) {}

    // Drop obsolete columns from tbl_clientes
    const obsClientCols = ['id_cliente', 'razon_social', 'iva', 'telefono', 'direccion', 'address', 'is_deleted', 'deleted', 'deleted_at', 'created_by', 'created_at', 'estado'];
    for (const col of obsClientCols) {
        try { await connection.query(`ALTER TABLE tbl_clientes DROP COLUMN ${col}`); } catch (e) {}
    }

    // 4. Update tbl_campos
    console.log('Updating tbl_campos (Robust Sync)...');
    const fieldMappings = [
        { old: 'client_id', new: 'clientId', type: 'VARCHAR(36)' },
        { old: 'long', new: 'lng', type: 'DECIMAL(11, 8)' },
        { old: 'lot_names', new: 'lotNames', type: 'TEXT' }
    ];

    for (const mapping of fieldMappings) {
        try {
            const oldCol = mapping.old === 'long' ? '`long`' : mapping.old;
            await connection.query(`ALTER TABLE tbl_campos CHANGE COLUMN ${oldCol} ${mapping.new} ${mapping.type}`);
        } catch (e) {
            try {
                await connection.query(`ALTER TABLE tbl_campos ADD COLUMN IF NOT EXISTS ${mapping.new} ${mapping.type}`);
                const oldCol = mapping.old === 'long' ? '`long`' : mapping.old;
                await connection.query(`UPDATE tbl_campos SET ${mapping.new} = ${oldCol} WHERE ${mapping.new} IS NULL`);
            } catch (err) {}
        }
    }

    const obsFieldCols = ['client_id', 'long', 'lot_names', 'location'];
    for (const col of obsFieldCols) {
        try { await connection.query(`ALTER TABLE tbl_campos DROP COLUMN ${col}`); } catch (e) {}
    }

    try { 
        await connection.query('ALTER TABLE tbl_campos CHANGE COLUMN id id VARCHAR(36)');
    } catch (e) {}

    // 5. Restore Relationships
    console.log('Restoring foreign key constraints...');
    try {
        await connection.query('ALTER TABLE work_orders ADD CONSTRAINT fk_trabajos_cliente FOREIGN KEY (clientId) REFERENCES tbl_clientes(id)');
        await connection.query('ALTER TABLE tbl_auditoria ADD CONSTRAINT fk_auditoria_cliente FOREIGN KEY (clientId) REFERENCES tbl_clientes(id)');
        await connection.query('ALTER TABLE tbl_campos ADD CONSTRAINT fk_campos_cliente FOREIGN KEY (clientId) REFERENCES tbl_clientes(id)');
    } catch (e) {
        console.warn('Could not restore some constraints:', e.message);
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
