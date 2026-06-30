import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import PDFDocument from 'pdfkit';
import { Pool } from '@neondatabase/serverless'; 
import fs from 'fs';
import path from 'path';
import axios from 'express'; // Certifique-se de usar o axios importado corretamente
import axiosStatic from 'axios';

// --- CONFIGURAÇÃO AUTOMÁTICA DO COFRE NFE ---
const COFRENFE_API_KEY = "ck_3f58df75c98e5ab540a0f3bcb728c777c4f111e48299cc4564efdf98488be2ae";
const VINCULO_ID = "E73702771000102"; // O seu CNPJ mapeado com o prefixo 'E'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

async function inicializarBanco() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notas_fiscais (
        chave VARCHAR(255) PRIMARY KEY,
        numero VARCHAR(50),
        destinatario VARCHAR(255),
        transportadora VARCHAR(255),
        status VARCHAR(50) DEFAULT 'AGUARDANDO'
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50),
        descricao VARCHAR(255),
        qtd_esperada INTEGER,
        qtd_conferida INTEGER DEFAULT 0,
        lote VARCHAR(50),
        nota_chave VARCHAR(255) REFERENCES notas_fiscais(chave)
      );
    `);

    console.log('✅ Base de dados conectada e sincronizada na Nuvem!');
  } catch (erro) {
    console.error('❌ Erro ao inicializar a base de dados:', erro);
  }
}
inicializarBanco();

// ROTA 1: BUSCA AUTOMÁTICA CONECTADA DIRETAMENTE À API DO COFRENFE VIA API KEY
app.get('/api/nfe/:chave', async (req, res) => {
  try {
    const { chave } = req.params;
    
    // 1. Procura primeiro na nossa base de dados local
    let notaResult = await pool.query('SELECT * FROM notas_fiscais WHERE chave = $1', [chave]);
    
    // 2. Se não encontrar, faz a consulta automática na API do CofreNFe
    if (notaResult.rows.length === 0 && chave.length === 44) {
      console.log(`🔍 A consultar chave ${chave} automaticamente na API do CofreNFe...`);
      
      try {
        const respostaCofre = await axiosStatic.get(`https://painel.cofrenfe.com.br/api/v1/nfe/${chave}`, {
          headers: { 
            'Authorization': `Api-Key ${COFRENFE_API_KEY}`,
            'X-Vinculo-ID': VINCULO_ID,
            'Content-Type': 'application/json'
          }
        });

        const dadosNfe = respostaCofre.data;

        if (dadosNfe && dadosNfe.numero) {
          const numeroNota = `NF-${parseInt(dadosNfe.numero, 10)}`;
          const clienteDest = dadosNfe.destinatario?.nome?.toUpperCase() || "CLIENTE EXTERNO";
          const transpNome = dadosNfe.transportadora?.nome?.toUpperCase() || "RETIRA / CLIENTE";
          
          await pool.query(`
            INSERT INTO notas_fiscais (chave, numero, destinatario, transportadora, status)
            VALUES ($1, $2, $3, $4, 'EM_CONFERENCIA')
          `, [chave, numeroNota, clienteDest, transpNome]);

          if (dadosNfe.itens && dadosNfe.itens.length > 0) {
            for (const item of dadosNfe.itens) {
              const codigoProd = item.codigo || "";
              const descricaoProd = item.descricao?.toUpperCase() || "";
              const qtdProd = Math.ceil(parseFloat(item.quantidade)) || 1;
              const loteProd = item.lote?.toUpperCase() || "";

              await pool.query(`
                INSERT INTO produtos (codigo, descricao, qtd_esperada, qtd_conferida, lote, nota_chave)
                VALUES ($1, $2, $3, 0, $4, $5)
              `, [codigoProd, descricaoProd, qtdProd, loteProd, chave]);
            }
          }

          // Atualiza o resultado local após a inserção bem-sucedida
          notaResult = await pool.query('SELECT * FROM notas_fiscais WHERE chave = $1', [chave]);
        }
      } catch (err) {
        console.error("⚠️ Nota não encontrada ou erro no barramento do CofreNFe:", err.message);
      }
    }

    if (notaResult.rows.length === 0) {
      return res.status(404).json({ erro: 'Nota não encontrada na base de dados nem na API do Cofre.' });
    }
    
    const nota = notaResult.rows[0];
    const produtosResult = await pool.query('SELECT * FROM produtos WHERE nota_chave = $1', [chave]);
    
    res.json({
      chave: nota.chave,
      numero: nota.numero,
      destinatario: nota.destinatario,
      transportadora: nota.transportadora,
      status: nota.status,
      produtos: produtosResult.rows.map(p => ({
        id: p.id.toString(),
        codigo: p.codigo,
        descricao: p.descricao,
        qtdEsperada: p.qtd_esperada,
        qtdConferida: p.qtd_conferida,
        lote: p.lote
      }))
    });
  } catch (erro) {
    res.status(500).json({ erro: 'Erro interno de servidor' });
  }
});

