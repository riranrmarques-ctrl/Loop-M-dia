const STORAGE_MIDIAS_KEY = "biblioteca_midias_v1";
const STORAGE_ENVIOS_KEY = "biblioteca_envios_v1";

const midiasPadrao = [
  { id: "m1", nome: "Web - Previsão do Tempo.txt", tipo: "TXT", duracao: "-", tamanho: "2.1 KB" },
  { id: "m2", nome: "UOL - Entretenimento.txt", tipo: "TXT", duracao: "-", tamanho: "1.8 KB" },
  { id: "m3", nome: "Jogos de Hoje - Futebol.txt", tipo: "TXT", duracao: "-", tamanho: "1.6 KB" },
  { id: "m4", nome: "Cotações - Dólar e Euro.txt", tipo: "TXT", duracao: "-", tamanho: "1.9 KB" },
  { id: "m5", nome: "Notícias - Brasil.txt", tipo: "TXT", duracao: "-", tamanho: "2.4 KB" },
  { id: "m6", nome: "Horóscopo do Dia.txt", tipo: "TXT", duracao: "-", tamanho: "1.3 KB" },
  { id: "m7", nome: "Promoção - Loja Exemplo.png", tipo: "PNG", duracao: "-", tamanho: "245 KB" },
  { id: "m8", nome: "Cardápio - Restaurante.png", tipo: "PNG", duracao: "-", tamanho: "312 KB" },
  { id: "m9", nome: "Aviso - Manutenção.png", tipo: "PNG", duracao: "-", tamanho: "186 KB" },
  { id: "m10", nome: "Oferta Especial.png", tipo: "PNG", duracao: "-", tamanho: "278 KB" },
  { id: "m11", nome: "Banner - Black Friday.png", tipo: "PNG", duracao: "-", tamanho: "342 KB" },
  { id: "m12", nome: "Tabela - Preços.png", tipo: "PNG", duracao: "-", tamanho: "198 KB" },
  { id: "m13", nome: "Informativo - Evento.png", tipo: "PNG", duracao: "-", tamanho: "256 KB" }
];

const pontosPadrao = [
  "Salão de Beleza",
  "Mercado",
  "Academia Alpha",
  "Padaria",
  "Posto Central",
  "Restaurante Sabor",
  "Farmácia Vida",
  "Escola Futuro",
  "Bar do Zé",
  "Clínica Saúde"
];

let midias = [];
let midiaArrastada = null;
let timerMensagem = null;

const dataAtualizacao = document.getElementById("dataAtualizacao");
const btnAtualizarBiblioteca = document.getElementById("btnAtualizarBiblioteca");
const btnAdicionarMidia = document.getElementById("btnAdicionarMidia");
const inputMidia = document.getElementById("inputMidia");
const listaMidias = document.getElementById("listaMidias");
const listaPontosBiblioteca = document.getElementById("listaPontosBiblioteca");
const buscaPonto = document.getElementById("buscaPonto");
const dropGlobalBiblioteca = document.getElementById("dropGlobalBiblioteca");
const mensagemBiblioteca = document.getElementById("mensagemBiblioteca");

