const SUPABASE_URL = "https://rgrwoboqryvwnqsvlrtj.supabase.co";
const SUPABASE_KEY = "sb_publishable_PYvzQu5T5Xzl_QF1J_qI4w_b9XF-aa3";

const BUCKET = "midias";
const TABELA_MIDIAS = "biblioteca";
const TABELA_PLAYLISTS = "playlists";
const TABELA_PONTOS = "pontos";

const STORAGE_MIDIAS_KEY = "biblioteca_cache_v2";

const midiasPadrao = [
  { id: "m1", nome: "Web - PrevisÃ£o do Tempo.txt", tipo: "TXT", duracao: "-", tamanho: "2.1 KB" },
  { id: "m2", nome: "UOL - Entretenimento.txt", tipo: "TXT", duracao: "-", tamanho: "1.8 KB" },
  { id: "m3", nome: "Jogos de Hoje - Futebol.txt", tipo: "TXT", duracao: "-", tamanho: "1.6 KB" },
  { id: "m4", nome: "CotaÃ§Ãµes - DÃ³lar e Euro.txt", tipo: "TXT", duracao: "-", tamanho: "1.9 KB" },
  { id: "m5", nome: "NotÃ­cias - Brasil.txt", tipo: "TXT", duracao: "-", tamanho: "2.4 KB" },
  { id: "m6", nome: "HorÃ³scopo do Dia.txt", tipo: "TXT", duracao: "-", tamanho: "1.3 KB" },
  { id: "m7", nome: "PromoÃ§Ã£o - Loja Exemplo.png", tipo: "PNG", duracao: "-", tamanho: "245 KB" },
  { id: "m8", nome: "CardÃ¡pio - Restaurante.png", tipo: "PNG", duracao: "-", tamanho: "312 KB" },
  { id: "m9", nome: "Aviso - ManutenÃ§Ã£o.png", tipo: "PNG", duracao: "-", tamanho: "186 KB" },
  { id: "m10", nome: "Oferta Especial.png", tipo: "PNG", duracao: "-", tamanho: "278 KB" },
  { id: "m11", nome: "Banner - Black Friday.png", tipo: "PNG", duracao: "-", tamanho: "342 KB" },
  { id: "m12", nome: "Tabela - PreÃ§os.png", tipo: "PNG", duracao: "-", tamanho: "198 KB" },
  { id: "m13", nome: "Informativo - Evento.png", tipo: "PNG", duracao: "-", tamanho: "256 KB" }
];

const pontosPadrao = [
  "SalÃ£o de Beleza",
  "Mercado",
  "Academia Alpha",
  "Padaria",
  "Posto Central",
  "Restaurante Sabor",
  "FarmÃ¡cia Vida",
  "Escola Futuro",
  "Bar do ZÃ©",
  "ClÃ­nica SaÃºde"
];

let midias = [];
let pontosBiblioteca = [];
let midiaArrastada = null;
let timerMensagem = null;
let supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

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

