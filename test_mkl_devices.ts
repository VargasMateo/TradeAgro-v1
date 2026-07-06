import { getMklToken } from './server.ts';

async function test() {
  const token = await getMklToken();
  const res = await fetch('https://panel.mklagro.com/api/device', { headers: { token } });
  const json = await res.json();
  console.log(JSON.stringify(json.data.slice(0, 3), null, 2));
}
test();
