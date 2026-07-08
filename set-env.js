const fs = require('fs');
const path = require('path');

const envDir = path.join(__dirname, 'src', 'environments');
const prodEnvPath = path.join(envDir, 'environment.prod.ts');
const devEnvPath = path.join(envDir, 'environment.ts');

const supabaseUrl = process.env.SUPABASE_URL || 'https://jhobkthhgqezemseroeh.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impob2JrdGhoZ3FlemVtc2Vyb2VoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MTE5OTcsImV4cCI6MjA5OTA4Nzk5N30.2p-jAPtVA39BOaZD--uuJYW7u9qV5dyVDvDRVP4u3VU';

const prodEnvConfig = `export const environment = {
  production: true,
  supabaseUrl: '${supabaseUrl}',
  supabaseAnonKey: '${supabaseAnonKey}'
};
`;

const devEnvConfig = `export const environment = {
  production: false,
  supabaseUrl: '${supabaseUrl}',
  supabaseAnonKey: '${supabaseAnonKey}'
};
`;

if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
}

fs.writeFileSync(prodEnvPath, prodEnvConfig);
fs.writeFileSync(devEnvPath, devEnvConfig);
console.log('Environment files generated successfully.');
