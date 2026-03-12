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
  console.log('[DEBUG] GET /api/clients - Fetching all clients');
  try {
    const [rows]: any = await pool.query('SELECT * FROM tbl_clientes');
    console.log(`[DEBUG] Found ${rows.length} clients`);
    
    // Map database fields to the new English attributes
    const clients = rows.map((row: any) => ({
      id: row.id_cliente,
      displayName: row.razon_social, 
      businessName: row.razon_social,
      cuit: row.cuit,
      ivaCondition: row.iva,
      email: row.email ?? '',
      phoneNumber: row.telefono ?? '',
      createdBy: row.created_by ?? 'System',
      createdAt: row.created_at ?? new Date().toISOString(),
    }));
    
    res.json(clients);
  } catch (error) {
    console.error('[DATABASE ERROR] GET /api/clients:', error.message);
    res.status(500).json({ error: 'Failed to fetch clients', details: error.message });
  }
});

/** 
 * Generic endpoint to create a client 
 */
app.post('/api/clients', async (req, res) => {
  console.log('[DEBUG] POST /api/clients - Data received:', JSON.stringify(req.body, null, 2));
  
  try {
    const { 
      displayName,
      businessName, 
      cuit, 
      ivaCondition, 
      email,
      phoneNumber,
      createdBy 
    } = req.body;

    const randomId = `CL-${Math.floor(1000 + Math.random() * 9000)}`;

    const dbData = {
      id_cliente: randomId,
      razon_social: businessName || displayName,
      cuit: cuit,
      iva: ivaCondition || 'RI',
      estado: 1,
      created_by: createdBy || 'Admin'
      // created_at is handled by DEFAULT CURRENT_TIMESTAMP in SQL
    };

    console.log('[DEBUG] Executing SQL with data:', JSON.stringify(dbData, null, 2));
    
    const [result]: any = await pool.query('INSERT INTO tbl_clientes SET ?', [dbData]);
    
    console.log('[DEBUG] Insert successful! Result:', result);
    res.json({ 
      success: true, 
      id: randomId, 
      message: 'Client created successfully',
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[DATABASE ERROR] POST /api/clients:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create client', 
      details: error.message,
      sqlCode: error.code
    });
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
