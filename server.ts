import express from 'express';
import mysql from 'mysql2/promise';
import crypto from 'crypto';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

const JWT_SECRET = process.env.JWT_SECRET;

// Auto-create tables on startup
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profesionals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        displayName VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        specialty VARCHAR(255),
        createdBy VARCHAR(255) DEFAULT 'Admin',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deletedAt TIMESTAMP NULL
      )
    `);
    console.log('[INIT] profesionals table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        displayName VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'profesional', 'cliente') NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[INIT] users table ready');

    // Seed default users if empty
    const [userRows]: any = await pool.query('SELECT COUNT(*) as count FROM users');
    if (userRows[0].count === 0) {
      console.log('[INIT] Seeding default users...');
      const defaultUsers = [
        { name: 'Admin TradeAgro', email: 'admin@tradeagro.com', pass: 'admin123', role: 'admin' },
        { name: 'Mateo Profesional', email: 'profesional@tradeagro.com', pass: 'prof123', role: 'profesional' },
        { name: 'Cliente Estancia', email: 'cliente@tradeagro.com', pass: 'client123', role: 'cliente' }
      ];

      for (const u of defaultUsers) {
        const hashedPass = await bcrypt.hash(u.pass, 10);
        await pool.query('INSERT INTO users (displayName, email, password, role) VALUES (?, ?, ?, ?)',
          [u.name, u.email, hashedPass, u.role]);
      }
      console.log('[INIT] Default users seeded');
    }
  } catch (err: any) {
    console.error('[INIT ERROR] Failed to initialize database:', err.message);
  }
})();

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`[AUTH] Login attempt: ${email}`);

  try {
    const [rows]: any = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`[AUTH] Failed: Invalid password for ${email}`);
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }

    console.log(`[AUTH] Success: ${email} logged in as ${user.role}`);
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('[AUTH ERROR]:', error.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
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
        lots: row.lotNames ? JSON.parse(row.lotNames) : []
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
      for (const field of fields) {
        const fieldData = {
          clientId: clientId,
          name: field.name,
          lat: field.lat || null,
          lng: field.lng || null,
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

    const clientData = {
      displayName: displayName,
      businessName: businessName,
      cuit: cuit,
      ivaCondition: ivaCondition || 'RI',
      email: email,
      phoneNumber: phoneNumber,
      createdBy: createdBy || 'Admin'
    };

    console.log('[DEBUG] Inserting new client');
    const [clientResult]: any = await connection.query('INSERT INTO tbl_clientes SET ?', [clientData]);
    const newClientId = clientResult.insertId;
    console.log('[DEBUG] Inserted client with ID:', newClientId);

    // Insert associated fields if any
    if (fields && Array.isArray(fields)) {
      console.log(`[DEBUG] Inserting ${fields.length} associated fields`);
      for (const field of fields) {
        const fieldData = {
          clientId: newClientId,
          name: field.name,
          lat: field.lat || null,
          lng: field.lng || null,
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
 * Endpoint to fetch jobs (trabajos) with client info
 */
app.get('/api/jobs', async (req, res) => {
  console.log('[DEBUG] GET /api/jobs - Fetching all jobs');
  try {
    const [rows]: any = await pool.query(`
      SELECT t.*, c.displayName as clientName
      FROM tbl_trabajos t
      LEFT JOIN tbl_clientes c ON t.clientId = c.id
      ORDER BY t.createdAt DESC
    `);

    // Map database rows to frontend Job format
    const jobs = rows.map((row: any) => ({
      id: row.id,
      jobCode: row.jobCode || `#AG-${row.id}`,
      clientId: row.clientId,
      client: row.clientName || 'Cliente Desconocido',
      date: row.date,
      location: row.fieldName ? `${row.fieldName}${row.lotName ? ` - ${row.lotName}` : ''}` : 'Ubicación pendiente',
      service: row.service || 'Sin servicio',
      title: row.title || row.service,
      fieldName: row.fieldName,
      lotName: row.lotName,
      hectares: parseFloat(row.hectares) || 0,
      amountUsd: parseFloat(row.amountUsd) || 0,
      campaign: row.campaign,
      description: row.description,
      status: row.status,
      operator: "Asignación Pendiente",
      iconName: getIconNameForService(row.service),
      color: getColorForService(row.service),
      createdAt: row.createdAt
    }));

    res.json(jobs);
  } catch (error) {
    console.error('[DATABASE ERROR] GET /api/jobs:', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE') return res.json([]);
    res.status(500).json({ error: 'Failed to fetch jobs', details: error.message });
  }
});