function normalizarMidia(item = {}) {
  return {
    ...item,
    id: String(item.id || item.codigo || `midia-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    nome: item.nome || item.titulo_arquivo || item.storage_path?.split("/").pop() || "Arquivo",
    tipo: String(item.tipo || obterTipoArquivo(item.nome || item.titulo_arquivo || "")).toUpperCase(),
    duracao: item.duracao || "-",
    tamanho: item.tamanho || item.tamanho_formatado || "-",
    video_url: item.video_url || item.url || item.arquivo_url || "",
    storage_path: item.storage_path || ""
  };
}

function obterCodigoPonto(ponto) {
  return String(ponto?.codigo || ponto?.codigo_ponto || ponto?.id || "").trim();
}

function obterNomePonto(ponto) {
  return String(ponto?.nome || ponto?.nome_painel || ponto?.titulo || ponto?.ambiente || obterCodigoPonto(ponto)).trim();
}

async function buscarMidiasRemoto() {
  if (!supabaseClient) throw new Error("Supabase nÃ£o carregou.");

  const { data, error } = await supabaseClient
    .from(TABELA_MIDIAS)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizarMidia);
}

async function buscarPontosRemoto() {
  if (!supabaseClient) throw new Error("Supabase nÃ£o carregou.");

  const tentativas = [
    () => supabaseClient.from(TABELA_PONTOS).select("*").order("nome", { ascending: true }),
    () => supabaseClient.from(TABELA_PONTOS).select("*").order("codigo", { ascending: true }),
    () => supabaseClient.from(TABELA_PONTOS).select("*")
  ];

  for (const tentar of tentativas) {
    const { data, error } = await tentar();
    if (!error) return (data || []).map((ponto) => ({
      codigo: obterCodigoPonto(ponto),
      nome: obterNomePonto(ponto)
    })).filter((ponto) => ponto.codigo || ponto.nome);
  }

  return pontosPadrao.map((nome) => ({ codigo: nome, nome }));
}

async function salvarMidiaRemota(midia) {
  if (!supabaseClient) throw new Error("Supabase nÃ£o carregou.");

  const payloads = [
    {
      nome: midia.nome,
      tipo: midia.tipo,
      duracao: midia.duracao,
      tamanho: midia.tamanho,
      video_url: midia.video_url || "",
      storage_path: midia.storage_path || ""
    },
    {
      nome: midia.nome,
      tipo: midia.tipo,
      video_url: midia.video_url || "",
      storage_path: midia.storage_path || ""
    }
  ];

  let ultimoErro = null;

  for (const payload of payloads) {
    const { data, error } = await supabaseClient
      .from(TABELA_MIDIAS)
      .insert([payload])
      .select("*")
      .limit(1);

    if (!error) return normalizarMidia(data?.[0] || midia);
    ultimoErro = error;
  }

  throw ultimoErro || new Error("NÃ£o foi possÃ­vel salvar mÃ­dia.");
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
  const base = pontosBiblioteca.length
    ? pontosBiblioteca
    : pontosPadrao.map((nome) => ({ codigo: nome, nome }));

  if (!termo) return base;

  return base.filter((ponto) => ponto.nome.toLowerCase().includes(termo) || ponto.codigo.toLowerCase().includes(termo));
}

function montarLinhaPonto(ponto) {
  const nome = ponto.nome || ponto.codigo;

  return `
    <div class="ponto-linha" data-ponto="${escaparHtml(ponto.codigo || nome)}" data-nome="${escaparHtml(nome)}">
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
      registrarEnvio(linha.dataset.ponto, midiaArrastada, linha.dataset.nome);
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

async function registrarEnvio(ponto, midia, nomePonto = "") {
  if (!ponto || !midia) return;

  try {
    if (!supabaseClient) throw new Error("Supabase nÃ£o carregou.");

    const { error } = await supabaseClient
      .from(TABELA_PLAYLISTS)
      .insert([{
        codigo: ponto,
        nome: midia.nome,
        titulo_arquivo: midia.nome,
        video_url: midia.video_url || "",
        storage_path: midia.storage_path || "",
        codigo_cliente: null,
        tipo: String(midia.tipo || "").toLowerCase() === "txt" ? "site" : String(midia.tipo || "arquivo").toLowerCase(),
        ordem: Date.now()
      }]);

    if (error) throw error;
    mostrarMensagem(`${midia.nome} enviado para ${nomePonto || ponto}.`);
  } catch (error) {
    console.error(error);
    mostrarMensagem(`${midia.nome} salvo na biblioteca. Verifique a tabela playlists.`);
  }
}

async function adicionarArquivos(files) {
  const arquivos = Array.from(files || []);
  if (!arquivos.length) return;

  const novasMidias = [];

  for (const file of arquivos) {
    const nomeLimpo = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "-");

    let storagePath = "";
    let videoUrl = "";

    try {
      if (supabaseClient) {
        storagePath = `biblioteca/${Date.now()}-${nomeLimpo}`;
        const { error: uploadError } = await supabaseClient.storage
          .from(BUCKET)
          .upload(storagePath, file, {
            cacheControl: "86400",
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(storagePath);
        videoUrl = data.publicUrl;
      }
    } catch (error) {
      console.warn("Upload da mÃ­dia falhou, mantendo local:", error);
    }

    const midiaBase = {
      id: `midia-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      nome: file.name,
      tipo: obterTipoArquivo(file.name),
      duracao: "-",
      tamanho: formatarTamanho(file.size),
      video_url: videoUrl,
      storage_path: storagePath
    };

    try {
      novasMidias.push(await salvarMidiaRemota(midiaBase));
    } catch (error) {
      console.warn("NÃ£o foi possÃ­vel salvar mÃ­dia no Supabase:", error);
      novasMidias.push(midiaBase);
    }
  }

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
    carregarBibliotecaRemota(true);
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

async function carregarBibliotecaRemota(forcarMensagem = false) {
  try {
    const [midiasRemotas, pontosRemotos] = await Promise.all([
      buscarMidiasRemoto(),
      buscarPontosRemoto()
    ]);

    if (midiasRemotas.length) {
      midias = midiasRemotas;
      salvarMidias();
    }

    pontosBiblioteca = pontosRemotos;
    renderizarMidias();
    renderizarPontos();
    formatarDataAtualizacao();
    if (forcarMensagem) mostrarMensagem("Biblioteca atualizada pelo Supabase.");
  } catch (error) {
    console.error(error);
    if (forcarMensagem) mostrarMensagem("Usando dados locais. Verifique as tabelas da biblioteca.");
  }
}

function iniciarBiblioteca() {
  midias = lerMidias();
  formatarDataAtualizacao();
  renderizarMidias();
  renderizarPontos();
  iniciarEventos();
  carregarBibliotecaRemota(false);

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

iniciarBiblioteca();
