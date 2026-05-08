const STORAGE_EMPRESAS_KEY = "loop_empresas_v1";

const empresasPadrao = [
  {
    id: "fulano-indoor",
    nome: "Fulano Indoor",
    email: "contato@fulanoindoor.com",
    telas: 18,
    pontos: 6,
    armazenamento: 320,
    usado: 220,
    status: "Ativa",
    contato: "Fulano da Silva",
    telefone: "(11) 99999-9999",
    vencimento: "2025-05-12",
    valor: "R$ 599,00"
  },
  {
    id: "norte-midia-tv",
    nome: "Norte MÃ­dia TV",
    email: "admin@nortemidiatv.com",
    telas: 12,
    pontos: 4,
    armazenamento: 220,
    usado: 138,
    status: "Ativa",
    contato: "Marina Costa",
    telefone: "(31) 98888-1212",
    vencimento: "2025-05-18",
    valor: "R$ 449,00"
  }
];

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

function lerEmpresas() {
  try {
    const salvas = JSON.parse(localStorage.getItem(STORAGE_EMPRESAS_KEY) || "null");
    return Array.isArray(salvas) && salvas.length ? salvas : empresasPadrao;
  } catch {
    return empresasPadrao;
  }
}

function salvarEmpresas() {
  localStorage.setItem(STORAGE_EMPRESAS_KEY, JSON.stringify(empresas));
}

function obterIdEmpresa() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "fulano-indoor";
}

function obterClasseStatus(status) {
  const valor = String(status || "").toLowerCase();
  if (valor.includes("suspensa")) return "suspensa";
  if (valor.includes("limite")) return "limite";
  return "ativa";
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

function salvarFormulario() {
  if (!empresaAtual) return;

  empresaAtual = {
    ...empresaAtual,
    nome: nomeEmpresa?.value.trim() || "Nova franquia",
    email: emailEmpresa?.value.trim() || "",
    telas: Number(numeroTelas?.value || 0),
    pontos: Number(numeroPontos?.value || 0),
    armazenamento: Number(armazenamentoEmpresa?.value || 0),
    contato: contatoEmpresa?.value.trim() || "",
    telefone: telefoneEmpresa?.value.trim() || "",
    status: statusEmpresa?.value || "Ativa",
    vencimento: vencimentoEmpresa?.value || "",
    valor: valorEmpresa?.value.trim() || ""
  };

  empresas = empresas.map((empresa) => {
    return empresa.id === empresaAtual.id ? empresaAtual : empresa;
  });

  salvarEmpresas();
  preencherFormulario();
  formatarDataAtualizacao();
  mostrarMensagem("AlteraÃ§Ãµes salvas.");
}

function iniciarDetalhe() {
  empresas = lerEmpresas();
  const id = obterIdEmpresa();
  empresaAtual = empresas.find((empresa) => empresa.id === id) || empresas[0] || empresasPadrao[0];

  if (!empresas.find((empresa) => empresa.id === empresaAtual.id)) {
    empresas = [empresaAtual, ...empresas];
    salvarEmpresas();
  }

  formatarDataAtualizacao();
  preencherFormulario();

  armazenamentoEmpresa?.addEventListener("input", atualizarStorage);
  statusEmpresa?.addEventListener("change", () => {
    if (!statusEmpresaTopo) return;
    statusEmpresaTopo.textContent = statusEmpresa.value;
    statusEmpresaTopo.className = `status-pill ${obterClasseStatus(statusEmpresa.value)}`;
  });

  btnAtualizarDetalhe?.addEventListener("click", () => {
    empresas = lerEmpresas();
    empresaAtual = empresas.find((empresa) => empresa.id === empresaAtual.id) || empresaAtual;
    formatarDataAtualizacao();
    preencherFormulario();
    mostrarMensagem("Empresa atualizada.");
  });

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
