import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { tabelaNotasFiscais, tabelaHistorico } from './bancoMock';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

io.on('connection', (socket) => {
  console.log('Operador conectado:', socket.id);
});

// Busca a Nota Fiscal
app.get('/api/nfe/:chave', (req, res) => {
  const { chave } = req.params;
  const nota = tabelaNotasFiscais[chave];

  if (!nota) return res.status(404).json({ erro: 'Nota não encontrada.' });

  if (nota.status === 'AGUARDANDO') nota.status = 'EM_CONFERENCIA';
  res.json(nota);
});

// Bipa o produto
app.post('/api/conferencia/bipar', (req, res) => {
  const { chave, produtoId } = req.body;
  const nota = tabelaNotasFiscais[chave];

  if (!nota) return res.status(404).json({ erro: 'Nota não encontrada.' });

  const produto = nota.produtos.find(p => p.id === produtoId);
  if (!produto) return res.status(404).json({ erro: 'Produto inválido.' });

  if (produto.qtdConferida >= produto.qtdEsperada) {
    return res.status(400).json({ erro: 'Quantidade máxima atingida.' });
  }

  produto.qtdConferida += 1;

  const totalEsperado = nota.produtos.reduce((acc, p) => acc + p.qtdEsperada, 0);
  const totalConferido = nota.produtos.reduce((acc, p) => acc + p.qtdConferida, 0);
  
  if (totalEsperado === totalConferido) nota.status = 'CONFERIDO';

  res.json({ sucesso: true, produto, statusNota: nota.status });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Back-end rodando na porta ${PORT}`);
});