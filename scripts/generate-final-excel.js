const fs = require('fs');
const path = require('path');
const PDFParser = require("pdf2json");
const XLSX = require('xlsx');

// PATHS
const FILE1_PATH = path.join(__dirname, '../test-data/HS_Code_Mappin.pdf');
const FILE2_PATH = path.join(__dirname, '../test-data/hscodewiselistwithgstrates.pdf');
const OUTPUT_PATH = path.join(__dirname, '../test-data/ready_to_upload.xlsx');

const noCleanText = (str) => str ? str.trim() : "";

// --- PARSING LOGIC (Mirroring verified logic) ---

async function parseFile1() {
    console.log(`\n📄 Parsing File 1...`);
    const parser = new PDFParser(null, 1);
    return new Promise((resolve, reject) => {
        parser.on("pdfParser_dataError", err => reject(err.parserError));
        parser.on("pdfParser_dataReady", () => {
            const rawText = parser.getRawTextContent();
            let text = "";
            try { text = decodeURIComponent(rawText); } catch (e) { text = rawText; }
            const lines = text.split('\n');
            const records = new Map();
            let currentChapter = "";

            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.includes('ITC-HS Codes') || trimmed.includes('Description')) return;
                const codeMatch = trimmed.match(/(\d{6,8})/);
                if (codeMatch) {
                    const itcCode = codeMatch[1];
                    const codeIndex = trimmed.indexOf(itcCode);
                    const beforeCode = trimmed.substring(0, codeIndex).trim();
                    const afterCode = trimmed.substring(codeIndex + itcCode.length).trim();
                    if (beforeCode && beforeCode.length > 3 && !/^\d+$/.test(beforeCode)) currentChapter = beforeCode;

                    records.set(itcCode, {
                        itc_hs_code: itcCode,
                        chapter: currentChapter,
                        description: noCleanText(afterCode) || "No Desc"
                    });
                }
            });
            console.log(`   ✓ File 1: ${records.size} records`);
            resolve(records);
        });
        parser.loadPDF(FILE1_PATH);
    });
}

async function parseFile2() {
    console.log(`\n📄 Parsing File 2...`);
    const parser = new PDFParser(null, 1);
    return new Promise((resolve, reject) => {
        parser.on("pdfParser_dataError", err => reject(err.parserError));
        parser.on("pdfParser_dataReady", () => {
            const rawText = parser.getRawTextContent();
            let text = "";
            try { text = decodeURIComponent(rawText); } catch (e) { text = rawText; }
            const lines = text.split('\n');
            const records = new Map(); // Specifics
            const rules = new Map();   // Rules (4-digit)

            let pendingRule = { code: null, desc: '', rate: 0 };

            const savePendingRule = () => {
                if (pendingRule.code) {
                    // Extract rate from rule desc if possible?
                    // Typically rules in PDF have rate at the end line too.
                    rules.set(pendingRule.code, {
                        code: pendingRule.code,
                        rate: pendingRule.rate || 0,
                        desc: pendingRule.desc.trim()
                    });
                    pendingRule = { code: null, desc: '', rate: 0 };
                }
            };

            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed) return;
                // GARBAGE FILTERS
                if (/^[\d,\s]{10,}$/.test(trimmed)) return;
                if (/^\d+,\s+\d{4}/.test(trimmed)) return;
                if (/(\d{4}\s\d{2}|\d{4})[\s,]+(\d{4}\s\d{2}|\d{4})/.test(trimmed)) return;

                // 1. Specific Code (New Item)
                const specificMatch = trimmed.match(/^(\d{6,8})/);
                if (specificMatch) {
                    savePendingRule();
                    const code = specificMatch[1];
                    const rateMatch = trimmed.match(/(18|12|28|5)\s?%/);
                    if (rateMatch) {
                        const rate = parseFloat(rateMatch[1]);
                        const desc = trimmed.replace(code, "").replace(rateMatch[0], "").replace(/^\s*\d+\s+/, "").trim();
                        records.set(code, {
                            code: code,
                            rate: rate,
                            description: noCleanText(desc)
                        });
                    }
                    return;
                }

                // 2. Header Code (New Rule)
                if (/^\d{4}$/.test(trimmed)) {
                    savePendingRule();
                    pendingRule.code = trimmed;
                    return;
                }

                // 3. Accumulate Rule Desc
                if (pendingRule.code) {
                    const rateMatch = trimmed.match(/(18|12|28|5)\s?%/);
                    if (rateMatch) pendingRule.rate = parseFloat(rateMatch[1]);
                    pendingRule.desc += " " + trimmed;
                }
            });
            savePendingRule();

            console.log(`   ✓ File 2: ${records.size} specifics, ${rules.size} rules`);
            resolve({ specifics: records, rules: rules });
        });
        parser.loadPDF(FILE2_PATH);
    });
}

