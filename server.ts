import express from 'express';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import nodemailer from 'nodemailer';

// Define __dirname for ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors({
  origin: ['https://tradeagrosmart.com.ar', 'https://www.tradeagrosmart.com.ar'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Block all /backend/test/* routes in production
app.use('/backend/test', (req: any, res: any, next: any) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Define a router for all API routes
const apiRouter = express.Router();

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

  jwt.verify(token, JWT_SECRET!, async (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Token inválido o expirado.' });
    }

    try {
      // Validate in the database if the user has been deleted (soft-delete check)
      // This immediately revokes access for deleted users on their next API request
      if (user.role === 'client') {
        const [rows]: any = await pool.query('SELECT deletedAt FROM clients WHERE userId = ?', [user.id]);
        if (rows.length === 0 || rows[0].deletedAt !== null) {
          return res.status(401).json({ success: false, error: 'Tu cuenta se encuentra desactivada.' });
        }
      } else if (user.role === 'profesional') {
        const [rows]: any = await pool.query('SELECT deletedAt FROM profesionals WHERE userId = ?', [user.id]);
        if (rows.length === 0 || rows[0].deletedAt !== null) {
          return res.status(401).json({ success: false, error: 'Tu cuenta se encuentra desactivada.' });
        }
      }
    } catch (dbErr) {
      console.error('[AUTH ERROR] Checking deleted status:', dbErr);
    }

    req.user = user;
    next();
  });
};

const seedDefaultUsers = async (connection: mysql.Connection | mysql.Pool = pool) => {
  // ... (rest of the code unchanged until /backend/jobs)
  try {
    console.log('[SEED] Checking if default users exist...');

    const adminPass = await bcrypt.hash('123456', 10);
    const profPass = await bcrypt.hash('123456', 10);
    const clientPass = await bcrypt.hash('123456', 10);

    // 1. Admin
    const [adminCheck]: any = await connection.query('SELECT id FROM users WHERE email = ?', ['admin@tradeagro.com']);
    if (adminCheck.length === 0) {
      console.log('[SEED] Inserting Admin...');
      await connection.query(
        'INSERT INTO users (displayName, email, password, role, createdBy) VALUES (?, ?, ?, ?, ?)',
        ['Admin TradeAgro', 'admin@tradeagro.com', adminPass, 'admin', 1]
      );
    }

    // 2. Profesional
    const [profCheck]: any = await connection.query('SELECT id FROM users WHERE email = ?', ['profesional@tradeagro.com']);
    if (profCheck.length === 0) {
      console.log('[SEED] Inserting Profesional...');
      const [profRes]: any = await connection.query(
        'INSERT INTO users (displayName, email, password, role, createdBy) VALUES (?, ?, ?, ?, ?)',
        ['Juan Tecnico', 'profesional@tradeagro.com', profPass, 'profesional', 1]
      );
      await connection.query(
        'INSERT INTO profesionals (userId, specialty, phoneNumber) VALUES (?, ?, ?)',
        [profRes.insertId, 'Ingeniero Agrónomo - Especialista en Riego', '5491155551234']
      );
    }

    // 3. Cliente
    const [clientCheck]: any = await connection.query('SELECT id FROM users WHERE email = ?', ['cliente@tradeagro.com']);
    if (clientCheck.length === 0) {
      console.log('[SEED] Inserting Cliente...');
      const [clientRes]: any = await connection.query(
        'INSERT INTO users (displayName, email, password, role, createdBy) VALUES (?, ?, ?, ?, ?)',
        ['Carlos Estanciero', 'cliente@tradeagro.com', clientPass, 'client', 1]
      );
      await connection.query(
        'INSERT INTO clients (userId, businessName, cuit, ivaCondition, phoneNumber) VALUES (?, ?, ?, ?, ?)',
        [clientRes.insertId, 'La Estancia S.A.', '20123456789', 'Responsable Inscripto', '5493519876543']
      );
    }

    console.log('[SEED] SUCCESS: Default users and extensions seeded.');
  } catch (err: any) {
    console.error('[SEED ERROR]:', err.message);
    throw err; // Re-throw to be caught by initializeDatabase
  }
};

const seedDefaultServices = async (connection: mysql.Connection | mysql.Pool = pool) => {
  try {
    // Manual management only
  } catch (err: any) {
    console.error('[SEED ERROR] Services:', err.message);
  }
};

async function initializeDatabase() {
  console.log('[INIT] Starting full database initialization sequence...');
  const connection = await pool.getConnection();
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // Services Table
    console.log('[INIT] Creating services table (Early)...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        parentId INT DEFAULT NULL,
        isPredefined BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parentId) REFERENCES services(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

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
        hasStations BOOLEAN DEFAULT FALSE,
        notificationEmails TEXT DEFAULT NULL,
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
        secondaryService VARCHAR(255) DEFAULT NULL,
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

    // Migration: add secondaryService column if it doesn't exist
    try {
      await connection.query('ALTER TABLE work_orders ADD COLUMN secondaryService VARCHAR(255) DEFAULT NULL AFTER service');
      console.log('[INIT] Added secondaryService column to work_orders');
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME') console.error('[INIT] secondaryService migration error:', e.message);
    }

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

    // Password Setup Tokens Table
    console.log('[INIT] Creating password_setup_tokens table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS password_setup_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        token VARCHAR(36) UNIQUE NOT NULL,
        expiresAt DATETIME NOT NULL,
        usedAt DATETIME NULL DEFAULT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
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

    // Migration for services: add parentId and remove UNIQUE on name
    try {
      const [columns]: any = await connection.query('SHOW COLUMNS FROM services');
      const hasParentId = columns.some((c: any) => c.Field === 'parentId');
      if (!hasParentId) {
        console.log('[INIT] Migrating services: adding parentId column');
        await connection.query('ALTER TABLE services ADD COLUMN parentId INT DEFAULT NULL AFTER name');
        await connection.query('ALTER TABLE services ADD FOREIGN KEY (parentId) REFERENCES services(id) ON DELETE CASCADE');
      }

      // Check for global unique index on 'name' and remove it to allow hierarchy duplicates
      const [indexes]: any = await connection.query('SHOW INDEX FROM services WHERE Column_name = "name" AND Non_unique = 0');
      if (indexes.length > 0) {
        const indexName = indexes[0].Key_name;
        console.log(`[INIT] Migrating services: removing unique index "${indexName}" from name`);
        await connection.query(`ALTER TABLE services DROP INDEX ${indexName}`);
      }
    } catch (err: any) {
      console.log('[INIT] Migration for services skipped or failed:', err.message);
    }

    // Migration: add hasStations column to clients if it doesn't exist
    try {
      await connection.query('ALTER TABLE clients ADD COLUMN hasStations BOOLEAN DEFAULT FALSE AFTER phoneNumber');
      console.log('[INIT] Added hasStations column to clients');
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME') console.error('[INIT] hasStations migration error:', e.message);
    }

    // Migration: add notificationEmails column to clients if it doesn't exist
    try {
      await connection.query('ALTER TABLE clients ADD COLUMN notificationEmails TEXT DEFAULT NULL AFTER hasStations');
      console.log('[INIT] Added notificationEmails column to clients');
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME') console.error('[INIT] notificationEmails migration error:', e.message);
    }

    // Migration: remove hasStations from profesionals if it was added by mistake
    try {
      await connection.query('ALTER TABLE profesionals DROP COLUMN hasStations');
      console.log('[INIT] Removed hasStations column from profesionals');
    } catch (e: any) {
      // Column doesn't exist, that's fine
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('[INIT] Schema ready. Calling seed...');

    await seedDefaultUsers(connection);
    await seedDefaultServices(connection);

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
app.put('/backend/profile', authenticateToken, async (req: any, res: any) => {
  console.log('[DEBUG] PUT /backend/profile - User self-update initiated');
  const connection = await pool.getConnection();
  try {
    const {
      id, displayName, email, role,
      phoneNumber: profPhoneNumber, specialty, // Prof fields
      businessName, cuit, ivaCondition, phoneNumber, // Client fields
      notificationEmails // Client notification emails
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
        'UPDATE clients SET businessName = ?, cuit = ?, ivaCondition = ?, phoneNumber = ?, notificationEmails = ? WHERE userId = ?',
        [businessName || null, cuit || null, ivaCondition || 'Responsable Inscripto', phoneNumber || null, notificationEmails || null, id]
      );
    }

    await connection.commit();

    // Fetch updated user to return
    const [rows]: any = await pool.query(`
      SELECT u.id, u.displayName, u.email, u.role, u.createdAt, u.createdBy,
             p.phoneNumber, p.specialty,
             c.businessName, c.cuit, c.ivaCondition, c.phoneNumber as clientPhoneNumber, c.notificationEmails
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
app.post('/backend/test/reset-database', async (req, res) => {
  console.log('[DEBUG] POST /backend/test/reset-database - FULL RESET requested');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // Drop and recreate to ensure schema changes
    const tables = ['work_order_observations', 'work_order_attachments', 'work_orders', 'fields', 'clients', 'profesionals', 'users', 'services'];
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

// ==========================================
// EMAIL & PASSWORD SETUP UTILITIES
// ==========================================

const PASSWORD_NOT_SET_PLACEHOLDER = '__PASSWORD_NOT_SET__';

const EXTRA_NOTIFICATION_RECIPIENTS = ['juan.caraffo@tradeagro.com.ar', 'claudio.rivero@tradeagro.com.ar'];

// Configure SMTP transporter (lazy initialization)
let smtpTransporter: nodemailer.Transporter | null = null;
const getTransporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return smtpTransporter;
};

const getAppUrl = () => {
  return process.env.APP_URL || `http://localhost:${port}`;
};

async function sendPasswordSetupEmail(userEmail: string, displayName: string, token: string) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[EMAIL] SMTP not configured. Skipping email send.');
    throw new Error('Servidor de correo no configurado');
  }

  const appUrl = getAppUrl();
  const setupLink = `${appUrl}/setup-password?token=${token}`;
  const fromEmail = process.env.SMTP_FROM || 'TradeAgro <no-reply@tradeagrosmart.com.ar>';

  const textContent = `¡Hola ${displayName}!

Se ha creado una cuenta para usted en TradeAgro. Para comenzar a usar el sistema, debe configurar su contraseña haciendo clic en el siguiente enlace:

${setupLink}

Este enlace expira en 48 horas.

© ${new Date().getFullYear()} TradeAgro. Todos los derechos reservados.`;

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bienvenido a TradeAgro</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%); padding: 32px 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800;">TradeAgro</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Sistema de Gesti&oacute;n Agropecuaria</p>
    </div>
    <div style="padding: 32px 24px;">
      <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 8px;">&iexcl;Hola ${displayName}!</h2>
      <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Se ha creado una cuenta para usted en TradeAgro. Para comenzar a usar el sistema, debe configurar su contrase&ntilde;a haciendo clic en el bot&oacute;n de abajo.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${setupLink}" style="display: inline-block; background: #2e7d32; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(46,125,50,0.3);">
          Configurar mi Contrase&ntilde;a
        </a>
      </div>
      <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0 0 8px;">
        Si el bot&oacute;n no funciona, copie y pegue este enlace en su navegador:
      </p>
      <p style="color: #2e7d32; font-size: 12px; word-break: break-all; background: #f0fdf4; padding: 12px; border-radius: 8px; border: 1px solid #bbf7d0;">
        ${setupLink}
      </p>
      <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0; text-align: center;">
        Este enlace expira en 48 horas.
      </p>
    </div>
    <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} TradeAgro. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>`;

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: userEmail,
      subject: 'Bienvenido a TradeAgro — Configure su contraseña',
      text: textContent,
      html: htmlContent
    });

    console.log(`[EMAIL] Password setup email sent to ${userEmail}, messageId: ${info.messageId}`);
  } catch (error: any) {
    console.error(`[EMAIL CATCH] Failed to send email to ${userEmail}:`, error.message);
    throw error;
  }
}

async function sendForgotPasswordEmail(userEmail: string, displayName: string, token: string) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[EMAIL] SMTP not configured. Skipping email send.');
    throw new Error('Servidor de correo no configurado');
  }

  const appUrl = getAppUrl();
  const resetLink = `${appUrl}/setup-password?token=${token}`;
  const fromEmail = process.env.SMTP_FROM || 'TradeAgro <no-reply@tradeagrosmart.com.ar>';

  const textContent = `¡Hola ${displayName}!

Hemos recibido una solicitud para restablecer la contraseña de su cuenta en TradeAgro. Para elegir una nueva contraseña, acceda al siguiente enlace:

${resetLink}

Si no realizó esta solicitud, puede ignorar este correo. Su contraseña actual no cambiará.

Este enlace expira en 48 horas.

© 2026 TradeAgro. Sistema de Gestión Agropecuaria.`;

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Restablecer su contrase&ntilde;a</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%); padding: 32px 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800;">TradeAgro</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Restablecimiento de Contrase&ntilde;a</p>
    </div>
    <div style="padding: 32px 24px;">
      <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 8px;">&iexcl;Hola ${displayName}!</h2>
      <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Hemos recibido una solicitud para restablecer la contrase&ntilde;a de su cuenta en TradeAgro. Haga clic en el bot&oacute;n de abajo para elegir una nueva contrase&ntilde;a.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetLink}" style="display: inline-block; background: #2e7d32; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(46,125,50,0.3);">
          Restablecer mi Contrase&ntilde;a
        </a>
      </div>
      <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0 0 8px;">
        Si no realiz&oacute; esta solicitud, puede ignorar este correo. Su contrase&ntilde;a actual no cambiar&aacute; hasta que acceda al enlace de arriba.
      </p>
      <p style="color: #2e7d32; font-size: 12px; word-break: break-all; background: #f0fdf4; padding: 12px; border-radius: 8px; border: 1px solid #bbf7d0;">
        ${resetLink}
      </p>
      <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0; text-align: center;">
        Este enlace expira en 48 horas.
      </p>
    </div>
    <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; 2026 TradeAgro. Sistema de Gesti&oacute;n Agropecuaria.</p>
    </div>
  </div>
</body>
</html>`;

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: userEmail,
      subject: 'Restablecer su contraseña — TradeAgro',
      text: textContent,
      html: htmlContent,
    });

    console.log(`[EMAIL] Forgot password email sent to ${userEmail}, messageId: ${info.messageId}`);
  } catch (error: any) {
    console.error(`[EMAIL CATCH] Failed to send email to ${userEmail}:`, error.message);
    throw error;
  }
}

async function sendOrderCompletedEmail(orderData: any) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[EMAIL] SMTP not configured. Skipping order completion email.');
    return;
  }

  const appUrl = getAppUrl();
  const orderUrl = `${appUrl}/work-orders/${orderData.uuid || orderData.id}`;
  const fromEmail = process.env.SMTP_FROM || 'TradeAgro <no-reply@tradeagrosmart.com.ar>';

  const textContent = `¡Tu orden ha sido completada!

Hola ${orderData.clientName}, te informamos que el trabajo solicitado ha sido finalizado con éxito.

Detalles del Servicio:
- Orden: #AG-${orderData.id}
- Servicio: ${orderData.service}
- Campo / Lote: ${orderData.location}
${orderData.hectares ? `- Superficie: ${orderData.hectares} ha.\n` : ''}- Campaña: ${orderData.campaign}

Ver detalles en el panel:
${orderUrl}

Si tienes alguna duda, por favor contacta con tu asesor asignado.

© ${new Date().getFullYear()} TradeAgro. Este es un mensaje automático, por favor no lo respondas.`;

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Orden #${orderData.id} Completada</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%); padding: 32px 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800;">TradeAgro</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Notificaci&oacute;n de Servicio</p>
    </div>
    <div style="padding: 32px 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #f0fdf4; color: #166534; padding: 8px 16px; border-radius: 99px; font-weight: 700; font-size: 12px; border: 1px solid #bbf7d0;">
          &#10003; ORDEN FINALIZADA
        </div>
      </div>
      <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 8px; text-align: center;">&iexcl;Tu orden ha sido completada!</h2>
      <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 32px; text-align: center;">
        Hola <strong>${orderData.clientName}</strong>, te informamos que el trabajo solicitado ha sido finalizado con &eacute;xito.
      </p>

      <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 32px;">
        <h3 style="color: #1e293b; font-size: 14px; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">Detalles del Servicio</h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Orden:</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">#AG-${orderData.id}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Servicio:</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${orderData.service}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Campo / Lote:</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${orderData.location}</td>
          </tr>
          ${orderData.hectares ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Superficie:</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${orderData.hectares} ha.</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Campa&ntilde;a:</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${orderData.campaign}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${orderUrl}" style="display: inline-block; background: #2e7d32; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(46,125,50,0.3);">
          Ver detalles en el panel
        </a>
      </div>

      <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0; text-align: center;">
        Si tienes alguna duda, por favor contacta con tu asesor asignado.
      </p>
    </div>
    <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} TradeAgro. Este es un mensaje autom&aacute;tico, por favor no lo respondas.</p>
    </div>
  </div>
</body>
</html>`;

  // 1. Notify Client
  if (orderData.clientEmail) {
    try {
      const info = await transporter.sendMail({
        from: fromEmail,
        to: orderData.clientEmail,
        subject: `Orden #${orderData.id} Completada — TradeAgro`,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[EMAIL] Order completion email sent to ${orderData.clientEmail}, messageId: ${info.messageId}`);
    } catch (error: any) {
      console.error(`[EMAIL ERROR] Failed to send order completion email to ${orderData.clientEmail}:`, error.message);
    }
  }

  // 1b. Notify Client's additional notification emails (Distribution List)
  if (orderData.clientNotificationEmails) {
    const additionalEmails = orderData.clientNotificationEmails
      .split(/[,;\s]+/)
      .map((e: string) => e.trim())
      .filter((e: string) => e && e.includes('@'));

    for (const addEmail of additionalEmails) {
      try {
        const info = await transporter.sendMail({
          from: fromEmail,
          to: addEmail,
          subject: `Orden #${orderData.id} Completada — TradeAgro`,
          text: textContent,
          html: htmlContent,
        });
        console.log(`[EMAIL] Order completion copy sent to client's distribution list email: ${addEmail}, messageId: ${info.messageId}`);
      } catch (error: any) {
        console.error(`[EMAIL ERROR] Failed to send order completion email copy to distribution list email ${addEmail}:`, error.message);
      }
    }
  }

  // 2. Notify extra recipients individually
  for (const extraEmail of EXTRA_NOTIFICATION_RECIPIENTS) {
    try {
      const info = await transporter.sendMail({
        from: fromEmail,
        to: extraEmail,
        subject: `Orden #${orderData.id} Completada — TradeAgro`,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[EMAIL] Order completion copy sent to ${extraEmail}, messageId: ${info.messageId}`);
    } catch (error: any) {
      console.error(`[EMAIL ERROR] Failed to send order completion email copy to ${extraEmail}:`, error.message);
    }
  }
}

async function createPasswordSetupToken(connection: any, userId: number): Promise<string> {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  // Invalidate any existing tokens for this user
  await connection.query(
    'UPDATE password_setup_tokens SET usedAt = NOW() WHERE userId = ? AND usedAt IS NULL',
    [userId]
  );

  await connection.query(
    'INSERT INTO password_setup_tokens (userId, token, expiresAt) VALUES (?, ?, ?)',
    [userId, token, expiresAt]
  );

  return token;
}

// ==========================================
// AUTH ENDPOINTS (Public - No JWT required)
// ==========================================

/**
 * GET /backend/auth/validate-token — Validate a password setup token
 */
apiRouter.get('/auth/validate-token', async (req, res) => {
  const { token } = req.query;
  console.log(`[AUTH] Validating password setup token`);

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ valid: false, error: 'Token no proporcionado' });
  }

  try {
    const [rows]: any = await pool.query(`
      SELECT pst.*, u.displayName, u.email, u.password
      FROM password_setup_tokens pst
      JOIN users u ON pst.userId = u.id
      WHERE pst.token = ?
    `, [token]);

    if (rows.length === 0) {
      return res.json({ valid: false, error: 'Token inválido o no encontrado' });
    }

    const tokenRow = rows[0];

    if (tokenRow.usedAt) {
      return res.json({ valid: false, error: 'Este enlace ya fue utilizado. Si necesita configurar su contraseña, solicite un nuevo enlace.' });
    }

    if (new Date(tokenRow.expiresAt) < new Date()) {
      return res.json({ valid: false, error: 'Este enlace ha expirado. Solicite un nuevo enlace de configuración.' });
    }

    res.json({
      valid: true,
      displayName: tokenRow.displayName,
      email: tokenRow.email,
      isNew: tokenRow.password === PASSWORD_NOT_SET_PLACEHOLDER
    });
  } catch (error: any) {
    console.error('[AUTH ERROR] validate-token:', error.message);
    res.status(500).json({ valid: false, error: 'Error interno del servidor' });
  }
});

