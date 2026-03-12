import express from 'express';
import mysql from 'mysql2/promise';
import crypto from 'crypto';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Endpoint to fetch clients from tbl_clientes
app.get('/api/clients', async (req, res) => {
  console.log('[DEBUG] GET /api/clients - Fetching active clients');
  try {
    const [clientRows]: any = await pool.query('SELECT * FROM tbl_clientes WHERE deletedAt IS NULL');
    const [fieldRows]: any = await pool.query('SELECT * FROM tbl_campos');

    // Process fields into a map for easy lookup
    const fieldsByClient: Record<string, any[]> = {};
    fieldRows.forEach((row: any) => {
      if (!fieldsByClient[row.clientId]) {
        fieldsByClient[row.clientId] = [];
      }
      fieldsByClient[row.clientId].push({
        id: row.id,
        name: row.name,
        lat: parseFloat(row.lat) || 0,
        lng: parseFloat(row.lng) || 0,
        lotNames: row.lotNames ? JSON.parse(row.lotNames) : []
      });
    });

    const clients = clientRows.map((row: any) => ({
      ...row,
      // Mapping for frontend compatibility
      name: row.displayName,
      phone: row.phoneNumber,
      ivaCondition: row.ivaCondition === 'RI' ? 'Responsable Inscripto' :
        row.ivaCondition === 'MT' ? 'Monotributista' : row.ivaCondition,
      fields: fieldsByClient[row.id] || []
    }));

    res.json(clients);
  } catch (error) {
    console.error('[DATABASE ERROR] GET /api/clients:', error.message);
    res.status(500).json({ error: 'Failed to fetch clients', details: error.message });
  }
});

/** 
 * Soft delete a client
 */