// ROTA 5: IMPRESSÃO DE ETIQUETA INDIVIDUAL DE PRODUTO REFINADA
app.get('/api/etiqueta/produto/:produtoId', async (req, res) => {
  try {
    const { produtoId } = req.params;
    const qtdDesejada = req.query.qtd ? String(req.query.qtd) : null;

    const prodResult = await pool.query('SELECT * FROM produtos WHERE id = $1', [produtoId]);
    if (prodResult.rows.length === 0) return res.status(404).json({ erro: 'Produto não encontrado.' });
    const produto = prodResult.rows[0];

    const notaResult = await pool.query('SELECT * FROM notas_fiscais WHERE chave = $1', [produto.nota_chave]);
    const nota = notaResult.rows[0];

    const quantidadeEtiqueta = qtdDesejada ? parseInt(qtdDesejada) : produto.qtd_esperada;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=Etiqueta_Prod_${produto.codigo}.pdf`);

    const doc = new PDFDocument({ size: [283.5, 141.7], margin: 0 });
    doc.pipe(res);
    
    const logoPath = path.join(process.cwd(), 'server', 'logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 10, 4, { width: 65 });
      doc.fillColor('#15803d').font('Helvetica-Bold').fontSize(11).text('EXPEDIÇÃO', 90, 8);
      doc.fillColor('#64748b').font('Helvetica').fontSize(7).text('Controle de Carga', 90, 21);
    }

    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(17).text(`${nota.numero}`, 180, 8, { align: 'right', width: 93 });
    doc.moveTo(10, 42).lineTo(273.5, 42).lineWidth(1).strokeColor('#e2e8f0').stroke(); 

    doc.font('Helvetica-Bold').fontSize(7).fillColor('#64748b').text('DESTINATÁRIO:', 10, 44);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text(nota.destinatario, 10, 52, { width: 263, height: 20, ellipsis: true });

    doc.font('Helvetica-Bold').fontSize(7).fillColor('#64748b').text('TRANSPORTADORA:', 10, 72);
    doc.font('Helvetica').fontSize(9).fillColor('#0f172a').text(nota.transportadora, 10, 80, { width: 263, ellipsis: true });

    doc.moveTo(10, 94).lineTo(273.5, 94).lineWidth(1).strokeColor('#e2e8f0').stroke(); 

    doc.font('Helvetica-Bold').fontSize(7).fillColor('#64748b').text('PRODUTO / ITEM EXCLUSIVO:', 10, 99);
    const textoProduto = `[${produto.codigo}] ${produto.descricao}`;
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a').text(textoProduto, 10, 108, { width: 185, height: 10, ellipsis: true });
    
    const loteTexto = produto.lote ? `LOTE: ${produto.lote}` : 'LOTE: N/A';
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#15803d').text(loteTexto, 10, 122);

    doc.font('Helvetica-Bold').fontSize(7).fillColor('#64748b').text('QTD/VOLS:', 210, 99, { width: 63, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#000000').text(`${quantidadeEtiqueta}`, 210, 110, { width: 63, align: 'center' });

    doc.end();
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao gerar etiqueta PDF' });
  }
});

// ROTA 6: CONTINGÊNCIA - SALVAMENTO MANUAL OU POR UPLOAD DE XML NA TELA
app.post('/api/nfe/salvar-manual', async (req, res) => {
  try {
    const { chave, numero, destinatario, transportadora, produtos } = req.body;
    await pool.query(`
      INSERT INTO notas_fiscais (chave, numero, destinatario, transportadora, status)
      VALUES ($1, $2, $3, $4, 'EM_CONFERENCIA')
      ON CONFLICT (chave) DO UPDATE SET numero = $2, destinatario = $3, transportadora = $4
    `, [chave, numero, destinatario, transportadora]);

    const produtosInseridos = [];
    for (const prod of produtos) {
      const pResult = await pool.query(`
        INSERT INTO produtos (codigo, descricao, qtd_esperada, qtd_conferida, lote, nota_chave)
        VALUES ($1, $2, $3, 0, $4, $5)
        RETURNING id, codigo, descricao, qtd_esperada as "qtdEsperada", qtd_conferida as "qtdConferida", lote
      `, [prod.codigo, prod.descricao, parseInt(prod.qtdEsperada), prod.lote, chave]);
      
      produtosInseridos.push({ ...pResult.rows[0], id: pResult.rows[0].id.toString() });
    }
    res.status(201).json({ sucesso: true, produtos: produtosInseridos });
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao guardar nota' });
  }
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Back-end operacional na porta ${PORT}`);
});