/**
 * POST /backend/auth/setup-password — Set password using a valid token
 */
apiRouter.post('/auth/setup-password', async (req, res) => {
  const { token, password } = req.body;
  console.log(`[AUTH] Password setup attempt`);

  if (!token || !password) {
    return res.status(400).json({ success: false, error: 'Token y contraseña son requeridos' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const connection = await pool.getConnection();
  try {
    // Validate token
    const [rows]: any = await connection.query(`
      SELECT pst.*, u.displayName, u.email
      FROM password_setup_tokens pst
      JOIN users u ON pst.userId = u.id
      WHERE pst.token = ?
    `, [token]);

    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Token inválido' });
    }

    const tokenRow = rows[0];

    if (tokenRow.usedAt) {
      return res.status(400).json({ success: false, error: 'Este enlace ya fue utilizado' });
    }

    if (new Date(tokenRow.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, error: 'Este enlace ha expirado' });
    }

    await connection.beginTransaction();

    // Hash and update password
    const hashedPassword = await bcrypt.hash(password, 10);
    await connection.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, tokenRow.userId]
    );

    // Mark token as used
    await connection.query(
      'UPDATE password_setup_tokens SET usedAt = NOW() WHERE id = ?',
      [tokenRow.id]
    );

    await connection.commit();

    console.log(`[AUTH] Password successfully set for user ${tokenRow.email}`);
    res.json({
      success: true,
      message: 'Contraseña configurada exitosamente. Ya puede iniciar sesión.'
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('[AUTH ERROR] setup-password:', error.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

/**
 * POST /backend/auth/forgot-password — Request a password reset link
 */
apiRouter.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  console.log(`[AUTH] Forgot password request for: ${email}`);

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email es requerido' });
  }

  const connection = await pool.getConnection();
  try {
    // 1. Find user
    const [users]: any = await connection.query(
      'SELECT id, displayName, email FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      // For security, do not reveal if user exists
      console.log(`[AUTH] Forgot password: user not found (${email}), but returning success`);
      return res.json({
        success: true,
        message: 'Si el correo está registrado, recibirá un enlace para restablecer su contraseña.'
      });
    }

    const user = users[0];

    // 2. Generate token
    await connection.beginTransaction();
    const token = await createPasswordSetupToken(connection, user.id);
    await connection.commit();

    // 3. Send email
    try {
      await sendForgotPasswordEmail(user.email, user.displayName, token);
      res.json({
        success: true,
        message: 'Si el correo está registrado, recibirá un enlace para restablecer su contraseña.'
      });
    } catch (emailError: any) {
      console.error('[AUTH ERROR] email delivery failed:', emailError.message);
      res.status(500).json({
        success: false,
        error: `No se pudo enviar el correo: ${emailError.message}. Verifique la configuración del servidor.`
      });
    }
  } catch (error: any) {
    await connection.rollback();
    console.error('[AUTH ERROR] forgot-password:', error.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

/**
 * POST /backend/auth/resend-invite — Resend the password setup email
 */
apiRouter.post('/auth/resend-invite', authenticateToken, async (req: any, res: any) => {
  const { userId } = req.body;
  console.log(`[AUTH] Resend invite requested for userId: ${userId}`);

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId es requerido' });
  }

  const connection = await pool.getConnection();
  try {
    const [userRows]: any = await connection.query(
      'SELECT id, displayName, email FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    const user = userRows[0];

    // Generate new token (invalidates old ones)
    const token = await createPasswordSetupToken(connection, user.id);

    // Send email
    try {
      await sendPasswordSetupEmail(user.email, user.displayName, token);
      res.json({
        success: true,
        message: `Email de invitación reenviado a ${user.email}`
      });
    } catch (emailError: any) {
      console.error('[AUTH ERROR] resend-invite email failed:', emailError.message);
      res.status(500).json({
        success: false,
        error: `No se pudo enviar el correo: ${emailError.message}`
      });
    }
  } catch (error: any) {
    console.error('[AUTH ERROR] resend-invite:', error.message);
    res.status(500).json({ success: false, error: 'Error al reenviar invitación' });
  } finally {
    connection.release();
  }
});

// Login endpoint
apiRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`[AUTH] Login attempt: ${email}`);

  try {
    const [rows]: any = await pool.query(`
      SELECT u.id, u.displayName, u.email, u.password, u.role, u.createdAt, u.createdBy,
             p.deletedAt as profDeletedAt, c.deletedAt as clientDeletedAt,
             p.phoneNumber, p.specialty,
             c.businessName, c.cuit, c.ivaCondition, c.phoneNumber as clientPhoneNumber, c.hasStations, c.notificationEmails
      FROM users u
      LEFT JOIN profesionals p ON u.id = p.userId
      LEFT JOIN clients c ON u.id = c.userId
      WHERE u.email = ?
    `, [email]);

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }

    const user = rows[0];

    // Check soft-deleted status
    if (user.role === 'client' && user.clientDeletedAt !== null) {
      console.log(`[AUTH] Failed: Client account is deleted for ${email}`);
      return res.status(401).json({ success: false, error: 'Tu cuenta se encuentra desactivada.' });
    }
    if (user.role === 'profesional' && user.profDeletedAt !== null) {
      console.log(`[AUTH] Failed: Profesional account is deleted for ${email}`);
      return res.status(401).json({ success: false, error: 'Tu cuenta se encuentra desactivada.' });
    }

    // Check if password has not been set yet (invited user)
    if (user.password === PASSWORD_NOT_SET_PLACEHOLDER) {
      console.log(`[AUTH] Failed: Password not set for ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Debe configurar su contraseña usando el enlace enviado a su correo electrónico.',
        passwordNotSet: true
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`[AUTH] Failed: Invalid password for ${email}`);
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }

    console.log(`[AUTH] Success: ${email} logged in as ${user.role}`);
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET!,
      { expiresIn: '365d' }
    );

    // Filter out password and null fields to match polymorphic interface
    const userData: any = { ...user };
    delete userData.password;
    // Ensure hasStations is a proper boolean before null-filter
    if ('hasStations' in userData) {
      userData.hasStations = !!userData.hasStations;
    }
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

// External/Form-based Login endpoint (supports urlencoded and redirects)
apiRouter.post('/login-external', async (req, res) => {
  const { email, password } = req.body;
  console.log(`[AUTH-EXTERNAL] Login attempt: ${email}`);

  try {
    const [rows]: any = await pool.query(`
      SELECT u.id, u.displayName, u.email, u.password, u.role, u.createdAt, u.createdBy,
             p.deletedAt as profDeletedAt, c.deletedAt as clientDeletedAt,
             p.phoneNumber, p.specialty,
             c.businessName, c.cuit, c.ivaCondition, c.phoneNumber as clientPhoneNumber, c.hasStations, c.notificationEmails
      FROM users u
      LEFT JOIN profesionals p ON u.id = p.userId
      LEFT JOIN clients c ON u.id = c.userId
      WHERE u.email = ?
    `, [email]);

    if (rows.length === 0) {
      return res.redirect(`/login?error=${encodeURIComponent('Credenciales inválidas')}`);
    }

    const user = rows[0];

    // Check soft-deleted status
    if (user.role === 'client' && user.clientDeletedAt !== null) {
      console.log(`[AUTH-EXTERNAL] Failed: Client account is deleted for ${email}`);
      return res.redirect(`/login?error=${encodeURIComponent('Tu cuenta se encuentra desactivada.')}`);
    }
    if (user.role === 'profesional' && user.profDeletedAt !== null) {
      console.log(`[AUTH-EXTERNAL] Failed: Profesional account is deleted for ${email}`);
      return res.redirect(`/login?error=${encodeURIComponent('Tu cuenta se encuentra desactivada.')}`);
    }

    // Check if password has not been set yet (invited user)
    if (user.password === PASSWORD_NOT_SET_PLACEHOLDER) {
      console.log(`[AUTH-EXTERNAL] Failed: Password not set for ${email}`);
      return res.redirect(`/login?error=${encodeURIComponent('Debe configurar su contraseña usando el enlace enviado a su correo electrónico.')}`);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`[AUTH-EXTERNAL] Failed: Invalid password for ${email}`);
      return res.redirect(`/login?error=${encodeURIComponent('Credenciales inválidas')}`);
    }

    console.log(`[AUTH-EXTERNAL] Success: ${email} logged in as ${user.role}`);
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET!,
      { expiresIn: '365d' }
    );

    // Filter out password and null fields to match polymorphic interface
    const userData: any = { ...user };
    delete userData.password;
    if ('hasStations' in userData) {
      userData.hasStations = !!userData.hasStations;
    }
    Object.keys(userData).forEach(key => userData[key] === null && delete userData[key]);

    const redirectUrl = `/login-callback?token=${encodeURIComponent(token)}&user=${encodeURIComponent(JSON.stringify(userData))}`;
    res.redirect(redirectUrl);
  } catch (error: any) {
    console.error('[AUTH-EXTERNAL ERROR]:', error.message);
    res.redirect(`/login?error=${encodeURIComponent('Error interno del servidor')}`);
  }
});

// Test endpoint
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Endpoint to fetch clients from clients
apiRouter.get('/clients', authenticateToken, async (req: any, res: any) => {
  console.log('[DEBUG] GET /backend/clients - Fetching active clients');
  const isAdmin = req.user.role === 'admin';
  try {
    const [clientRows]: any = await pool.query(`
      SELECT c.*, u.displayName, u.email, u.createdAt, u.createdBy, c.userId as id, u.isTest,
             (u.password = ?) as setupPending
      FROM clients c
      JOIN users u ON c.userId = u.id
      WHERE c.deletedAt IS NULL
      ${isAdmin ? '' : 'AND u.isTest = 0'}
    `, [PASSWORD_NOT_SET_PLACEHOLDER]);
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
      setupPending: !!row.setupPending,
      hasStations: !!row.hasStations,
      isTest: !!row.isTest,
      // Mapping for frontend compatibility
      name: row.displayName,
      phone: row.phoneNumber,
      ivaCondition: row.ivaCondition,
      fields: fieldsByClient[row.id] || []
    }));

    res.json(clients);
  } catch (error) {
    console.error('[DATABASE ERROR] GET /backend/clients:', error.message);
    res.status(500).json({ error: 'Failed to fetch clients', details: error.message });
  }
});

/** 
 * Soft delete a client
 */
// Update client and fields unified endpoint
apiRouter.put('/clients/:id', authenticateToken, async (req: any, res: any) => {
  console.log(`[DEBUG] PUT /backend/clients/${req.params.id} - Unified update initiated`);
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
      notificationEmails,
      isTest,
      fields // Array of fields from the modal
    } = req.body;

    await connection.beginTransaction();

    // 1. Update user data (Base)
    await connection.query(
      'UPDATE users SET displayName = ?, email = ?, isTest = ? WHERE id = ?',
      [displayName, email, isTest ? 1 : 0, userId]
    );

    // 2. Update client data (Extension)
    const clientData = {
      businessName: businessName,
      cuit: cuit,
      ivaCondition: ivaCondition || 'Responsable Inscripto',
      phoneNumber: phoneNumber,
      notificationEmails: notificationEmails || null
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
    console.error('[DATABASE TRANSACTION ERROR] PUT /backend/clients/:id:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update client and fields',
      details: error.message
    });
  } finally {
    connection.release();
  }
});

apiRouter.delete('/clients/:id', authenticateToken, async (req: any, res: any) => {
  const { id } = req.params;
  console.log(`[DEBUG] DELETE /backend/clients/${id} - Soft delete requested`);
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
    console.error('[DATABASE ERROR] DELETE /backend/clients:', error.message);
    res.status(500).json({ error: 'Failed to delete client', details: error.message });
  }
});



/** 
 * Unified endpoint to create a client and their fields in a single transaction
 */
apiRouter.post('/clients', authenticateToken, async (req: any, res: any) => {
  console.log('[DEBUG] POST /backend/clients - Unified creation initiated');
  const connection = await pool.getConnection();

  try {
    const {
      displayName,
      businessName,
      cuit,
      ivaCondition,
      email,
      phoneNumber,
      notificationEmails,
      createdBy,
      isTest,
      password, // Optional, can default
      fields // Array of fields from the modal
    } = req.body;

    const userEmail = email || `${displayName.toLowerCase().replace(/\s+/g, '')}@tradeagro.com`;

    // 0. Check for existing soft-deleted user to reactivate
    const [existingUsers]: any = await connection.query(
      `SELECT u.id, u.role, c.deletedAt as clientDeletedAt
       FROM users u
       LEFT JOIN clients c ON u.id = c.userId
       WHERE u.email = ?`,
      [userEmail]
    );

    await connection.beginTransaction();

    let newUserId;

    if (existingUsers.length > 0) {
      const existing = existingUsers[0];
      if (existing.role === 'client' && existing.clientDeletedAt !== null) {
        // Reactivate soft-deleted client
        newUserId = existing.id;
        console.log('[DEBUG] Reactivating soft-deleted client userId:', newUserId);

        await connection.query(
          'UPDATE users SET displayName = ?, password = ?, isTest = ? WHERE id = ?',
          [displayName, PASSWORD_NOT_SET_PLACEHOLDER, isTest ? 1 : 0, newUserId]
        );

        // Clear previous fields to avoid duplicates since the frontend sends fresh ones
        await connection.query('DELETE FROM fields WHERE clientId = ?', [newUserId]);
      } else {
        // Active user exists
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: 'Duplicate entry',
          details: 'Duplicate entry \'' + userEmail + '\' for key \'users.email\''
        });
      }
    } else {
      // 1. Create completely new User
      const [userResult]: any = await connection.query(
        'INSERT INTO users (displayName, email, password, role, createdBy, isTest) VALUES (?, ?, ?, ?, ?, ?)',
        [displayName, userEmail, PASSWORD_NOT_SET_PLACEHOLDER, 'client', createdBy ?? 'Admin', isTest ? 1 : 0]
      );
      newUserId = userResult.insertId;
    }

    // 2. Create or Update Client extension record
    console.log('[DEBUG] UPSERTING client extension for userId:', newUserId);
    await connection.query(
      `INSERT INTO clients (userId, businessName, cuit, ivaCondition, phoneNumber, notificationEmails, deletedAt) 
       VALUES (?, ?, ?, ?, ?, ?, NULL) 
       ON DUPLICATE KEY UPDATE 
       businessName = VALUES(businessName), cuit = VALUES(cuit), ivaCondition = VALUES(ivaCondition), phoneNumber = VALUES(phoneNumber), notificationEmails = VALUES(notificationEmails), deletedAt = NULL`,
      [newUserId, businessName, cuit, ivaCondition || 'Responsable Inscripto', phoneNumber, notificationEmails || null]
    );

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

    // 4. Generate password setup token and send invite email
    const setupToken = await createPasswordSetupToken(connection, newUserId);

    await connection.commit();
    console.log('[DEBUG] Transaction committed successfully');

    // Send email after commit (non-blocking)
    let emailSent = false;
    let emailErrorMessage = '';
    try {
      await sendPasswordSetupEmail(userEmail, displayName, setupToken);
      emailSent = true;

      // Send individually to extra recipients
      for (const extraEmail of EXTRA_NOTIFICATION_RECIPIENTS) {
        try {
          await sendPasswordSetupEmail(extraEmail, displayName, setupToken);
          console.log(`[EMAIL] Client registration copy successfully sent to ${extraEmail}`);
        } catch (extraError: any) {
          console.error(`[EMAIL ERROR] Failed to send copy of client welcome email to ${extraEmail}:`, extraError.message);
        }
      }
    } catch (emailError: any) {
      console.error('[AUTH ERROR] client creation email failed:', emailError.message);
      emailErrorMessage = emailError.message;
    }

    res.json({
      success: true,
      id: newUserId,
      emailSent,
      email: userEmail,
      // setupLink removed for production security
      message: emailSent
        ? 'Cliente creado exitosamente. Se envió un email de invitación.'
        : `Cliente creado exitosamente, pero hubo un problema con el email: ${emailErrorMessage}`,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    await connection.rollback();
    console.error('[DATABASE TRANSACTION ERROR] POST /backend/clients:', error.message);
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
apiRouter.get('/fields', authenticateToken, async (req: any, res: any) => {
  console.log('[DEBUG] GET /backend/fields');
  try {
    const [rows]: any = await pool.query('SELECT * FROM fields');
    const fields = rows.map((row: any) => ({
      ...row,
      lotNames: row.lotNames ? JSON.parse(row.lotNames) : []
    }));
    res.json(fields);
  } catch (error) {
    console.error('[DATABASE ERROR] GET /backend/fields:', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE') return res.json([]);
    res.status(500).json({ error: 'Failed to fetch fields', details: error.message });
  }
});

/**
 * Endpoint to fetch jobs (trabajos) with client info
 */
apiRouter.get('/work-orders', authenticateToken, async (req: any, res) => {
  const { id, role } = req.user;
  console.log(`[DEBUG_AUTH] GET /backend/work-orders - UserID: ${id}, Role: ${role}`);

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

    // Hide test work orders for non-admins
    if (role !== 'admin') {
      query += ` AND u.isTest = 0 AND (p_user.isTest IS NULL OR p_user.isTest = 0)`;
    }

    query += ` ORDER BY t.createdAt DESC`;

    console.log(`[DEBUG] GET /backend/work-orders - User: ${id}, Role: ${role}`);

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
      secondaryService: row.secondaryService || null,
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
    console.error('[DATABASE ERROR] GET /backend/work-orders:', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE') return res.json([]);
    res.status(500).json({ error: 'Failed to fetch jobs', details: error.message });
  }
});

async function sendNewOrderEmail(orderData: any) {
  const transporter = getTransporter();
  if (!transporter) return;

  const appUrl = getAppUrl();
  const orderUrl = `${appUrl}/work-orders/${orderData.uuid || orderData.id}`;
  const fromEmail = process.env.SMTP_FROM || 'TradeAgro <no-reply@tradeagrosmart.com.ar>';

  const textContent = `Confirmación de Orden #AG-${orderData.id}

Hola ${orderData.clientName},

Se ha registrado correctamente la orden de trabajo #AG-${orderData.id}.

Detalles:
- Servicio: ${orderData.service}
- Profesional a cargo: ${orderData.profesionalName || 'Pendiente de asignación'}

Recibirás otra notificación cuando el trabajo sea completado.

Ver Detalles de la Orden:
${orderUrl}

TradeAgro`;

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Confirmaci&oacute;n de Orden #AG-${orderData.id}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: white;">
    <div style="background: #2e7d32; padding: 24px; text-align: center; color: white;">
      <h1 style="margin: 0;">TradeAgro</h1>
      <p style="margin: 4px 0 0; opacity: 0.8;">Confirmaci&oacute;n de Orden</p>
    </div>
    <div style="padding: 24px;">
      <h2 style="color: #1e293b;">Hola ${orderData.clientName},</h2>
      <p style="color: #64748b; line-height: 1.6;">Se ha registrado correctamente la orden de trabajo <strong>#AG-${orderData.id}</strong>.</p>
      <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin: 24px 0;">
        <p style="margin: 0 0 8px;"><strong>Servicio:</strong> ${orderData.service}</p>
        <p style="margin: 0;"><strong>Profesional a cargo:</strong> ${orderData.profesionalName || 'Pendiente de asignaci&oacute;n'}</p>
      </div>
      <p style="color: #94a3b8; font-size: 13px;">Recibir&aacute;s otra notificaci&oacute;n cuando el trabajo sea completado.</p>
      <div style="text-align: center; margin-top: 24px;">
        <a href="${orderUrl}" style="display: inline-block; background: #2e7d32; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Ver Detalles de la Orden</a>
      </div>
    </div>
  </div>
</body>
</html>`;

  // 1. Notify Client
  if (orderData.clientEmail) {
    try {
      await transporter.sendMail({
        from: fromEmail,
        to: orderData.clientEmail,
        subject: `Confirmación de Orden #${orderData.id} — TradeAgro`,
        text: textContent,
        html: htmlContent
      });
      console.log(`[EMAIL] New order confirmation email sent to ${orderData.clientEmail}`);
    } catch (err: any) {
      console.error(`[EMAIL ERROR] sendNewOrderEmail failed for client ${orderData.clientEmail}:`, err.message);
    }
  }

  // 1b. Notify Client's additional notification emails (Distribution List)
  if (orderData.clientNotificationEmails) {
    const additionalEmails = orderData.clientNotificationEmails
      .split(/[,;\s]+/)
      .map((e: string) => e.trim())
      .filter((e: string) => e && e.includes('@'));

    for (const addEmail of additionalEmails) {
      try {
        await transporter.sendMail({
          from: fromEmail,
          to: addEmail,
          subject: `Confirmación de Orden #${orderData.id} — TradeAgro`,
          text: textContent,
          html: htmlContent
        });
        console.log(`[EMAIL] New order confirmation copy sent to client's distribution list email: ${addEmail}`);
      } catch (err: any) {
        console.error(`[EMAIL ERROR] sendNewOrderEmail distribution list copy failed for ${addEmail}:`, err.message);
      }
    }
  }

  // 2. Notify extra recipients individually
  for (const extraEmail of EXTRA_NOTIFICATION_RECIPIENTS) {
    try {
      await transporter.sendMail({
        from: fromEmail,
        to: extraEmail,
        subject: `Confirmación de Orden #${orderData.id} — TradeAgro`,
        text: textContent,
        html: htmlContent
      });
      console.log(`[EMAIL] New order confirmation copy sent to ${extraEmail}`);
    } catch (err: any) {
      console.error(`[EMAIL ERROR] sendNewOrderEmail copy failed for ${extraEmail}:`, err.message);
    }
  }
}

/**
 * Endpoint to create a job (trabajo)
 */
apiRouter.post('/work-orders', authenticateToken, async (req, res) => {
  console.log('[DEBUG] POST /backend/work-orders - Creating new job:', JSON.stringify(req.body));
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
      secondaryService,
      campaign,
      amount,
      notes,
      fieldId,
      createdBy
    } = req.body;

    // Persist services if they are new, maintaining hierarchy
    await ensureServicesExist(service, secondaryService);

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

    console.log('[DEBUG] POST /backend/work-orders - RECIBIDO BODY:', JSON.stringify(req.body));

    const dbData: any = {
      clientId: finalClientId || null,
      profesionalId: profesionalId || null,
      date: date || null,
      title: title,
      service: service,
      secondaryService: secondaryService || null,
      campaign: campaign || null,
      fieldId: fieldId || null,
      fieldName: field || null,
      lotName: lot || null,
      hectares: parseFloat(cleanHectares) || 0,
      amountUsd: parseFloat(cleanAmount) || 0,
      status: req.body.status || 'Pendiente',
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
      id: dbData.uuid
    });

    // Send notification emails asycnchronously
    try {
      const [orderRows]: any = await pool.query(`
        SELECT t.*, 
               u_client.displayName as clientName, u_client.email as clientEmail,
               c_client.notificationEmails as clientNotificationEmails,
               u_prof.displayName as profesionalName, u_prof.email as profesionalEmail
        FROM work_orders t
        LEFT JOIN users u_client ON t.clientId = u_client.id
        LEFT JOIN clients c_client ON t.clientId = c_client.userId
        LEFT JOIN users u_prof ON t.profesionalId = u_prof.id
        WHERE t.id = ?
      `, [result.insertId]);

      if (orderRows.length > 0) {
        const row = orderRows[0];
        sendNewOrderEmail({
          id: row.id,
          uuid: row.uuid,
          clientName: row.clientName,
          clientEmail: row.clientEmail,
          clientNotificationEmails: row.clientNotificationEmails,
          profesionalName: row.profesionalName,
          profesionalEmail: row.profesionalEmail,
          service: row.service,
          location: row.fieldName ? `${row.fieldName}${row.lotName ? ` - ${row.lotName}` : ''}` : 'Ubicación registrada',
          hectares: row.hectares
        }).catch(err => console.error('[ORDER EMAIL] Error sending new order email:', err));
      }
    } catch (emailError) {
      console.error('[ORDER EMAIL] Error fetching data for new order email:', emailError);
    }
  } catch (error) {
    console.error('[DATABASE ERROR] POST /backend/work-orders:', error);
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
apiRouter.put('/work-orders/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const user = req.user;
  console.log(`[DEBUG] PUT /backend/work-orders/${id} - Updating job:`, JSON.stringify(req.body));
  try {
    // Resolve UUID to internal numeric ID
    const [woRows]: any = await pool.query(
      'SELECT id, status, profesionalId FROM work_orders WHERE uuid = ? AND deletedAt IS NULL',
      [id]
    );
    if (woRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Orden de trabajo no encontrada' });
    }
    const orderBeforeUpdate = woRows[0];

    // Authorization: Admin or the assigned Professional
    const isAuthorized = user.role === 'admin' || user.id === orderBeforeUpdate.profesionalId;
    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'No tienes permiso para modificar esta orden' });
    }

    const internalJobId = orderBeforeUpdate.id;

    const {
      clientId,
      profesionalId,
      date,
      title,
      field,
      lot,
      hectares,
      service,
      secondaryService,
      status,
      campaign,
      amount,
      fieldId,
      notes
    } = req.body;

    // Persist services if they are new, maintaining hierarchy
    await ensureServicesExist(service, secondaryService);

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
      secondaryService: secondaryService || null,
      campaign: campaign || null,
      fieldId: fieldId || null,
      fieldName: field || null,
      lotName: lot || null,
      hectares: parseFloat(cleanHectares) || 0,
      amountUsd: parseFloat(cleanAmount) || 0,
      status: status || undefined,
    };

    console.log(`[DEBUG] Updating work_orders id ${internalJobId}:`, JSON.stringify(dbData));
    const [result]: any = await pool.query('UPDATE work_orders SET ? WHERE id = ?', [dbData, internalJobId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    // Si el estado CAMBIA a "Completado", enviar email al cliente
    if (status === 'Completado' && orderBeforeUpdate.status !== 'Completado') {
      try {
        const query = `
          SELECT t.*, u.displayName as clientName, u.email as clientEmail,
                 c.notificationEmails as clientNotificationEmails
          FROM work_orders t
          JOIN users u ON t.clientId = u.id
          LEFT JOIN clients c ON t.clientId = c.userId
          WHERE t.id = ?
        `;
        const [rows]: any = await pool.query(query, [internalJobId]);

        if (rows.length > 0) {
          const row = rows[0];
          const orderData = {
            id: row.id,
            uuid: row.uuid,
            clientName: row.clientName,
            clientEmail: row.clientEmail,
            clientNotificationEmails: row.clientNotificationEmails,
            service: row.service || 'Servicio General',
            location: row.fieldName ? `${row.fieldName}${row.lotName ? ` - ${row.lotName}` : ''}` : 'Ubicación registrada',
            hectares: row.hectares,
            campaign: row.campaign
          };

          // Enviar email de forma asíncrona
          sendOrderCompletedEmail(orderData).catch(err => {
            console.error('[ORDER UPDATE] Error asynchronously sending completed email:', err);
          });
        }
      } catch (emailDataError) {
        console.error('[ORDER UPDATE] Error fetching data for completion email:', emailDataError);
      }
    }

    res.json({
      success: true,
      id: id
    });
  } catch (error: any) {
    console.error(`[DATABASE ERROR] PUT /backend/work-orders/${id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update job',
      message: error.message,
      code: error.code
    });
  }
});

/**
 * Endpoint to update ONLY the status of a work order
 */
apiRouter.patch('/work-orders/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const user = (req as any).user;

  if (!status) {
    return res.status(400).json({ success: false, error: 'Status is required' });
  }

  // Validate status
  const validStatuses = ['Pendiente', 'En Proceso', 'Completado', 'Cancelado'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status value' });
  }

  try {
    // Resolve UUID to internal numeric ID
    const [woRows]: any = await pool.query(
      'SELECT id, clientId, profesionalId FROM work_orders WHERE uuid = ? AND deletedAt IS NULL',
      [id]
    );
    if (woRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Orden de trabajo no encontrada' });
    }
    const order = woRows[0];

    // Authorization: Admin, or the assigned Professional
    const isAuthorized = user.role === 'admin' || user.id === order.profesionalId;
    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'No tienes permiso para cambiar el estado de esta orden' });
    }

    await pool.query('UPDATE work_orders SET status = ? WHERE id = ?', [status, order.id]);

    console.log(`[STATUS UPDATE] Order ${order.id} updated to ${status} by user ${user.id}`);

    // Si el estado es "Completado", enviar email al cliente
    if (status === 'Completado') {
      try {
        const query = `
          SELECT t.*, u.displayName as clientName, u.email as clientEmail,
                 c.notificationEmails as clientNotificationEmails
          FROM work_orders t
          JOIN users u ON t.clientId = u.id
          LEFT JOIN clients c ON t.clientId = c.userId
          WHERE t.id = ?
        `;
        const [rows]: any = await pool.query(query, [order.id]);

        if (rows.length > 0) {
          const row = rows[0];
          const orderData = {
            id: row.id,
            uuid: row.uuid,
            clientName: row.clientName,
            clientEmail: row.clientEmail,
            clientNotificationEmails: row.clientNotificationEmails,
            service: row.service || 'Servicio General',
            location: row.fieldName ? `${row.fieldName}${row.lotName ? ` - ${row.lotName}` : ''}` : 'Ubicación registrada',
            hectares: row.hectares,
            campaign: row.campaign
          };

          // Enviar email de forma asíncrona (no bloqueante)
          sendOrderCompletedEmail(orderData).catch(err => {
            console.error('[STATUS UPDATE] Error asynchronously sending completed email:', err);
          });
        }
      } catch (emailDataError) {
        console.error('[STATUS UPDATE] Error fetching data for completion email:', emailDataError);
      }
    }

    res.json({
      success: true,
      message: 'Estado actualizado correctamente',
      status: status
    });
  } catch (error: any) {
    console.error(`[DATABASE ERROR] PATCH /backend/work-orders/${id}/status:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update status',
      message: error.message
    });
  }
});

/**
 * Soft delete a job (work order)
 */
apiRouter.delete('/work-orders/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  console.log(`[DEBUG] DELETE /backend/work-orders/${id} - Hard delete requested by ${req.user.role}`);
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Acceso denegado. Solo los administradores pueden eliminar órdenes de trabajo.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Fetch the exact ID of the work order
    const [woRows]: any = await connection.query(
      'SELECT id FROM work_orders WHERE uuid = ? OR id = ?',
      [id, id]
    );

    if (woRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Orden de trabajo no encontrada' });
    }

    const realId = woRows[0].id;

    // 2. Delete associated records manually to support MyISAM / lack of foreign keys
    console.log(`[DEBUG] Deleting observations for workOrderId: ${realId}`);
    await connection.query('DELETE FROM work_order_observations WHERE workOrderId = ?', [realId]);

    console.log(`[DEBUG] Deleting attachments for workOrderId: ${realId}`);
    await connection.query('DELETE FROM work_order_attachments WHERE workOrderId = ?', [realId]);

    // 3. Delete the work order itself
    console.log(`[DEBUG] Deleting work order ID: ${realId}`);
    await connection.query('DELETE FROM work_orders WHERE id = ?', [realId]);

    await connection.commit();
    res.json({ success: true, message: 'Orden de trabajo y todos sus datos asociados eliminados correctamente' });
  } catch (error: any) {
    await connection.rollback();
    console.error('[DATABASE ERROR] DELETE /backend/work-orders:', error.message);
    res.status(500).json({ error: 'Failed to delete job', details: error.message });
  } finally {
    connection.release();
  }
});

