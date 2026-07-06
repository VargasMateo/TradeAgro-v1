const fetch = require('node-fetch'); // wait, we can just use native fetch in node 18+

async function run() {
  const loginRes = await fetch('http://localhost:3001/backend/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mateo.vargas@tradeagro.com.ar', password: 'Tradeagro2026!' })
  });
  if (!loginRes.ok) {
    console.error('Login failed', loginRes.status, await loginRes.text());
    return;
  }
  const loginData = await loginRes.json();
  const token = loginData.token;
  
  const devRes = await fetch('http://localhost:3001/backend/weather-stations/devices', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Devices status:', devRes.status);
  console.log('Devices:', JSON.stringify(await devRes.json(), null, 2));
}

run();
