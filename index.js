require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
const { Storage } = require('@google-cloud/storage');

async function main() {
  const dbConfig = {
    user: process.env.NODE_ENV === 'production' ? process.env.PROD_DB_USER : process.env.DEV_DB_USER,
    password: process.env.NODE_ENV === 'production' ? process.env.PROD_DB_PASSWORD : process.env.DEV_DB_PASSWORD,
    database: process.env.NODE_ENV === 'production' ? process.env.PROD_DB_NAME : process.env.DEV_DB_NAME,
    host: process.env.NODE_ENV === 'production' ? undefined : process.env.DEV_DB_HOST,
    socketPath: process.env.NODE_ENV === 'production' ? process.env.PROD_DB_SOCKET : undefined,
  };

  const connection = await mysql.createConnection(dbConfig);
  const [rows] = await connection.execute('SELECT * FROM user');

  const fileName = `user_${new Date().toISOString().replace(/[-:]/g,'').replace(/\..+/, '')}.csv`;
  const csvWriter = createObjectCsvWriter({
    path: `/tmp/${fileName}`,
    header: Object.keys(rows[0] || {}).map(key => ({ id: key, title: key })),
  });
  await csvWriter.writeRecords(rows);

  const storage = new Storage();
  await storage.bucket(process.env.GCS_BUCKET).upload(`/tmp/${fileName}`, { destination: fileName });

  console.log(`Uploaded ${fileName} to bucket ${process.env.GCS_BUCKET}`);
  await connection.end();
}

main().catch(console.error);

