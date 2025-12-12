/**
 * Converts a number to words (Indian/International format)
 * For simplicity, we'll implement a basic International (USD) converter.
 * If INR is detected, we can add Lakh/Crore logic later or use a library.
 * 
 * For now, this supports millions/billions which handles standard USD cases.
 */

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const TEENS = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const SCALES = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

function convertChunk(num: number): string {
    let str = '';

    // Hundreds
    if (num >= 100) {
        str += ONES[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
    }

    // Tens and Ones
    if (num >= 20) {
        str += TENS[Math.floor(num / 10)] + ' ';
        num %= 10;
    }

    if (num >= 10) {
        str += TEENS[num - 10] + ' ';
        num = 0;
    }

    if (num > 0) {
        str += ONES[num] + ' ';
    }

    return str;
}

export function numberToWords(amount: number, currency: string = 'USD'): string {
    if (amount === 0) return 'Zero ' + currency;

    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);

    let i = 0;
    let words = '';
    let num = integerPart;

    if (num === 0) words = 'Zero ';

    while (num > 0) {
        const chunk = num % 1000;
        if (chunk !== 0) {
            const chunkStr = convertChunk(chunk);
            words = chunkStr + SCALES[i] + ' ' + words;
        }
        num = Math.floor(num / 1000);
        i++;
    }

    // Currency Suffix
    let currencyName = currency;
    let coinName = 'Cents';

    if (currency === 'INR') {
        currencyName = 'Rupees';
        coinName = 'Paise';
        // Note: Logic above is International (Millions). 
        // For INR specific (Lakhs/Crores), we would need different chunking (100, 10, 10...).
        // Keeping it simple international for now as Eximley is likely USD dominant for exports.
    }

    let result = words.trim() + ' ' + currencyName;

    if (decimalPart > 0) {
        result += ' and ' + convertChunk(decimalPart).trim() + ' ' + coinName;
    }

    return result + ' Only';
}