/**
 * Endpoint to fetch a single work order by ID or UUID (Secured)
 */
apiRouter.get('/work-orders/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const user = req.user;
  console.log(`[SECURE DEBUG] GET /backend/work-orders/${id} - User: ${user.id}, Role: ${user.role}`);

  try {
    const query = `
      SELECT t.*, u.displayName as clientName, p_user.displayName as professionalName,
             p_prof.phoneNumber as professionalPhone, c.phoneNumber as clientPhone,
             f.lat, f.lng
      FROM work_orders t
      LEFT JOIN users u ON t.clientId = u.id
      LEFT JOIN users p_user ON t.profesionalId = p_user.id
      LEFT JOIN profesionals p_prof ON t.profesionalId = p_prof.userId
      LEFT JOIN clients c ON t.clientId = c.userId
      LEFT JOIN fields f ON t.fieldId = f.id
      WHERE t.uuid = ? AND t.deletedAt IS NULL
    `;

    const [rows]: any = await pool.query(query, [id]);

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
      clientPhone: row.clientPhone || null,
      date: row.date,
      location: row.fieldName ? `${row.fieldName}${row.lotName ? ` - ${row.lotName}` : ''}` : 'Ubicación pendiente',
      service: row.service || 'Sin servicio',
      secondaryService: row.secondaryService || null,
      title: row.title || row.service,
      fieldId: row.fieldId,
      fieldName: row.fieldName,
      lotName: row.lotName,
      hectares: parseFloat(row.hectares) || 0,
      amountUsd: parseFloat(row.amountUsd) || 0,
      campaign: row.campaign,
      status: row.status,
      operator: row.professionalName || "Asignación Pendiente",
      profesionalPhone: row.professionalPhone || null,
      lat: row.lat,
      lng: row.lng,
      iconName: getIconNameForService(row.service),
      color: getColorForService(row.service),
      createdAt: row.createdAt,
      createdBy: row.createdBy
    };

    res.json(job);
  } catch (error: any) {
    console.error(`[DATABASE ERROR] GET /backend/work-orders/${id}:`, error.message);
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
apiRouter.post('/work-orders/:id/attachments', authenticateToken, upload.array('files'), async (req: any, res) => {
  const { id } = req.params;
  const files = req.files as Express.Multer.File[];
  const uploadedBy = req.user.id;

  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files uploaded' });
  }

  try {
    // Resolve UUID to internal numeric ID
    const [woRows]: any = await pool.query(
      'SELECT id, clientId, profesionalId FROM work_orders WHERE uuid = ? AND deletedAt IS NULL',
      [id]
    );
    if (woRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Orden de trabajo no encontrada' });
    }
    const order = woRows[0];

    // Authorization: Admin, Client, or Professional
    const isAuthorized = req.user.role === 'admin' || req.user.id === order.clientId || req.user.id === order.profesionalId;
    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'No tienes permiso para subir archivos a esta orden' });
    }

    const internalJobId = order.id;

    const values = (req.files as Express.Multer.File[]).map(file => [
      internalJobId,
      file.originalname,
      `/backend/attachments/content/`, // Placeholder
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
    console.error(`[DATABASE ERROR] POST /backend/work-orders/${id}/attachments:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to save attachments' });
  }
});

/**
 * Fetch attachments for a job
 */
apiRouter.get('/work-orders/:id/attachments', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  try {
    // Resolve UUID to internal numeric ID
    const [woRows]: any = await pool.query(
      'SELECT id, clientId, profesionalId FROM work_orders WHERE uuid = ? AND deletedAt IS NULL',
      [id]
    );
    if (woRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Orden de trabajo no encontrada' });
    }
    const order = woRows[0];

    // Authorization: Admin, Client, or Professional
    const user = req.user as any;
    const isAuthorized = user.role === 'admin' || user.id === order.clientId || user.id === order.profesionalId;
    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'No tienes permiso para ver los archivos de esta orden' });
    }

    const internalJobId = order.id;

    const [rows]: any = await pool.query(
      'SELECT a.id, workOrderId, fileName, fileType, fileSize, uploadedBy, a.createdAt, u.displayName as uploaderName FROM work_order_attachments a LEFT JOIN users u ON a.uploadedBy = u.id WHERE a.workOrderId = ? ORDER BY a.createdAt DESC',
      [internalJobId]
    );

    // Add the dynamic URL for each attachment
    const attachments = rows.map((row: any) => ({
      ...row,
      fileUrl: `/backend/attachments/${row.id}/content`
    }));

    res.json(attachments);
  } catch (error: any) {
    console.error(`[DATABASE ERROR] GET /backend/work-orders/${id}/attachments:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch attachments' });
  }
});