function escaparHtml(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mostrarMensagem(texto) {
  if (!mensagemBiblioteca) return;

  clearTimeout(timerMensagem);
  mensagemBiblioteca.textContent = texto;
  mensagemBiblioteca.hidden = !texto;

  if (!texto) return;

  timerMensagem = setTimeout(() => {
    mensagemBiblioteca.hidden = true;
    mensagemBiblioteca.textContent = "";
  }, 3500);
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

function lerMidias() {
  try {
    const salvas = JSON.parse(localStorage.getItem(STORAGE_MIDIAS_KEY) || "null");
    return Array.isArray(salvas) && salvas.length ? salvas : midiasPadrao;
  } catch {
    return midiasPadrao;
  }
}

function salvarMidias() {
  localStorage.setItem(STORAGE_MIDIAS_KEY, JSON.stringify(midias));
}

function obterTipoArquivo(nome) {
  const extensao = String(nome || "").split(".").pop()?.toUpperCase() || "ARQ";
  if (extensao === "JPG" || extensao === "JPEG") return "JPG";
  if (extensao === "WEBP") return "WEBP";
  if (extensao === "MP4") return "MP4";
  if (extensao === "PNG") return "PNG";
  if (extensao === "TXT") return "TXT";
  return extensao.slice(0, 4);
}

function formatarTamanho(bytes) {
  const valor = Number(bytes || 0);
  if (valor < 1024) return `${valor || 0} B`;
  if (valor < 1024 * 1024) return `${(valor / 1024).toFixed(1)} KB`;
  return `${(valor / 1024 / 1024).toFixed(1)} MB`;
}

function midiaEhImagem(midia) {
  return ["PNG", "JPG", "JPEG", "WEBP"].includes(String(midia.tipo || "").toUpperCase());
}

function montarLinhaMidia(midia) {
  const icone = midiaEhImagem(midia) ? "image" : "file-text";
  const classeIcone = midiaEhImagem(midia) ? "imagem" : "";

  return `
    <div class="midia-linha" draggable="true" data-id="${escaparHtml(midia.id)}">
      <div class="midia-nome">
        <span class="midia-icone ${classeIcone}">
          <i data-lucide="${icone}"></i>
        </span>
        <span>${escaparHtml(midia.nome)}</span>
      </div>
      <span>${escaparHtml(midia.tipo)}</span>
      <span>${escaparHtml(midia.duracao || "-")}</span>
      <span>${escaparHtml(midia.tamanho)}</span>
    </div>
  `;
}

function renderizarMidias() {
  if (!listaMidias) return;

  listaMidias.innerHTML = midias.length
    ? midias.map(montarLinhaMidia).join("")
    : `<div class="linha-vazia">Nenhuma mÃ­dia adicionada.</div>`;

  document.querySelectorAll(".midia-linha").forEach((linha) => {
    linha.addEventListener("dragstart", () => {
      const id = linha.dataset.id;
      midiaArrastada = midias.find((midia) => midia.id === id) || null;
      linha.classList.add("arrastando");
    });

    linha.addEventListener("dragend", () => {
      linha.classList.remove("arrastando");
      midiaArrastada = null;
      limparDrops();
    });
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function obterPontosFiltrados() {
  const termo = String(buscaPonto?.value || "").trim().toLowerCase();
  if (!termo) return pontosPadrao;

  return pontosPadrao.filter((ponto) => ponto.toLowerCase().includes(termo));
}

function montarLinhaPonto(nome) {
  return `
    <div class="ponto-linha" data-ponto="${escaparHtml(nome)}">
      <i data-lucide="folder"></i>
      <span>${escaparHtml(nome)}</span>
    </div>
  `;
}

function renderizarPontos() {
  if (!listaPontosBiblioteca) return;

  const pontos = obterPontosFiltrados();
  listaPontosBiblioteca.innerHTML = pontos.length
    ? pontos.map(montarLinhaPonto).join("")
    : `<div class="linha-vazia">Nenhum ponto encontrado.</div>`;

  document.querySelectorAll(".ponto-linha").forEach((linha) => {
    linha.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (!midiaArrastada) return;
      limparDrops();
      linha.classList.add("ativo-drop");
    });

    linha.addEventListener("dragleave", () => {
      linha.classList.remove("ativo-drop");
    });

    linha.addEventListener("drop", (event) => {
      event.preventDefault();
      if (!midiaArrastada) return;
      registrarEnvio(linha.dataset.ponto, midiaArrastada);
      limparDrops();
    });
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function limparDrops() {
  document.querySelectorAll(".ativo-drop").forEach((el) => el.classList.remove("ativo-drop"));
  dropGlobalBiblioteca?.classList.remove("ativo");
}

function registrarEnvio(ponto, midia) {
  if (!ponto || !midia) return;

  try {
    const envios = JSON.parse(localStorage.getItem(STORAGE_ENVIOS_KEY) || "[]");
    envios.push({
      ponto,
      midiaId: midia.id,
      nome: midia.nome,
      criadoEm: new Date().toISOString()
    });
    localStorage.setItem(STORAGE_ENVIOS_KEY, JSON.stringify(envios));
  } catch {
    return;
  }

  mostrarMensagem(`${midia.nome} enviado para ${ponto}.`);
}

function adicionarArquivos(files) {
  const arquivos = Array.from(files || []);
  if (!arquivos.length) return;

  const novasMidias = arquivos.map((file) => ({
    id: `midia-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    nome: file.name,
    tipo: obterTipoArquivo(file.name),
    duracao: "-",
    tamanho: formatarTamanho(file.size)
  }));

  midias = [...novasMidias, ...midias];
  salvarMidias();
  renderizarMidias();
  formatarDataAtualizacao();
  mostrarMensagem(`${novasMidias.length} mÃ­dia(s) adicionada(s).`);
}

function iniciarEventos() {
  btnAdicionarMidia?.addEventListener("click", () => {
    inputMidia?.click();
  });

  inputMidia?.addEventListener("change", (event) => {
    adicionarArquivos(event.target.files);
    inputMidia.value = "";
  });

  btnAtualizarBiblioteca?.addEventListener("click", () => {
    renderizarMidias();
    renderizarPontos();
    formatarDataAtualizacao();
    mostrarMensagem("Biblioteca atualizada.");
  });

  buscaPonto?.addEventListener("input", renderizarPontos);

  dropGlobalBiblioteca?.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (!midiaArrastada) return;
    dropGlobalBiblioteca.classList.add("ativo");
  });

  dropGlobalBiblioteca?.addEventListener("dragleave", () => {
    dropGlobalBiblioteca.classList.remove("ativo");
  });

  dropGlobalBiblioteca?.addEventListener("drop", (event) => {
    event.preventDefault();
    if (!midiaArrastada) return;
    mostrarMensagem(`${midiaArrastada.nome} pronto para envio. Escolha um ponto.`);
    limparDrops();
  });
}

function iniciarBiblioteca() {
  midias = lerMidias();
  formatarDataAtualizacao();
  renderizarMidias();
  renderizarPontos();
  iniciarEventos();

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

iniciarBiblioteca();
