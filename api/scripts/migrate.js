const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { pool } = require('../db');

const migrationsDir = path.join(__dirname, '..', 'migrations');

function splitSqlStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function ensureMigrationTable() {
  await pool.query(`
    create table if not exists app_migrations (
      id int unsigned not null auto_increment,
      migration_name varchar(255) not null,
      applied_at datetime not null default current_timestamp,
      primary key (id),
      unique key uniq_app_migrations_name (migration_name)
    ) engine=InnoDB default charset=utf8mb4
  `);
}

async function getAppliedMigrations() {
  const [rows] = await pool.query('select migration_name from app_migrations');
  return new Set(rows.map((row) => row.migration_name));
}

async function runMigrations() {
  await ensureMigrationTable();
  const applied = await getAppliedMigrations();
  const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();
  const appliedNow = [];

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const statements = splitSqlStatements(sql);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      for (const statement of statements) {
        await connection.query(statement);
      }
      await connection.query('insert into app_migrations (migration_name) values (?)', [file]);
      await connection.commit();
      appliedNow.push(file);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  return appliedNow;
}

if (require.main === module) {
  runMigrations()
    .then(async (appliedNow) => {
      if (appliedNow.length === 0) {
        console.log('No pending migrations.');
      } else {
        console.log(`Applied migrations: ${appliedNow.join(', ')}`);
      }
      await pool.end();
    })
    .catch(async (error) => {
      console.error(error);
      await pool.end();
      process.exit(1);
    });
}

module.exports = { runMigrations };
