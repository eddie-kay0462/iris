const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env manually
const envPath = '/Users/kirkkudoto/Downloads/School/Ashesi Year Four/Semester Two/Entrepreneurship II/Building Iris/iris/apps/backend/.env';
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
};

const url = getEnv('SUPABASE_URL');
const key = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!url || !key) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkTargets() {
  console.log("Fetching revenue_targets from the database...");
  const { data, error } = await supabase.from('revenue_targets').select('*');
  
  if (error) {
    console.error("Error fetching targets:", error);
    return;
  }
  
  console.log("\n--- REVENUE TARGETS IN DATABASE ---");
  if (data.length === 0) {
    console.log("Table is empty. No targets have been saved yet.");
  } else {
    console.table(data);
  }
  console.log("-----------------------------------\n");
}

checkTargets();