/**
 * Fetch observations for a job
 */
apiRouter.get('/work-orders/:id/observations', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  try {
    // Resolve UUID to internal numeric ID
    const [woRows]: any = await pool.query(
      'SELECT id, clientId, profesionalId FROM work_orders WHERE uuid = ? AND deletedAt IS NULL',
      [id]
    );
    if (woRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Orden de trabajo no encontrada' });
    }
    const order = woRows[0];

    // Authorization: Admin, Client, or Professional
    const user = req.user as any;
    const isAuthorized = user.role === 'admin' || user.id === order.clientId || user.id === order.profesionalId;
    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'No tienes permiso para ver las observaciones de esta orden' });
    }

    const internalJobId = order.id;

    const [rows]: any = await pool.query(
      `SELECT o.id, o.workOrderId, o.userId, o.text, o.createdAt,
              u.displayName, u.role
       FROM work_order_observations o
       JOIN users u ON o.userId = u.id
       WHERE o.workOrderId = ?
       ORDER BY o.createdAt ASC`,
      [internalJobId]
    );
    res.json(rows);
  } catch (error: any) {
    console.error(`[DATABASE ERROR] GET /backend/work-orders/${id}/observations:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch observations' });
  }
});

/**
 * Create a new observation for a job
 */
apiRouter.post('/work-orders/:id/observations', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, error: 'Text is required' });
  }

  try {
    // Resolve UUID to internal numeric ID
    const [woRows]: any = await pool.query(
      'SELECT id, clientId, profesionalId FROM work_orders WHERE uuid = ? AND deletedAt IS NULL',
      [id]
    );
    if (woRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Orden de trabajo no encontrada' });
    }
    const order = woRows[0];

    // Authorization: Admin, Client, or Professional
    const user = req.user as any;
    const isAuthorized = user.role === 'admin' || user.id === order.clientId || user.id === order.profesionalId;
    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'No tienes permiso para agregar observaciones a esta orden' });
    }

    const internalJobId = order.id;

    const [result]: any = await pool.query(
      'INSERT INTO work_order_observations (workOrderId, userId, text) VALUES (?, ?, ?)',
      [internalJobId, userId, text.trim()]
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
    console.error(`[DATABASE ERROR] POST /backend/work-orders/${id}/observations:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to create observation' });
  }
});

