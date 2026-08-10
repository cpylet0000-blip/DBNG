import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config(); // Make sure .env is loaded

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set or empty. Please configure it in your .env file.'
  );
}

// Create Prisma client (no need for datasourceUrl)
const prisma = new PrismaClient({
  //log: ['query', 'info', 'warn', 'error'], // optional logging
});

// Connect and check
await prisma
  .$connect()
  .then(() => console.log('Connected to the database successfully.'))
  .catch((err) => {
    console.error('Prisma failed to connect:', err);
    throw err;
  });
export default prisma;