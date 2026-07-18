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
  -- Enable RLS on leads (if not already)
  ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing policies on leads to reset
  DROP POLICY IF EXISTS "Deny all for leads" ON public.leads;
  
  -- Create policy for leads: no access for anon or authenticated (only service_role can access)
  -- Since service_role bypasses RLS, we can just create a policy that returns false, 
  -- or we simply don't create any policy and the default is DENY ALL. 
  -- But to be explicit, we can create one for authenticated users that returns false, or just rely on default.
  -- Let's just rely on default DENY ALL since we don't have any policies.

  -- Enable RLS on profiles (if not already)
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing policies on profiles
  DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

  -- Create policies for profiles
  CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

  CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);
`;

async function run() {
  try {
    await client.connect();
    console.log('Connected to Postgres for RLS!');
    await client.query(sql);
    console.log('RLS policies successfully applied.');
  } catch (err) {
    console.error('Error applying RLS:', err);
  } finally {
    await client.end();
  }
}

run();
