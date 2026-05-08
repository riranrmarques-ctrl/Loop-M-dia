const SUPABASE_URL = "https://rgrwoboqryvwnqsvlrtj.supabase.co";
const SUPABASE_KEY = "sb_publishable_PYvzQu5T5Xzl_QF1J_qI4w_b9XF-aa3";

const STORAGE_EMPRESAS_KEY = "loop_empresas_v2";
const TABELAS_EMPRESAS = ["empresas"];

let supabaseClient = null;
let tabelaEmpresasAtual = localStorage.getItem("loop_empresas_tabela_atual") || "";
let empresas = [];
let carregandoEmpresas = false;
let timerMensagem = null;

const listaEmpresas = document.getElementById("listaEmpresas");
const buscaEmpresa = document.getElementById("buscaEmpresa");
const btnAdicionarEmpresa = document.getElementById("btnAdicionarEmpresa");
const btnAtualizarEmpresas = document.getElementById("btnAtualizarEmpresas");
const dataAtualizacao = document.getElementById("dataAtualizacao");
const mensagemEmpresas = document.getElementById("mensagemEmpresas");

function iniciarSupabase() {
  if (!window.supabase) return null;
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

function escaparHtml(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
  if (!mensagemEmpresas) return;

  clearTimeout(timerMensagem);
  mensagemEmpresas.textContent = texto;
  mensagemEmpresas.hidden = !texto;

  if (!texto) return;

  timerMensagem = setTimeout(() => {
    mensagemEmpresas.hidden = true;
    mensagemEmpresas.textContent = "";
  }, 3500);
}

function obterClasseStatus(status) {
  const valor = String(status || "").toLowerCase();
  if (valor.includes("suspensa")) return "suspensa";
  if (valor.includes("limite")) return "limite";
  return "ativa";
}

function obterEmpresasFiltradas() {
  const termo = String(buscaEmpresa?.value || "").trim().toLowerCase();
  if (!termo) return empresas;

  return empresas.filter((empresa) => {
    return [
      empresa.nome,
      empresa.email,
      empresa.status,
      empresa.contato
    ].join(" ").toLowerCase().includes(termo);
  });
}

function montarLinhaEmpresa(empresa) {
  const statusClasse = obterClasseStatus(empresa.status);

  return `
    <a class="empresa-linha" href="/empresa-pasta.html?id=${encodeURIComponent(empresa.id)}">
      <div class="empresa-identidade">
        <div class="empresa-folder">
          <i data-lucide="folder"></i>
        </div>

        <div class="empresa-nome">
          <strong>${escaparHtml(empresa.nome)}</strong>
          <span>${escaparHtml(empresa.email)}</span>
        </div>
      </div>

      <div class="empresa-metrica">
        <i data-lucide="monitor"></i>
        <div>
          <strong>${escaparHtml(empresa.telas)}</strong>
          <span>Telas</span>
        </div>
      </div>

      <div class="empresa-metrica">
        <i data-lucide="map-pin"></i>
        <div>
          <strong>${escaparHtml(empresa.pontos)}</strong>
          <span>Pontos</span>
        </div>
      </div>

      <div class="empresa-metrica storage">
        <i data-lucide="database"></i>
        <div>
          <strong>${escaparHtml(empresa.armazenamento)} GB</strong>
          <span>Armazenamento</span>
        </div>
      </div>

      <span class="status-empresa ${statusClasse}">${escaparHtml(empresa.status)}</span>

      <i class="empresa-seta" data-lucide="chevron-right"></i>
    </a>
  `;
}

function renderizarEmpresas() {
  if (!listaEmpresas) return;

  const filtradas = obterEmpresasFiltradas();
  listaEmpresas.innerHTML = filtradas.length
    ? filtradas.map(montarLinhaEmpresa).join("")
    : `<div class="estado-vazio">Nenhuma franquia encontrada.</div>`;

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

async function buscarEmpresasRemoto() {
  if (!supabaseClient) throw new Error("Supabase não carregou.");

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

function montarPayloadEmpresa(empresa) {
  return {
    nome: empresa.nome,
    email: empresa.email,
    telas: empresa.telas,
    pontos: empresa.pontos,
    armazenamento: empresa.armazenamento,
    usado: empresa.usado,
    status: empresa.status,
    contato: empresa.contato,
    telefone: empresa.telefone,
    vencimento: empresa.vencimento || null,
    valor: empresa.valor
  };
}

async function inserirEmpresaRemota(empresa) {
  if (!supabaseClient) throw new Error("Supabase não carregou.");

  const tabelas = tabelaEmpresasAtual ? [tabelaEmpresasAtual] : TABELAS_EMPRESAS;
  const payloads = [
    { id: empresa.id, ...montarPayloadEmpresa(empresa) },
    { codigo: empresa.id, nome: empresa.nome, email: empresa.email, status: empresa.status },
    { nome: empresa.nome, email: empresa.email, status: empresa.status }
  ];

  let ultimoErro = null;

  for (const tabela of tabelas) {
    for (const payload of payloads) {
      const { data, error } = await supabaseClient
        .from(tabela)
        .insert([payload])
        .select("*")
        .limit(1);

      if (!error) {
        tabelaEmpresasAtual = tabela;
        localStorage.setItem("loop_empresas_tabela_atual", tabela);
        return normalizarEmpresa(data?.[0] || empresa, tabela);
      }

      ultimoErro = error;
      console.warn(`Falha ao inserir empresa em ${tabela}:`, payload, error);
    }
  }

  throw ultimoErro || new Error("Não foi possível inserir empresa.");
}

async function carregarEmpresas(opcoes = {}) {
  if (carregandoEmpresas) return;

  const forcarAtualizacao = opcoes.forcarAtualizacao === true;
  carregandoEmpresas = true;

  if (!forcarAtualizacao) {
    empresas = lerEmpresasCache();
    renderizarEmpresas();
  }

  try {
    mostrarMensagem("Buscando empresas no Supabase...");
    const remotas = await buscarEmpresasRemoto();

    empresas = remotas;
    salvarEmpresasCache();
    formatarDataAtualizacao();
    renderizarEmpresas();
    mostrarMensagem("Empresas carregadas do Supabase.");
  } catch (error) {
    console.error(error);

    if (!empresas.length) {
      empresas = lerEmpresasCache();
      renderizarEmpresas();
    }

    mostrarMensagem("Usando dados locais. Verifique a tabela no Supabase.");
  } finally {
    carregandoEmpresas = false;
  }
}

async function adicionarEmpresa() {
  const numero = empresas.length + 1;
  const nome = `Nova Franquia ${numero}`;
  const novaEmpresa = {
    id: slugify(`${nome}-${Date.now()}`),
    nome,
    email: "contato@novafranquia.com",
    telas: 1,
    pontos: 1,
    armazenamento: 50,
    usado: 0,
    status: "Ativa",
    contato: "Responsável",
    telefone: "",
    vencimento: "2025-12-12",
    valor: "R$ 0,00"
  };

  try {
    mostrarMensagem("Criando franquia no Supabase...");
    const criada = await inserirEmpresaRemota(novaEmpresa);
    empresas = [criada, ...empresas];
    mostrarMensagem("Franquia adicionada no Supabase.");
  } catch (error) {
    console.error(error);
    empresas = [novaEmpresa, ...empresas];
    mostrarMensagem("Franquia salva localmente. Ajuste a tabela no Supabase.");
  }

  salvarEmpresasCache();
  renderizarEmpresas();
  formatarDataAtualizacao();
}

function iniciarEmpresas() {
  supabaseClient = iniciarSupabase();
  empresas = lerEmpresasCache();
  formatarDataAtualizacao();
  renderizarEmpresas();

  buscaEmpresa?.addEventListener("input", renderizarEmpresas);
  btnAdicionarEmpresa?.addEventListener("click", adicionarEmpresa);
  btnAtualizarEmpresas?.addEventListener("click", () => carregarEmpresas({ forcarAtualizacao: true }));

  carregarEmpresas();

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

iniciarEmpresas();
