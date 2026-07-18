const { Client } = require('pg');

const client = new Client({
  host: 'db.mhdzfkihqfrbcgrwjdps.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'zenthHk20032003#', // without the brackets you sent
  ssl: { rejectUnauthorized: false }
});

const sql = `
create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  name         text not null,
  email        text not null,
  business     text,
  requirements text,
  plan         text check (plan in ('starter', 'premium', null)),
  status       text not null default 'new' check (status in ('new', 'contacted', 'closed'))
);
`;

async function run() {
  try {
    await client.connect();
    console.log('Connected to Supabase Postgres!');
    
    await client.query(sql);
    console.log('Table "leads" created successfully!');
    
    await client.query('alter table public.leads enable row level security;');
    console.log('RLS enabled on "leads" table.');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
