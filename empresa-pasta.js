const SUPABASE_URL = "https://rgrwoboqryvwnqsvlrtj.supabase.co";
const SUPABASE_KEY = "sb_publishable_PYvzQu5T5Xzl_QF1J_qI4w_b9XF-aa3";

const STORAGE_EMPRESAS_KEY = "loop_empresas_v2";
const TABELAS_EMPRESAS = ["empresas"];

let supabaseClient = null;
let tabelaEmpresasAtual = localStorage.getItem("loop_empresas_tabela_atual") || "";
let empresas = [];
let empresaAtual = null;
let timerMensagem = null;

const tituloEmpresa = document.getElementById("tituloEmpresa");
const statusEmpresaTopo = document.getElementById("statusEmpresaTopo");
const dataAtualizacao = document.getElementById("dataAtualizacao");
const mensagemDetalhe = document.getElementById("mensagemDetalhe");

const emailEmpresa = document.getElementById("emailEmpresa");
const senhaEmpresa = document.getElementById("senhaEmpresa");
const numeroTelas = document.getElementById("numeroTelas");
const numeroPontos = document.getElementById("numeroPontos");
const armazenamentoEmpresa = document.getElementById("armazenamentoEmpresa");
const textoStorage = document.getElementById("textoStorage");
const percentualStorage = document.getElementById("percentualStorage");
const barraStorage = document.getElementById("barraStorage");
const nomeEmpresa = document.getElementById("nomeEmpresa");
const contatoEmpresa = document.getElementById("contatoEmpresa");
const telefoneEmpresa = document.getElementById("telefoneEmpresa");
const statusEmpresa = document.getElementById("statusEmpresa");
const vencimentoEmpresa = document.getElementById("vencimentoEmpresa");
const valorEmpresa = document.getElementById("valorEmpresa");

const btnAtualizarDetalhe = document.getElementById("btnAtualizarDetalhe");
const btnAlterarSenha = document.getElementById("btnAlterarSenha");
const btnBaixarContrato = document.getElementById("btnBaixarContrato");
const btnSalvarEmpresa = document.getElementById("btnSalvarEmpresa");

function iniciarSupabase() {
  if (!window.supabase) return null;
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

function slugify(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function numero(valor, fallback = 0) {
  const final = Number(valor);
  return Number.isFinite(final) ? final : fallback;
}

function primeiroValor(obj, chaves, fallback = "") {
  for (const chave of chaves) {
    if (obj?.[chave] !== undefined && obj?.[chave] !== null && String(obj[chave]).trim() !== "") {
      return obj[chave];
    }
  }

  return fallback;
}

function normalizarEmpresa(row = {}, tabela = tabelaEmpresasAtual) {
  const nome = String(primeiroValor(row, ["nome", "nome_franquia", "empresa", "razao_social", "titulo"], "Nova franquia")).trim();
  const idOriginal = primeiroValor(row, ["id", "uuid", "codigo", "slug"], "");
  const id = String(idOriginal || slugify(nome) || `empresa-${Date.now()}`).trim();

  return {
    ...row,
    id,
    rowId: row.id ?? row.uuid ?? row.codigo ?? id,
    tabelaOrigem: tabela,
    nome,
    email: String(primeiroValor(row, ["email", "email_acesso", "login", "contato_email"], "")).trim(),
    telas: numero(primeiroValor(row, ["telas", "numero_telas", "limite_telas", "qtd_telas"], 0)),
    pontos: numero(primeiroValor(row, ["pontos", "numero_pontos", "limite_pontos", "qtd_pontos"], 0)),
    armazenamento: numero(primeiroValor(row, ["armazenamento", "armazenamento_gb", "limite_gb", "storage_gb"], 0)),
    usado: numero(primeiroValor(row, ["usado", "armazenamento_usado", "usado_gb", "storage_usado_gb"], 0)),
    status: String(primeiroValor(row, ["status", "situacao"], "Ativa")).trim(),
    contato: String(primeiroValor(row, ["contato", "responsavel", "contato_responsavel"], "")).trim(),
    telefone: String(primeiroValor(row, ["telefone", "celular", "whatsapp"], "")).trim(),
    vencimento: String(primeiroValor(row, ["vencimento", "proximo_vencimento", "data_vencimento"], "")).trim(),
    valor: String(primeiroValor(row, ["valor", "valor_mensal", "mensalidade"], "")).trim()
  };
}

function obterIdEmpresa() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
}

function criarEmpresaVazia(id = "") {
  const codigo = String(id || `empresa-${Date.now()}`).trim();

  return normalizarEmpresa({
    id: codigo,
    nome: "",
    email: "",
    telas: 0,
    pontos: 0,
    armazenamento: 0,
    usado: 0,
    status: "Ativa",
    contato: "",
    telefone: "",
    vencimento: "",
    valor: ""
  });
}

function obterClasseStatus(status) {
  const valor = String(status || "").toLowerCase();
  if (valor.includes("suspensa")) return "suspensa";
  if (valor.includes("limite")) return "limite";
  return "ativa";
}

function lerEmpresasCache() {
  try {
    const salvas = JSON.parse(localStorage.getItem(STORAGE_EMPRESAS_KEY) || "null");
    return Array.isArray(salvas) ? salvas.map((item) => normalizarEmpresa(item)) : [];
  } catch {
    return [];
  }
}

function salvarEmpresasCache() {
  localStorage.setItem(STORAGE_EMPRESAS_KEY, JSON.stringify(empresas));
}

function formatarDataAtualizacao() {
  const data = new Date();
  const dataTexto = data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short"
  });
  const horaTexto = data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });

  if (dataAtualizacao) {
    dataAtualizacao.textContent = `${dataTexto}, ${horaTexto}`;
  }
}

