const fs = require('fs');
const path = require('path');
const PDFParser = require("pdf2json");

// PATHS
const FILE1_PATH = path.join(__dirname, '../test-data/HS_Code_Mappin.pdf');
const FILE2_PATH = path.join(__dirname, '../test-data/hscodewiselistwithgstrates.pdf');
const ARTIFACT_DIR = path.join(__dirname, '../test-data');

const noCleanText = (str) => str ? str.trim() : "";

async function parseFile1() {
    console.log(`\n📄 Parsing File 1: ${path.basename(FILE1_PATH)} (Simulation)`);
    const parser = new PDFParser(null, 1);

    return new Promise((resolve, reject) => {
        parser.on("pdfParser_dataError", errData => reject(errData.parserError));
        parser.on("pdfParser_dataReady", pdfData => {
            const rawText = parser.getRawTextContent();
            let text = "";
            try { text = decodeURIComponent(rawText); } catch (e) { text = rawText; }

            const lines = text.split('\n');
            const records = new Map();
            let currentChapter = "";

            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.includes('ITC-HS Codes') || trimmed.includes('Description')) return;

                const codeMatch = trimmed.match(/(\d{6,8})/); // Correct Regex
                if (codeMatch) {
                    const itcCode = codeMatch[1];
                    const codeIndex = trimmed.indexOf(itcCode);
                    const beforeCode = trimmed.substring(0, codeIndex).trim();
                    const afterCode = trimmed.substring(codeIndex + itcCode.length).trim();

                    if (beforeCode && beforeCode.length > 3 && !/^\d+$/.test(beforeCode)) {
                        currentChapter = beforeCode;
                    }

                    records.set(itcCode, {
                        code: itcCode,
                        description: afterCode || "No Desc",
                        chapter: currentChapter,
                        source: 'File1'
                    });
                }
            });
            console.log(`   - Extracted Records: ${records.size} `);
            resolve(records);
        });
        parser.loadPDF(FILE1_PATH);
    });
}

async function parseFile2() {
    console.log(`\n📄 Parsing File 2: ${path.basename(FILE2_PATH)} (Simulation)`);
    const parser = new PDFParser(null, 1);

    return new Promise((resolve, reject) => {
        parser.on("pdfParser_dataError", errData => reject(errData.parserError));
        parser.on("pdfParser_dataReady", pdfData => {
            const rawText = parser.getRawTextContent();
            let text = "";
            try { text = decodeURIComponent(rawText); } catch (e) { text = rawText; }

            const lines = text.split('\n');

            // RAW DUMP (Simulation)
            const rawCSVContent = lines.map((l, i) => `${i + 1},"${l.replace(/"/g, '""')}"`).join('\n');
            const rawPath = path.join(ARTIFACT_DIR, `raw_file2_dump_script_${Date.now()}.csv`);
            fs.writeFileSync(rawPath, "line_number,content\n" + rawCSVContent);
            console.log(`   - Wrote Raw Dump to ${rawPath}`);

            const records = new Map();

            // State for Multi-line Header Rule
            let pendingRule = { code: null, desc: '', rate: 0 };

            const savePendingRule = () => {
                if (pendingRule.code) {
                    // Default rule rate to 18 if not found? Or null?
                    records.set(pendingRule.code, {
                        code: pendingRule.code,
                        rate: pendingRule.rate || 0, // 0 means "Unknown/Inherit"
                        description: pendingRule.desc.trim(),
                        source: 'File2_Rule_Header'
                    });
                    if (pendingRule.code === '4202') {
                        console.log("DEBUG: Saved Rule 4202:", pendingRule.desc.substring(0, 50) + "...");
                    }
                    pendingRule = { code: null, desc: '', rate: 0 };
                }
            };

            lines.forEach(line => {
                const trimmed = line.trim();
                if (!trimmed) return;

                // GARBAGE FILTER 
                if (/^[\d,\s]{10,}$/.test(trimmed)) return;

                // 1. Check for Specific Code (Start of new item) -> Ends pending rule
                const specificMatch = trimmed.match(/^(\d{6,8})/);
                if (specificMatch) {
                    savePendingRule(); // End previous header block

                    // Parse Specific Item Standard Logic...
                    const code = specificMatch[1];
                    const rateMatch = trimmed.match(/(18|12|28|5)\s?%/);
                    if (rateMatch) {
                        const rate = parseFloat(rateMatch[1]);
                        const desc = trimmed.replace(code, "").replace(rateMatch[0], "").replace(/^\s*\d+\s+/, "").trim();
                        records.set(code, {
                            code: code,
                            rate: rate,
                            description: desc,
                            source: 'File2_Specific'
                        });
                    }
                    return; // Done with this line
                }

                // 2. Check for Standalone Header Code (Start of new Rule)
                // Exactly 4 digits? Or 4 digits with minimal noise?
                // "4202" or "4202 "
                if (/^\d{4}$/.test(trimmed)) {
                    savePendingRule(); // End previous
                    pendingRule.code = trimmed;
                    return;
                }

                // 3. Accumulate Description to Pending Rule
                if (pendingRule.code) {
                    // Check for rate in this line to assign to rule
                    const rateMatch = trimmed.match(/(18|12|28|5)\s?%/);
                    if (rateMatch) {
                        pendingRule.rate = parseFloat(rateMatch[1]);
                        // Clean rate from text? Maybe keep text as is for description
                    }
                    pendingRule.desc += " " + trimmed;
                }
            });
            savePendingRule(); // End last

            console.log(`   - Extracted Records(Specific + Rules): ${records.size} `);
            resolve(records);
        });
        parser.loadPDF(FILE2_PATH);
    });
}

