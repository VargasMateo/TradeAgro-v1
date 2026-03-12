import express from 'express';
import mysql from 'mysql2/promise';
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
    const [clientRows]: any = await pool.query('SELECT * FROM tbl_clientes WHERE deleted = 0 OR deleted IS NULL');
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
app.delete('/api/clients/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[DEBUG] DELETE /api/clients/${id} - Soft delete requested`);
  try {
    const [result]: any = await pool.query(
      'UPDATE tbl_clientes SET deleted = 1, deletedAt = NOW() WHERE id = ?',
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

    const randomClientId = `CL-${Math.floor(1000 + Math.random() * 9000)}`;

    const clientData = {
      id: randomClientId,
      displayName: businessName || displayName,
      businessName: businessName || displayName,
      cuit: cuit,
      ivaCondition: ivaCondition || 'RI',
      email: email,
      phoneNumber: phoneNumber,
      createdBy: createdBy || 'Admin'
    };

    console.log('[DEBUG] Inserting client:', randomClientId);
    await connection.query('INSERT INTO tbl_clientes SET ?', [clientData]);

    // Insert associated fields if any
    if (fields && Array.isArray(fields)) {
      console.log(`[DEBUG] Inserting ${fields.length} associated fields`);
      for (const field of fields) {
        const fieldId = `FLD-${Math.floor(Math.random() * 10000)}`;
        const fieldData = {
          id: fieldId,
          clientId: randomClientId,
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
      id: randomClientId, 
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
    // If table doesn't exist yet, return empty list instead of 500
    if (error.code === 'ER_NO_SUCH_TABLE') return res.json([]);
    res.status(500).json({ error: 'Failed to fetch fields', details: error.message });
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

// Backward compatibility (optional, can be removed)
app.post('/api/clients/create-mock', async (req, res) => {
  console.log('[DEBUG] POST /api/clients/create-mock - Creating random client');
  // ... similar logic as app.post('/api/clients') but with random data
  const mockData = {
    businessName: `Test Company ${Math.floor(Math.random() * 999)}`,
    cuit: '20123456789',
    ivaConditionId: 1,
    city: 'Tandil'
  };
  // Calling the same logic would be cleaner, but let's just use the direct route instead in frontend
  res.redirect(307, '/api/clients'); 
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
