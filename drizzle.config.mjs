import dotenv from "dotenv";
dotenv.config();

export default {
  schema: './config/db/schema.js',
  out: './config/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'false' ? false : {
      rejectUnauthorized: false,
    },
  },
};