// --- MAIN GENERATION ---

async function generate() {
    try {
        const file1Map = await parseFile1();
        const { specifics, rules } = await parseFile2();

        console.log(`\n🔄 Merging & Cleaning...`);
        const finalRows = [];
        const allCodes = new Set([...file1Map.keys(), ...specifics.keys()]);

        for (const code of allCodes) {
            const r1 = file1Map.get(code); // ITC
            const r2 = specifics.get(code); // GST

            // 1. Base Record
            let final = {
                // FILE 1 COLUMNS
                "ITC HS Code": code,
                "ITC Description": r1 ? r1.description : "",
                "ITC Chapter": r1 ? r1.chapter : "",

                // FILE 2 COLUMNS
                "GST HSN Code": r2 ? r2.code : "",
                "GST Original Description": r2 ? r2.description : "",
                "GST Original Rate": r2 ? r2.rate : "",

                // COMPUTED / MERGED COLUMNS
                "GST Rule Header": "", // The "Trunks" text if applicable
                "Final Rate": 0,
                "Final Description": "",
                "Source": ""
            };

            // LOGIC
            let computedRate = 0;
            let computedDesc = "";
            let ruleHeaderDesc = "";
            let source = "";

            // A. Rate Logic
            if (r2) {
                computedRate = r2.rate;
                source = "GST Specific";
            } else {
                const prefix = code.substring(0, 4);
                if (rules.has(prefix)) {
                    computedRate = rules.get(prefix).rate;
                    source = "GST Rule Fallback";
                }
            }

            // B. Description Logic (Propagation)
            const prefix = code.substring(0, 4);
            if (rules.has(prefix)) {
                const rule = rules.get(prefix);
                ruleHeaderDesc = noCleanText(rule.desc); // "Trunks..."

                // Start with specific desc if exists, else use ITC desc as base? 
                // Usually we want the GST description if available.
                let baseDesc = r2 ? r2.description : "";

                if (!baseDesc) {
                    // If no specific GST desc, we use the Rule Header
                    computedDesc = ruleHeaderDesc;
                } else {
                    // If specific exists, check for redundancy
                    if (!baseDesc.toLowerCase().includes(ruleHeaderDesc.toLowerCase().substring(0, 20))) {
                        computedDesc = `${ruleHeaderDesc} - ${baseDesc}`;
                    } else {
                        computedDesc = baseDesc;
                    }
                }
            } else {
                // No rule found? Use whatever specific we have
                computedDesc = r2 ? r2.description : (r1 ? r1.description : "");
            }

            // Populate Final
            final["Final Rate"] = computedRate;
            final["Final Description"] = computedDesc;
            final["GST Rule Header"] = ruleHeaderDesc;
            final["Source"] = source;
            if (!final["Source"] && r1) final["Source"] = "ITC Only";

            finalRows.push(final);
        }

        console.log(`   ✓ Prepared ${finalRows.length} merged records.`);

        // Write to Excel
        console.log(`\n💾 Saving to Excel...`);
        const ws = XLSX.utils.json_to_sheet(finalRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "HSN Data Verified");

        XLSX.writeFile(wb, OUTPUT_PATH);
        console.log(`✅ SUCCESS: Created ${OUTPUT_PATH}`);

    } catch (e) {
        console.error("Error:", e);
    }
}

generate();
