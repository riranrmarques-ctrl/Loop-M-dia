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
  },
  {
    id: "conecta-indoor",
    nome: "Conecta Indoor",
    email: "suporte@conectaindoor.com",
    telas: 8,
    pontos: 3,
    armazenamento: 150,
    usado: 86,
    status: "Ativa",
    contato: "Rafael Nunes",
    telefone: "(21) 97777-3434",
    vencimento: "2025-05-22",
    valor: "R$ 329,00"
  },
  {
    id: "play-tv",
    nome: "Play TV",
    email: "contato@playtv.com.br",
    telas: 6,
    pontos: 2,
    armazenamento: 100,
    usado: 78,
    status: "Limite prÃ³ximo",
    contato: "Bianca Melo",
    telefone: "(71) 96666-5656",
    vencimento: "2025-05-25",
    valor: "R$ 249,00"
  },
  {
    id: "visual-indoor",
    nome: "Visual Indoor",
    email: "contato@visualindoor.com",
    telas: 4,
    pontos: 1,
    armazenamento: 80,
    usado: 64,
    status: "Limite prÃ³ximo",
    contato: "Lucas Ramos",
    telefone: "(85) 95555-7878",
    vencimento: "2025-05-27",
    valor: "R$ 199,00"
  },
  {
    id: "smart-midia-tv",
    nome: "Smart MÃ­dia TV",
    email: "contato@smartmidiatv.com",
    telas: 10,
    pontos: 3,
    armazenamento: 90,
    usado: 42,
    status: "Suspensa",
    contato: "Camila Prado",
    telefone: "(51) 94444-9090",
    vencimento: "2025-06-02",
    valor: "R$ 299,00"
  }
];

let empresas = [];
let timerMensagem = null;

const listaEmpresas = document.getElementById("listaEmpresas");
const buscaEmpresa = document.getElementById("buscaEmpresa");
const btnAdicionarEmpresa = document.getElementById("btnAdicionarEmpresa");
const btnAtualizarEmpresas = document.getElementById("btnAtualizarEmpresas");
const dataAtualizacao = document.getElementById("dataAtualizacao");
const mensagemEmpresas = document.getElementById("mensagemEmpresas");

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
    <a class="empresa-linha" href="/empresa-detalhe.html?id=${encodeURIComponent(empresa.id)}">
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

function adicionarEmpresa() {
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
    contato: "ResponsÃ¡vel",
    telefone: "",
    vencimento: "2025-12-12",
    valor: "R$ 0,00"
  };

  empresas = [novaEmpresa, ...empresas];
  salvarEmpresas();
  renderizarEmpresas();
  mostrarMensagem("Franquia adicionada.");
}

function iniciarEmpresas() {
  empresas = lerEmpresas();
  formatarDataAtualizacao();
  renderizarEmpresas();

  buscaEmpresa?.addEventListener("input", renderizarEmpresas);
  btnAdicionarEmpresa?.addEventListener("click", adicionarEmpresa);
  btnAtualizarEmpresas?.addEventListener("click", () => {
    empresas = lerEmpresas();
    formatarDataAtualizacao();
    renderizarEmpresas();
    mostrarMensagem("Empresas atualizadas.");
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

iniciarEmpresas();
