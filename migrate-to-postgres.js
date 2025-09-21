const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration
const sqliteIndexDBPath = path.join(__dirname, 'database.db');
const sqliteReturnsDBPath = path.join(__dirname, 'final.db');
const pgConnectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/index_comparison';

// PostgreSQL connection
const pool = new Pool({
  connectionString: pgConnectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Open SQLite databases
const indexDB = new sqlite3.Database(sqliteIndexDBPath, sqlite3.OPEN_READONLY);
const returnsDB = new sqlite3.Database(sqliteReturnsDBPath, sqlite3.OPEN_READONLY);

async function createPostgresTables() {
  const client = await pool.connect();
  try {
    // Create tables with the same structure as SQLite
    await client.query(`
      CREATE TABLE IF NOT EXISTS sheet1 (
        date TEXT,
        PRIMARY KEY (date)
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS returns (
        "From" TEXT,
        PRIMARY KEY ("From")
      );
    `);
    
    console.log('PostgreSQL tables created successfully');
  } catch (err) {
    console.error('Error creating PostgreSQL tables:', err);
  } finally {
    client.release();
  }
}

async function migrateIndexData() {
  return new Promise((resolve, reject) => {
    // Get column info from SQLite
    indexDB.all("PRAGMA table_info(Sheet1)", async (err, columns) => {
      if (err) {
        reject(err);
        return;
      }
      
      const client = await pool.connect();
      try {
        // Add columns to PostgreSQL table
        for (const col of columns) {
          if (col.name !== 'Date') { // Date column already exists
            try {
              await client.query(`
                ALTER TABLE sheet1 ADD COLUMN IF NOT EXISTS "${col.name}" TEXT;
              `);
            } catch (err) {
              console.error(`Error adding column ${col.name}:`, err);
            }
          }
        }
        
        // Get data from SQLite
        indexDB.all("SELECT * FROM Sheet1", async (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          
          console.log(`Migrating ${rows.length} rows from index database...`);
          
          // Insert data into PostgreSQL
          for (const row of rows) {
            const columnNames = Object.keys(row);
            const placeholders = columnNames.map((_, i) => `$${i + 1}`).join(', ');
            const values = columnNames.map(col => row[col]);
            
            try {
              await client.query(`
                INSERT INTO sheet1 (${columnNames.map(col => `"${col}"`).join(', ')})
                VALUES (${placeholders})
                ON CONFLICT (date) DO UPDATE SET
                ${columnNames.filter(col => col !== 'Date').map((col, i) => `"${col}" = $${i + 2}`).join(', ')}
              `, values);
            } catch (err) {
              console.error(`Error inserting row with date ${row.Date}:`, err);
            }
          }
          
          console.log('Index data migration completed');
          resolve();
        });
      } catch (err) {
        reject(err);
      } finally {
        client.release();
      }
    });
  });
}

async function migrateReturnsData() {
  return new Promise((resolve, reject) => {
    // Get column info from SQLite
    returnsDB.all("PRAGMA table_info(returns)", async (err, columns) => {
      if (err) {
        reject(err);
        return;
      }
      
      const client = await pool.connect();
      try {
        // Add columns to PostgreSQL table
        for (const col of columns) {
          if (col.name !== 'From') { // From column already exists
            try {
              await client.query(`
                ALTER TABLE returns ADD COLUMN IF NOT EXISTS "${col.name}" TEXT;
              `);
            } catch (err) {
              console.error(`Error adding column ${col.name}:`, err);
            }
          }
        }
        
        // Get data from SQLite
        returnsDB.all("SELECT * FROM returns", async (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          
          console.log(`Migrating ${rows.length} rows from returns database...`);
          
          // Insert data into PostgreSQL
          for (const row of rows) {
            const columnNames = Object.keys(row);
            const placeholders = columnNames.map((_, i) => `$${i + 1}`).join(', ');
            const values = columnNames.map(col => row[col]);
            
            try {
              await client.query(`
                INSERT INTO returns (${columnNames.map(col => `"${col}"`).join(', ')})
                VALUES (${placeholders})
                ON CONFLICT ("From") DO UPDATE SET
                ${columnNames.filter(col => col !== 'From').map((col, i) => `"${col}" = $${i + 2}`).join(', ')}
              `, values);
            } catch (err) {
              console.error(`Error inserting row with From ${row.From}:`, err);
            }
          }
          
          console.log('Returns data migration completed');
          resolve();
        });
      } catch (err) {
        reject(err);
      } finally {
        client.release();
      }
    });
  });
}

async function migrate() {
  try {
    console.log('Starting migration from SQLite to PostgreSQL...');
    
    // Create tables
    await createPostgresTables();
    
    // Migrate data
    await migrateIndexData();
    await migrateReturnsData();
    
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    // Close connections
    indexDB.close();
    returnsDB.close();
    await pool.end();
  }
}

// Run migration
migrate();