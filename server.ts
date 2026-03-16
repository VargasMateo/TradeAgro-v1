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

const seedDefaultUsers = async (connection: mysql.Connection | mysql.Pool = pool) => {
  try {
    console.log('[SEED] Checking if users table needs seeding...');
    const [userRows]: any = await connection.query('SELECT COUNT(*) as count FROM users');
    
    if (userRows[0].count > 0) {
      console.log(`[SEED] Table 'users' already has ${userRows[0].count} records. Skipping seed.`);
      return;
    }

    console.log('[SEED] Starting default users insertion...');
    const adminPass = await bcrypt.hash('admin123', 10);
    const profPass = await bcrypt.hash('prof123', 10);
    const clientPass = await bcrypt.hash('client123', 10);

    // 1. Admin
    console.log('[SEED] Inserting Admin...');
    await connection.query(
      'INSERT INTO users (displayName, email, password, role, createdBy) VALUES (?, ?, ?, ?, ?)',
      ['Admin TradeAgro', 'admin@tradeagro.com', adminPass, 'admin', 'System']
    );

    // 2. Profesional
    console.log('[SEED] Inserting Profesional...');
    const [profRes]: any = await connection.query(
      'INSERT INTO users (displayName, email, password, role, createdBy) VALUES (?, ?, ?, ?, ?)',
      ['Juan Tecnico', 'profesional@tradeagro.com', profPass, 'profesional', 'System']
    );
    await connection.query(
      'INSERT INTO profesionals (userId, specialty, phoneNumber) VALUES (?, ?, ?)',
      [profRes.insertId, 'Ingeniero Agrónomo - Especialista en Riego', '+54 9 11 5555-1234']
    );

    // 3. Cliente
    console.log('[SEED] Inserting Cliente...');
    const [clientRes]: any = await connection.query(
      'INSERT INTO users (displayName, email, password, role, createdBy) VALUES (?, ?, ?, ?, ?)',
      ['Carlos Estanciero', 'cliente@tradeagro.com', clientPass, 'client', 'System']
    );
    await connection.query(
      'INSERT INTO clients (userId, businessName, cuit, ivaCondition, phoneNumber) VALUES (?, ?, ?, ?, ?)',
      [clientRes.insertId, 'La Estancia S.A.', '20-12345678-9', 'Responsable Inscripto', '+54 9 351 987-6543']
    );

    console.log('[SEED] SUCCESS: Default users and extensions seeded.');
  } catch (err: any) {
    console.error('[SEED ERROR]:', err.message);
    throw err; // Re-throw to be caught by initializeDatabase
  }
};

