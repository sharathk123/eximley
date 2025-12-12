const postgres = require('postgres');

async function testConnection(url) {
    try {
        const sql = postgres(url, { connect_timeout: 2 });
        const result = await sql`SELECT 1 as val`;
        console.log(`Success connecting to ${url}`);
        await sql.end();
        return true;
    } catch (e) {
        console.log(`Failed connecting to ${url}: ${e.message}`);
        return false;
    }
}

async function main() {
    // Try standard ports and passwords
    const urls = [
        'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
        'postgresql://postgres:postgres@127.0.0.1:5432/postgres',
        'postgresql://postgres:your-super-secret-and-long-postgres-password@127.0.0.1:54322/postgres'
    ];

    for (const url of urls) {
        if (await testConnection(url)) {
            console.log(`FOUND WORKING URL: ${url}`);
            process.exit(0);
        }
    }
    console.log('No working connection found.');
}

main();