// New Endpoint: Serve File Content from DB (Secured)
apiRouter.get('/attachments/:id/content', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { download } = req.query;
  const user = req.user;
  console.log(`[SECURE DEBUG] GET /backend/attachments/${id}/content - UserID: ${user.id}, Role: ${user.role}, download=${download}`);

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
    console.error('[DATABASE ERROR] GET /backend/attachments/:id/content:', error.message);
    res.status(500).json({ error: 'Failed to retrieve file content' });
  }
});

/**
 * Delete an attachment
 */
apiRouter.delete('/attachments/:id', authenticateToken, async (req, res) => {
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
    console.error('[DATABASE ERROR] DELETE /backend/attachments:', error.message);
    res.status(500).json({ success: false, error: 'Failed to delete attachment', details: error.message });
  }
});

/**
 * GET /backend/services — fetch all registered services
 */
apiRouter.get('/services', authenticateToken, async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT id, name, parentId FROM services ORDER BY name ASC');
    res.json(rows);
  } catch (error: any) {
    console.error('[DATABASE ERROR] GET /backend/services:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch services' });
  }
});

// Helper functions for backend mapping (similar to frontend)
async function ensureServicesExist(primary: string | null | undefined, secondary?: string | null | undefined) {
  if (!primary || !primary.trim()) return;

  const pTrimmed = primary.trim();
  try {
    // 1. Ensure Primary exists (must be a top-level service)
    let parentId: number;
    const [pRows]: any = await pool.query('SELECT id FROM services WHERE LOWER(name) = LOWER(?) AND parentId IS NULL', [pTrimmed]);

    if (pRows.length === 0) {
      console.log(`[SERVICES] Saving new primary service: ${pTrimmed}`);
      const [res]: any = await pool.query('INSERT INTO services (name, parentId) VALUES (?, NULL)', [pTrimmed]);
      parentId = res.insertId;
    } else {
      parentId = pRows[0].id;
    }

    // 2. Ensure Secondary exists (as child of primary)
    if (secondary && secondary.trim()) {
      const sTrimmed = secondary.trim();
      const [sRows]: any = await pool.query('SELECT id FROM services WHERE LOWER(name) = LOWER(?) AND parentId = ?', [sTrimmed, parentId]);

      if (sRows.length === 0) {
        console.log(`[SERVICES] Saving new secondary service: ${sTrimmed} (Parent: ${pTrimmed})`);
        await pool.query('INSERT INTO services (name, parentId) VALUES (?, ?)', [sTrimmed, parentId]);
      }
    }
  } catch (err: any) {
    console.error('[SERVICES ERROR] Failed to ensure services exist:', err.message);
  }
}

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
apiRouter.post('/fields', authenticateToken, async (req, res) => {
  console.log('[DEBUG] POST /backend/fields - Creating new field:', JSON.stringify(req.body));
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
    console.error('[DATABASE ERROR] POST /backend/fields:', error.message);
    res.status(500).json({ error: 'Failed to create field', details: error.message });
  }
});