/**
 * Endpoint to create a job (trabajo)
 */
app.post('/api/jobs', async (req, res) => {
  console.log('[DEBUG] POST /api/jobs - Creating new job:', JSON.stringify(req.body));
  try {
    const {
      clientId,
      date,
      title,
      field,
      lot,
      hectares,
      service,
      campaign,
      amount,
      notes
    } = req.body;

    // Clean numeric values
    const cleanAmount = typeof amount === 'string' ? amount.replace(/[^0-9.]/g, '') : amount;
    const cleanHectares = typeof hectares === 'string' ? hectares.replace(/[^0-9.]/g, '') : hectares;

    let finalClientId = clientId;

    // If clientId is missing, try to find it by name
    if (!finalClientId && req.body.client) {
      const [clientRows]: any = await pool.query('SELECT id FROM tbl_clientes WHERE displayName = ? LIMIT 1', [req.body.client]);
      if (clientRows.length > 0) {
        finalClientId = clientRows[0].id;
      }
    }

    const dbData = {
      clientId: finalClientId || null,
      userId: '1', // Legacy association placeholder
      date: date || null,
      title: title,
      service: service,
      campaign: campaign || null,
      fieldName: field || null,
      lotName: lot || null,
      hectares: parseFloat(cleanHectares) || 0,
      amountUsd: parseFloat(cleanAmount) || 0,
      description: notes || null,
      status: 'Pendiente',
    };

    console.log('[DEBUG] Inserting into tbl_trabajos:', JSON.stringify(dbData));
    const [result]: any = await pool.query('INSERT INTO tbl_trabajos SET ?', [dbData]);

    // Generate jobCode based on ID
    const jobCode = `#AG-${result.insertId}`;
    await pool.query('UPDATE tbl_trabajos SET jobCode = ? WHERE id = ?', [jobCode, result.insertId]);

    res.json({
      success: true,
      id: result.insertId,
      jobCode: jobCode
    });
  } catch (error) {
    console.error('[DATABASE ERROR] POST /api/jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create job',
      message: error.message,
      code: error.code
    });
  }
});

/**
 * Endpoint to update an existing job (trabajo)
 */
