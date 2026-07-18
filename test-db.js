require('dotenv').config();
const supabase = require('./lib/supabase');

async function checkSupabase() {
  console.log('Testing connection to Supabase...');
  
  // Try to select a single row from the leads table
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Supabase Connection Error:');
    console.error(error.message);
    if (error.code === '42P01') {
      console.error('\nNOTE: The error "relation public.leads does not exist" means you have not created the "leads" table in your Supabase SQL editor yet.');
    }
  } else {
    console.log('✅ Supabase is working perfectly!');
    console.log('✅ The "leads" table exists.');
    console.log('Current rows in table:', data.length);
  }
}

checkSupabase();