async function initializeDatabase() {
  console.log('[INIT] Starting full database initialization sequence...');
  const connection = await pool.getConnection();
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // Base Users Table
    console.log('[INIT] Creating users table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        displayName VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'profesional', 'client') NOT NULL,
        createdBy VARCHAR(255) DEFAULT 'System',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Extension: Professionals
    console.log('[INIT] Creating profesionals table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS profesionals (
        userId INT PRIMARY KEY,
        phoneNumber VARCHAR(50),
        specialty VARCHAR(255),
        deletedAt TIMESTAMP NULL DEFAULT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Extension: Clients
    console.log('[INIT] Creating clients table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS clients (
        userId INT PRIMARY KEY,
        cuit VARCHAR(20),
        businessName VARCHAR(255),
        phoneNumber VARCHAR(50),
        ivaCondition VARCHAR(100),
        deletedAt TIMESTAMP NULL DEFAULT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Other tables
    console.log('[INIT] Creating operational tables...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tbl_campos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        clientId INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        lat DECIMAL(10, 8),
        lng DECIMAL(11, 8),
        lotNames TEXT,
        FOREIGN KEY (clientId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS tbl_trabajos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        jobCode VARCHAR(50),
        clientId INT,
        userId VARCHAR(255),
        date DATETIME,
        title VARCHAR(255),
        service VARCHAR(255),
        campaign VARCHAR(100),
        fieldName VARCHAR(255),
        lotName VARCHAR(255),
        hectares DECIMAL(10, 2),
        amountUsd DECIMAL(10, 2),
        description TEXT,
        status VARCHAR(50),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (clientId) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('[INIT] Schema ready. Calling seed...');
    
    await seedDefaultUsers(connection);
    
    console.log('[INIT] Database initialization completed successfully.');
  } catch (err: any) {
    console.error('[INIT ERROR] Fatal during initialization:', err.message);
  } finally {
    connection.release();
  }
}

// Initial call
initializeDatabase();

/**
 * UPDATE LOGGED-IN USER PROFILE
 */
app.put('/api/profile', async (req, res) => {
  console.log('[DEBUG] PUT /api/profile - User self-update initiated');
  const connection = await pool.getConnection();
  try {
    const { 
      id, displayName, email, location, description, role,
      phone, specialty, // Prof fields
      businessName, cuit, ivaCondition, phoneNumber // Client fields
    } = req.body;

    if (!id) return res.status(400).json({ error: 'User ID is required' });

    await connection.beginTransaction();

    // 1. Update Base User
    await connection.query(
      'UPDATE users SET displayName = ?, email = ? WHERE id = ?',
      [displayName, email, id]
    );

    // 2. Update Extension based on role
    if (role === 'profesional') {
      await connection.query(
        'UPDATE profesionals SET phoneNumber = ?, specialty = ? WHERE userId = ?',
        [phoneNumber || null, specialty || null, id]
      );
    } else if (role === 'client') {
      await connection.query(
        'UPDATE clients SET businessName = ?, cuit = ?, ivaCondition = ?, phoneNumber = ? WHERE userId = ?',
        [businessName || null, cuit || null, ivaCondition || 'RI', phoneNumber || null, id]
      );
    }

    await connection.commit();
    
    // Fetch updated user to return
    const [rows]: any = await pool.query(`
      SELECT u.id, u.displayName, u.email, u.role, u.createdAt, u.createdBy,
             p.phoneNumber, p.specialty,
             c.businessName, c.cuit, c.ivaCondition, c.phoneNumber as clientPhoneNumber
      FROM users u
      LEFT JOIN profesionals p ON u.id = p.userId
      LEFT JOIN clients c ON u.id = c.userId
      WHERE u.id = ?
    `, [id]);
    
    // Process nulls...
    const userData = { ...rows[0] };
    Object.keys(userData).forEach(key => userData[key] === null && delete userData[key]);

    res.json({ success: true, user: userData });
  } catch (error: any) {
    await connection.rollback();
    console.error('[PROFILE UPDATE ERROR]:', error.message);
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  } finally {
    connection.release();
  }
});

/**
 * RESET ENTIRE DATABASE (Dev only)
 */
app.post('/api/test/reset-database', async (req, res) => {
  console.log('[DEBUG] POST /api/test/reset-database - FULL RESET requested');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Drop and recreate to ensure schema changes
    const tables = ['tbl_trabajos', 'tbl_campos', 'clients', 'profesionals', 'users'];
    for (const table of tables) {
      await connection.query(`DROP TABLE IF EXISTS ${table}`);
    }
    
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    await connection.commit();
    
    // Re-initialize with full schema
    console.log('[RESET] Re-initializing database...');
    await initializeDatabase();
    
    res.json({ success: true, message: 'Database reset and re-seeded successfully' });
  } catch (error: any) {
    await connection.rollback();
    console.error('[DATABASE RESET ERROR]:', error.message);
    res.status(500).json({ error: 'Failed to reset database', details: error.message });
  } finally {
    connection.release();
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`[AUTH] Login attempt: ${email}`);

  try {
    const [rows]: any = await pool.query(`
      SELECT u.id, u.displayName, u.email, u.password, u.role, u.createdAt, u.createdBy,
             p.phone, p.specialty,
             c.businessName, c.cuit, c.ivaCondition, c.phoneNumber
      FROM users u
      LEFT JOIN profesionals p ON u.id = p.userId
      LEFT JOIN clients c ON u.id = c.userId
      WHERE u.email = ?
    `, [email]);

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
      JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Filter out password and null fields to match polymorphic interface
    const userData: any = { ...user };
    delete userData.password;
    Object.keys(userData).forEach(key => userData[key] === null && delete userData[key]);

    res.json({
      success: true,
      token,
      user: userData
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

// Endpoint to fetch clients from clients
app.get('/api/clients', async (req, res) => {
  console.log('[DEBUG] GET /api/clients - Fetching active clients');
  try {
    const [clientRows]: any = await pool.query(`
      SELECT c.*, u.displayName, u.email, u.createdAt, u.createdBy, c.userId as id
      FROM clients c
      JOIN users u ON c.userId = u.id
      WHERE c.deletedAt IS NULL
    `);
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
    const userId = req.params.id; // Correct semantic: the id is the userId
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

    // 1. Update user data (Base)
    await connection.query(
      'UPDATE users SET displayName = ?, email = ? WHERE id = ?',
      [displayName, email, userId]
    );

    // 2. Update client data (Extension)
    const clientData = {
      businessName: businessName,
      cuit: cuit,
      ivaCondition: ivaCondition || 'RI',
      phoneNumber: phoneNumber
    };

    console.log('[DEBUG] Updating client extension for userId:', userId);
    await connection.query('UPDATE clients SET ? WHERE userId = ?', [clientData, userId]);

    // 3. Replace fields (delete existing, insert new)
    console.log('[DEBUG] Replacing associated fields');
    await connection.query('DELETE FROM tbl_campos WHERE clientId = ?', [userId]);

    if (fields && Array.isArray(fields)) {
      for (const field of fields) {
        const fieldData = {
          clientId: userId,
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
      id: userId,
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
    // Soft delete in clients table
    const [result]: any = await pool.query(
      'UPDATE clients SET deletedAt = NOW() WHERE userId = ?',
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
      password, // Optional, can default
      fields // Array of fields from the modal
    } = req.body;

    await connection.beginTransaction();

    // 1. Create User first
    const hashedPass = await bcrypt.hash(password || '123456', 10);
    const [userResult]: any = await connection.query(
      'INSERT INTO users (displayName, email, password, role, createdBy) VALUES (?, ?, ?, ?, ?)',
      [displayName, email || `${displayName.toLowerCase().replace(/\s+/g, '')}@tradeagro.com`, hashedPass, 'client', createdBy || 'Admin']
    );
    const newUserId = userResult.insertId;

    // 2. Create Client extension record
    const clientData = {
      userId: newUserId,
      businessName: businessName,
      cuit: cuit,
      ivaCondition: ivaCondition || 'RI',
      phoneNumber: phoneNumber
    };

    console.log('[DEBUG] Inserting new client extension for userId:', newUserId);
    await connection.query('INSERT INTO clients SET ?', [clientData]);

    // 3. Insert associated fields if any
    if (fields && Array.isArray(fields)) {
      console.log(`[DEBUG] Inserting ${fields.length} associated fields`);
      for (const field of fields) {
        const fieldData = {
          clientId: newUserId, // Note: clientId in tbl_campos is now linked to users.id
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
      id: newUserId,
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
      SELECT t.*, u.displayName as clientName
      FROM tbl_trabajos t
      LEFT JOIN users u ON t.clientId = u.id
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
      const [userRows]: any = await pool.query(
        'SELECT id FROM users WHERE displayName = ? AND role = "client" LIMIT 1', 
        [req.body.client]
      );
      if (userRows.length > 0) {
        finalClientId = userRows[0].id;
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
      const [userRows]: any = await pool.query(
        'SELECT id FROM users WHERE displayName = ? AND role = "client" LIMIT 1', 
        [req.body.client]
      );
      if (userRows.length > 0) {
        finalClientId = userRows[0].id;
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
    await connection.beginTransaction();
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    // Delete fields and clients
    await connection.query('TRUNCATE TABLE tbl_campos');
    await connection.query('DELETE FROM clients');
    // Delete users with role client
    await connection.query('DELETE FROM users WHERE role = "client"');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    await connection.commit();
    res.json({ success: true, message: 'Clients reset successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to reset clients', details: error.message });
  } finally {
    connection.release();
  }
});

app.post('/api/test/reset-profesionals', async (req, res) => {
  console.log('[DEBUG] POST /api/test/reset-profesionals');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('DELETE FROM profesionals');
    await connection.query('DELETE FROM users WHERE role = "profesional"');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    await connection.commit();
    res.json({ success: true, message: 'Professionals reset successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to reset professionals', details: error.message });
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
    const [rows]: any = await pool.query(`
      SELECT p.*, u.displayName, u.email, u.createdAt, u.createdBy, p.userId as id
      FROM profesionals p
      JOIN users u ON p.userId = u.id
      WHERE p.deletedAt IS NULL
      ORDER BY u.createdAt DESC
    `);
    // Ensure phoneNumber is consistently named in the response
    const formatted = rows.map((r: any) => ({
      ...r,
      phoneNumber: r.phoneNumber
    }));
    res.json(formatted);
  } catch (error: any) {
    console.error('[DATABASE ERROR] GET /api/profesionales:', error.message);
    res.status(500).json({ error: 'Failed to fetch profesionales', details: error.message });
  }
});

/**
 * PUT /api/profesionales/:id — update an existing professional
 */
app.put('/api/profesionales/:id', async (req, res) => {
  const { id } = req.params; // userId
  console.log(`[DEBUG] PUT /api/profesionales/${id} - Updating profesional:`, JSON.stringify(req.body));
  const connection = await pool.getConnection();
  try {
    const { displayName, email, phoneNumber, specialty } = req.body;
    
    await connection.beginTransaction();

    // 1. Update User base
    await connection.query(
      'UPDATE users SET displayName = ?, email = ? WHERE id = ?',
      [displayName, email, id]
    );

    // 2. Update Profesional extension
    const profData = { phoneNumber, specialty };
    await connection.query('UPDATE profesionals SET ? WHERE userId = ?', [profData, id]);

    await connection.commit();
    res.json({ success: true, id });
  } catch (error: any) {
    await connection.rollback();
    console.error('[DATABASE ERROR] PUT /api/profesionales:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update profesional', details: error.message });
  } finally {
    connection.release();
  }
});

/**
 * DELETE /api/profesionales/:id — soft delete a professional
 */
app.delete('/api/profesionales/:id', async (req, res) => {
  const { id } = req.params; // userId
  console.log(`[DEBUG] DELETE /api/profesionales/${id} - Soft deleting profesional`);
  try {
    const [result]: any = await pool.query('UPDATE profesionals SET deletedAt = NOW() WHERE userId = ?', [id]);

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
  const connection = await pool.getConnection();
  try {
    const { displayName, email, password, phoneNumber, specialty, createdBy } = req.body;

    await connection.beginTransaction();

    // 1. Create User first
    const hashedPass = await bcrypt.hash(password || '123456', 10);
    const [userResult]: any = await connection.query(
      'INSERT INTO users (displayName, email, password, role, createdBy) VALUES (?, ?, ?, ?, ?)',
      [displayName, email, hashedPass, 'profesional', createdBy || 'Admin']
    );
    const newUserId = userResult.insertId;

    // 2. Create Profesional extension
    const profData = {
      userId: newUserId,
      phoneNumber: phoneNumber || null,
      specialty: specialty || null
    };
    await connection.query('INSERT INTO profesionals SET ?', [profData]);

    await connection.commit();
    res.json({
      success: true,
      id: newUserId,
      message: 'Profesional created successfully',
      createdAt: new Date().toISOString()
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('[DATABASE ERROR] POST /api/profesionales:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create profesional',
      details: error.message
    });
  } finally {
    connection.release();
  }
});
/**
 * GET /api/users — fetch all users from the system
 */
app.get('/api/users', async (req, res) => {
  console.log('[DEBUG] GET /api/users');
  try {
    const [rows]: any = await pool.query(`
      SELECT id, displayName, email, role, createdAt, createdBy
      FROM users
      ORDER BY createdAt DESC
    `);
    res.json(rows);
  } catch (error: any) {
    console.error('[DATABASE ERROR] GET /api/users:', error.message);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

/**
 * RESET USERS (Dev only) - Warning: This clears everything as all tables depend on users
 */
app.post('/api/test/reset-users', async (req, res) => {
  console.log('[DEBUG] POST /api/test/reset-users');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE tbl_trabajos');
    await connection.query('TRUNCATE TABLE tbl_campos');
    await connection.query('TRUNCATE TABLE clients');
    await connection.query('TRUNCATE TABLE profesionals');
    await connection.query('TRUNCATE TABLE users');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    await connection.commit();
    res.json({ success: true, message: 'All users and dependent data reset successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to reset users', details: error.message });
  } finally {
    connection.release();
  }
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
