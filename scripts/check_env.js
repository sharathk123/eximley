require('dotenv').config({ path: '.env.local' });

if (process.env.DATABASE_URL) {
    console.log('DATABASE_URL is present.');
} else {
    console.log('DATABASE_URL is MISSING. Available keys:', Object.keys(process.env).filter(k => !k.startsWith('npm_')));
}
