import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import PDFDocument from 'pdfkit';
import { tabelaNotasFiscais } from './bancoMock';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

io.on('connection', (socket) => {
  console.log('Operador conectado:', socket.id);
});

// ROTA 1: Busca a Nota Fiscal
app.get('/api/nfe/:chave', (req, res) => {
  const { chave } = req.params;
  const nota = tabelaNotasFiscais[chave];

  if (!nota) return res.status(404).json({ erro: 'Nota não encontrada.' });

  if (nota.status === 'AGUARDANDO') nota.status = 'EM_CONFERENCIA';
  res.json(nota);
});

// ROTA 2: Bipa o produto
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

// ROTA 3: Gerar Relatório Diário e Fazer o Download
app.get('/api/relatorios/pdf', (req, res) => {
  // Isso força o navegador a fazer o DOWNLOAD do arquivo
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=Relatorio_Expedicao.pdf');

  const doc = new PDFDocument({ size: 'A4', margin: 30 });
  doc.pipe(res);

  // Paleta de Cores
  const corPrimaria = '#1e3a8a';
  const corTexto = '#0f172a';
  const corMutado = '#64748b';
  const corLinha = '#e2e8f0';
  const corFundoHead = '#0f172a';

  // --- CABEÇALHO ---
  doc.fillColor(corPrimaria).fontSize(18).text('EUROESPID LOGÍSTICA', { bold: true });
  doc.fillColor(corMutado).fontSize(10).text('Relatório Consolidado de Expedição Industrial');
  
  const dataAtual = new Date().toLocaleString('pt-BR');
  doc.fontSize(9).text(`Emissão: ${dataAtual}`, 380, 30, { align: 'right' });
  doc.text('Período: Diário', 380, 42, { align: 'right' });
  
  doc.moveTo(30, 60).lineTo(565, 60).lineWidth(1.5).strokeColor(corPrimaria).stroke();

  // --- KPIs (CARDS) ---
  let expedidas = 0;
  let pendentes = 0;
  let totalVolumes = 0;
  
  Object.values(tabelaNotasFiscais).forEach((nota) => {
    if (nota.status === 'CONFERIDO' || nota.status === 'EXPEDIDO') expedidas++;
    else pendentes++;
    nota.produtos.forEach(p => totalVolumes += p.qtdConferida);
  });
  const totalNotas = expedidas + pendentes;

  doc.y = 80;
  
  // Card 1
  doc.rect(30, 80, 125, 45).lineWidth(1).strokeColor(corLinha).stroke();
  doc.fillColor('#3b82f6').rect(30, 80, 4, 45).fill();
  doc.fillColor(corPrimaria).fontSize(14).text(totalNotas.toString(), 45, 90, { bold: true });
  doc.fillColor(corMutado).fontSize(7).text('NOTAS IMPORTADAS', 45, 108);

  // Card 2
  doc.rect(165, 80, 125, 45).lineWidth(1).strokeColor(corLinha).stroke();
  doc.fillColor('#10b981').rect(165, 80, 4, 45).fill();
  doc.fillColor(corPrimaria).fontSize(14).text(expedidas.toString(), 180, 90, { bold: true });
  doc.fillColor(corMutado).fontSize(7).text('NOTAS EXPEDIDAS', 180, 108);

  // Card 3
  doc.rect(300, 80, 125, 45).lineWidth(1).strokeColor(corLinha).stroke();
  doc.fillColor('#f59e0b').rect(300, 80, 4, 45).fill();
  doc.fillColor(corPrimaria).fontSize(14).text(pendentes.toString(), 315, 90, { bold: true });
  doc.fillColor(corMutado).fontSize(7).text('EM CONFERÊNCIA', 315, 108);

  // Card 4
  doc.rect(435, 80, 130, 45).lineWidth(1).strokeColor(corLinha).stroke();
  doc.fillColor('#ef4444').rect(435, 80, 4, 45).fill();
  doc.fillColor(corPrimaria).fontSize(14).text(totalVolumes.toString(), 450, 90, { bold: true });
  doc.fillColor(corMutado).fontSize(7).text('VOLUMES TOTAIS', 450, 108);

  // --- TABELA 1: NOTAS FISCAIS ---
  doc.y = 150;
  doc.fillColor(corPrimaria).fontSize(11).text('1. RESUMO DAS NOTAS FISCAIS PROCESSADAS', 30, doc.y, { bold: true });
  doc.moveDown(1);

  let startY = doc.y;
  doc.fillColor(corFundoHead).rect(30, startY, 535, 20).fill();
  doc.fillColor('#ffffff').fontSize(8)
     .text('NÚMERO NF', 40, startY + 6, { bold: true })
     .text('DESTINATÁRIO', 110, startY + 6, { bold: true })
     .text('TRANSPORTADORA', 280, startY + 6, { bold: true })
     .text('VOLUMES', 420, startY + 6, { bold: true })
     .text('STATUS', 480, startY + 6, { bold: true });
  
  doc.y = startY + 25;
  Object.values(tabelaNotasFiscais).forEach((nota) => {
     let vols = 0;
     nota.produtos.forEach(p => vols += p.qtdEsperada);
     
     doc.fillColor(corTexto).fontSize(8)
        .text(nota.numero, 40, doc.y)
        .text(nota.destinatario, 110, doc.y, { width: 160, ellipsis: true })
        .text(nota.transportadora, 280, doc.y, { width: 130, ellipsis: true })
        .text(vols.toString(), 420, doc.y);
        
     // Cor baseada no status
     const isConf = nota.status === 'CONFERIDO';
     doc.fillColor(isConf ? '#15803d' : '#a16207')
        .text(nota.status, 480, doc.y, { bold: true });
        
     doc.y += 15;
     doc.moveTo(30, doc.y - 5).lineTo(565, doc.y - 5).lineWidth(0.5).strokeColor(corLinha).stroke();
  });

  // --- TABELA 2: PRODUTOS ---
  doc.moveDown(2);
  doc.fillColor(corPrimaria).fontSize(11).text('2. DETALHAMENTO DE ITENS', 30, doc.y, { bold: true });
  doc.moveDown(1);

  startY = doc.y;
  doc.fillColor(corFundoHead).rect(30, startY, 535, 20).fill();
  doc.fillColor('#ffffff').fontSize(8)
     .text('CÓD. PRODUTO', 40, startY + 6, { bold: true })
     .text('DESCRIÇÃO DO ITEM', 130, startY + 6, { bold: true })
     .text('LOTE', 340, startY + 6, { bold: true })
     .text('QTD ESP.', 420, startY + 6, { bold: true })
     .text('QTD CONF.', 480, startY + 6, { bold: true });

  doc.y = startY + 25;
  Object.values(tabelaNotasFiscais).forEach((nota) => {
     nota.produtos.forEach((prod) => {
        doc.fillColor(corTexto).fontSize(8)
           .text(prod.codigo, 40, doc.y)
           .text(prod.descricao, 130, doc.y, { width: 200, ellipsis: true })
           .text(prod.lote || 'N/A', 340, doc.y)
           .text(prod.qtdEsperada.toString(), 420, doc.y);
           
        const ok = prod.qtdConferida === prod.qtdEsperada;
        doc.fillColor(ok ? '#15803d' : '#a16207')
           .text(prod.qtdConferida.toString(), 480, doc.y, { bold: true });
           
        doc.y += 15;
        doc.moveTo(30, doc.y - 5).lineTo(565, doc.y - 5).lineWidth(0.5).strokeColor(corLinha).stroke();
     });
  });

  // --- ASSINATURAS ---
  doc.y = 730; // Fixa no final da página
  doc.moveTo(60, doc.y).lineTo(250, doc.y).lineWidth(1).strokeColor(corMutado).stroke();
  doc.moveTo(340, doc.y).lineTo(530, doc.y).lineWidth(1).strokeColor(corMutado).stroke();
  
  doc.fillColor(corTexto).fontSize(9)
     .text('Operador / Conferente Sênior', 60, doc.y + 5, { width: 190, align: 'center', bold: true })
     .text('Supervisor de Logística e Expedição', 340, doc.y + 5, { width: 190, align: 'center', bold: true });

  doc.end();
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Back-end rodando na porta ${PORT}`);
});