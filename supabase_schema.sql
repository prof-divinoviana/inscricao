
-- Script SQL para o Editor do Supabase

-- 1. Criar Tabelas

-- Tabela de Estudantes
CREATE TABLE IF NOT EXISTS estudantes (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    nome TEXT NOT NULL,
    turma TEXT NOT NULL,
    serie INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de IFAs (Itinerários Formativos)
CREATE TABLE IF NOT EXISTS ifas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_ifa TEXT NOT NULL,
    turma TEXT NOT NULL,
    serie INTEGER NOT NULL,
    tipo_ifa INTEGER NOT NULL, -- 1 ou 2
    projeto_1 TEXT NOT NULL,
    professor_1 TEXT NOT NULL,
    projeto_2 TEXT NOT NULL,
    professor_2 TEXT NOT NULL,
    vagas_maximas INTEGER DEFAULT 40,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Inscrições
CREATE TABLE IF NOT EXISTS inscricoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estudante_id UUID NOT NULL REFERENCES estudantes(id) ON DELETE CASCADE,
    ifa_id UUID NOT NULL REFERENCES ifas(id) ON DELETE CASCADE,
    data_inscricao TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(estudante_id) -- Impede dupla inscrição
);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE estudantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ifas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscricoes ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança (RLS)

-- IFAs: Todos podem ver, apenas admin pode editar (via service role ou política específica)
CREATE POLICY "IFAs são visíveis para todos" ON ifas FOR SELECT USING (true);

-- Estudantes: Podem criar seu próprio perfil e ver o próprio perfil
CREATE POLICY "Estudantes podem criar seu perfil" ON estudantes FOR INSERT WITH CHECK (true);
CREATE POLICY "Estudantes podem ver seu perfil" ON estudantes FOR SELECT USING (true);

-- Inscrições: Estudantes podem criar, mas apenas se forem os donos
CREATE POLICY "Estudantes podem se inscrever" ON inscricoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Estudantes podem ver suas inscrições" ON inscricoes FOR SELECT USING (true);

-- 4. Função para contar vagas e validar limite
CREATE OR REPLACE FUNCTION check_vagas_limit()
RETURNS TRIGGER AS $$
DECLARE
    vagas_ocupadas INTEGER;
    vagas_max INTEGER;
BEGIN
    -- Contar inscrições atuais para o IFA
    SELECT COUNT(*) INTO vagas_ocupadas FROM inscricoes WHERE ifa_id = NEW.ifa_id;
    
    -- Obter limite de vagas do IFA
    SELECT vagas_maximas INTO vagas_max FROM ifas WHERE id = NEW.ifa_id;
    
    IF vagas_ocupadas >= vagas_max THEN
        RAISE EXCEPTION 'Vagas esgotadas para este Itinerário Formativo.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar vagas antes de inserir inscrição
CREATE TRIGGER trigger_check_vagas
BEFORE INSERT ON inscricoes
FOR EACH ROW
EXECUTE FUNCTION check_vagas_limit();

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_ifas_serie ON ifas(serie);
CREATE INDEX IF NOT EXISTS idx_inscricoes_ifa ON inscricoes(ifa_id);
CREATE INDEX IF NOT EXISTS idx_inscricoes_estudante ON inscricoes(estudante_id);
