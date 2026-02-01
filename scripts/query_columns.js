const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  database: process.env.DB_NAME || 'microclimat',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

(async () => {
  const res = await pool.query(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_name IN ('uploaded_files', 'testing_periods')
     ORDER BY table_name, ordinal_position`
  );
  console.log(res.rows);
  await pool.end();
})().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});


