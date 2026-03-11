import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabase: any = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
} else {
  console.warn("Supabase credentials missing in server.ts. Some features may be limited.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  
  // Identificar série pela turma
  app.post("/api/identify-serie", (req, res) => {
    const { turma } = req.body;
    if (!turma || !turma.includes('.')) {
      return res.status(400).json({ error: "Turma inválida. Use o formato XX.XX" });
    }
    
    const prefix = turma.substring(0, 2);
    let serie = 0;
    
    if (prefix === "13") serie = 1;
    else if (prefix === "23") serie = 2;
    else if (prefix === "33") serie = 3;
    
    if (serie === 0) {
      return res.status(400).json({ error: "Série não identificada para esta turma." });
    }
    
    res.json({ serie });
  });

  // Upload e Processamento de PDF
  app.post("/api/admin/upload-pdf", async (req, res) => {
    try {
      const { fileData, fileName } = req.body;
      if (!fileData) return res.status(400).json({ error: "Nenhum dado de arquivo enviado." });

      const buffer = Buffer.from(fileData, 'base64');
      const data = await pdf(buffer);
      
      // Lógica de extração simplificada (depende do formato do PDF)
      // Aqui assumimos que o PDF contém linhas estruturadas
      const lines = data.text.split('\n').filter(l => l.trim().length > 0);
      
      const extractedIfas = [];
      
      // Exemplo de parser (ajustar conforme o PDF real)
      // Espera-se: Nome IFA, Turma, Projeto 1, Prof 1, Projeto 2, Prof 2
      // Como o formato pode variar, vamos usar uma lógica de busca por padrões
      
      // TODO: Implementar parser robusto baseado nos anexos fornecidos
      // Por enquanto, vamos simular a extração de um bloco
      
      // Exemplo de lógica de extração (mock para demonstração)
      // Em produção, isso seria um loop complexo analisando as linhas
      
      res.json({ 
        message: "PDF processado com sucesso", 
        text: data.text,
        info: data.info 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erro ao processar PDF" });
    }
  });

  // Salvar IFAs extraídos
  app.post("/api/admin/save-ifas", async (req, res) => {
    const { ifas } = req.body;
    const { data, error } = await supabase.from('ifas').insert(ifas);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