app.put('/api/jobs/:id', async (req, res) => {
  const jobId = req.params.id;
  console.log(`[DEBUG] PUT /api/jobs/${jobId} - Updating job:`, JSON.stringify(req.body));
  try {
    const {
      clientId,
      date,
      title,
      field,
      lot,
      hectares,
      service,
      campaign,
      amount,
      notes
    } = req.body;

    // Clean numeric values
    const cleanAmount = typeof amount === 'string' ? amount.replace(/[^0-9.]/g, '') : amount;
    const cleanHectares = typeof hectares === 'string' ? hectares.replace(/[^0-9.]/g, '') : hectares;

    let finalClientId = clientId;

    // If clientId is missing, try to find it by name
    if (!finalClientId && req.body.client) {
      const [clientRows]: any = await pool.query('SELECT id FROM tbl_clientes WHERE displayName = ? LIMIT 1', [req.body.client]);
      if (clientRows.length > 0) {
        finalClientId = clientRows[0].id;
      }
    }

    const dbData = {
      clientId: finalClientId || null,
      date: date || null,
      title: title,
      service: service,
      campaign: campaign || null,
      fieldName: field || null,
      lotName: lot || null,
      hectares: parseFloat(cleanHectares) || 0,
      amountUsd: parseFloat(cleanAmount) || 0,
      description: notes || null,
    };

    console.log(`[DEBUG] Updating tbl_trabajos id ${jobId}:`, JSON.stringify(dbData));
    const [result]: any = await pool.query('UPDATE tbl_trabajos SET ? WHERE id = ?', [dbData, jobId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({
      success: true,
      id: jobId
    });
  } catch (error) {
    console.error(`[DATABASE ERROR] PUT /api/jobs/${jobId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update job',
      message: error.message,
      code: error.code
    });
  }
});

// Helper functions for backend mapping (similar to frontend)
function getIconNameForService(service: string) {
  switch (service) {
    case 'Cosecha': return 'Wheat';
    case 'Siembra': return 'Sprout';
    case 'Fumigación': return 'Droplets';
    case 'Fertilización': return 'Activity';
    default: return 'Tractor';
  }
}

function getColorForService(service: string) {
  switch (service) {
    case 'Cosecha': return 'orange';
    case 'Siembra': return 'emerald';
    case 'Fumigación': return 'blue';
    case 'Fertilización': return 'indigo';
    default: return 'emerald';
  }
}

/**
 * Endpoint to create a field
 */
app.post('/api/fields', async (req, res) => {
  console.log('[DEBUG] POST /api/fields - Data received:', req.body);
  try {
    const { clientId, name, lat, long: lng, lotNames } = req.body;
    const dbData = {
      clientId: clientId,
      name,
      lat: lat || null,
      lng: lng || null,
      lotNames: JSON.stringify(lotNames || [])
    };

    const [result]: any = await pool.query('INSERT INTO tbl_campos SET ?', [dbData]);
    res.json({ success: true, id: result.insertId });
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
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE tbl_campos');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
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
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE tbl_trabajos');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    res.json({ success: true, message: 'Jobs reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset jobs', details: error.message });
  } finally {
    connection.release();
  }
});

/**
 * GET /api/profesionales — fetch active professionals
 */
app.get('/api/profesionales', async (req, res) => {
  console.log('[DEBUG] GET /api/profesionales');
  try {
    const [rows]: any = await pool.query('SELECT * FROM profesionals WHERE deletedAt IS NULL ORDER BY createdAt DESC');
    res.json(rows);
  } catch (error: any) {
    console.error('[DATABASE ERROR] GET /api/profesionales:', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE') return res.json([]);
    res.status(500).json({ error: 'Failed to fetch profesionales', details: error.message });
  }
});

/**
 * PUT /api/profesionales/:id — update an existing professional
 */
app.put('/api/profesionales/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[DEBUG] PUT /api/profesionales/${id} - Updating profesional:`, JSON.stringify(req.body));
  try {
    const { displayName, email, phone, specialty } = req.body;
    const dbData = { displayName, email, phone, specialty };

    const [result]: any = await pool.query('UPDATE profesionals SET ? WHERE id = ?', [dbData, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Profesional not found' });
    }

    res.json({ success: true, id });
  } catch (error: any) {
    console.error('[DATABASE ERROR] PUT /api/profesionales:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update profesional', details: error.message });
  }
});

/**
 * DELETE /api/profesionales/:id — soft delete a professional
 */
app.delete('/api/profesionales/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[DEBUG] DELETE /api/profesionales/${id} - Soft deleting profesional`);
  try {
    const [result]: any = await pool.query('UPDATE profesionals SET deletedAt = NOW() WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Profesional not found' });
    }

    res.json({ success: true, message: 'Profesional deleted successfully' });
  } catch (error: any) {
    console.error('[DATABASE ERROR] DELETE /api/profesionales:', error.message);
    res.status(500).json({ success: false, error: 'Failed to delete profesional', details: error.message });
  }
});

/**
 * POST /api/profesionales — create a new professional
 */
app.post('/api/profesionales', async (req, res) => {
  console.log('[DEBUG] POST /api/profesionales - Creating new profesional:', JSON.stringify(req.body));
  try {
    const { displayName, email, phone, specialty, createdBy } = req.body;

    const dbData = {
      displayName,
      email,
      phone: phone || null,
      specialty: specialty || null,
      createdBy: createdBy || 'Admin'
    };

    const [result]: any = await pool.query('INSERT INTO profesionals SET ?', [dbData]);

    res.json({
      success: true,
      id: result.insertId,
      message: 'Profesional created successfully',
      createdAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[DATABASE ERROR] POST /api/profesionales:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create profesional',
      details: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
