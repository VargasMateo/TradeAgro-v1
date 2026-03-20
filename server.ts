import express from 'express';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists (safely for Vercel Serverless environment)
const uploadDir = path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (error: any) {
  console.warn('[WARNING] Skipping uploads directory creation (expected in Serverless environments):', error.message);
}

// Multer config - Now using memory storage to save to DB
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

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

// Middleware to verify JWT
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // Soporte para token por query param (útil para descargas directas)
  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Acceso denegado. Token no proporcionado.' });
  }

  jwt.verify(token, JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Token inválido o expirado.' });
    }
    req.user = user;
    next();
  });
};

const seedDefaultUsers = async (connection: mysql.Connection | mysql.Pool = pool) => {
  // ... (rest of the code unchanged until /api/jobs)
  try {
    console.log('[SEED] Checking if users table needs seeding...');
    const [userRows]: any = await connection.query('SELECT COUNT(*) as count FROM users');

    if (userRows[0].count > 0) {
      console.log(`[SEED] Table 'users' already has ${userRows[0].count} records. Skipping seed.`);
      return;
    }

    console.log('[SEED] Starting default users insertion...');
    const adminPass = await bcrypt.hash('123456', 10);
    const profPass = await bcrypt.hash('123456', 10);
    const clientPass = await bcrypt.hash('123456', 10);

    // 1. Admin
    console.log('[SEED] Inserting Admin...');
    await connection.query(
      'INSERT INTO users (displayName, email, password, role, createdBy) VALUES (?, ?, ?, ?, ?)',
      ['Admin TradeAgro', 'admin@tradeagro.com', adminPass, 'admin', 1]
    );

    // 2. Profesional
    console.log('[SEED] Inserting Profesional...');
    const [profRes]: any = await connection.query(
      'INSERT INTO users (displayName, email, password, role, createdBy) VALUES (?, ?, ?, ?, ?)',
      ['Juan Tecnico', 'profesional@tradeagro.com', profPass, 'profesional', 1]
    );
    await connection.query(
      'INSERT INTO profesionals (userId, specialty, phoneNumber) VALUES (?, ?, ?)',
      [profRes.insertId, 'Ingeniero Agrónomo - Especialista en Riego', '5491155551234']
    );

    // 3. Cliente
    console.log('[SEED] Inserting Cliente...');
    const [clientRes]: any = await connection.query(
      'INSERT INTO users (displayName, email, password, role, createdBy) VALUES (?, ?, ?, ?, ?)',
      ['Carlos Estanciero', 'cliente@tradeagro.com', clientPass, 'client', 1]
    );
    await connection.query(
      'INSERT INTO clients (userId, businessName, cuit, ivaCondition, phoneNumber) VALUES (?, ?, ?, ?, ?)',
      [clientRes.insertId, 'La Estancia S.A.', '20123456789', 'Responsable Inscripto', '5493519876543']
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
        createdBy INT DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure users.id is AUTO_INCREMENT and createdBy is INT
    const [idCol]: any = await connection.query('SHOW COLUMNS FROM users LIKE "id"');
    if (idCol.length > 0 && idCol[0].Extra !== 'auto_increment') {
      console.log('[INIT] Migrating users: forcing AUTO_INCREMENT on id');
      await connection.query('ALTER TABLE users MODIFY id INT AUTO_INCREMENT');
    }

    const [createdByCol]: any = await connection.query('SHOW COLUMNS FROM users LIKE "createdBy"');
    if (createdByCol.length > 0 && createdByCol[0].Type.toLowerCase().includes('varchar')) {
      console.log('[INIT] Migrating users: changing createdBy from VARCHAR to INT');
      await connection.query('UPDATE users SET createdBy = 0 WHERE createdBy = "System" OR createdBy = "" OR createdBy IS NULL');
      await connection.query('ALTER TABLE users MODIFY createdBy INT DEFAULT 0');
    }

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

    // Migration: Rename phone to phoneNumber if it accidentally exists
    try {
      const [columns]: any = await connection.query('SHOW COLUMNS FROM profesionals LIKE "phone"');
      if (columns.length > 0) {
        console.log('[INIT] Migrating profesionals: renaming phone to phoneNumber');
        await connection.query('ALTER TABLE profesionals CHANGE phone phoneNumber VARCHAR(50)');
      }
    } catch (err) {
      console.log('[INIT] Migration check for profesionals skipped or not needed.');
    }

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
    console.log('[INIT] Creating fields table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS fields (
        id INT AUTO_INCREMENT PRIMARY KEY,
        clientId INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        lat DECIMAL(10, 8),
        lng DECIMAL(11, 8),
        lotNames TEXT,
        FOREIGN KEY (clientId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Ensure fields.id is AUTO_INCREMENT
    const [fieldIdCol]: any = await connection.query('SHOW COLUMNS FROM fields LIKE "id"');
    if (fieldIdCol.length > 0 && fieldIdCol[0].Extra !== 'auto_increment') {
      console.log('[INIT] Migrating fields: forcing AUTO_INCREMENT on id');
      await connection.query('ALTER TABLE fields MODIFY id INT AUTO_INCREMENT');
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS work_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE,
        clientId INT,
        profesionalId INT,
        date DATETIME,
        title VARCHAR(255),
        service VARCHAR(255),
        campaign VARCHAR(100),
        fieldId INT,
        fieldName VARCHAR(255),
        lotName VARCHAR(255),
        hectares DECIMAL(10, 2),
        amountUsd DECIMAL(10, 2),
        status VARCHAR(50),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        createdBy VARCHAR(255),
        deletedAt TIMESTAMP NULL DEFAULT NULL,
        FOREIGN KEY (clientId) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (profesionalId) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    console.log('[INIT] Creating work_order_attachments table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS work_order_attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        workOrderId INT NOT NULL,
        fileName VARCHAR(255) NOT NULL,
        fileUrl VARCHAR(255),
        fileType VARCHAR(100),
        fileSize INT,
        fileData LONGBLOB,
        uploadedBy INT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workOrderId) REFERENCES work_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (uploadedBy) REFERENCES users(id) ON DELETE SET NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    // Migration for work_order_attachments
    try {
      const [columns]: any = await connection.query('SHOW COLUMNS FROM work_order_attachments');
      const hasFileData = columns.some((c: any) => c.Field === 'fileData');
      if (!hasFileData) {
        console.log('[INIT] Migrating work_order_attachments: adding fileData LONGBLOB');
        await connection.query('ALTER TABLE work_order_attachments ADD COLUMN fileData LONGBLOB');
        await connection.query('ALTER TABLE work_order_attachments MODIFY fileUrl VARCHAR(255) NULL');
        await connection.query('ALTER TABLE work_order_attachments MODIFY fileType VARCHAR(100)');
      }
    } catch (err) {
      console.log('[INIT] work_order_attachments migration check skipped (table might not exist yet).');
    }

    // Observations Table
    console.log('[INIT] Creating work_order_observations table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS work_order_observations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        workOrderId INT NOT NULL,
        userId INT NOT NULL,
        text TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workOrderId) REFERENCES work_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    // Migration: Rename userId INT to profesionalId INT if userId exists
    // And remove jobCode if it exists
    try {
      const [columns]: any = await connection.query('SHOW COLUMNS FROM work_orders');
      const hasUserId = columns.some((c: any) => c.Field === 'userId');
      const hasJobCode = columns.some((c: any) => c.Field === 'jobCode');
      const hasCreatedBy = columns.some((c: any) => c.Field === 'createdBy');
      const hasDeletedAt = columns.some((c: any) => c.Field === 'deletedAt');
      const hasFieldId = columns.some((c: any) => c.Field === 'fieldId');
      const hasUuid = columns.some((c: any) => c.Field === 'uuid');

      if (!hasUuid) {
        console.log('[INIT] Migrating work_orders: adding uuid column');
        await connection.query('ALTER TABLE work_orders ADD COLUMN uuid VARCHAR(36) UNIQUE AFTER id');
        await connection.query('UPDATE work_orders SET uuid = (SELECT UUID()) WHERE uuid IS NULL');
      }

      if (hasUserId) {
        console.log('[INIT] Migrating work_orders: renaming userId to profesionalId');
        await connection.query('ALTER TABLE work_orders CHANGE userId profesionalId INT');
      }
      if (hasJobCode) {
        console.log('[INIT] Migrating work_orders: removing jobCode');
        await connection.query('ALTER TABLE work_orders DROP COLUMN jobCode');
      }
      if (!hasCreatedBy) {
        console.log('[INIT] Migrating work_orders: adding createdBy column');
        await connection.query('ALTER TABLE work_orders ADD COLUMN createdBy INT DEFAULT 1');
      } else {
        const [createdBySpec]: any = await connection.query('SHOW COLUMNS FROM work_orders LIKE "createdBy"');
        if (createdBySpec.length > 0 && createdBySpec[0].Type.toLowerCase().includes('varchar')) {
          console.log('[INIT] Migrating work_orders: changing createdBy from VARCHAR to INT');
          await connection.query('UPDATE work_orders SET createdBy = 0 WHERE createdBy = "System" OR createdBy = "" OR createdBy IS NULL');
          await connection.query('ALTER TABLE work_orders MODIFY createdBy INT DEFAULT 0');
        }
      }
      if (!hasDeletedAt) {
        console.log('[INIT] Migrating work_orders: adding deletedAt column');
        await connection.query('ALTER TABLE work_orders ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL');
      }
      if (!hasFieldId) {
        console.log('[INIT] Migrating work_orders: adding fieldId column');
        await connection.query('ALTER TABLE work_orders ADD COLUMN fieldId INT NULL');
      }

      // Ensure id is AUTO_INCREMENT
      const [idColumn]: any = await connection.query('SHOW COLUMNS FROM work_orders LIKE "id"');
      if (idColumn.length > 0 && idColumn[0].Extra !== 'auto_increment') {
        console.log('[INIT] Migrating work_orders: forcing AUTO_INCREMENT on id');
        await connection.query('ALTER TABLE work_orders MODIFY id INT AUTO_INCREMENT');
      }

      // DATA MIGRATION: description -> work_order_observations
      const [woColumns]: any = await connection.query('SHOW COLUMNS FROM work_orders LIKE "description"');
      if (woColumns.length > 0) {
        console.log('[INIT] Migrating work_orders: moving description to work_order_observations...');
        const [ordersWithDesc]: any = await connection.query('SELECT id, description, createdBy FROM work_orders WHERE description IS NOT NULL AND description != ""');

        for (const order of ordersWithDesc) {
          // Try to find a valid userId for the createdBy name if it's numeric, or default to a system user
          let creatorId = parseInt(order.createdBy);
          if (isNaN(creatorId)) {
            const [adminRow]: any = await connection.query('SELECT id FROM users WHERE role = "admin" LIMIT 1');
            creatorId = adminRow.length > 0 ? adminRow[0].id : 1;
          }

          await connection.query(
            'INSERT INTO work_order_observations (workOrderId, userId, text) VALUES (?, ?, ?)',
            [order.id, creatorId, order.description]
          );
        }

        console.log(`[INIT] Migrated ${ordersWithDesc.length} descriptions. Dropping column description.`);
        try {
          await connection.query('ALTER TABLE work_orders DROP COLUMN description');
          console.log('[INIT] Column description dropped successfully.');
        } catch (dropErr) {
          console.error('[INIT ERROR] Failed to drop description column:', dropErr.message);
        }
      } else {
        console.log('[INIT] Column description already removed from work_orders.');
      }
    } catch (err) {
      console.log('[INIT] Migration check for work_orders skipped or not needed:', err.message);
    }

    // Migration: Rename tbl_campos to fields if it exists
    try {
      const [tables_old_campos]: any = await connection.query("SHOW TABLES LIKE 'tbl_campos'");
      if (tables_old_campos.length > 0) {
        console.log('[INIT] Migrating: renaming tbl_campos to fields');
        await connection.query('RENAME TABLE tbl_campos TO fields');
      }
    } catch (err) {
      console.log('[INIT] Migration to fields skipped or failed.');
    }

    // Migration: Rename tbl_trabajos to work_orders if it exists
    // Migration: Also rename WorkOrders (PascalCase) to work_orders if it accidentally exists
    try {
      const [tables_old]: any = await connection.query("SHOW TABLES LIKE 'tbl_trabajos'");
      if (tables_old.length > 0) {
        console.log('[INIT] Migrating: renaming tbl_trabajos to work_orders');
        await connection.query('RENAME TABLE tbl_trabajos TO work_orders');
      }
      const [tables_pascal]: any = await connection.query("SHOW TABLES LIKE 'WorkOrders'");
      if (tables_pascal.length > 0) {
        console.log('[INIT] Migrating: renaming WorkOrders to work_orders');
        await connection.query('RENAME TABLE WorkOrders TO work_orders');
      }
    } catch (err) {
      console.log('[INIT] Migration to work_orders skipped or failed.');
    }

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
      phoneNumber: profPhoneNumber, specialty, // Prof fields
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
        [profPhoneNumber || phoneNumber || null, specialty || null, id]
      );
    } else if (role === 'client') {
      await connection.query(
        'UPDATE clients SET businessName = ?, cuit = ?, ivaCondition = ?, phoneNumber = ? WHERE userId = ?',
        [businessName || null, cuit || null, ivaCondition || 'Responsable Inscripto', phoneNumber || null, id]
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
    const tables = ['work_order_observations', 'work_order_attachments', 'work_orders', 'fields', 'clients', 'profesionals', 'users'];
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
             p.phoneNumber, p.specialty,
             c.businessName, c.cuit, c.ivaCondition, c.phoneNumber as clientPhoneNumber
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
    const [fieldRows]: any = await pool.query('SELECT * FROM fields');

    // Process fields into a map for easy lookup
    const fieldsByClient: Record<string, any[]> = {};
    fieldRows.forEach((row: any) => {
      if (!fieldsByClient[row.clientId]) {
        fieldsByClient[row.clientId] = [];
      }
      const lat = row.lat !== null ? parseFloat(row.lat) : null;
      const lng = row.lng !== null ? parseFloat(row.lng) : null;
      
      console.log(`[SERVER DEBUG] Processing field "${row.name}" (ID: ${row.id}): lat=${lat}, lng=${lng}`);

      fieldsByClient[row.clientId].push({
        id: row.id,
        name: row.name,
        lat: lat,
        lng: lng,
        lots: row.lotNames ? JSON.parse(row.lotNames) : []
      });
    });

    const clients = clientRows.map((row: any) => ({
      ...row,
      // Mapping for frontend compatibility
      name: row.displayName,
      phone: row.phoneNumber,
      ivaCondition: row.ivaCondition,
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
      ivaCondition: ivaCondition || 'Responsable Inscripto',
      phoneNumber: phoneNumber
    };

    console.log('[DEBUG] Updating client extension for userId:', userId);
    await connection.query('UPDATE clients SET ? WHERE userId = ?', [clientData, userId]);

    // 3. Replace fields (delete existing, insert new)
    console.log('[DEBUG] Replacing associated fields');
    await connection.query('DELETE FROM fields WHERE clientId = ?', [userId]);

    if (fields && Array.isArray(fields)) {
      for (const field of fields) {
        const fieldData = {
          clientId: userId,
          name: field.name,
          lat: field.lat || null,
          lng: field.lng || null,
          lotNames: JSON.stringify(field.lots || [])
        };
        await connection.query('INSERT INTO fields SET ?', [fieldData]);
      }
    }

    await connection.commit();
    console.log('[DEBUG] Transaction committed successfully');

    // Fetch updated fields to include IDs in response, and parse lots
    const [fieldsRows]: any = await pool.query('SELECT * FROM fields WHERE clientId = ?', [userId]);
    const formattedFields = fieldsRows.map((f: any) => ({
      ...f,
      lots: f.lotNames ? JSON.parse(f.lotNames) : []
    }));

    res.json({
      success: true,
      id: userId,
      fields: formattedFields,
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
      [displayName, email || `${displayName.toLowerCase().replace(/\s+/g, '')}@tradeagro.com`, hashedPass, 'client', createdBy ?? 'Admin']
    );
    const newUserId = userResult.insertId;

    // 2. Create Client extension record
    const clientData = {
      userId: newUserId,
      businessName: businessName,
      cuit: cuit,
      ivaCondition: ivaCondition || 'Responsable Inscripto',
      phoneNumber: phoneNumber
    };

    console.log('[DEBUG] Inserting new client extension for userId:', newUserId);
    await connection.query('INSERT INTO clients SET ?', [clientData]);

    // 3. Insert associated fields if any
    if (fields && Array.isArray(fields)) {
      console.log(`[DEBUG] Inserting ${fields.length} associated fields`);
      for (const field of fields) {
        const fieldData = {
          clientId: newUserId, // Note: clientId in fields is now linked to users.id
          name: field.name,
          lat: field.lat || null,
          lng: field.lng || null,
          lotNames: JSON.stringify(field.lots || [])
        };
        await connection.query('INSERT INTO fields SET ?', [fieldData]);
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
    const [rows]: any = await pool.query('SELECT * FROM fields');
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
app.get('/api/work-orders', authenticateToken, async (req: any, res) => {
  const { id, role } = req.user;
  console.log(`[DEBUG_AUTH] GET /api/work-orders - UserID: ${id}, Role: ${role}`);

  try {
    let query = `
      SELECT t.*, u.displayName as clientName, p_user.displayName as professionalName,
             f.lat, f.lng
      FROM work_orders t
      LEFT JOIN users u ON t.clientId = u.id
      LEFT JOIN users p_user ON t.profesionalId = p_user.id
      LEFT JOIN fields f ON t.fieldId = f.id
      WHERE t.deletedAt IS NULL
    `;

    const params: any[] = [];

    // Role-based filtering
    if (role === 'profesional') {
      console.log(`[DEBUG_AUTH] Filtering for profesionalId: ${id}`);
      query += ` AND t.profesionalId = ?`;
      params.push(id);
    } else if (role === 'client') {
      console.log(`[DEBUG_AUTH] Filtering for clientId: ${id}`);
      query += ` AND t.clientId = ?`;
      params.push(id);
    } else {
      console.log(`[DEBUG_AUTH] No filtering applied for role: ${role}`);
    }

    query += ` ORDER BY t.createdAt DESC`;

    console.log(`[DEBUG] GET /api/work-orders - User: ${id}, Role: ${role}`);

    const [rows]: any = await pool.query(query, params);

    // Map database rows to frontend Job format
    const jobs = rows.map((row: any) => ({
      id: row.id,
      uuid: row.uuid,
      clientId: row.clientId,
      profesionalId: row.profesionalId,
      client: row.clientName || 'Cliente Desconocido',
      date: row.date,
      location: row.fieldName ? `${row.fieldName}${row.lotName ? ` - ${row.lotName}` : ''}` : 'Ubicación pendiente',
      service: row.service || 'Sin servicio',
      title: row.title || row.service,
      fieldId: row.fieldId,
      fieldName: row.fieldName,
      lotName: row.lotName,
      hectares: parseFloat(row.hectares) || 0,
      amountUsd: parseFloat(row.amountUsd) || 0,
      campaign: row.campaign,
      status: row.status,
      operator: row.professionalName || "Asignación Pendiente",
      lat: row.lat,
      lng: row.lng,
      iconName: getIconNameForService(row.service),
      color: getColorForService(row.service),
      createdAt: row.createdAt,
      createdBy: row.createdBy
    }));

    res.json(jobs);
  } catch (error) {
    console.error('[DATABASE ERROR] GET /api/work-orders:', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE') return res.json([]);
    res.status(500).json({ error: 'Failed to fetch jobs', details: error.message });
  }
});

/**
 * Endpoint to create a job (trabajo)
 */
app.post('/api/work-orders', authenticateToken, async (req, res) => {
  console.log('[DEBUG] POST /api/work-orders - Creating new job:', JSON.stringify(req.body));
  try {
    const {
      clientId,
      profesionalId,
      date,
      title,
      field,
      lot,
      hectares,
      service,
      campaign,
      amount,
      notes,
      fieldId,
      createdBy
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

    console.log('[DEBUG] POST /api/work-orders - RECIBIDO BODY:', JSON.stringify(req.body));

    const dbData: any = {
      clientId: finalClientId || null,
      profesionalId: profesionalId || null,
      date: date || null,
      title: title,
      service: service,
      campaign: campaign || null,
      fieldId: fieldId || null,
      fieldName: field || null,
      lotName: lot || null,
      hectares: parseFloat(cleanHectares) || 0,
      amountUsd: parseFloat(cleanAmount) || 0,
      status: 'Pendiente',
      createdBy: (req as any).user?.id || 0,
      uuid: randomUUID()
    };

    // Explicit audit: ensuring NO description field exists in dbData
    if ('description' in dbData || 'description' in req.body) {
      console.log('!!! AUDIT: description detected in body or data, removing it explicitly !!!');
      delete dbData.description;
    }

    console.log('[DEBUG] Inserting into work_orders with dbData:', JSON.stringify(dbData));
    const [result]: any = await pool.query('INSERT INTO work_orders SET ?', [dbData]);

    // If there is an observation, create it
    if (notes && notes.trim()) {
      const creatorId = (req as any).user.id;
      await pool.query(
        'INSERT INTO work_order_observations (workOrderId, userId, text) VALUES (?, ?, ?)',
        [result.insertId, creatorId, notes.trim()]
      );
    }

    res.json({
      success: true,
      id: result.insertId
    });
  } catch (error) {
    console.error('[DATABASE ERROR] POST /api/work-orders:', error);
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
app.put('/api/work-orders/:id', authenticateToken, async (req, res) => {
  const jobId = req.params.id;
  console.log(`[DEBUG] PUT /api/work-orders/${jobId} - Updating job:`, JSON.stringify(req.body));
  try {
    const {
      clientId,
      profesionalId,
      date,
      title,
      field,
      lot,
      hectares,
      service,
      campaign,
      amount,
      fieldId,
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
      profesionalId: profesionalId || null,
      date: date || null,
      title: title,
      service: service,
      campaign: campaign || null,
      fieldId: fieldId || null,
      fieldName: field || null,
      lotName: lot || null,
      hectares: parseFloat(cleanHectares) || 0,
      amountUsd: parseFloat(cleanAmount) || 0,
    };

    console.log(`[DEBUG] Updating work_orders id ${jobId}:`, JSON.stringify(dbData));
    const [result]: any = await pool.query('UPDATE work_orders SET ? WHERE id = ?', [dbData, jobId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({
      success: true,
      id: jobId
    });
  } catch (error) {
    console.error(`[DATABASE ERROR] PUT /api/work-orders/${jobId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update job',
      message: error.message,
      code: error.code
    });
  }
});

/**
 * Soft delete a job (work order)
 */
app.delete('/api/work-orders/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  console.log(`[DEBUG] DELETE /api/work-orders/${id} - Soft delete requested`);
  try {
    const [result]: any = await pool.query(
      'UPDATE work_orders SET deletedAt = NOW() WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ success: true, message: 'Job soft-deleted successfully' });
  } catch (error: any) {
    console.error('[DATABASE ERROR] DELETE /api/work-orders:', error.message);
    res.status(500).json({ error: 'Failed to delete job', details: error.message });
  }
});

/**
 * Endpoint to fetch a single work order by ID or UUID (Secured)
 */
app.get('/api/work-orders/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const user = req.user;
  console.log(`[SECURE DEBUG] GET /api/work-orders/${id} - User: ${user.id}, Role: ${user.role}`);

  try {
    const query = `
      SELECT t.*, u.displayName as clientName, p_user.displayName as professionalName,
             f.lat, f.lng
      FROM work_orders t
      LEFT JOIN users u ON t.clientId = u.id
      LEFT JOIN users p_user ON t.profesionalId = p_user.id
      LEFT JOIN fields f ON t.fieldId = f.id
      WHERE (t.id = ? OR t.uuid = ?) AND t.deletedAt IS NULL
    `;

    const [rows]: any = await pool.query(query, [id, id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Orden de trabajo no encontrada' });
    }

    const row = rows[0];

    // Authorization Check: Admin, Assigned Professional, or Client
    const isAuthorized = 
      user.role === 'admin' || 
      user.id === row.clientId || 
      user.id === row.profesionalId;

    if (!isAuthorized) {
      console.warn(`[SECURE CAUTION] Unauthorized WO access attempt by UID ${user.id} to WO ${id}`);
      return res.status(403).json({ success: false, error: 'No tienes permiso para ver esta orden' });
    }

    const job = {
      id: row.id,
      uuid: row.uuid,
      clientId: row.clientId,
      profesionalId: row.profesionalId,
      client: row.clientName || 'Cliente Desconocido',
      date: row.date,
      location: row.fieldName ? `${row.fieldName}${row.lotName ? ` - ${row.lotName}` : ''}` : 'Ubicación pendiente',
      service: row.service || 'Sin servicio',
      title: row.title || row.service,
      fieldId: row.fieldId,
      fieldName: row.fieldName,
      lotName: row.lotName,
      hectares: parseFloat(row.hectares) || 0,
      amountUsd: parseFloat(row.amountUsd) || 0,
      campaign: row.campaign,
      status: row.status,
      operator: row.professionalName || "Asignación Pendiente",
      lat: row.lat,
      lng: row.lng,
      iconName: getIconNameForService(row.service),
      color: getColorForService(row.service),
      createdAt: row.createdAt,
      createdBy: row.createdBy
    };

    res.json(job);
  } catch (error: any) {
    console.error(`[DATABASE ERROR] GET /api/work-orders/${id}:`, error.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Serve uploaded files
 */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/**
 * Upload attachments to a job
 */
app.post('/api/work-orders/:id/attachments', authenticateToken, upload.array('files'), async (req: any, res) => {
  const jobId = req.params.id;
  const files = req.files as Express.Multer.File[];
  const uploadedBy = req.user.id;

  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files uploaded' });
  }

  try {
    const values = (req.files as Express.Multer.File[]).map(file => [
      jobId,
      file.originalname,
      `/api/attachments/content/`, // Placeholder, will be updated or handled dynamically
      file.mimetype,
      file.size,
      file.buffer, // Save the actual file data
      uploadedBy
    ]);

    await pool.query(
      'INSERT INTO work_order_attachments (workOrderId, fileName, fileUrl, fileType, fileSize, fileData, uploadedBy) VALUES ?',
      [values]
    );

    // After insert, we could update the fileUrl to point to the correct ID, 
    // but the GET endpoint will construct it dynamically.

    res.json({ success: true, message: 'Files uploaded successfully' });
  } catch (error: any) {
    console.error(`[DATABASE ERROR] POST /api/work-orders/${jobId}/attachments:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to save attachments' });
  }
});

/**
 * Fetch attachments for a job
 */
app.get('/api/work-orders/:id/attachments', authenticateToken, async (req, res) => {
  const jobId = req.params.id;
  try {
    const [rows]: any = await pool.query(
      'SELECT a.id, workOrderId, fileName, fileType, fileSize, uploadedBy, a.createdAt, u.displayName as uploaderName FROM work_order_attachments a LEFT JOIN users u ON a.uploadedBy = u.id WHERE a.workOrderId = ? ORDER BY a.createdAt DESC',
      [jobId]
    );

    // Add the dynamic URL for each attachment
    const attachments = rows.map((row: any) => ({
      ...row,
      fileUrl: `/api/attachments/${row.id}/content`
    }));

    res.json(attachments);
  } catch (error: any) {
    console.error(`[DATABASE ERROR] GET /api/work-orders/${jobId}/attachments:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch attachments' });
  }
});

/**
 * Fetch observations for a job
 */
app.get('/api/work-orders/:id/observations', authenticateToken, async (req, res) => {
  const jobId = req.params.id;
  try {
    const [rows]: any = await pool.query(
      `SELECT o.id, o.workOrderId, o.userId, o.text, o.createdAt,
              u.displayName, u.role
       FROM work_order_observations o
       JOIN users u ON o.userId = u.id
       WHERE o.workOrderId = ?
       ORDER BY o.createdAt ASC`,
      [jobId]
    );
    res.json(rows);
  } catch (error: any) {
    console.error(`[DATABASE ERROR] GET /api/work-orders/${jobId}/observations:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch observations' });
  }
});

/**
 * Create a new observation for a job
 */
app.post('/api/work-orders/:id/observations', authenticateToken, async (req: any, res) => {
  const jobId = req.params.id;
  const userId = req.user.id;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, error: 'Text is required' });
  }

  try {
    const [result]: any = await pool.query(
      'INSERT INTO work_order_observations (workOrderId, userId, text) VALUES (?, ?, ?)',
      [jobId, userId, text.trim()]
    );

    // Fetch the created observation with user info
    const [rows]: any = await pool.query(
      `SELECT o.id, o.workOrderId, o.userId, o.text, o.createdAt,
              u.displayName, u.role
       FROM work_order_observations o
       JOIN users u ON o.userId = u.id
       WHERE o.id = ?`,
      [result.insertId]
    );

    res.json({ success: true, observation: rows[0] });
  } catch (error: any) {
    console.error(`[DATABASE ERROR] POST /api/work-orders/${jobId}/observations:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to create observation' });
  }
});

// New Endpoint: Serve File Content from DB (Secured)
app.get('/api/attachments/:id/content', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { download } = req.query;
  const user = req.user;
  console.log(`[SECURE DEBUG] GET /api/attachments/${id}/content - UserID: ${user.id}, Role: ${user.role}, download=${download}`);
  
  try {
    // Join with work_orders to check permissions in a single query
    const [rows]: any = await pool.query(`
      SELECT a.fileData, a.fileName, a.fileType, wo.clientId, wo.profesionalId
      FROM work_order_attachments a
      JOIN work_orders wo ON a.workOrderId = wo.id
      WHERE a.id = ?
    `, [id]);

    if (rows.length === 0 || !rows[0].fileData) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    const { fileData, fileName, fileType, clientId, profesionalId } = rows[0];

    // Authorization Check: Must be uploader (not explicitly needed if associated with job), 
    // Admin, the assigned Profesional, or the Client for this job.
    const isAuthorized = 
      user.role === 'admin' || 
      user.id === clientId || 
      user.id === profesionalId;

    if (!isAuthorized) {
      console.warn(`[SECURE CAUTION] Unauthorized access attempt by UID ${user.id} to attachment ${id}`);
      return res.status(403).json({ error: 'No tienes permisos para acceder a este archivo.' });
    }

    console.log(`[SECURE SUCCESS] Serving file: ${fileName} (${fileType}) to UID ${user.id}`);
    const disposition = download === 'true' ? 'attachment' : 'inline';

    res.setHeader('Content-Type', fileType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
    res.send(fileData);
  } catch (error: any) {
    console.error('[DATABASE ERROR] GET /api/attachments/:id/content:', error.message);
    res.status(500).json({ error: 'Failed to retrieve file content' });
  }
});

/**
 * Delete an attachment
 */
app.delete('/api/attachments/:id', authenticateToken, async (req, res) => {
  const attachmentId = req.params.id;
  const user = (req as any).user;

  try {
    // 1. Fetch attachment to check ownership
    const [rows]: any = await pool.query('SELECT uploadedBy FROM work_order_attachments WHERE id = ?', [attachmentId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const attachment = rows[0];

    // 2. Check permissions: Must be uploader OR admin
    if (user.role !== 'admin' && attachment.uploadedBy !== user.id) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este archivo.' });
    }

    // 3. Delete from DB only (files are in BLOBs)
    const [result]: any = await pool.query('DELETE FROM work_order_attachments WHERE id = ?', [attachmentId]);

    res.json({ success: true, message: 'Attachment deleted successfully' });
  } catch (error: any) {
    console.error('[DATABASE ERROR] DELETE /api/attachments:', error.message);
    res.status(500).json({ success: false, error: 'Failed to delete attachment', details: error.message });
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
// Migration step: Rename tbl_campos to fields if it exists
async function runMigrations() {
  try {
    const [rows]: any = await pool.query(`
      SELECT TABLE_NAME FROM information_schema.tables
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbl_campos';
    `);
    if (rows.length > 0) {
      console.log('[MIGRATION] Renaming table tbl_campos to fields...');
      await pool.query('RENAME TABLE tbl_campos TO fields;');
      console.log('[MIGRATION] Table tbl_campos renamed to fields successfully.');
    } else {
      console.log('[MIGRATION] Table tbl_campos not found, no rename needed.');
    }
  } catch (error: any) {
    console.error('[MIGRATION ERROR] Failed to run migrations:', error.message);
    // Depending on severity, you might want to exit the process here
  }
}

// Run migrations before starting the server
runMigrations().then(() => {
  console.log('[MIGRATION] Migrations completed.');
}).catch(err => {
  console.error('[MIGRATION] Error during migrations:', err);
  process.exit(1); // Exit if migrations fail
});

/**
 * CREATE A NEW FIELD
 */
app.post('/api/fields', authenticateToken, async (req, res) => {
  console.log('[DEBUG] POST /api/fields - Creating new field:', JSON.stringify(req.body));
  try {
    const { clientId, name, lat, lng, lotNames } = req.body;

    const dbData = {
      clientId,
      name,
      lat: lat || null,
      lng: lng || null,
      lotNames: JSON.stringify(lotNames || [])
    };

    const [result]: any = await pool.query('INSERT INTO fields SET ?', [dbData]);
    res.json({ success: true, id: result.insertId });
  } catch (error: any) {
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
    await connection.query('TRUNCATE TABLE fields');
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
    await connection.query('TRUNCATE TABLE fields');
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
app.post('/api/test/reset-work-orders', async (req, res) => {
  console.log('[DEBUG] POST /api/test/reset-work-orders');
  const connection = await pool.getConnection();
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE work_orders');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    res.json({ success: true, message: 'work_orders reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset work_orders', details: error.message });
  } finally {
    connection.release();
  }
});

/**
 * RESET ATTACHMENTS (Dev only)
 */
app.post('/api/test/reset-attachments', async (req, res) => {
  console.log('[DEBUG] POST /api/test/reset-attachments');
  const connection = await pool.getConnection();
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE work_order_attachments');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    res.json({ success: true, message: 'Attachments reset successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reset attachments', details: error.message });
  } finally {
    connection.release();
  }
});

/**
 * RESET OBSERVATIONS (Dev only)
 */
app.post('/api/test/reset-observations', async (req, res) => {
  console.log('[DEBUG] POST /api/test/reset-observations');
  const connection = await pool.getConnection();
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE work_order_observations');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    res.json({ success: true, message: 'Observations reset successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reset observations', details: error.message });
  } finally {
    connection.release();
  }
});

/**
 * GET /api/attachments (Dev only / Global)
 */
app.get('/api/attachments', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM work_order_attachments');
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch attachments', details: error.message });
  }
});

/**
 * GET /api/observations (Dev only / Global)
 */
app.get('/api/observations', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM work_order_observations');
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch observations', details: error.message });
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
      [displayName, email, hashedPass, 'profesional', createdBy ?? 'Admin']
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
 * RESET ALL DATA (Dev only) - Warning: This clears everything as all tables depend on users
 */
app.post('/api/test/reset-data', async (req, res) => {
  console.log('[DEBUG] POST /api/test/reset-data');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE work_order_observations');
    await connection.query('TRUNCATE TABLE work_order_attachments');
    await connection.query('TRUNCATE TABLE work_orders');
    await connection.query('TRUNCATE TABLE fields');
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

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
  });
}

export default app;
