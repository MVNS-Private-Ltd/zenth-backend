const { Client } = require('pg');

const client = new Client({
  host: 'db.mhdzfkihqfrbcgrwjdps.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'zenthHk20032003#', 
  ssl: { rejectUnauthorized: false }
});

const sql = `
-- Add user_id to leads table if it doesn't exist
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create a profiles table for role-based features
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  full_name TEXT,
  company TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
`;

async function run() {
  try {
    await client.connect();
    console.log('Connected to Postgres!');
    await client.query(sql);
    console.log('Migration successful: Added user_id to leads, created profiles table.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