function mostrarMensagem(texto) {
  if (!mensagemDetalhe) return;

  clearTimeout(timerMensagem);
  mensagemDetalhe.textContent = texto;
  mensagemDetalhe.hidden = !texto;

  if (!texto) return;

  timerMensagem = setTimeout(() => {
    mensagemDetalhe.hidden = true;
    mensagemDetalhe.textContent = "";
  }, 3500);
}

function atualizarStorage() {
  if (!empresaAtual) return;

  const limite = Number(armazenamentoEmpresa?.value || empresaAtual.armazenamento || 0);
  const usado = Number(empresaAtual.usado || 0);
  const percentual = limite > 0 ? Math.min(100, (usado / limite) * 100) : 0;

  if (textoStorage) textoStorage.textContent = `${usado} GB utilizados de ${limite} GB`;
  if (percentualStorage) percentualStorage.textContent = `${percentual.toFixed(1)}%`;
  if (barraStorage) barraStorage.style.width = `${percentual}%`;
}

function preencherFormulario() {
  if (!empresaAtual) return;

  if (tituloEmpresa) tituloEmpresa.textContent = empresaAtual.nome;
  if (statusEmpresaTopo) {
    statusEmpresaTopo.textContent = empresaAtual.status;
    statusEmpresaTopo.className = `status-pill ${obterClasseStatus(empresaAtual.status)}`;
  }

  if (emailEmpresa) emailEmpresa.value = empresaAtual.email || "";
  if (numeroTelas) numeroTelas.value = empresaAtual.telas || 0;
  if (numeroPontos) numeroPontos.value = empresaAtual.pontos || 0;
  if (armazenamentoEmpresa) armazenamentoEmpresa.value = empresaAtual.armazenamento || 0;
  if (nomeEmpresa) nomeEmpresa.value = empresaAtual.nome || "";
  if (contatoEmpresa) contatoEmpresa.value = empresaAtual.contato || "";
  if (telefoneEmpresa) telefoneEmpresa.value = empresaAtual.telefone || "";
  if (statusEmpresa) statusEmpresa.value = empresaAtual.status || "Ativa";
  if (vencimentoEmpresa) vencimentoEmpresa.value = empresaAtual.vencimento || "";
  if (valorEmpresa) valorEmpresa.value = empresaAtual.valor || "";

  atualizarStorage();
}

async function buscarEmpresasRemoto() {
  if (!supabaseClient) throw new Error("Supabase nÃ£o carregou.");

  const tabelas = tabelaEmpresasAtual
    ? [tabelaEmpresasAtual, ...TABELAS_EMPRESAS.filter((tabela) => tabela !== tabelaEmpresasAtual)]
    : TABELAS_EMPRESAS;

  let ultimoErro = null;

  for (const tabela of tabelas) {
    const { data, error } = await supabaseClient
      .from(tabela)
      .select("*");

    if (!error) {
      tabelaEmpresasAtual = tabela;
      localStorage.setItem("loop_empresas_tabela_atual", tabela);
      return (data || []).map((row) => normalizarEmpresa(row, tabela));
    }

    ultimoErro = error;
    console.warn(`Falha ao buscar empresas na tabela ${tabela}:`, error);
  }

  throw ultimoErro || new Error("Nenhuma tabela de empresas encontrada.");
}

