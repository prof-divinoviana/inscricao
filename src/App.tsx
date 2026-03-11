import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Link } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { 
  User, 
  School, 
  CheckCircle, 
  AlertCircle, 
  LogOut, 
  Upload, 
  Download, 
  Users, 
  BookOpen,
  ChevronRight,
  Loader2,
  Printer,
  FileText
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface IFA {
  id: string;
  nome_ifa: string;
  turma: string;
  serie: number;
  tipo_ifa: number;
  projeto_1: string;
  professor_1: string;
  projeto_2: string;
  professor_2: string;
  vagas_maximas: number;
  inscricoes_count?: number;
}

interface Estudante {
  id: string;
  nome: string;
  turma: string;
  serie: number;
}

// --- Components ---

const Navbar = () => (
  <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto flex justify-between items-center">
      <Link to="/" className="flex items-center gap-2 font-bold text-xl text-emerald-700">
        <School className="w-6 h-6" />
        <span>IFA Digital</span>
      </Link>
      <Link to="/admin" className="text-sm font-medium text-gray-500 hover:text-emerald-600 transition-colors">
        Painel Admin
      </Link>
    </div>
  </nav>
);

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) => (
  <div className={cn("bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden", className)} {...props}>
    {children}
  </div>
);

// --- Pages ---