async function diagnose() {
    try {
        console.log("🧪 HSN Pipeline Verification Simulation (ROBUST)");
        console.log("===============================================");

        const file1Map = await parseFile1();
        const file2Map = await parseFile2();

        // 1. Separate Specifics (6-8 digit) from Rules (4 digit)
        const gstSpecifics = new Map();
        const gstRules = new Map();

        for (const [code, rec] of file2Map) {
            if (code.length >= 6) gstSpecifics.set(code, rec);
            else if (code.length === 4) gstRules.set(code, rec);
        }
        console.log(`   - GST Specifics: ${gstSpecifics.size} `);
        console.log(`   - GST Rules(4 - digit): ${gstRules.size} `);
        console.log(`   - Keys: ${Array.from(gstRules.keys()).join(', ')} `);

        // MERGE LOGIC (Exact -> Prefix Fallback)
        const merged = new Map();
        let directMatches = 0;
        let ruleMatches = 0;

        // Load Base (File 1)
        for (const [code, rec] of file1Map) {
            merged.set(code, { ...rec, gst_rate: null, gst_hsn_code_description: null });
        }

        // Apply Merges
        for (const [itcCode, itcRec] of merged) {
            // STRATEGY 1: Exact Match in GST Specifics
            if (gstSpecifics.has(itcCode)) {
                const match = gstSpecifics.get(itcCode);
                itcRec.gst_rate = match.rate;
                itcRec.gst_hsn_code_description = match.description;
                directMatches++;
            }
            // STRATEGY 2: Prefix Match in GST Rules (Fallback)
            // ex: ITC 42023110 -> Try GST 4202
            else {
                const prefix4 = itcCode.substring(0, 4);
                if (gstRules.has(prefix4)) {
                    const rule = gstRules.get(prefix4);
                    // Only apply if it looks like a valid header match
                    itcRec.gst_rate = rule.rate;
                    itcRec.gst_hsn_code_description = rule.description; // Inherit Description from Header
                    ruleMatches++;
                }
            }
        }

        console.log("\n📊 TEST REPORT");
        console.log("-----------------------------------");
        console.log(`Merge Stats: Direct: ${directMatches}, Rule - Based: ${ruleMatches} `);

        // TEST 1: Parsing Volume
        const total = merged.size;
        console.log(`[TEST 1] Parsing Volume: ${total} records`);
        if (total > 2000) console.log("   ✅ PASS: Found > 2000 records");
        else console.log("   ❌ FAIL: Count too low");

        // TEST 2: Merging (Rates & Descriptions)
        const rateCount = Array.from(merged.values()).filter(r => r.gst_rate > 0).length;
        const descCount = Array.from(merged.values()).filter(r => r.gst_hsn_code_description && r.gst_hsn_code_description.length > 5).length;

        console.log(`[TEST 2] Enrichment Stats: `);
        console.log(`   - Records with Rates: ${rateCount} `);
        console.log(`   - Records with GST Desc: ${descCount} `);

        if (rateCount > 1000) console.log("   ✅ PASS: Massive enrichment (>1000) via Rules");
        else console.log(`   ❌ FAIL: Enrichment low(Rates: ${rateCount}) - Rules might not be applying`);

        // TEST 3: Specific Item (42023110 - The "Prefix Fallback" Case)
        // This likely doesn't exist in File 2 directly, but 4202 does.
        // We simulate finding it in File 1 (if it exists) or just check any 4202 child
        const t3Key = Array.from(merged.keys()).find(k => k.startsWith('4202') && k.length > 4);
        if (t3Key) {
            const t3 = merged.get(t3Key);
            console.log(`[TEST 3] Prefix Fallback(${t3Key}): `);
            console.log(`   - ITC Description: "${t3.description.substring(0, 30)}..."`);
            console.log(`   - GST Description: "${(t3.gst_hsn_code_description || "MISSING").substring(0, 30)}..."`);
            console.log(`   - Rate: ${t3.gst_rate}% `);

            if (t3.gst_rate > 0 && t3.gst_hsn_code_description && !t3.gst_hsn_code_description.includes("22, 4202")) {
                console.log("   ✅ PASS: Rate & Clean Desc present");
            } else {
                console.log("   ⚠️  WARN: Fail (Missing data or Garbage text)");
            }
        } else {
            console.log("   ℹ️  INFO: No 4202xxxx codes found in File 1 to test fallback.");
        }

        // ... existing test reporting ...

        // --- WRITE CSVs for User ---
        console.log(`\n💾 writing CSVs to ${ARTIFACT_DIR}...`);

        function writeCSV(name, headers, records) {
            const headerLine = headers.join(',') + '\n';
            const body = records.map(r => headers.map(h => {
                let val = r[h] || "";
                if (typeof val === 'string') val = val.replace(/"/g, '""');
                return `"${val}"`;
            }).join(',')).join('\n');
            fs.writeFileSync(path.join(ARTIFACT_DIR, name), headerLine + body);
            console.log(`   - Wrote ${name}`);
        }

        // 1. ITC Master
        const itcRows = Array.from(file1Map.values()).map(r => ({ ...r, itc_hs_code: r.code, itc_hs_code_description: r.description }));
        writeCSV('staging_itc_master.csv', ['itc_hs_code', 'chapter', 'itc_hs_code_description'], itcRows);

        // 2. GST Specifics
        const gstRows = Array.from(gstSpecifics.values()).map(r => ({ ...r, gst_hsn_code: r.code, gst_rate: r.rate, gst_hsn_code_description: r.description }));
        writeCSV('staging_gst_rates.csv', ['gst_hsn_code', 'gst_rate', 'commodity', 'gst_hsn_code_description'], gstRows);

        // 3. GST Rules
        const ruleRows = Array.from(gstRules.values()).map(r => ({ ...r, desc: r.description }));
        writeCSV('staging_gst_rules.csv', ['code', 'rate', 'desc'], ruleRows);

        console.log("✅ Done. Files created in test-data.");

    } catch (e) {
        console.error("Simulation Error:", e);
    }
}

diagnose();