function montarPayloadEmpresa() {
  return {
    nome: nomeEmpresa?.value.trim() || "Nova franquia",
    email: emailEmpresa?.value.trim() || "",
    telas: Number(numeroTelas?.value || 0),
    pontos: Number(numeroPontos?.value || 0),
    armazenamento: Number(armazenamentoEmpresa?.value || 0),
    usado: Number(empresaAtual?.usado || 0),
    contato: contatoEmpresa?.value.trim() || "",
    telefone: telefoneEmpresa?.value.trim() || "",
    status: statusEmpresa?.value || "Ativa",
    vencimento: vencimentoEmpresa?.value || null,
    valor: valorEmpresa?.value.trim() || ""
  };
}

async function salvarEmpresaRemota(payload) {
  if (!supabaseClient) throw new Error("Supabase nÃ£o carregou.");

  const tabela = empresaAtual?.tabelaOrigem || tabelaEmpresasAtual || TABELAS_EMPRESAS[0];
  const id = empresaAtual?.rowId || empresaAtual?.id;
  const tentativas = [
    () => supabaseClient.from(tabela).update(payload).eq("id", id).select("*").limit(1),
    () => supabaseClient.from(tabela).update(payload).eq("codigo", empresaAtual.id).select("*").limit(1),
    () => supabaseClient.from(tabela).upsert([{ id: empresaAtual.id, ...payload }]).select("*").limit(1),
    () => supabaseClient.from(tabela).upsert([{ codigo: empresaAtual.id, ...payload }]).select("*").limit(1)
  ];

  let ultimoErro = null;

  for (const tentarSalvar of tentativas) {
    const { data, error } = await tentarSalvar();

    if (!error) {
      return normalizarEmpresa(data?.[0] || { ...empresaAtual, ...payload }, tabela);
    }

    ultimoErro = error;
    console.warn("Falha ao salvar empresa:", error);
  }

  throw ultimoErro || new Error("NÃ£o foi possÃ­vel salvar empresa.");
}

async function carregarEmpresa(forcarAtualizacao = false) {
  const id = obterIdEmpresa();

  if (!forcarAtualizacao) {
    empresas = lerEmpresasCache();
    empresaAtual = empresas.find((empresa) => empresa.id === id) || criarEmpresaVazia(id);
    preencherFormulario();
  }

  try {
    mostrarMensagem("Buscando empresa no Supabase...");
    const remotas = await buscarEmpresasRemoto();

    empresas = remotas.length ? remotas : lerEmpresasCache();
    empresaAtual = empresas.find((empresa) => empresa.id === id) || criarEmpresaVazia(id);
    salvarEmpresasCache();
    formatarDataAtualizacao();
    preencherFormulario();
    mostrarMensagem("Empresa carregada do Supabase.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Usando dados locais. Verifique a tabela no Supabase.");
  }
}

async function salvarFormulario() {
  if (!empresaAtual) return;

  const payload = montarPayloadEmpresa();
  empresaAtual = { ...empresaAtual, ...payload };

  try {
    mostrarMensagem("Salvando no Supabase...");
    empresaAtual = await salvarEmpresaRemota(payload);
    mostrarMensagem("AlteraÃ§Ãµes salvas no Supabase.");
  } catch (error) {
    console.error(error);
    mostrarMensagem("AlteraÃ§Ãµes salvas localmente. Ajuste a tabela no Supabase.");
  }

  empresas = empresas.map((empresa) => empresa.id === empresaAtual.id ? empresaAtual : empresa);
  if (!empresas.find((empresa) => empresa.id === empresaAtual.id)) empresas.unshift(empresaAtual);
  salvarEmpresasCache();
  preencherFormulario();
  formatarDataAtualizacao();
}

function iniciarDetalhe() {
  supabaseClient = iniciarSupabase();
  formatarDataAtualizacao();
  carregarEmpresa(false);

  armazenamentoEmpresa?.addEventListener("input", atualizarStorage);
  statusEmpresa?.addEventListener("change", () => {
    if (!statusEmpresaTopo) return;
    statusEmpresaTopo.textContent = statusEmpresa.value;
    statusEmpresaTopo.className = `status-pill ${obterClasseStatus(statusEmpresa.value)}`;
  });

  btnAtualizarDetalhe?.addEventListener("click", () => carregarEmpresa(true));

  btnAlterarSenha?.addEventListener("click", () => {
    if (senhaEmpresa) senhaEmpresa.value = "â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢";
    mostrarMensagem("Senha pronta para alteraÃ§Ã£o.");
  });

  btnBaixarContrato?.addEventListener("click", () => {
    mostrarMensagem("Contrato preparado para download.");
  });

  btnSalvarEmpresa?.addEventListener("click", salvarFormulario);

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

iniciarDetalhe();
