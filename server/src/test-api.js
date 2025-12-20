require('dotenv').config();
const PORT = process.env.PORT || 3000;
async function testAPI() {
    const BASE_URL = `http://localhost:${PORT}/api`;
    console.log('Testing API at:', BASE_URL);

    try {
        // 1. Create a Site
        console.log('Creating site...');
        const siteRes = await fetch(`${BASE_URL}/sites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                siteName: 'API Test Site',
                siteNumber: 999,
                capacity: 1000
            })
        });

        if (!siteRes.ok) {
            const errorText = await siteRes.text();
            throw new Error(`Failed to create site: ${siteRes.status} ${siteRes.statusText} - ${errorText}`);
        }
        const site = await siteRes.json();
        console.log('Site created:', site);

        // 2. Add Daily Generation
        console.log('Adding daily generation...');
        const genRes = await fetch(`${BASE_URL}/daily-generation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                site: site._id,
                date: '2023-12-25',
                dailyGeneration: 100
            })
        });
        if (!genRes.ok) {
            throw new Error(`Failed to add generation: ${genRes.statusText}`);
        }
        const gen = await genRes.json();
        console.log('Generation added:', gen);

        // 3. Test Validation (Invalid Site)
        console.log('Testing validation with invalid data...');
        const invalidRes = await fetch(`${BASE_URL}/sites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                siteName: '', // Invalid (empty)
                siteNumber: 'NaN', // Invalid (string instead of number)
                capacity: -100 // Invalid (negative)
            })
        });

        if (invalidRes.status === 400) {
            console.log('Validation Test: PASSED (Got 400 Bad Request)');
            const errBody = await invalidRes.json();
            console.log('Error Body:', JSON.stringify(errBody, null, 2));
        } else {
            throw new Error(`Validation Test FAILED: Expected 400, got ${invalidRes.status}`);
        }

        // 4. Test Dashboard Aggregation
        console.log('Testing Dashboard Aggregation...');

        // Seed Data for Dashboard
        // Target: 100/month
        const startYear = 2023;
        await fetch(`${BASE_URL}/build-generation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                site: site._id,
                year: startYear,
                jan: 100, feb: 100, mar: 100, apr: 100, may: 100, jun: 100,
                jul: 100, aug: 100, sep: 100, oct: 100, nov: 100, dec: 100
            })
        });

        // Actuals: Apr=85 (Good), May=95 (Excellent), Jun=70 (Poor)
        await fetch(`${BASE_URL}/daily-generation`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ site: site._id, date: '2023-04-15', dailyGeneration: 85 })
        });
        await fetch(`${BASE_URL}/daily-generation`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ site: site._id, date: '2023-05-15', dailyGeneration: 95 })
        });
        await fetch(`${BASE_URL}/daily-generation`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ site: site._id, date: '2023-06-15', dailyGeneration: 70 })
        });

        // Query Dashboard
        const dashRes = await fetch(`${BASE_URL}/dashboard?siteId=${site._id}&year=${startYear}`);
        if (!dashRes.ok) {
            throw new Error(`Dashboard Request Failed: ${dashRes.status}`);
        }
        const dashData = await dashRes.json();
        console.log('Dashboard Data:', JSON.stringify(dashData.data.filter(d => d.actual > 0), null, 2));

        // Verify Logic
        const apr = dashData.data.find(d => d.month === 'APR');
        const may = dashData.data.find(d => d.month === 'MAY');
        const jun = dashData.data.find(d => d.month === 'JUN');

        if (apr.pr !== 85 || apr.status !== 'Good') throw new Error('Apr Logic Failed');
        if (may.pr !== 95 || may.status !== 'Excellent') throw new Error('May Logic Failed');
        if (jun.pr !== 70 || jun.status !== 'Poor') throw new Error('Jun Logic Failed');

        console.log('Dashboard Logic Verified: Excellent/Good/Poor calculations are correct.');

        // Cleanup
        await fetch(`${BASE_URL}/sites/${site._id}`, { method: 'DELETE' });
        console.log('Cleanup done.');

    } catch (err) {
        const fs = require('fs');
        fs.writeFileSync('api-error.log', err.stack || err.toString());
        console.error('API Verification failed:', err);
        process.exit(1);
    }
}

testAPI();