// Update client and fields unified endpoint
app.put('/api/clients/:id', async (req, res) => {
  console.log(`[DEBUG] PUT /api/clients/${req.params.id} - Unified update initiated`);
  const connection = await pool.getConnection();

  try {
    const clientId = req.params.id;
    const {
      displayName,
      businessName,
      cuit,
      ivaCondition,
      email,
      phoneNumber,
      fields // Array of fields from the modal
    } = req.body;

    await connection.beginTransaction();

    // 1. Update main client data
    const clientData = {
      displayName: displayName,
      businessName: businessName,
      cuit: cuit,
      ivaCondition: ivaCondition || 'RI',
      email: email,
      phoneNumber: phoneNumber
    };

    console.log('[DEBUG] Updating client:', clientId);
    await connection.query('UPDATE tbl_clientes SET ? WHERE id = ?', [clientData, clientId]);

    // 2. Replace fields (delete existing, insert new)
    console.log('[DEBUG] Replacing associated fields');
    await connection.query('DELETE FROM tbl_campos WHERE clientId = ?', [clientId]);

    if (fields && Array.isArray(fields)) {
      console.log(`[DEBUG] Inserting ${fields.length} updated fields`);
      for (const field of fields) {
        const fieldData = {
          id: field.id || crypto.randomUUID(),
          clientId: clientId,
          name: field.name,
          lat: field.lat || 0,
          lng: field.lng || 0,
          lotNames: JSON.stringify(field.lots || [])
        };
        await connection.query('INSERT INTO tbl_campos SET ?', [fieldData]);
      }
    }

    await connection.commit();
    console.log('[DEBUG] Transaction committed successfully');

    res.json({
      success: true,
      id: clientId,
      message: 'Client and fields updated successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('[DATABASE TRANSACTION ERROR] PUT /api/clients/:id:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update client and fields',
      details: error.message
    });
  } finally {
    connection.release();
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[DEBUG] DELETE /api/clients/${id} - Soft delete requested`);
  try {
    const [result]: any = await pool.query(
      'UPDATE tbl_clientes SET deletedAt = NOW() WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ success: true, message: 'Client soft-deleted successfully' });
  } catch (error) {
    console.error('[DATABASE ERROR] DELETE /api/clients:', error.message);
    res.status(500).json({ error: 'Failed to delete client', details: error.message });
  }
});

/** 
 * Unified endpoint to create a client and their fields in a single transaction
 */
app.post('/api/clients', async (req, res) => {
  console.log('[DEBUG] POST /api/clients - Unified creation initiated');
  const connection = await pool.getConnection();

  try {
    const {
      displayName,
      businessName,
      cuit,
      ivaCondition,
      email,
      phoneNumber,
      createdBy,
      fields // Array of fields from the modal
    } = req.body;

    await connection.beginTransaction();

    const newClientId = crypto.randomUUID();

    const clientData = {
      id: newClientId,
      displayName: displayName,
      businessName: businessName,
      cuit: cuit,
      ivaCondition: ivaCondition || 'RI',
      email: email,
      phoneNumber: phoneNumber,
      createdBy: createdBy || 'Admin'
    };

    console.log('[DEBUG] Inserting client:', newClientId);
    await connection.query('INSERT INTO tbl_clientes SET ?', [clientData]);

    // Insert associated fields if any
    if (fields && Array.isArray(fields)) {
      console.log(`[DEBUG] Inserting ${fields.length} associated fields`);
      for (const field of fields) {
        const fieldId = crypto.randomUUID();
        const fieldData = {
          id: fieldId,
          clientId: newClientId,
          name: field.name,
          lat: field.lat || 0,
          lng: field.lng || 0,
          lotNames: JSON.stringify(field.lots || [])
        };
        await connection.query('INSERT INTO tbl_campos SET ?', [fieldData]);
      }
    }

    await connection.commit();
    console.log('[DEBUG] Transaction committed successfully');

    res.json({
      success: true,
      id: newClientId,
      message: 'Client and fields created successfully',
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    await connection.rollback();
    console.error('[DATABASE TRANSACTION ERROR] POST /api/clients:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create client and fields',
      details: error.message
    });
  } finally {
    connection.release();
  }
});

/**
 * Endpoint to fetch fields (campos)
 */
app.get('/api/fields', async (req, res) => {
  console.log('[DEBUG] GET /api/fields');
  try {
    const [rows]: any = await pool.query('SELECT * FROM tbl_campos');
    const fields = rows.map((row: any) => ({
      ...row,
      lotNames: row.lotNames ? JSON.parse(row.lotNames) : []
    }));
    res.json(fields);
  } catch (error) {
    console.error('[DATABASE ERROR] GET /api/fields:', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE') return res.json([]);
    res.status(500).json({ error: 'Failed to fetch fields', details: error.message });
  }
});

/**
 * Endpoint to fetch jobs (trabajos)
 */
app.get('/api/jobs', async (req, res) => {
  console.log('[DEBUG] GET /api/jobs');
  try {
    const [rows]: any = await pool.query('SELECT * FROM tbl_trabajos');
    res.json(rows);
  } catch (error) {
    console.error('[DATABASE ERROR] GET /api/jobs:', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE') return res.json([]);
    res.status(500).json({ error: 'Failed to fetch jobs', details: error.message });
  }
});

/**
 * Endpoint to create a field
 */
app.post('/api/fields', async (req, res) => {
  console.log('[DEBUG] POST /api/fields - Data received:', req.body);
  try {
    const { clientId, name, lat, long: lng, lotNames } = req.body;
    const fieldId = `FLD-${Math.floor(Math.random() * 10000)}`;

    const dbData = {
      id: fieldId,
      clientId: clientId,
      name,
      lat,
      lng,
      lotNames: JSON.stringify(lotNames || [])
    };

    await pool.query('INSERT INTO tbl_campos SET ?', [dbData]);
    res.json({ success: true, id: fieldId });
  } catch (error) {
    console.error('[DATABASE ERROR] POST /api/fields:', error.message);
    res.status(500).json({ error: 'Failed to create field', details: error.message });
  }
});

/**
 * RESET CLIENTS (Dev only)
 */
app.post('/api/test/reset-clients', async (req, res) => {
  console.log('[DEBUG] POST /api/test/reset-clients');
  const connection = await pool.getConnection();
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE tbl_clientes');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    res.json({ success: true, message: 'Clients reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset clients', details: error.message });
  } finally {
    connection.release();
  }
});

/**
 * RESET FIELDS (Dev only)
 */
app.post('/api/test/reset-fields', async (req, res) => {
  console.log('[DEBUG] POST /api/test/reset-fields');
  const connection = await pool.getConnection();
  try {
    await connection.query('TRUNCATE TABLE tbl_campos');
    res.json({ success: true, message: 'Fields reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset fields', details: error.message });
  } finally {
    connection.release();
  }
});

/**
 * RESET JOBS (Dev only)
 */
app.post('/api/test/reset-jobs', async (req, res) => {
  console.log('[DEBUG] POST /api/test/reset-jobs');
  const connection = await pool.getConnection();
  try {
    await connection.query('TRUNCATE TABLE tbl_trabajos');
    res.json({ success: true, message: 'Jobs reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset jobs', details: error.message });
  } finally {
    connection.release();
  }
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
