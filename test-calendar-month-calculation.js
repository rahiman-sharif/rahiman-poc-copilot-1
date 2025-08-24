// Test script to demonstrate calendar month vs 30-day calculation
// Date: August 24, 2025

function testDateCalculations() {
    console.log('=== License Date Calculation Test ===\n');
    
    const startDate = new Date('2025-08-24'); // August 24, 2025
    console.log('Start Date:', startDate.toLocaleDateString('en-GB')); // 24/08/2025
    
    // Method 1: Calendar Month (Correct way - what our system now does)
    const calendarMonthLater = new Date(startDate);
    calendarMonthLater.setMonth(startDate.getMonth() + 1);
    console.log('1 Calendar Month Later:', calendarMonthLater.toLocaleDateString('en-GB')); // 24/09/2025
    
    // Method 2: 30-day period (Incorrect way - what old systems do)
    const thirtyDaysLater = new Date(startDate);
    thirtyDaysLater.setDate(startDate.getDate() + 30);
    console.log('30 Days Later:', thirtyDaysLater.toLocaleDateString('en-GB')); // 23/09/2025
    
    // Show the difference
    console.log('\n=== Key Differences ===');
    console.log('Calendar Month approach: 24/08/2025 → 24/09/2025');
    console.log('30-day approach: 24/08/2025 → 23/09/2025');
    console.log('Difference: 1 day');
    
    // Test with different months to show varying differences
    console.log('\n=== Testing Different Months ===');
    
    const testDates = [
        { month: 'January', date: '2025-01-31' },   // 31 days
        { month: 'February', date: '2025-02-28' },  // 28 days (not leap year)
        { month: 'March', date: '2025-03-31' },     // 31 days
        { month: 'April', date: '2025-04-30' },     // 30 days
        { month: 'February (Leap)', date: '2024-02-29' }, // 29 days (leap year)
    ];
    
    testDates.forEach(test => {
        const start = new Date(test.date);
        
        const calendar = new Date(start);
        calendar.setMonth(start.getMonth() + 1);
        
        const thirty = new Date(start);
        thirty.setDate(start.getDate() + 30);
        
        const daysDiff = Math.abs((calendar - thirty) / (1000 * 60 * 60 * 24));
        
        console.log(`${test.month}: ${start.toLocaleDateString('en-GB')} → Calendar: ${calendar.toLocaleDateString('en-GB')}, 30-days: ${thirty.toLocaleDateString('en-GB')} (Diff: ${daysDiff} days)`);
    });
    
    // Test edge cases
    console.log('\n=== Edge Cases ===');
    
    // January 31st + 1 month = February 28th (not March 3rd)
    const jan31 = new Date('2025-01-31');
    const feb28 = new Date(jan31);
    feb28.setMonth(jan31.getMonth() + 1);
    console.log(`Jan 31 + 1 month: ${jan31.toLocaleDateString('en-GB')} → ${feb28.toLocaleDateString('en-GB')}`);
    
    // Leap year test
    const feb29 = new Date('2024-02-29'); // Leap year
    const mar29 = new Date(feb29);
    mar29.setMonth(feb29.getMonth() + 1);
    console.log(`Feb 29 (leap) + 1 month: ${feb29.toLocaleDateString('en-GB')} → ${mar29.toLocaleDateString('en-GB')}`);
}

testDateCalculations();
