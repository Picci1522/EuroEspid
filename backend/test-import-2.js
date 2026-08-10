const fs = require('fs');
const xml = fs.readFileSync(__dirname + '/test-nfe-2.xml', 'utf8');

fetch('http://localhost:3000/nfe/xml', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ xml }),
})
  .then(async (r) => ({ status: r.status, body: await r.json() }))
  .then((res) => console.log(JSON.stringify(res, null, 2)))
  .catch((err) => console.error('Erro:', err));