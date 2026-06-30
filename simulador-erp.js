// Simulador enviando as Notas Fiscais REAIS extraídas dos XMLs
const notasFiscais = [
    {
      chave: "42260673702771000102550030000935551977820373",
      numero: "NF-93555",
      destinatario: "SEARA ALIMENTOS LTDA - FILIAL 287",
      transportadora: "ALFA TRANSPORTES LTDA",
      produtos: [
        { codigo: "1588", descricao: "EUROFOAM AFE-1520 - BBNA 50", qtdEsperada: 50, lote: "EURO26-17635754TEC" }
      ]
    },
    {
      chave: "42260673702771000102550030000935511204488709",
      numero: "NF-93551",
      destinatario: "FRIGORIFICO FRANGO FACIO LTDA",
      transportadora: "ALFA TRANSPORTES LTDA",
      produtos: [
        { codigo: "68", descricao: "EUROTIOX L - BBNA 50", qtdEsperada: 50, lote: "EURO26-14035228TEC" },
        { codigo: "2208", descricao: "EUROFOAM AFE-1510 - BBNA 20", qtdEsperada: 40, lote: "EURO26-17635753TEC" }
      ]
    },
    {
      chave: "42260673702771000102550030000935571047346973",
      numero: "NF-93557",
      destinatario: "COOPERATIVA CENTRAL AURORA ALIMENTOS - FILIAL 9",
      transportadora: "ALFA TRANSPORTES LTDA",
      produtos: [
        { codigo: "1659", descricao: "EUROTIOX ATC 65L - BBNA 50", qtdEsperada: 400, lote: "EURO26-14935333TEC-A" }
      ]
    },
    {
      chave: "42260673702771000102550030000935581601864511",
      numero: "NF-93558",
      destinatario: "SEARA ALIMENTOS LTDA - FILIAL 134",
      transportadora: "ALFA TRANSPORTES LTDA",
      produtos: [
        { codigo: "142", descricao: "STOP ACID RM - BBNA 50", qtdEsperada: 200, lote: "EURO25-06928834TEC / EURO26-17035641TEC" }
      ]
    }
  ];
  
  async function enviarNotas() {
    for (const nota of notasFiscais) {
      try {
        const resposta = await fetch('http://localhost:3001/api/webhook/erp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nota)
        });
        
        const dados = await resposta.json();
        if (resposta.ok) {
          console.log(`✅ ${nota.numero} integrada: ${dados.mensagem}`);
        } else {
          console.log(`⚠️ Erro na ${nota.numero}: ${dados.erro}`);
        }
      } catch (erro) {
        console.error(`❌ Falha de conexão ao enviar ${nota.numero}`);
      }
    }
    console.log("🚀 Integração em lote finalizada!");
  }
  
  enviarNotas();