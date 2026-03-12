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
    
    // Map database fields to English attributes defined in src/types/database.ts
    const clients = rows.map((row: any) => ({
      id: row.id_cliente,
      businessName: row.razon_social,
      cuit: row.cuit,
      iva: row.iva,
      isActive: row.estado === 1,
    }));
    
    res.json(clients);
  } catch (error) {
    console.error('[DATABASE ERROR] GET /api/clients:', error.message);
    res.status(500).json({ error: 'Failed to fetch clients', details: error.message });
  }
});

/** 
 * Generic endpoint to create a client 
 * Maps to the now confirmed columns: id_cliente, razon_social, cuit, iva, estado
 */
app.post('/api/clients', async (req, res) => {
  console.log('[DEBUG] POST /api/clients - Data received:', JSON.stringify(req.body, null, 2));
  
  try {
    const { 
      businessName, 
      cuit, 
      iva, 
      isActive 
    } = req.body;

    // Generate a random 7-char ID for id_cliente (e.g., CL-1234)
    const randomId = `CL-${Math.floor(1000 + Math.random() * 9000)}`;

    // Map to DB columns
    const dbData = {
      id_cliente: randomId,
      razon_social: businessName,
      cuit: cuit,
      iva: iva || 'RI', // Default to Responsable Inscripto short code
      estado: isActive === false ? 0 : 1
    };
    
    console.log('[DEBUG] Executing SQL with data:', JSON.stringify(dbData, null, 2));
    
    const [result]: any = await pool.query('INSERT INTO tbl_clientes SET ?', [dbData]);
    
    console.log('[DEBUG] Insert successful! Result:', result);
    res.json({ success: true, id: randomId, message: 'Client created successfully' });
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
