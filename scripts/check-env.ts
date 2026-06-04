import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const VARS = [
  {
    name: 'SUPABASE_URL',
    required: true,
    description: 'Supabase project URL (used by Next.js frontend + scripts)',
    example: 'https://xxxx.supabase.co',
  },
  {
    name: 'SUPABASE_ANON_KEY',
    required: true,
    description: 'Anon/public key — frontend read access (RLS enforced)',
    example: 'eyJ...',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Service role key — scripts only, bypasses RLS for writes',
    example: 'eyJ...',
  },
];

let allOk = true;

console.log('\nApp Price Radar — Environment Check');
console.log('=====================================');
console.log('Source: .env.local\n');

for (const v of VARS) {
  const value = process.env[v.name];
  const set = !!value;
  const status = set ? '✓ SET  ' : '✗ MISSING';
  const color = set ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';

  console.log(`${color}${status}${reset}  ${v.name}`);
  console.log(`         ${v.description}`);
  if (!set) {
    console.log(`         Example: ${v.example}`);
    if (v.required) allOk = false;
  }
  console.log('');
}

if (allOk) {
  console.log('\x1b[32m✓ All required environment variables are set.\x1b[0m\n');
} else {
  console.log('\x1b[31m✗ Some required variables are missing.\x1b[0m');
  console.log('  Copy .env.example to .env.local and fill in the values.\n');
  process.exit(1);
}
