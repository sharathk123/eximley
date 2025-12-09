
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const PDF_PATH = './test-data/HS_Code_Mappin.pdf';

async function run() {
    if (!fs.existsSync(PDF_PATH)) {
        console.error("PDF not found");
        return;
    }

    const dataBuffer = fs.readFileSync(PDF_PATH);
    const data = await pdf(dataBuffer);

    console.log("--- START PDF TEXT ---");
    console.log(data.text.substring(0, 2000));
    console.log("--- END PDF TEXT ---");
}

run();
