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
  console.log('[DEBUG] GET /api/clients - Fetching all clients and fields');
  try {
    const [clientRows]: any = await pool.query('SELECT * FROM tbl_clientes');
    const [fieldRows]: any = await pool.query('SELECT * FROM tbl_campos');
    
    // Process fields into a map for easy lookup
    const fieldsByClient: Record<string, any[]> = {};
    fieldRows.forEach((row: any) => {
      if (!fieldsByClient[row.client_id]) {
        fieldsByClient[row.client_id] = [];
      }
      fieldsByClient[row.client_id].push({
        id: row.id,
        name: row.name,
        lat: parseFloat(row.lat) || 0,
        lng: parseFloat(row.long) || 0, // Mapping long (DB) to lng (Frontend)
        lots: row.lot_names ? JSON.parse(row.lot_names) : []
      });
    });

    const clients = clientRows.map((row: any) => ({
      id: row.id_cliente,
      name: row.razon_social, // Alias for frontend
      displayName: row.razon_social, 
      businessName: row.razon_social,
      cuit: row.cuit,
      ivaCondition: row.iva === 'RI' ? 'Responsable Inscripto' : 
                    row.iva === 'MT' ? 'Monotributista' : row.iva,
      email: row.email ?? '',
      phone: row.telefono ?? '', // Alias for frontend
      phoneNumber: row.telefono ?? '',
      createdBy: row.created_by ?? 'System',
      createdAt: row.created_at ?? new Date().toISOString(),
      fields: fieldsByClient[row.id_cliente] || []
    }));
    
    res.json(clients);
  } catch (error) {
    console.error('[DATABASE ERROR] GET /api/clients:', error.message);
    res.status(500).json({ error: 'Failed to fetch clients', details: error.message });
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
      id_cliente: randomClientId,
      razon_social: businessName || displayName,
      cuit: cuit,
      iva: ivaCondition || 'RI',
      email: email,
      telefono: phoneNumber,
      estado: 1,
      created_by: createdBy || 'Admin'
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
          client_id: randomClientId,
          name: field.name,
          lat: field.lat || 0,
          "long": field.lng || 0, // Using lng from frontend, mapping to long col
          lot_names: JSON.stringify(field.lots || [])
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
      id: row.id,
      clientId: row.client_id,
      name: row.name,
      lat: parseFloat(row.lat) || 0,
      long: parseFloat(row.long) || 0,
      lotNames: row.lot_names ? JSON.parse(row.lot_names) : []
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
      client_id: clientId,
      name,
      lat,
      "long": lng,
      lot_names: JSON.stringify(lotNames || [])
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
