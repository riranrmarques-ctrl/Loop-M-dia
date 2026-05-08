const SUPABASE_URL = "https://rgrwoboqryvwnqsvlrtj.supabase.co";
const SUPABASE_KEY = "sb_publishable_PYvzQu5T5Xzl_QF1J_qI4w_b9XF-aa3";

const BUCKET = "midias";
const TABELA_MIDIAS = "biblioteca";
const TABELA_PLAYLISTS = "playlists";
const TABELA_PONTOS = "pontos";
const TABELA_STATUS_PONTOS = "statuspontos";
const TABELA_VINCULOS = "playercliente";

const STORAGE_MIDIAS_KEY = "biblioteca_cache_v2";
const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

let midias = [];
let pontosBiblioteca = [];
let midiaArrastada = null;
let timerMensagem = null;
let supabaseClient = null;

const dataAtualizacao = document.getElementById("dataAtualizacao");
const btnAtualizarBiblioteca = document.getElementById("btnAtualizarBiblioteca");
const btnAdicionarMidia = document.getElementById("btnAdicionarMidia");
const inputMidia = document.getElementById("inputMidia");
const listaMidias = document.getElementById("listaMidias");
const listaPontosBiblioteca = document.getElementById("listaPontosBiblioteca");
const buscaPonto = document.getElementById("buscaPonto");
const dropGlobalBiblioteca = document.getElementById("dropGlobalBiblioteca");
const mensagemBiblioteca = document.getElementById("mensagemBiblioteca");

function carregarScript(src) {
  return new Promise((resolve, reject) => {
    const existente = document.querySelector(`script[src="${src}"]`);

    if (existente) {
      existente.addEventListener("load", resolve, { once: true });
      existente.addEventListener("error", reject, { once: true });
      if (window.supabase) resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function garantirSupabase() {
  if (supabaseClient) return supabaseClient;

  if (!window.supabase) {
    await carregarScript(SUPABASE_CDN);
  }

  if (!window.supabase) {
    throw new Error("Supabase não carregou. Confira o CDN no HTML.");
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return supabaseClient;
}

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
    return Array.isArray(salvas) ? salvas : [];
  } catch {
    return [];
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
  return String(
    ponto?.codigo ||
    ponto?.codigo_ponto ||
    ponto?.ponto_codigo ||
    ponto?.id_ponto ||
    ponto?.codigo_visual ||
    ponto?.id ||
    ""
  ).trim();
}

function obterNomePonto(ponto) {
  return String(ponto?.nome || ponto?.nome_painel || ponto?.titulo || ponto?.ambiente || obterCodigoPonto(ponto)).trim();
}

function pontoEstaAtivoBiblioteca(ponto = {}) {
  const status = String(ponto.status || ponto.status_final || ponto.status_evento || "").trim().toLowerCase();

  if (ponto.disponivel === false) return false;
  if (["inativo", "indisponivel", "indisponível", "offline", "suspensa", "suspenso"].includes(status)) return false;
  return true;
}

function normalizarPontoBiblioteca(ponto = {}) {
  const codigo = obterCodigoPonto(ponto);
  const nome = obterNomePonto(ponto) || codigo;

  return {
    codigo,
    nome,
    status: ponto.status || ponto.status_final || ponto.status_evento || "",
    disponivel: ponto.disponivel
  };
}

async function buscarMidiasRemoto() {
  const client = await garantirSupabase();

  const { data, error } = await client
    .from(TABELA_MIDIAS)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizarMidia);
}

async function buscarPontosRemoto() {
  const client = await garantirSupabase();

  const mapa = new Map();
  const adicionar = (ponto = {}, somenteAtivo = false) => {
    if (somenteAtivo && !pontoEstaAtivoBiblioteca(ponto)) return;

    const normalizado = normalizarPontoBiblioteca(ponto);
    const codigo = normalizado.codigo || normalizado.nome;
    if (!codigo) return;

    const existente = mapa.get(codigo);
    mapa.set(codigo, {
      codigo,
      nome: normalizado.nome || existente?.nome || codigo
    });
  };

  const consultas = [
    {
      tabela: TABELA_PONTOS,
      somenteAtivo: true,
      normalizar: (row) => row
    },
    {
      tabela: TABELA_STATUS_PONTOS,
      somenteAtivo: true,
      normalizar: (row) => ({
        codigo: row.ponto_codigo || row.codigo,
        nome: row.nome || row.ponto_codigo || row.codigo,
        status: row.status || row.evento
      })
    },
    {
      tabela: TABELA_PLAYLISTS,
      somenteAtivo: false,
      normalizar: (row) => ({
        codigo: row.codigo,
        nome: row.codigo
      })
    },
    {
      tabela: TABELA_VINCULOS,
      somenteAtivo: false,
      normalizar: (row) => ({
        codigo: row.ponto_codigo || row.codigo_ponto || row.codigo,
        nome: row.ponto_codigo || row.codigo_ponto || row.codigo
      })
    }
  ];

  const erros = [];

  for (const consulta of consultas) {
    const { data, error } = await client
      .from(consulta.tabela)
      .select("*");

    if (error) {
      erros.push(`${consulta.tabela}: ${error.message || "erro"}`);
      console.warn(`Falha ao buscar ${consulta.tabela} para biblioteca:`, error);
      continue;
    }

    (data || []).forEach((row) => adicionar(consulta.normalizar(row), consulta.somenteAtivo));
  }

  const pontos = Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  if (!pontos.length && erros.length) {
    mostrarMensagem(`Não encontrei pontos. ${erros[0]}`);
  }

  return pontos;
}

async function salvarMidiaRemota(midia) {
  const client = await garantirSupabase();

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
      const { data, error } = await client
      .from(TABELA_MIDIAS)
      .insert([payload])
      .select("*")
      .limit(1);

    if (!error) return normalizarMidia(data?.[0] || midia);
    ultimoErro = error;
  }

  throw ultimoErro || new Error("Não foi possível salvar mídia.");
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
    : `<div class="linha-vazia">Nenhuma mídia adicionada.</div>`;

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
  const base = pontosBiblioteca;

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
    const client = await garantirSupabase();

    const { error } = await client
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
      const client = await garantirSupabase();

      if (client) {
        storagePath = `biblioteca/${Date.now()}-${nomeLimpo}`;
        const { error: uploadError } = await client.storage
          .from(BUCKET)
          .upload(storagePath, file, {
            cacheControl: "86400",
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data } = client.storage.from(BUCKET).getPublicUrl(storagePath);
        videoUrl = data.publicUrl;
      }
    } catch (error) {
      console.warn("Upload da mídia falhou, mantendo local:", error);
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
      console.warn("Não foi possível salvar mídia no Supabase:", error);
      novasMidias.push(midiaBase);
    }
  }

  midias = [...novasMidias, ...midias];
  salvarMidias();
  renderizarMidias();
  formatarDataAtualizacao();
  mostrarMensagem(`${novasMidias.length} mídia(s) adicionada(s).`);
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
