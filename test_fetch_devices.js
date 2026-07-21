async function test() {
  const res = await fetch('http://localhost:3000/backend/weather-stations/devices');
  const json = await res.json();
  console.log(JSON.stringify(json.data.slice(0,2), null, 2));
}
test();
