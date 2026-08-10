// Uso: node test-pallet.js <nfeId>
const nfeId = process.argv[2];
if (!nfeId) {
  console.error('Passe o id da NF-e: node test-pallet.js <nfeId>');
  process.exit(1);
}

fetch(`http://localhost:3000/pallets/montar/${nfeId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ estrategia: 'FEFO', capacidadePorPallet: 40 }),
})
  .then(async (r) => ({ status: r.status, body: await r.json() }))
  .then((res) => console.log(JSON.stringify(res, null, 2)))
  .catch((err) => console.error('Erro:', err));