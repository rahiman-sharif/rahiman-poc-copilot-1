/**
 * Number to Words Converter
 * Converts numbers to Indian English words format
 */

const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
];

const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertHundreds(num) {
    let result = '';
    
    if (num >= 100) {
        result += ones[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
    }
    
    if (num >= 20) {
        result += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
    }
    
    if (num > 0) {
        result += ones[num] + ' ';
    }
    
    return result;
}

function convertToWords(num) {
    if (num === 0) return 'Zero';
    
    let result = '';
    
    // Crores
    if (num >= 10000000) {
        result += convertHundreds(Math.floor(num / 10000000)) + 'Crore ';
        num %= 10000000;
    }
    
    // Lakhs
    if (num >= 100000) {
        result += convertHundreds(Math.floor(num / 100000)) + 'Lakh ';
        num %= 100000;
    }
    
    // Thousands
    if (num >= 1000) {
        result += convertHundreds(Math.floor(num / 1000)) + 'Thousand ';
        num %= 1000;
    }
    
    // Hundreds, tens, and ones
    if (num > 0) {
        result += convertHundreds(num);
    }
    
    return result.trim();
}

function convertAmountToWords(amount) {
    if (isNaN(amount) || amount < 0) {
        return 'Invalid Amount';
    }
    
    // Split into rupees and paise
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);
    
    let result = 'Indian Rupees ';
    
    if (rupees === 0) {
        result += 'Zero';
    } else {
        result += convertToWords(rupees);
    }
    
    if (paise > 0) {
        result += ' and ' + convertToWords(paise) + ' paise';
    }
    
    result += ' Only';
    
    return result;
}

module.exports = {
    convertToWords,
    convertAmountToWords
};