/**
 * RESET CLIENTS (Dev only)
 */
apiRouter.post('/test/reset-clients', async (req, res) => {
  console.log('[DEBUG] POST /backend/test/reset-clients');
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

apiRouter.post('/test/reset-profesionals', async (req, res) => {
  console.log('[DEBUG] POST /backend/test/reset-profesionals');
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
apiRouter.post('/test/reset-fields', async (req, res) => {
  console.log('[DEBUG] POST /backend/test/reset-fields');
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
apiRouter.post('/test/reset-work-orders', async (req, res) => {
  console.log('[DEBUG] POST /backend/test/reset-work-orders');
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
apiRouter.post('/test/reset-attachments', async (req, res) => {
  console.log('[DEBUG] POST /backend/test/reset-attachments');
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
apiRouter.post('/test/reset-observations', async (req, res) => {
  console.log('[DEBUG] POST /backend/test/reset-observations');
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
 * RESET TOKENS (Dev only)
 */
apiRouter.post('/test/reset-tokens', async (req, res) => {
  console.log('[DEBUG] POST /backend/test/reset-tokens');
  const connection = await pool.getConnection();
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE password_setup_tokens');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    res.json({ success: true, message: 'Tokens reset successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reset tokens', details: error.message });
  } finally {
    connection.release();
  }
});

/**
 * GET /backend/attachments (Dev only / Global)
 */
apiRouter.get('/attachments', authenticateToken, async (req: any, res: any) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM work_order_attachments');
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch attachments', details: error.message });
  }
});

/**
 * GET /backend/observations (Dev only / Global)
 */
apiRouter.get('/observations', authenticateToken, async (req: any, res: any) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM work_order_observations');
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch observations', details: error.message });
  }
});

/**
 * GET /backend/tokens (Dev only / Global)
 */
apiRouter.get('/tokens', authenticateToken, async (req: any, res: any) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM password_setup_tokens');
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch tokens', details: error.message });
  }
});

/**
 * GET /backend/profesionales — fetch active professionals
 */
apiRouter.get('/profesionales', authenticateToken, async (req: any, res: any) => {
  console.log('[DEBUG] GET /backend/profesionales for user:', req.user.email);
  const isAdmin = req.user.role === 'admin';
  try {
    let rows;
    if (req.user.role === 'client') {
      [rows] = await pool.query(`
        SELECT DISTINCT p.*, u.displayName, u.email, u.createdAt, u.createdBy, p.userId as id, u.isTest,
               (u.password = ?) as setupPending
        FROM profesionals p
        JOIN users u ON p.userId = u.id
        JOIN work_orders w ON p.userId = w.profesionalId
        WHERE p.deletedAt IS NULL AND w.clientId = ? AND w.deletedAt IS NULL
        ${isAdmin ? '' : 'AND u.isTest = 0'}
        ORDER BY u.createdAt DESC
      `, [PASSWORD_NOT_SET_PLACEHOLDER, req.user.id]);
    } else {
      [rows] = await pool.query(`
        SELECT p.*, u.displayName, u.email, u.createdAt, u.createdBy, p.userId as id, u.isTest,
               (u.password = ?) as setupPending
        FROM profesionals p
        JOIN users u ON p.userId = u.id
        WHERE p.deletedAt IS NULL
        ${isAdmin ? '' : 'AND u.isTest = 0'}
        ORDER BY u.createdAt DESC
      `, [PASSWORD_NOT_SET_PLACEHOLDER]);
    }

    // Ensure phoneNumber is consistently named in the response
    const formatted = rows.map((r: any) => ({
      ...r,
      setupPending: !!r.setupPending,
      isTest: !!r.isTest,
      phoneNumber: r.phoneNumber
    }));
    res.json(formatted);
  } catch (error: any) {
    console.error('[DATABASE ERROR] GET /backend/profesionales:', error.message);
    res.status(500).json({ error: 'Failed to fetch profesionales', details: error.message });
  }
});

/**
 * PUT /backend/profesionales/:id — update an existing professional
 */
apiRouter.put('/profesionales/:id', authenticateToken, async (req: any, res: any) => {
  const { id } = req.params; // userId
  console.log(`[DEBUG] PUT /backend/profesionales/${id} - Updating profesional:`, JSON.stringify(req.body));
  const connection = await pool.getConnection();
  try {
    const { displayName, email, phoneNumber, specialty, isTest } = req.body;

    await connection.beginTransaction();

    // 1. Update User base
    await connection.query(
      'UPDATE users SET displayName = ?, email = ?, isTest = ? WHERE id = ?',
      [displayName, email, isTest ? 1 : 0, id]
    );

    // 2. Update Profesional extension
    const profData = { phoneNumber, specialty };
    await connection.query('UPDATE profesionals SET ? WHERE userId = ?', [profData, id]);

    await connection.commit();
    res.json({ success: true, id });
  } catch (error: any) {
    await connection.rollback();
    console.error('[DATABASE ERROR] PUT /backend/profesionales:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update profesional', details: error.message });
  } finally {
    connection.release();
  }
});

/**
 * DELETE /backend/profesionales/:id — soft delete a professional
 */
apiRouter.delete('/profesionales/:id', authenticateToken, async (req: any, res: any) => {
  const { id } = req.params; // userId
  console.log(`[DEBUG] DELETE /backend/profesionales/${id} - Soft deleting profesional`);
  try {
    const [result]: any = await pool.query('UPDATE profesionals SET deletedAt = NOW() WHERE userId = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Profesional not found' });
    }

    res.json({ success: true, message: 'Profesional deleted successfully' });
  } catch (error: any) {
    console.error('[DATABASE ERROR] DELETE /backend/profesionales:', error.message);
    res.status(500).json({ success: false, error: 'Failed to delete profesional', details: error.message });
  }
});

/**
 * Toggle hasStations flag for a client (admin only)
 */
apiRouter.patch('/clients/:id/stations-toggle', authenticateToken, async (req: any, res: any) => {
  const { id } = req.params;
  const { hasStations } = req.body;
  console.log(`[DEBUG] PATCH /backend/clients/${id}/stations-toggle - hasStations=${hasStations}`);

  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Solo administradores pueden modificar esta configuración.' });
  }

  try {
    const [result]: any = await pool.query(
      'UPDATE clients SET hasStations = ? WHERE userId = ?',
      [!!hasStations, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    res.json({ success: true, hasStations: !!hasStations });
  } catch (error: any) {
    console.error('[DATABASE ERROR] PATCH /clients/:id/stations-toggle:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update stations flag', details: error.message });
  }
});

/**
 * POST /backend/profesionales — create a new professional
 */
apiRouter.post('/profesionales', authenticateToken, async (req: any, res: any) => {
  console.log('[DEBUG] POST /backend/profesionales - Creating new profesional:', JSON.stringify(req.body));
  const connection = await pool.getConnection();
  try {
    const { displayName, email, password, phoneNumber, specialty, createdBy, isTest } = req.body;

    // 0. Check for existing soft-deleted user to reactivate
    const [existingUsers]: any = await connection.query(
      `SELECT u.id, u.role, p.deletedAt as profDeletedAt
       FROM users u
       LEFT JOIN profesionals p ON u.id = p.userId
       WHERE u.email = ?`,
      [email]
    );

    await connection.beginTransaction();

    let newUserId;

    if (existingUsers.length > 0) {
      const existing = existingUsers[0];
      if (existing.role === 'profesional' && existing.profDeletedAt !== null) {
        // Reactivate soft-deleted profesional
        newUserId = existing.id;
        console.log('[DEBUG] Reactivating soft-deleted profesional userId:', newUserId);

        await connection.query(
          'UPDATE users SET displayName = ?, password = ?, isTest = ? WHERE id = ?',
          [displayName, PASSWORD_NOT_SET_PLACEHOLDER, isTest ? 1 : 0, newUserId]
        );
      } else {
        // Active user exists
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: 'Duplicate entry',
          details: 'Duplicate entry \'' + email + '\' for key \'users.email\''
        });
      }
    } else {
      // 1. Create completely new User
      const [userResult]: any = await connection.query(
        'INSERT INTO users (displayName, email, password, role, createdBy, isTest) VALUES (?, ?, ?, ?, ?, ?)',
        [displayName, email, PASSWORD_NOT_SET_PLACEHOLDER, 'profesional', createdBy ?? 'Admin', isTest ? 1 : 0]
      );
      newUserId = userResult.insertId;
    }

    // 2. Create or Update Profesional extension
    console.log('[DEBUG] UPSERTING profesional extension for userId:', newUserId);
    await connection.query(
      `INSERT INTO profesionals (userId, phoneNumber, specialty, deletedAt)
       VALUES (?, ?, ?, NULL)
       ON DUPLICATE KEY UPDATE
       phoneNumber = VALUES(phoneNumber), specialty = VALUES(specialty), deletedAt = NULL`,
      [newUserId, phoneNumber || null, specialty || null]
    );

    // 3. Generate password setup token
    const setupToken = await createPasswordSetupToken(connection, newUserId);

    await connection.commit();

    // 4. Send email (non-blocking)
    let emailSent = false;
    let emailErrorMessage = '';
    try {
      await sendPasswordSetupEmail(email, displayName, setupToken);
      emailSent = true;
    } catch (emailError: any) {
      console.error('[AUTH ERROR] profesional creation email failed:', emailError.message);
      emailErrorMessage = emailError.message;
    }

    res.json({
      success: true,
      id: newUserId,
      emailSent,
      message: emailSent
        ? 'Profesional creado exitosamente. Se envió un email de invitación.'
        : `Profesional creado exitosamente, pero hubo un problema con el email: ${emailErrorMessage}`,
      // setupLink removed for production security
      createdAt: new Date().toISOString()
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('[DATABASE ERROR] POST /backend/profesionales:', error.message);
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
 * GET /backend/users — fetch all users from the system
 */
apiRouter.get('/users', authenticateToken, async (req: any, res: any) => {
  console.log('[DEBUG] GET /backend/users');
  try {
    const [rows]: any = await pool.query(`
      SELECT id, displayName, email, role, createdAt, createdBy
      FROM users
      ORDER BY createdAt DESC
    `);
    res.json(rows);
  } catch (error: any) {
    console.error('[DATABASE ERROR] GET /backend/users:', error.message);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

/**
 * RESET ALL DATA (Dev only) - Warning: This clears everything as all tables depend on users
 */
app.post('/backend/test/reset-data', async (req, res) => {
  console.log('[DEBUG] POST /backend/test/reset-data');
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

// Mount the API router
// Using /backend as the stable endpoint for production and local development
app.use('/backend', apiRouter);

// Memory caches to prevent slow, redundant external MKL API queries
let cachedDevices: any = null;
let cachedDevicesTimestamp = 0;
const DEVICES_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const sensorDataCache: Record<string, { data: any; timestamp: number }> = {};
const SENSOR_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

let activeMklToken: string | null = null;

/**
 * Validates, rotates, and fetches a fresh JWT token dynamically from MKL Agro login API
 */
async function getMklToken(forceRefresh = false): Promise<string> {
  const MKL_EMAIL = process.env.MKL_EMAIL;
  const MKL_PASSWORD = process.env.MKL_PASSWORD;

  // 1. If we have a token and aren't forcing a refresh, check its remaining lifetime
  if (activeMklToken && !forceRefresh) {
    try {
      const parts = activeMklToken.split('.');
      if (parts.length === 3) {
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          Buffer.from(base64, 'base64')
            .toString('utf8')
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        const expirationTime = payload.exp * 1000;
        
        // If token has more than 1 hour left, use it
        if (Date.now() < expirationTime - 60 * 60 * 1000) {
          return activeMklToken;
        }
        console.log('[MKL AUTH] Token is expiring soon (less than 1 hour). Initiating refresh...');
      }
    } catch (e: any) {
      console.warn('[MKL AUTH] Failed to parse cached JWT payload:', e.message);
    }
  }

  // 2. Fetch new token from MKL login endpoint using email/password
  try {
    console.log(`[MKL AUTH] Authenticating with MKL Agro API for user "${MKL_EMAIL}"...`);
    const loginResponse = await fetch('https://panel.mklagro.com/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: MKL_EMAIL,
        password: MKL_PASSWORD
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Authentication endpoint returned status ${loginResponse.status}`);
    }

    const result: any = await loginResponse.json();
    if (result.status === 'success' && result.token) {
      activeMklToken = result.token;
      console.log('[MKL AUTH] Obtained fresh MKL Agro JWT session token successfully.');
      return activeMklToken!;
    } else {
      throw new Error(result.error || 'Invalid login response payload');
    }
  } catch (error: any) {
    console.error('[MKL AUTH ERROR] Failed to login to MKL Agro:', error.message);
    throw error;
  }
}

/**
 * GET /backend/weather-stations/debug-token — Get current active MKL token (for debug/testing)
 */
apiRouter.get('/weather-stations/debug-token', authenticateToken, async (req: any, res: any) => {
  res.json({ token: activeMklToken });
});

/**
 * POST /backend/weather-stations/debug-reset-token — Sets token to an invalid signature to test auto-healing (401 retry)
 */
apiRouter.post('/weather-stations/debug-reset-token', authenticateToken, async (req: any, res: any) => {
  activeMklToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayloadmock.invalidsignature";
  console.log('[MKL DEBUG] Token forcefully set to invalid mock token to test 401 recovery');
  
  // Also invalidate local caches so the next click/fetch forces a fresh network call to MKL!
  cachedDevices = null;
  cachedDevicesTimestamp = 0;
  Object.keys(sensorDataCache).forEach(key => delete sensorDataCache[key]);
  
  res.json({ success: true, token: activeMklToken, message: 'Token set to invalid mock to force 401 auto-healing' });
});

/**
 * GET /backend/weather-stations/devices — Fetch all available weather stations/devices
 */
apiRouter.get('/weather-stations/devices', authenticateToken, async (req: any, res: any) => {
  console.log('[DEBUG] GET /backend/weather-stations/devices');
  try {
    // Return from cache if still fresh
    if (cachedDevices && (Date.now() - cachedDevicesTimestamp < DEVICES_CACHE_TTL)) {
      console.log('[CACHE HIT] Returning cached weather devices list');
      return res.json(cachedDevices);
    }

    let token = await getMklToken();
    const apiUrl = 'https://panel.mklagro.com/api/device';
    
    let mklResponse = await fetch(apiUrl, {
      headers: {
        'token': token
      }
    });

    // Auto-Healing: retry once with fresh login token if 401 Unauthorized occurs
    if (mklResponse.status === 401) {
      console.warn('[MKL API] Token returned 401 Unauthorized. Forcing token rotation and retry...');
      token = await getMklToken(true); // force session login
      mklResponse = await fetch(apiUrl, {
        headers: {
          'token': token
        }
      });
    }

    if (!mklResponse.ok) {
      console.error('[ERROR] MKL API returned status:', mklResponse.status);
      const status = mklResponse.status === 401 ? 502 : mklResponse.status;
      return res.status(status).json({ error: 'Failed to fetch devices from MKL API' });
    }

    const mklData = await mklResponse.json();
    
    // Save to cache
    cachedDevices = mklData;
    cachedDevicesTimestamp = Date.now();
    console.log('[CACHE MISS] Fetched and cached weather devices list');
    
    res.json(mklData);
  } catch (error: any) {
    console.error('[ERROR] GET /backend/weather-stations/devices:', error.message);
    res.status(500).json({ error: 'Failed to fetch weather devices' });
  }
});

/**
 * GET /backend/weather-stations — Fetch sensor data from MKL Agro API
 */
apiRouter.get('/weather-stations', authenticateToken, async (req: any, res: any) => {
  console.log('[DEBUG] GET /backend/weather-stations');
  try {
    const dId = req.query.dId || "MKL33E83E0DEABF8CE83E";

    // Return from cache if still fresh
    const cachedItem = sensorDataCache[dId];
    if (cachedItem && (Date.now() - cachedItem.timestamp < SENSOR_CACHE_TTL)) {
      console.log(`[CACHE HIT] Returning cached sensor data for dId: ${dId}`);
      return res.json(cachedItem.data);
    }

    let token = await getMklToken();
    const apiUrl = `https://panel.mklagro.com/api/data?dId=${dId}&variable=estaciontodas`;

    let mklResponse = await fetch(apiUrl, {
      headers: {
        'token': token
      }
    });

    // Auto-Healing: retry once with fresh login token if 401 Unauthorized occurs
    if (mklResponse.status === 401) {
      console.warn('[MKL API] Token returned 401 Unauthorized. Forcing token rotation and retry...');
      token = await getMklToken(true); // force session login
      mklResponse = await fetch(apiUrl, {
        headers: {
          'token': token
        }
      });
    }

    if (!mklResponse.ok) {
      console.error('[ERROR] MKL API returned status:', mklResponse.status);
      const status = mklResponse.status === 401 ? 502 : mklResponse.status;
      return res.status(status).json({ error: 'Failed to fetch from MKL API' });
    }

    const mklData = await mklResponse.json();
    
    let finalData = mklData;
    // MKL API returns historical data. We extract the latest record for the frontend.
    if (mklData && mklData.data && Array.isArray(mklData.data) && mklData.data.length > 0) {
      const latestData = mklData.data[mklData.data.length - 1];
      finalData = {
        status: mklData.status,
        data: [latestData]
      };
    }

    // Save to cache
    sensorDataCache[dId] = {
      data: finalData,
      timestamp: Date.now()
    };
    console.log(`[CACHE MISS] Fetched and cached sensor data for dId: ${dId}`);

    res.json(finalData);
  } catch (error: any) {
    console.error('[ERROR] GET /backend/weather-stations:', error.message);
    res.status(500).json({ error: 'Failed to fetch weather stations' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});

export default app;