const HomePage = () => {
  const [nome, setNome] = useState('');
  const [turma, setTurma] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!turma.includes('.')) {
      setError('Formato de turma inválido. Use o ponto (ex: 13.01)');
      setLoading(false);
      return;
    }

    try {
      // Validação básica de configuração
      if (!supabase) {
        throw new Error("Configuração do Supabase ausente. Verifique as variáveis de ambiente.");
      }
      
      const url = (supabase as any).supabaseUrl;
      if (url && (url.includes('vercel.app') || url.includes('run.app'))) {
        throw new Error("Erro de Configuração: A URL do Supabase parece estar apontando para o próprio app. Use a URL do projeto Supabase (ex: https://xyz.supabase.co).");
      }

      // Identificação da série localmente
      const prefix = turma.substring(0, 2);
      let serie = 0;
      
      if (prefix === "13") serie = 1;
      else if (prefix === "23") serie = 2;
      else if (prefix === "33") serie = 3;
      
      if (serie === 0) {
        throw new Error("Série não identificada para esta turma (Use 13, 23 ou 33).");
      }

      // Salvar dados temporários no sessionStorage
      sessionStorage.setItem('temp_student', JSON.stringify({ nome, turma, serie }));
      navigate('/selecao');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Inscrição Itinerários</h1>
          <p className="text-gray-500 mt-2">Informe seus dados para ver as opções disponíveis</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nome Completo</label>
            <input
              required
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="Digite seu nome"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Turma (Ex: 13.01)</label>
            <input
              required
              type="text"
              value={turma}
              onChange={(e) => setTurma(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="XX.XX"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continuar'}
            {!loading && <ChevronRight className="w-5 h-5" />}
          </button>
        </form>
      </Card>
    </div>
  );
};

const SelecaoPage = () => {
  const [student, setStudent] = useState<any>(null);
  const [ifas, setIfas] = useState<IFA[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const data = sessionStorage.getItem('temp_student');
    if (!data) {
      navigate('/');
      return;
    }
    const parsed = JSON.parse(data);
    setStudent(parsed);
    
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    fetchIfas(parsed.serie);
  }, [navigate]);

  const fetchIfas = async (serie: number) => {
    try {
      if (!supabase) return;
      
      const { data, error } = await supabase
        .from('ifas')
        .select('*, inscricoes(count)')
        .eq('serie', serie);

      if (error) throw error;
      
      const formattedData = data.map((item: any) => ({
        ...item,
        inscricoes_count: item.inscricoes[0]?.count || 0
      }));
      
      setIfas(formattedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInscricao = async (ifaId: string) => {
    if (!supabase) {
      alert("Configuração do banco de dados pendente. Contate o administrador.");
      return;
    }
    setSubmitting(ifaId);
    try {
      // 1. Verificar se o estudante já existe (Nome + Turma)
      let { data: existingStudent, error: findError } = await supabase
        .from('estudantes')
        .select('id')
        .eq('nome', student.nome)
        .eq('turma', student.turma)
        .maybeSingle();

      if (findError) throw findError;

      let studentId = existingStudent?.id;

      // 2. Se o estudante existe, verificar se já tem inscrição
      if (studentId) {
        const { data: existingInscricao, error: checkError } = await supabase
          .from('inscricoes')
          .select('id')
          .eq('estudante_id', studentId)
          .maybeSingle();

        if (checkError) throw checkError;
        if (existingInscricao) {
          throw new Error("Você já possui uma inscrição ativa neste sistema.");
        }
      } else {
        // 3. Se não existe, criar o estudante
        const { data: newStudent, error: createError } = await supabase
          .from('estudantes')
          .insert([{ 
            nome: student.nome, 
            turma: student.turma, 
            serie: student.serie 
          }])
          .select()
          .single();

        if (createError) throw createError;
        studentId = newStudent.id;
      }

      // 4. Criar a inscrição no IFA selecionado
      const { error: inscricaoError } = await supabase
        .from('inscricoes')
        .insert([{ 
          estudante_id: studentId, 
          ifa_id: ifaId 
        }]);

      if (inscricaoError) {
        // Se o erro for de limite de vagas ou algo do tipo
        if (inscricaoError.code === '23505') {
          throw new Error("Você já está inscrito neste itinerário.");
        }
        throw inscricaoError;
      }

      setSuccess(true);
      sessionStorage.removeItem('temp_student');
    } catch (err: any) {
      alert(err.message || "Erro ao realizar inscrição. Tente novamente.");
    } finally {
      setSubmitting(null);
    }
  };

  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md p-8 text-center border-amber-200 bg-amber-50">
          <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-amber-900">Configuração Necessária</h2>
          <p className="text-amber-700 mt-2">
            As chaves do Supabase não foram configuradas. Por favor, adicione 
            <code className="bg-amber-100 px-1 rounded mx-1">SUPABASE_URL</code> e 
            <code className="bg-amber-100 px-1 rounded mx-1">SUPABASE_ANON_KEY</code> 
            no painel de Secrets.
          </p>
        </Card>
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
    </div>
  );

  if (success) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Inscrição Confirmada!</h1>
        <p className="text-gray-500 mt-4">Sua escolha foi registrada com sucesso no sistema.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-8 w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all"
        >
          Voltar ao Início
        </button>
      </Card>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Olá, {student?.nome}</h1>
        <p className="text-gray-500 mt-1">Série identificada: {student?.serie}ª Série | Turma: {student?.turma}</p>
        <p className="text-emerald-600 font-medium mt-2">Escolha um dos Itinerários Formativos abaixo:</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ifas.map((ifa) => {
          const vagasRestantes = ifa.vagas_maximas - (ifa.inscricoes_count || 0);
          const esgotado = vagasRestantes <= 0;

          return (
            <Card key={ifa.id} className="flex flex-col h-full border-2 hover:border-emerald-500 transition-all group">
              <div className="p-6 flex-grow">
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
                    Turma {ifa.turma}
                  </span>
                  <span className={cn(
                    "text-sm font-bold",
                    esgotado ? "text-red-500" : "text-emerald-600"
                  )}>
                    {esgotado ? 'Vagas Esgotadas' : `${vagasRestantes} vagas restantes`}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-gray-900 mb-6 group-hover:text-emerald-700 transition-colors">
                  {ifa.nome_ifa}
                </h2>

                <div className="space-y-6">
                  <div className="relative pl-4 border-l-4 border-emerald-500">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Projeto Integrador 1</p>
                    <p className="font-bold text-gray-800 leading-tight">{ifa.projeto_1}</p>
                    <p className="text-sm text-gray-500 mt-1">Prof. {ifa.professor_1}</p>
                  </div>

                  <div className="relative pl-4 border-l-4 border-emerald-300">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Projeto Integrador 2</p>
                    <p className="font-bold text-gray-800 leading-tight">{ifa.projeto_2}</p>
                    <p className="text-sm text-gray-500 mt-1">Prof. {ifa.professor_2}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0">
                <button
                  disabled={esgotado || submitting !== null}
                  onClick={() => handleInscricao(ifa.id)}
                  className={cn(
                    "w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                    esgotado 
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                      : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100"
                  )}
                >
                  {submitting === ifa.id ? <Loader2 className="w-5 h-5 animate-spin" /> : esgotado ? 'ESGOTADO' : 'INSCREVER-SE'}
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

const AdminPage = () => {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ifas, setIfas] = useState<IFA[]>([]);
  const [inscritos, setInscritos] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ifas' | 'inscritos'>('ifas');
  const [selectedIfa, setSelectedIfa] = useState<string>('all');

  useEffect(() => {
    if (!supabase) return;
    
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Erro ao obter sessão:", error);
        return;
      }
      setUser(session?.user ?? null);
      if (session?.user) fetchData();
    }).catch(err => {
      console.error("Erro crítico na sessão:", err);
    });
  }, []);

  const fetchData = async () => {
    const { data: ifasData } = await supabase.from('ifas').select('*, inscricoes(count)');
    const { data: inscritosData } = await supabase.from('inscricoes').select('*, estudantes(*), ifas(*)');
    
    if (ifasData) {
      setIfas(ifasData.map((i: any) => ({ ...i, inscricoes_count: i.inscricoes[0]?.count || 0 })));
    }
    if (inscritosData) setInscritos(inscritosData);
  };

  const filteredInscritos = selectedIfa === 'all' 
    ? inscritos 
    : inscritos.filter(ins => ins.ifas?.id === selectedIfa);

  const getExportData = () => {
    return filteredInscritos.map(ins => ({
      Estudante: ins.estudantes?.nome,
      Turma: ins.estudantes?.turma,
      IFA: ins.ifas?.nome_ifa,
      Data: new Date(ins.data_inscricao).toLocaleDateString()
    }));
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const title = selectedIfa === 'all' ? 'Lista Geral de Inscritos' : `Inscritos - ${ifas.find(i => i.id === selectedIfa)?.nome_ifa}`;
    
    doc.text(title, 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Estudante', 'Turma Origem', 'IFA Escolhido', 'Data']],
      body: filteredInscritos.map(ins => [
        ins.estudantes?.nome,
        ins.estudantes?.turma,
        ins.ifas?.nome_ifa,
        new Date(ins.data_inscricao).toLocaleDateString()
      ]),
    });
    doc.save(`inscritos_${selectedIfa}.pdf`);
  };

  const exportToDoc = () => {
    const title = selectedIfa === 'all' ? 'Lista Geral de Inscritos' : `Inscritos - ${ifas.find(i => i.id === selectedIfa)?.nome_ifa}`;
    let html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${title}</title></head>
      <body>
        <h1>${title}</h1>
        <table border='1' style='border-collapse: collapse; width: 100%;'>
          <thead>
            <tr style='background-color: #f2f2f2;'>
              <th>Estudante</th>
              <th>Turma Origem</th>
              <th>IFA Escolhido</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            ${filteredInscritos.map(ins => `
              <tr>
                <td>${ins.estudantes?.nome}</td>
                <td>${ins.estudantes?.turma}</td>
                <td>${ins.ifas?.nome_ifa}</td>
                <td>${new Date(ins.data_inscricao).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inscritos_${selectedIfa}.doc`;
    link.click();
  };

  const handlePrint = () => {
    const title = selectedIfa === 'all' ? 'Lista Geral de Inscritos' : `Inscritos - ${ifas.find(i => i.id === selectedIfa)?.nome_ifa}`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f4f4f4; }
            h1 { color: #059669; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <table>
            <thead>
              <tr>
                <th>Estudante</th>
                <th>Turma Origem</th>
                <th>IFA Escolhido</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              ${filteredInscritos.map(ins => `
                <tr>
                  <td>${ins.estudantes?.nome}</td>
                  <td>${ins.estudantes?.turma}</td>
                  <td>${ins.ifas?.nome_ifa}</td>
                  <td>${new Date(ins.data_inscricao).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else {
      setUser(data.user);
      fetchData();
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md p-8 text-center border-amber-200 bg-amber-50">
          <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-amber-900">Configuração Necessária</h2>
          <p className="text-amber-700 mt-2">
            As chaves do Supabase não foram configuradas no painel de Secrets.
          </p>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md p-8">
          <h1 className="text-2xl font-bold mb-6 text-center">Acesso Administrativo</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border rounded-xl"
              required
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded-xl"
              required
            />
            <button
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Painel de Controle</h1>
        <button onClick={handleLogout} className="flex items-center gap-2 text-red-600 font-medium">
          <LogOut className="w-5 h-5" /> Sair
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 bg-emerald-600 text-white">
          <div className="flex items-center gap-4">
            <BookOpen className="w-8 h-8" />
            <div>
              <p className="text-emerald-100 text-sm">Total de IFAs</p>
              <p className="text-2xl font-bold">{ifas.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-blue-600 text-white">
          <div className="flex items-center gap-4">
            <Users className="w-8 h-8" />
            <div>
              <p className="text-blue-100 text-sm">Estudantes Inscritos</p>
              <p className="text-2xl font-bold">{inscritos.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-white border-2 border-dashed border-gray-100 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <CheckCircle className="w-6 h-6 text-emerald-500" />
            <span className="font-bold text-sm">Banco de Dados Conectado</span>
            <p className="text-[10px] text-center px-4">Os dados foram inseridos via SQL Editor</p>
          </div>
        </Card>
      </div>

      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('ifas')}
          className={cn("pb-4 px-2 font-bold transition-all", activeTab === 'ifas' ? "border-b-4 border-emerald-600 text-emerald-600" : "text-gray-400")}
        >
          Itinerários (IFAs)
        </button>
        <button
          onClick={() => setActiveTab('inscritos')}
          className={cn("pb-4 px-2 font-bold transition-all", activeTab === 'inscritos' ? "border-b-4 border-emerald-600 text-emerald-600" : "text-gray-400")}
        >
          Lista de Inscritos
        </button>
      </div>

      {activeTab === 'ifas' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                <th className="p-4 font-bold">IFA</th>
                <th className="p-4 font-bold">Turma</th>
                <th className="p-4 font-bold">Vagas</th>
                <th className="p-4 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ifas.map(ifa => (
                <tr key={ifa.id} className="hover:bg-gray-50">
                  <td className="p-4 font-bold text-gray-900">{ifa.nome_ifa}</td>
                  <td className="p-4 text-gray-600">{ifa.turma}</td>
                  <td className="p-4 text-gray-600">{ifa.inscricoes_count} / {ifa.vagas_maximas}</td>
                  <td className="p-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-bold",
                      (ifa.inscricoes_count || 0) >= ifa.vagas_maximas ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                    )}>
                      {(ifa.inscricoes_count || 0) >= ifa.vagas_maximas ? 'Lotado' : 'Disponível'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="w-full md:w-64">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Filtrar por IFA</label>
              <select 
                value={selectedIfa}
                onChange={(e) => setSelectedIfa(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm bg-white"
              >
                <option value="all">Todos os Itinerários</option>
                {ifas.map(ifa => (
                  <option key={ifa.id} value={ifa.id}>{ifa.nome_ifa} ({ifa.turma})</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors"
              >
                <Printer className="w-4 h-4 text-emerald-600" /> Imprimir
              </button>
              <button 
                onClick={exportToPDF}
                className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-4 h-4 text-red-500" /> PDF
              </button>
              <button 
                onClick={exportToDoc}
                className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4 text-blue-500" /> Word (DOC)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                  <th className="p-4 font-bold">Estudante</th>
                  <th className="p-4 font-bold">Turma Origem</th>
                  <th className="p-4 font-bold">IFA Escolhido</th>
                  <th className="p-4 font-bold">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredInscritos.map(ins => (
                  <tr key={ins.id} className="hover:bg-gray-50">
                    <td className="p-4 font-bold text-gray-900">{ins.estudantes?.nome}</td>
                    <td className="p-4 text-gray-600">{ins.estudantes?.turma}</td>
                    <td className="p-4 text-gray-600">{ins.ifas?.nome_ifa}</td>
                    <td className="p-4 text-gray-400 text-sm">{new Date(ins.data_inscricao).toLocaleDateString()}</td>
                  </tr>
                ))}
                {filteredInscritos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-400 italic">Nenhum registro encontrado para este filtro.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white text-gray-900 font-sans">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/selecao" element={<SelecaoPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </Router>
  );
}
