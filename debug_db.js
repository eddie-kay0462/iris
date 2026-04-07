require('dotenv').config({ path: '/Users/kirkkudoto/Downloads/School/Ashesi Year Four/Semester Two/Entrepreneurship II/Building Iris/iris/apps/backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('revenue_targets').select('*');
  console.log('DATA:', JSON.stringify(data, null, 2));
  console.log('ERROR:', error);
}

run();
