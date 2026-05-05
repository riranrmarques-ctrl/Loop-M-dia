const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const BUCKET = "midias";

const TABELA = "playlists";
const TABELA_PONTOS = "pontos";
const TABELA_STATUS_PONTOS = "statuspontos";

const CACHE_PONTOS_KEY = "painel_pontos_cache_v11";
const CACHE_PONTOS_TTL = 30 * 60 * 1000;
const CACHE_PLAYLIST_PREFIX = "painel_playlist_cache_v10_";
const CACHE_PLAYLIST_TTL = 2 * 60 * 1000;

function limparCachesAntigos() {
  try {
    [
      "painel_pontos_cache_v1",
      "painel_pontos_cache_v2",
      "painel_pontos_cache_v3",
      "painel_pontos_cache_v4",
      "painel_pontos_cache_v5",
      "painel_pontos_cache_v6",
      "painel_pontos_cache_v7",
      "painel_pontos_cache_v8",
      "painel_pontos_cache_v9",
      "painel_pontos_cache_v10"
    ].forEach((key) => sessionStorage.removeItem(key));

    Object.keys(sessionStorage).forEach((key) => {
      if (
        key.startsWith("painel_playlist_cache_v1_") ||
        key.startsWith("painel_playlist_cache_v2_") ||
        key.startsWith("painel_playlist_cache_v3_") ||
        key.startsWith("painel_playlist_cache_v4_") ||
        key.startsWith("painel_playlist_cache_v5_") ||
        key.startsWith("painel_playlist_cache_v6_") ||
        key.startsWith("painel_playlist_cache_v7_") ||
        key.startsWith("painel_playlist_cache_v8_") ||
        key.startsWith("painel_playlist_cache_v9_")
      ) {
        sessionStorage.removeItem(key);
      }
    });
  } catch {
    return;
  }
}

limparCachesAntigos();

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const statusEl = document.querySelector(".status-topo") || document.getElementById("status");
const listaPontos = document.getElementById("listaPontos");
const btnBaixarContrato = document.getElementById("btnBaixarContrato");
const pontoDetalhe = document.getElementById("pontoDetalhe");
const pontosBox = document.querySelector(".pontos-box");

const codigoAtual = document.getElementById("codigoAtual");
const tituloPasta = document.getElementById("tituloPasta");

const btnVoltar = document.getElementById("btnVoltar");
const btnCopiarCodigo = document.getElementById("btnCopiarCodigo");
const btnEditarInfo = document.getElementById("btnEditarInfo");
const btnToggleDisponibilidade = document.getElementById("btnToggleDisponibilidade");
const btnNovoPonto = document.getElementById("btnNovoPonto");
const btnUpgradePlaylist = document.getElementById("btnUpgradePlaylist");
const inputUpgradePlaylist = document.getElementById("inputUpgradePlaylist");
const btnDeletarPonto = document.getElementById("btnDeletarPonto");

const modalEditar = document.getElementById("modalEditar");
const editNome = document.getElementById("editNome");
const editCidade = document.getElementById("editCidade");
const editEndereco = document.getElementById("editEndereco");

const editContratoInicio = document.getElementById("editContratoInicio");
const editContratoFim = document.getElementById("editContratoFim");
const editContratoParceriaSim = document.getElementById("editContratoParceriaSim");
const editContratoParceriaNao = document.getElementById("editContratoParceriaNao");
const editValorContrato = document.getElementById("editValorContrato");

const editResponsavelNome = document.getElementById("editResponsavelNome");
const editResponsavelCpf = document.getElementById("editResponsavelCpf");
const editResponsavelTelefone = document.getElementById("editResponsavelTelefone");
const editResponsavelEmail = document.getElementById("editResponsavelEmail");

const previewImagem = document.getElementById("previewImagem");
const inputImagem = document.getElementById("inputImagem");
const btnSalvarEdicao = document.getElementById("btnSalvarEdicao");
const btnFecharModal = document.getElementById("btnFecharModal");

let codigoSelecionado = null;
let pontosMap = {};
let dragIndex = null;
let arquivoImagemEdicao = null;
let painelIniciado = false;
let carregandoPontos = false;
let carregandoPlaylist = false;
let criandoNovoPonto = false;

let posicaoImagemAtual = { x: 50, y: 50 };
let arrastandoPreview = false;

function setStatus(texto, tipo = "normal") {
  if (!statusEl) return;

  statusEl.textContent = texto;
  statusEl.classList.remove("ok", "erro", "normal");
  statusEl.classList.add(tipo);

  if (!statusEl.classList.contains("status-box")) {
    statusEl.classList.add("status-box");
  }
}

function escapeHtml(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizarCodigo(codigo) {
  return String(codigo || "").trim().toUpperCase();
}

function obterImagemPonto(ponto) {
  return (
    ponto?.imagem_url ||
    ponto?.imagem ||
    ponto?.foto_url ||
    ponto?.imagem_ponto ||
    "https://placehold.co/600x320/png"
  );
}

function obterCodigoPonto(ponto) {
  return normalizarCodigo(
    ponto?.codigo ||
    ponto?.codigo_ponto ||
    ponto?.ponto_codigo ||
    ponto?.codigo_visual ||
    ponto?.id_ponto ||
    ponto?.id ||
    ""
  );
}

function obterNomePonto(ponto, codigo) {
  return (
    ponto?.nome ||
    ponto?.nome_local ||
    ponto?.nome_painel ||
    ponto?.titulo ||
    ponto?.ambiente ||
    codigo ||
    "Carregando..."
  );
}

function obterCidadePonto(ponto) {
  return ponto?.cidade || ponto?.cidade_regiao || ponto?.municipio || ponto?.localidade || "";
}

function obterEnderecoPonto(ponto) {
  return ponto?.endereco || ponto?.endereco_completo || ponto?.endereço || ponto?.local || "";
}

function obterUltimoPingPonto(ponto) {
  return (
    ponto?.ultimo_ping ||
    ponto?.last_ping ||
    ponto?.updated_at ||
    ponto?.data_ping ||
    ponto?.created_at ||
    null
  );
}

function obterLocalizacaoPonto(cidade, endereco = "") {
  const cidadeFinal = String(cidade || "").trim();
  const enderecoFinal = String(endereco || "").trim();

  if (cidadeFinal && enderecoFinal) {
    return `<strong>${escapeHtml(cidadeFinal)}</strong> | ${escapeHtml(enderecoFinal)}`;
  }

  if (cidadeFinal) {
    return `<strong>${escapeHtml(cidadeFinal)}</strong>`;
  }

  if (enderecoFinal) {
    return escapeHtml(enderecoFinal);
  }

  return "Localização não definida";
}

function pontoEstaDisponivel(ponto) {
  const statusCliente = String(ponto?.status || ponto?.situacao || "").toLowerCase().trim();

  if (ponto?.disponivel === false) return false;
  if (statusCliente === "inativo") return false;
  return true;
}

function normalizarStatusHistorico(item) {
  return String(item?.status || item?.evento || "")
    .toLowerCase()
    .trim();
}

function obterDataHistorico(item) {
  return item?.ultimo_ping || item?.data_hora || item?.created_at || null;
}

function statusEhAtivo(status) {
  const valor = String(status || "").toLowerCase().trim();
  return valor === "ativo" || valor === "online" || valor === "conectou";
}

function statusEhInativo(status) {
  const valor = String(status || "").toLowerCase().trim();
  return valor === "inativo" || valor === "offline" || valor === "desconectou";
}

function calcularStatusInfo(ponto) {
  if (!pontoEstaDisponivel(ponto)) {
    return {
      texto: "Indisponível",
      detalhe: "Indisponível",
      ativo: false,
      classe: "indisponivel",
      desde: null
    };
  }

  const status = String(ponto?.status_evento || ponto?.status_final || ponto?.status || "")
    .toLowerCase()
    .trim();

  const ultimoPing = ponto?.ultimo_ping || obterUltimoPingPonto(ponto);
  const horario = ultimoPing ? formatarDataHora(ultimoPing) : "sem histórico";

  if (statusEhAtivo(status)) {
    return {
      texto: "Ativo",
      detalhe: `Ativo desde ${horario}`,
      ativo: true,
      classe: "ativo",
      desde: ultimoPing
    };
  }

  if (statusEhInativo(status)) {
    return {
      texto: "Inativo",
      detalhe: `Inativo desde ${horario}`,
      ativo: false,
      classe: "inativo",
      desde: ultimoPing
    };
  }

  return {
    texto: "Inativo",
    detalhe: "Inativo desde sem histórico",
    ativo: false,
    classe: "inativo",
    desde: null
  };
}

function formatarData(valor) {
  if (!valor) return "Sem data";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Sem data";

  return data.toLocaleDateString("pt-BR");
}

function formatarDataHora(valor) {
  if (!valor) return "Sem data";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Sem data";

  return data.toLocaleString("pt-BR");
}

function calcularStatusPorHistorico(historicoStatus = [], ponto = {}) {
  if (!pontoEstaDisponivel(ponto)) {
    return {
      texto: "Indisponível",
      detalhe: "Indisponível",
      ativo: false,
      classe: "indisponivel"
    };
  }

  const ultimoEvento = Array.isArray(historicoStatus) ? historicoStatus[0] : null;
  const status = normalizarStatusHistorico(ultimoEvento);
  const dataEventoRaw = obterDataHistorico(ultimoEvento);
  const horario = dataEventoRaw ? formatarDataHora(dataEventoRaw) : "sem histórico";

  if (statusEhAtivo(status)) {
    return {
      texto: "Ativo",
      detalhe: `Ativo desde ${horario}`,
      ativo: true,
      classe: "ativo"
    };
  }

  if (statusEhInativo(status)) {
    return {
      texto: "Inativo",
      detalhe: `Inativo desde ${horario}`,
      ativo: false,
      classe: "inativo"
    };
  }

  return calcularStatusInfo(ponto);
}

function obterStatusPontoParaPainel(codigo, ponto) {
  return calcularStatusInfo(ponto);
}

function atualizarStatusDetalhePonto(statusInfo) {
  const statusPonto = document.getElementById("statusPonto");
  if (!statusPonto || !statusInfo) return;

  statusPonto.textContent = statusInfo.detalhe || statusInfo.texto;
  statusPonto.classList.remove("ativo", "inativo", "indisponivel");
  statusPonto.classList.add(statusInfo.classe);
  statusPonto.dataset.status = String(statusInfo.texto || "").toLowerCase();
}

function itemEstaInativo(item) {
  const dataFim = item?.data_fim || item?.fim_exibicao || null;
  if (!dataFim) return false;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const fim = new Date(dataFim);
  if (Number.isNaN(fim.getTime())) return false;

  fim.setHours(23, 59, 59, 999);
  return fim < hoje;
}

function obterTextoEventoConexao(item) {
  const status = normalizarStatusHistorico(item);

  if (statusEhAtivo(status)) return "Ativo";
  if (statusEhInativo(status)) return "Inativo";

  return status || "Sem status";
}

function lerCachePontos() {
  try {
    const bruto = sessionStorage.getItem(CACHE_PONTOS_KEY);
    if (!bruto) return null;

    const cache = JSON.parse(bruto);
    const criadoEm = Number(cache.criadoEm || 0);
    const pontos = Array.isArray(cache.pontos) ? cache.pontos : [];

    if (!pontos.length) return null;

    return {
      pontos,
      fresco: Date.now() - criadoEm < CACHE_PONTOS_TTL
    };
  } catch {
    return null;
  }
}

function salvarCachePontos(pontos) {
  try {
    sessionStorage.setItem(CACHE_PONTOS_KEY, JSON.stringify({
      criadoEm: Date.now(),
      pontos
    }));
  } catch {
    return;
  }
}

function obterChaveCachePlaylist(codigo) {
  return `${CACHE_PLAYLIST_PREFIX}${codigo}`;
}

function lerCachePlaylist(codigo) {
  try {
    const bruto = sessionStorage.getItem(obterChaveCachePlaylist(codigo));
    if (!bruto) return null;

    const cache = JSON.parse(bruto);
    const criadoEm = Number(cache.criadoEm || 0);

    return {
      playlist: Array.isArray(cache.playlist) ? cache.playlist : [],
      historico: Array.isArray(cache.historico) ? cache.historico : [],
      fresco: Date.now() - criadoEm < CACHE_PLAYLIST_TTL
    };
  } catch {
    return null;
  }
}

function salvarCachePlaylist(codigo, playlist, historico) {
  try {
    sessionStorage.setItem(obterChaveCachePlaylist(codigo), JSON.stringify({
      criadoEm: Date.now(),
      playlist,
      historico
    }));
  } catch {
    return;
  }
}

function limparCachePlaylist(codigo) {
  try {
    sessionStorage.removeItem(obterChaveCachePlaylist(codigo));
  } catch {
    return;
  }
}

function atualizarCachePonto(codigo, alteracoes) {
  if (!codigo || !pontosMap[codigo]) return;

  pontosMap[codigo] = {
    ...pontosMap[codigo],
    ...alteracoes
  };

  salvarCachePontos(Object.values(pontosMap));
}

function aplicarPosicaoImagem(el, posicao) {
  if (!el || !posicao) return;
  el.style.objectPosition = `${posicao.x}% ${posicao.y}%`;
}

async function uploadArquivoEmBucket(file, path, opcoes = {}) {
  const { error } = await supabaseClient.storage
    .from(BUCKET)
    .upload(path, file, opcoes);

  if (error) throw error;

  const { data } = supabaseClient.storage.from(BUCKET).getPublicUrl(path);

  return {
    bucket: BUCKET,
    publicUrl: data.publicUrl
  };
}

async function uploadImagemPonto(file, codigo) {
  const extensao = (file.name.split(".").pop() || "jpg").toLowerCase();
  const nomeArquivo = `${codigo}/${Date.now()}.${extensao}`;

  const resultado = await uploadArquivoEmBucket(file, nomeArquivo, {
    cacheControl: "86400",
    upsert: true
  });

  return resultado.publicUrl;
}

function limparNomeArquivo(nome) {
  return String(nome || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function detectarTipoArquivoPlaylist(file) {
  const nome = String(file?.name || "").toLowerCase();

  if (
    nome.endsWith(".jpg") ||
    nome.endsWith(".jpeg") ||
    nome.endsWith(".png") ||
    nome.endsWith(".webp")
  ) {
    return "imagem";
  }

  if (nome.endsWith(".txt")) return "site";

  return "video";
}

function gerarCodigoPontoAleatorio() {
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numeros = "0123456789";

  return (
    letras[Math.floor(Math.random() * letras.length)] +
    numeros[Math.floor(Math.random() * numeros.length)] +
    letras[Math.floor(Math.random() * letras.length)] +
    numeros[Math.floor(Math.random() * numeros.length)] +
    letras[Math.floor(Math.random() * letras.length)] +
    numeros[Math.floor(Math.random() * numeros.length)] +
    letras[Math.floor(Math.random() * letras.length)]
  );
}

async function obterCodigoPontoUnico() {
  const usadosLocais = new Set(Object.keys(pontosMap));

  for (let tentativa = 0; tentativa < 80; tentativa++) {
    const codigo = gerarCodigoPontoAleatorio();

    if (usadosLocais.has(codigo)) continue;

    const { data, error } = await supabaseClient
      .from(TABELA_PONTOS)
      .select("codigo")
      .eq("codigo", codigo)
      .maybeSingle();

    if (error) throw error;
    if (!data) return codigo;
  }

  throw new Error("Não foi possível gerar um código de ponto único.");
}

async function criarNovoPonto() {
  if (criandoNovoPonto) return;

  criandoNovoPonto = true;

  if (btnNovoPonto) btnNovoPonto.disabled = true;

  try {
    setStatus("Criando novo ponto...", "normal");

    const codigoLivre = await obterCodigoPontoUnico();

    const payloads = [
      {
        codigo: codigoLivre,
        nome: codigoLivre,
        cidade: "",
        endereco: "",
        imagem_url: "https://placehold.co/600x320/png",
        status: "ativo",
        disponivel: true
      },
      {
        codigo: codigoLivre,
        nome_local: codigoLivre,
        cidade_regiao: "",
        endereco_completo: "",
        imagem_url: "https://placehold.co/600x320/png",
        status: "ativo",
        disponivel: true
      },
      {
        codigo: codigoLivre,
        nome: codigoLivre
      }
    ];

    let erroFinal = null;

    for (const payload of payloads) {
      const { error } = await supabaseClient
        .from(TABELA_PONTOS)
        .insert([payload]);

      if (!error) {
        erroFinal = null;
        break;
      }

      erroFinal = error;
      console.warn("Falha ao criar ponto com payload:", payload, error);
    }

    if (erroFinal) throw erroFinal;

    limparCachePlaylist(codigoLivre);
    sessionStorage.removeItem(CACHE_PONTOS_KEY);

    await carregarPontosRemoto();
    abrirPonto(codigoLivre);
    setStatus(`Novo ponto ${codigoLivre} criado com sucesso`, "ok");
  } catch (error) {
    console.error(error);
    setStatus("Erro ao criar novo ponto", "erro");
  } finally {
    criandoNovoPonto = false;
    if (btnNovoPonto) btnNovoPonto.disabled = false;
  }
}

async function obterProximaOrdemPlaylist() {
  const { data, error } = await supabaseClient
    .from(TABELA)
    .select("ordem")
    .eq("codigo", codigoSelecionado)
    .order("ordem", { ascending: false })
    .limit(1);

  if (error) {
    console.warn("Não foi possível buscar ordem da playlist:", error);
    return 1;
  }

  return Number(data?.[0]?.ordem || 0) + 1;
}

async function enviarMaterialDiretoPlaylist(file) {
  if (!codigoSelecionado) {
    setStatus("Selecione um ponto primeiro", "erro");
    return;
  }

  if (!file) {
    setStatus("Selecione um arquivo", "erro");
    return;
  }

  let path = "";

  try {
    setStatus("Enviando material...", "normal");

    const nomeLimpo = limparNomeArquivo(file.name);
    path = `playlists/${codigoSelecionado}/${Date.now()}-${nomeLimpo}`;
    const tipo = detectarTipoArquivoPlaylist(file);

    const uploadResultado = await uploadArquivoEmBucket(file, path, {
      cacheControl: "86400",
      upsert: false
    });

    const ordem = await obterProximaOrdemPlaylist();

    const payload = {
      codigo: codigoSelecionado,
      nome: file.name,
      titulo_arquivo: file.name,
      video_url: uploadResultado.publicUrl,
      storage_path: path,
      codigo_cliente: null,
      tipo,
      ordem
    };

    const { data, error } = await supabaseClient
      .from(TABELA)
      .insert([payload])
      .select();

    if (error) {
      console.error("ERRO INSERT PLAYLIST:", error);
      await supabaseClient.storage.from(BUCKET).remove([path]);
      setStatus(`Erro ao gravar playlist: ${error.message || "falha no banco"}`, "erro");
      return;
    }

    console.log("ITEM INSERIDO:", data);

    limparCachePlaylist(codigoSelecionado);
    await carregarPlaylist({ forcarAtualizacao: true });

    setStatus("Material enviado para a playlist", "ok");
  } catch (error) {
    console.error("Erro ao enviar material:", error);

    if (path) {
      await supabaseClient.storage.from(BUCKET).remove([path]);
    }

    setStatus(`Erro ao enviar material: ${error.message || "falha desconhecida"}`, "erro");
  }
}

function obterChavePosicaoImagem(codigo) {
  return `ponto_imagem_posicao_${codigo}`;
}

function salvarPosicaoImagem(codigo, posicao) {
  if (!codigo) return;
  sessionStorage.setItem(obterChavePosicaoImagem(codigo), JSON.stringify(posicao));
}

function lerPosicaoImagem(codigo) {
  if (!codigo) return { x: 50, y: 50 };

  try {
    const salva = sessionStorage.getItem(obterChavePosicaoImagem(codigo));
    if (!salva) return { x: 50, y: 50 };

    const obj = JSON.parse(salva);
    const x = Number(obj.x);
    const y = Number(obj.y);

    return {
      x: Number.isFinite(x) ? x : 50,
      y: Number.isFinite(y) ? y : 50
    };
  } catch {
    return { x: 50, y: 50 };
  }
}

function atualizarVisualDisponibilidade(disponivel) {
  if (!btnToggleDisponibilidade) return;

  const texto = btnToggleDisponibilidade.querySelector(".toggle-texto");

  btnToggleDisponibilidade.classList.toggle("ativo", disponivel);
  btnToggleDisponibilidade.setAttribute("aria-pressed", disponivel ? "true" : "false");

  if (texto) {
    texto.textContent = disponivel ? "Disponível" : "Indisponível";
  }
}

async function alternarDisponibilidadePonto() {
  if (!codigoSelecionado) return;

  const ponto = pontosMap[codigoSelecionado] || {};
  const disponivelAtual = pontoEstaDisponivel(ponto);
  const novoStatus = !disponivelAtual;

  atualizarVisualDisponibilidade(novoStatus);
  atualizarCachePonto(codigoSelecionado, {
    disponivel: novoStatus,
    status: novoStatus ? "ativo" : "inativo"
  });

  try {
    setStatus(novoStatus ? "Marcando como disponível..." : "Marcando como indisponível...", "normal");

    const tentativas = [
      { disponivel: novoStatus },
      { status: novoStatus ? "ativo" : "inativo" },
      { disponivel: novoStatus, status: novoStatus ? "ativo" : "inativo" }
    ];

    let errorFinal = null;

    for (const payload of tentativas) {
      const { error } = await supabaseClient
        .from(TABELA_PONTOS)
        .update(payload)
        .eq("codigo", codigoSelecionado);

      if (!error) {
        errorFinal = null;
        break;
      }

      errorFinal = error;
      console.warn("Falha ao atualizar ponto com payload:", payload, error);
    }

    if (errorFinal) throw errorFinal;

    sessionStorage.removeItem(CACHE_PONTOS_KEY);
    renderizarCardsPontos(Object.values(pontosMap));

    const statusInfo = obterStatusPontoParaPainel(codigoSelecionado, pontosMap[codigoSelecionado]);
    atualizarStatusDetalhePonto(statusInfo);
    setStatus(novoStatus ? "Ponto disponível" : "Ponto indisponível", "ok");
  } catch (error) {
    console.error("Erro ao atualizar disponibilidade:", error);

    atualizarVisualDisponibilidade(disponivelAtual);
    atualizarCachePonto(codigoSelecionado, {
      disponivel: disponivelAtual,
      status: disponivelAtual ? "ativo" : "inativo"
    });

    renderizarCardsPontos(Object.values(pontosMap));

    const statusInfo = obterStatusPontoParaPainel(codigoSelecionado, pontosMap[codigoSelecionado]);
    atualizarStatusDetalhePonto(statusInfo);
    setStatus("Erro ao atualizar disponibilidade", "erro");
  }
}

async function buscarStatusPontosRemoto() {
  const consultas = [
    { filtro: "ponto_codigo", ordem: "ultimo_ping" },
    { filtro: "codigo", ordem: "data_hora" },
    { filtro: "ponto_codigo", ordem: "created_at" }
  ];

  for (const consulta of consultas) {
    const { data, error } = await supabaseClient
      .from(TABELA_STATUS_PONTOS)
      .select("*")
      .order(consulta.ordem, { ascending: false });

    if (!error) {
      const statusPorCodigo = {};

      (data || []).forEach((item) => {
        const codigo = normalizarCodigo(
          item.ponto_codigo ||
          item.codigo ||
          item.codigo_ponto ||
          ""
        );

        if (!codigo || statusPorCodigo[codigo]) return;

        statusPorCodigo[codigo] = item;
      });

      return statusPorCodigo;
    }

    console.warn("Status dos pontos não carregou:", error);
  }

  return {};
}

async function buscarPontosRemoto() {
  const { data: pontosData, error: pontosError } = await supabaseClient
    .from(TABELA_PONTOS)
    .select("*")
    .order("codigo", { ascending: true });

  if (pontosError) throw pontosError;

  const statusPorCodigo = await buscarStatusPontosRemoto();

  return (pontosData || []).map((ponto) => {
    const codigo = obterCodigoPonto(ponto);
    const statusMaisRecente = statusPorCodigo[codigo];
    const statusEvento = normalizarStatusHistorico(statusMaisRecente) || ponto.status || "";

    return {
      ...ponto,
      codigo,
      nome: obterNomePonto(ponto, codigo),
      cidade: obterCidadePonto(ponto),
      endereco: obterEnderecoPonto(ponto),
      imagem_url: obterImagemPonto(ponto),
      ultimo_ping: obterDataHistorico(statusMaisRecente) || obterUltimoPingPonto(ponto),
      status_evento: statusEvento,
      status_final: statusEvento,
      disponivel: pontoEstaDisponivel(ponto)
    };
  });
}

function montarCardPonto(ponto) {
  const codigo = obterCodigoPonto(ponto);
  const nome = obterNomePonto(ponto, codigo);
  const cidade = obterCidadePonto(ponto);
  const endereco = obterEnderecoPonto(ponto);
  const statusInfo = obterStatusPontoParaPainel(codigo, ponto);
  const imagem = obterImagemPonto(ponto);

  return `
    <div class="card-ponto ${statusInfo.classe === "indisponivel" ? "card-indisponivel" : ""}" data-codigo="${escapeHtml(codigo)}">
      <div class="card-status-topo">
        <span class="status-bolinha ${statusInfo.classe}"></span>
        <span class="card-status ${statusInfo.classe}">${escapeHtml(statusInfo.texto)}</span>
      </div>

      <div class="card-imagem-box">
        <img
          class="card-imagem"
          src="${escapeHtml(imagem)}"
          alt="${escapeHtml(nome)}"
          loading="lazy"
          decoding="async"
        >
      </div>

      <div class="card-conteudo">
        <div class="card-nome"><strong>${escapeHtml(nome)}</strong></div>

        <div class="card-info-linha">
          <div class="card-cidade">${obterLocalizacaoPonto(cidade, endereco)}</div>

          <div class="card-codigo-area">
            <div class="card-codigo" title="Clique para copiar">${escapeHtml(codigo)}</div>
          </div>
        </div>
      </div>

      <div class="card-acoes">
        <button class="btn-abrir" data-codigo="${escapeHtml(codigo)}" type="button">Abrir pasta</button>
      </div>
    </div>
  `;
}

function ativarEventosCardsRenderizados() {
  document.querySelectorAll(".btn-abrir").forEach((btn) => {
    btn.onclick = (event) => {
      event.stopPropagation();
      abrirPonto(btn.dataset.codigo);
    };
  });

  document.querySelectorAll(".card-codigo").forEach((codigoEl) => {
    codigoEl.onclick = async (event) => {
      event.stopPropagation();

      const card = codigoEl.closest(".card-ponto");
      const codigo = String(card?.dataset.codigo || codigoEl.textContent || "").trim();

      if (!codigo) return;

      try {
        await navigator.clipboard.writeText(codigo);
        setStatus("Código copiado", "ok");
      } catch {
        setStatus("Erro ao copiar código", "erro");
      }
    };
  });
}

function renderizarCardsPontos(lista) {
  pontosMap = {};

  const ordenados = [...lista].sort((a, b) => {
    const ordemA = Number(a.ordem || 999999);
    const ordemB = Number(b.ordem || 999999);

    if (ordemA !== ordemB) return ordemA - ordemB;

    return obterCodigoPonto(a).localeCompare(obterCodigoPonto(b), "pt-BR");
  });

  ordenados.forEach((ponto) => {
    const codigo = obterCodigoPonto(ponto);
    if (codigo) pontosMap[codigo] = ponto;
  });

  if (pontosBox) {
    pontosBox.innerHTML = ordenados.map((ponto) => montarCardPonto(ponto)).join("");

    ativarEventosCardsRenderizados();

    document.querySelectorAll(".card-imagem").forEach((img) => {
      img.setAttribute("draggable", "false");
    });

    ativarDragPontos();

    document.querySelectorAll(".card-imagem").forEach((imagemEl) => {
      const card = imagemEl.closest(".card-ponto");
      const codigo = String(card?.dataset.codigo || "").trim();
      aplicarPosicaoImagem(imagemEl, lerPosicaoImagem(codigo));
    });
  }
}

function abrirPonto(codigo) {
  codigoSelecionado = normalizarCodigo(codigo);

  const ponto = pontosMap[codigoSelecionado] || {};
  const nome = obterNomePonto(ponto, codigoSelecionado);
  const cidade = obterCidadePonto(ponto);
  const endereco = obterEnderecoPonto(ponto);

  if (listaPontos) listaPontos.style.display = "none";
  if (pontoDetalhe) pontoDetalhe.style.display = "block";

  document.body.classList.add("modo-detalhe");

  if (codigoAtual) {
    codigoAtual.textContent = codigoSelecionado;
    codigoAtual.title = "Clique para copiar";
  }

  if (tituloPasta) {
    tituloPasta.innerHTML = `<strong>${escapeHtml(nome)}</strong>`;
  }

  const cidadePonto = document.getElementById("cidadePonto");
  const enderecoPonto = document.getElementById("enderecoPonto");
  const imagemPonto = document.getElementById("imagemPonto");

  const statusInfo = obterStatusPontoParaPainel(codigoSelecionado, ponto);
  const posicaoSalva = lerPosicaoImagem(codigoSelecionado);

  atualizarVisualDisponibilidade(pontoEstaDisponivel(ponto));

  if (cidadePonto) cidadePonto.innerHTML = obterLocalizacaoPonto(cidade, endereco);
  if (enderecoPonto) enderecoPonto.textContent = endereco || "";

  atualizarStatusDetalhePonto(statusInfo);

  if (imagemPonto) {
    imagemPonto.loading = "lazy";
    imagemPonto.decoding = "async";
    imagemPonto.src = obterImagemPonto(ponto);
    imagemPonto.alt = nome;
    aplicarPosicaoImagem(imagemPonto, posicaoSalva);
  }

  carregarPlaylist({ forcarAtualizacao: true });
}

function obterNomeArquivoPlaylist(item) {
  if (item.titulo_arquivo && String(item.titulo_arquivo).trim()) {
    return String(item.titulo_arquivo).trim();
  }

  if (item.storage_path) {
    const partes = String(item.storage_path).split("/");
    return partes[partes.length - 1] || "Arquivo";
  }

  if (item.video_url) {
    const partes = String(item.video_url).split("/");
    return partes[partes.length - 1]?.split("?")[0] || "Arquivo";
  }

  if (item.nome && String(item.nome).trim()) {
    return String(item.nome).trim();
  }

  return "Arquivo";
}

function obterNomeClientePlaylist(item) {
  if (item.nome_cliente && String(item.nome_cliente).trim()) {
    return String(item.nome_cliente).trim();
  }

  if (item.nome && String(item.nome).trim()) {
    return String(item.nome).trim();
  }

  if (item.codigo_cliente && String(item.codigo_cliente).trim()) {
    return `Cliente ${String(item.codigo_cliente).trim()}`;
  }

  return "Cliente não informado";
}

function obterUrlDownloadPlaylist(item) {
  return item.video_url || item.arquivo_url || item.url || "";
}

function montarItemPlaylist(item, index) {
  const nomeArquivo = obterNomeArquivoPlaylist(item);
  const nomeCliente = obterNomeClientePlaylist(item);
  const urlDownload = obterUrlDownloadPlaylist(item);

  return `
    <div class="playlist-item" draggable="true" data-index="${index}" data-id="${item.id}">
      <div class="playlist-item-linha">
        <div class="playlist-item-handle" title="Arrastar">⋮⋮</div>

        <div class="playlist-item-ordem">${index + 1}.</div>

        <div class="playlist-item-nome" title="${escapeHtml(nomeCliente)} - ${escapeHtml(nomeArquivo)}">
          <strong>${escapeHtml(nomeCliente)}</strong>
          <small>${escapeHtml(nomeArquivo)}</small>
        </div>

        <div class="playlist-item-data playlist-item-postado">
          ${formatarDataHora(item.created_at || item.data_inicio)}
        </div>

        <div class="playlist-item-data playlist-item-encerramento">
          ${formatarData(item.data_fim)}
        </div>

        <div class="playlist-item-acoes-laterais">
          <button class="playlist-acao btn-renomear-item" type="button" data-id="${item.id}" data-nome="${escapeHtml(nomeArquivo)}" title="Renomear">✎</button>
          <a class="playlist-acao btn-baixar-item" href="${escapeHtml(urlDownload || "#")}" download target="_blank" rel="noopener" title="Baixar">↓</a>
          <button class="playlist-acao btn-excluir-item" type="button" data-id="${item.id}" title="Excluir">×</button>
        </div>
      </div>
    </div>
  `;
}

function montarItemHistoricoEncerramento(item, index) {
  const nomeArquivo = obterNomeArquivoPlaylist(item);
  const nomeCliente = obterNomeClientePlaylist(item);

  return `
    <div class="historico-item">
      <span class="historico-item-ordem">${index + 1}.</span>
      <span class="historico-item-nome">${escapeHtml(nomeCliente)} | ${escapeHtml(nomeArquivo)}</span>
      <span class="historico-item-valor">${formatarData(item.data_fim)}</span>
    </div>
  `;
}

function montarItemHistoricoStatus(item, index) {
  const textoEvento = obterTextoEventoConexao(item);
  const eventoNormalizado = normalizarStatusHistorico(item);
  const classe = statusEhAtivo(eventoNormalizado)
    ? "ativo"
    : statusEhInativo(eventoNormalizado)
      ? "inativo"
      : "";

  const data = formatarDataHora(obterDataHistorico(item));

  return `
    <div class="historico-item">
      <span class="historico-item-ordem">${index + 1}.</span>
      <span class="historico-item-nome historico-status ${classe}">
        ${escapeHtml(textoEvento)} em ${escapeHtml(data)}
      </span>
      <span class="historico-item-valor">${escapeHtml(data)}</span>
    </div>
  `;
}

function obterContainerHistoricoEncerramento() {
  return (
    document.getElementById("historicoEncerramento") ||
    document.getElementById("playlistInativaEncerramento") ||
    document.getElementById("playlistInativa")
  );
}

function obterContainerHistoricoStatus() {
  return (
    document.getElementById("historicoStatus") ||
    document.getElementById("playlistInativaStatus")
  );
}

function renderizarPlaylistDados(lista, historicoStatus) {
  const ponto = pontosMap[codigoSelecionado] || {};
  const statusInfo = calcularStatusPorHistorico(historicoStatus, ponto);
  atualizarStatusDetalhePonto(statusInfo);

  const ativos = lista.filter((item) => !itemEstaInativo(item));
  const inativos = lista.filter((item) => itemEstaInativo(item));

  const playlistAtiva = document.getElementById("playlistAtiva");
  const historicoEncerramento = obterContainerHistoricoEncerramento();
  const historicoStatusEl = obterContainerHistoricoStatus();

  if (playlistAtiva) {
    playlistAtiva.innerHTML = ativos.length
      ? ativos.map((item, index) => montarItemPlaylist(item, index)).join("")
      : `<div class="playlist-vazia">Nenhum item ativo</div>`;
  }

  if (historicoEncerramento) {
    historicoEncerramento.innerHTML = inativos.length
      ? inativos.map((item, index) => montarItemHistoricoEncerramento(item, index)).join("")
      : `<div class="playlist-vazia">Sem histórico</div>`;
  }

  if (historicoStatusEl) {
    historicoStatusEl.innerHTML = historicoStatus.length
      ? historicoStatus.map((item, index) => montarItemHistoricoStatus(item, index)).join("")
      : `<div class="playlist-vazia">Sem histórico</div>`;
  }

  ativarDrag(ativos);
  ativarRenomearItens();
  ativarExclusaoItens();
}

async function buscarHistoricoStatusPonto(codigo) {
  const consultasHistorico = [
    { filtro: "ponto_codigo", ordem: "ultimo_ping", colunas: "*" },
    { filtro: "codigo", ordem: "data_hora", colunas: "*" },
    { filtro: "ponto_codigo", ordem: "created_at", colunas: "*" }
  ];

  for (const consulta of consultasHistorico) {
    const { data, error } = await supabaseClient
      .from(TABELA_STATUS_PONTOS)
      .select(consulta.colunas)
      .eq(consulta.filtro, codigo)
      .order(consulta.ordem, { ascending: false })
      .limit(30);

    if (!error) return data || [];

    console.warn(`Erro ao buscar histórico usando ${consulta.ordem}:`, error);
  }

  return [];
}

async function buscarPlaylistRemota(codigo) {
  const { data: playlistData, error: playlistError } = await supabaseClient
    .from(TABELA)
    .select("*")
    .eq("codigo", codigo)
    .order("ordem", { ascending: true });

  if (playlistError) throw playlistError;

  const historicoData = await buscarHistoricoStatusPonto(codigo);

  return {
    playlist: playlistData || [],
    historico: historicoData || []
  };
}

async function carregarPlaylist(opcoes = {}) {
  if (!codigoSelecionado || carregandoPlaylist) return;

  const forcarAtualizacao = opcoes.forcarAtualizacao === true;
  const codigo = codigoSelecionado;
  const cache = lerCachePlaylist(codigo);

  if (!forcarAtualizacao && cache) {
    renderizarPlaylistDados(cache.playlist, cache.historico);
    setStatus(cache.fresco ? "Painel Ativo" : "Playlist em cache. Atualização pendente.", cache.fresco ? "ok" : "normal");

    if (cache.fresco) return;
  } else if (!cache) {
    setStatus("Carregando playlist...", "normal");
  }

  carregandoPlaylist = true;

  try {
    const dados = await buscarPlaylistRemota(codigo);

    if (codigoSelecionado !== codigo) return;

    salvarCachePlaylist(codigo, dados.playlist, dados.historico);
    renderizarPlaylistDados(dados.playlist, dados.historico);
    setStatus("Painel Ativo", "ok");
  } catch (error) {
    console.error(error);

    if (cache) {
      setStatus("Painel Ativo", "ok");
      return;
    }

    setStatus("Erro ao carregar playlist", "erro");
  } finally {
    carregandoPlaylist = false;
  }
}

function ativarRenomearItens() {
  document.querySelectorAll(".btn-renomear-item").forEach((btn) => {
    btn.onclick = async (event) => {
      event.stopPropagation();

      const id = btn.dataset.id;
      const nomeAtual = btn.dataset.nome || "";

      if (!id) return;

      const novoNome = window.prompt("Digite o novo nome do arquivo:", nomeAtual);
      if (novoNome === null) return;

      const nomeFinal = novoNome.trim();

      if (!nomeFinal) {
        setStatus("Digite um nome válido", "erro");
        return;
      }

      const tentativasUpdate = [
        { titulo_arquivo: nomeFinal },
        { nome: nomeFinal }
      ];

      let updateError = null;

      for (const payload of tentativasUpdate) {
        const { error } = await supabaseClient
          .from(TABELA)
          .update(payload)
          .eq("id", id);

        if (!error) {
          updateError = null;
          break;
        }

        updateError = error;
        console.warn("Falha ao renomear com payload:", payload, error);
      }

      if (updateError) {
        console.error(updateError);
        setStatus("Erro ao renomear arquivo", "erro");
        return;
      }

      limparCachePlaylist(codigoSelecionado);
      setStatus("Arquivo renomeado", "ok");
      carregarPlaylist({ forcarAtualizacao: true });
    };
  });
}

async function ativarExclusaoItens() {
  document.querySelectorAll(".btn-excluir-item").forEach((btn) => {
    btn.onclick = async (event) => {
      event.stopPropagation();

      const id = btn.dataset.id;
      if (!id) return;

      const confirmar = window.confirm("Deseja excluir este item da playlist?");
      if (!confirmar) return;

      const { error } = await supabaseClient
        .from(TABELA)
        .delete()
        .eq("id", id);

      if (error) {
        console.error(error);
        setStatus("Erro ao excluir item", "erro");
        return;
      }

      limparCachePlaylist(codigoSelecionado);
      setStatus("Item excluído", "ok");
      carregarPlaylist({ forcarAtualizacao: true });
    };
  });
}

function limparEstadosDrag() {
  document.querySelectorAll("#playlistAtiva .playlist-item").forEach((el) => {
    el.classList.remove("drag-over", "drop-animating");
  });
}

function ativarDrag(lista) {
  const items = document.querySelectorAll("#playlistAtiva .playlist-item");

  items.forEach((item) => {
    item.addEventListener("dragstart", () => {
      dragIndex = Number(item.dataset.index);
      item.classList.add("dragging");
      document.body.classList.add("playlist-drag-ativa");
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
      document.body.classList.remove("playlist-drag-ativa");
      limparEstadosDrag();
      dragIndex = null;
    });

    item.addEventListener("dragover", (event) => {
      event.preventDefault();

      if (!item.classList.contains("drag-over")) {
        limparEstadosDrag();
        item.classList.add("drag-over");
      }
    });

    item.addEventListener("dragleave", () => {
      item.classList.remove("drag-over");
    });

    item.addEventListener("drop", async () => {
      item.classList.remove("drag-over");
      item.classList.add("drop-animating");

      const target = Number(item.dataset.index);

      if (Number.isNaN(dragIndex) || Number.isNaN(target) || dragIndex === target) {
        item.classList.remove("drop-animating");
        return;
      }

      const novo = [...lista];
      const movido = novo.splice(dragIndex, 1)[0];
      novo.splice(target, 0, movido);

      for (let i = 0; i < novo.length; i++) {
        const { error } = await supabaseClient
          .from(TABELA)
          .update({ ordem: i + 1 })
          .eq("id", novo[i].id);

        if (error) {
          console.error(error);
          setStatus("Erro ao reordenar playlist", "erro");
          item.classList.remove("drop-animating");
          return;
        }
      }

      limparCachePlaylist(codigoSelecionado);

      setTimeout(() => {
        item.classList.remove("drop-animating");
      }, 220);

      carregarPlaylist({ forcarAtualizacao: true });
    });
  });
}

function abrirModalEdicao() {
  if (!codigoSelecionado || !modalEditar) return;

  const ponto = pontosMap[codigoSelecionado] || {};
  posicaoImagemAtual = lerPosicaoImagem(codigoSelecionado);

  if (editNome) editNome.value = obterNomePonto(ponto, codigoSelecionado) || "";
  if (editCidade) editCidade.value = obterCidadePonto(ponto) || "";
  if (editEndereco) editEndereco.value = obterEnderecoPonto(ponto) || "";

  if (editContratoInicio) editContratoInicio.value = dataIsoParaBr(ponto.contrato_data_inicio) || "";
  if (editContratoFim) editContratoFim.value = dataIsoParaBr(ponto.contrato_data_fim) || "";

  const contratoEhParceria = ponto.contrato_tipo === "parceria";

  if (editContratoParceriaSim) editContratoParceriaSim.checked = contratoEhParceria;
  if (editContratoParceriaNao) editContratoParceriaNao.checked = !contratoEhParceria;

  if (editValorContrato) {
    editValorContrato.value = ponto.contrato_valor || "";
    editValorContrato.style.display = "block";
  }

  atualizarVisualParceria();

  if (editResponsavelNome) editResponsavelNome.value = ponto.responsavel_nome || "";
  if (editResponsavelCpf) editResponsavelCpf.value = ponto.responsavel_cpf || "";
  if (editResponsavelTelefone) editResponsavelTelefone.value = ponto.responsavel_telefone || "";
  if (editResponsavelEmail) editResponsavelEmail.value = ponto.responsavel_email || "";

  if (previewImagem) {
    previewImagem.src = obterImagemPonto(ponto);
    aplicarPosicaoImagem(previewImagem, posicaoImagemAtual);
  }

  if (inputImagem) inputImagem.value = "";

  arquivoImagemEdicao = null;
  modalEditar.style.display = "flex";
}

function fecharModalEdicao() {
  if (!modalEditar) return;

  modalEditar.style.display = "none";
  arquivoImagemEdicao = null;
  arrastandoPreview = false;

  if (inputImagem) inputImagem.value = "";
}

async function deletarPontoAtual() {
  if (!codigoSelecionado) return;

  const confirmar = window.confirm(`Deseja deletar o ponto ${codigoSelecionado}?`);
  if (!confirmar) return;

  try {
    setStatus("Deletando ponto...", "normal");

    await supabaseClient
      .from(TABELA)
      .delete()
      .eq("codigo", codigoSelecionado);

    await supabaseClient
      .from(TABELA_STATUS_PONTOS)
      .delete()
      .eq("ponto_codigo", codigoSelecionado);

    const { error } = await supabaseClient
      .from(TABELA_PONTOS)
      .delete()
      .eq("codigo", codigoSelecionado);

    if (error) throw error;

    limparCachePlaylist(codigoSelecionado);
    sessionStorage.removeItem(CACHE_PONTOS_KEY);

    codigoSelecionado = null;

    if (modalEditar) modalEditar.style.display = "none";
    if (pontoDetalhe) pontoDetalhe.style.display = "none";
    if (listaPontos) listaPontos.style.display = "block";

    await carregarPontosRemoto();

    setStatus("Ponto deletado", "ok");
  } catch (error) {
    console.error("Erro ao deletar ponto:", error);
    setStatus("Erro ao deletar ponto", "erro");
  }
}

async function baixarContratoAtual() {
  if (!codigoSelecionado) return;

  const janela = window.open("", "_blank");

  if (!janela) {
    setStatus("Permita pop-ups para abrir o contrato", "erro");
    return;
  }

  janela.document.open();
  janela.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Gerando contrato...</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          color: #111827;
        }
      </style>
    </head>
    <body>
      <h2>Gerando contrato...</h2>
      <p>Aguarde um instante.</p>
    </body>
    </html>
  `);
  janela.document.close();

  const ponto = pontosMap[codigoSelecionado] || {};
  const parceriaAtiva = editContratoParceriaSim ? editContratoParceriaSim.checked : false;

  const nome = editNome ? editNome.value.trim() : obterNomePonto(ponto, codigoSelecionado);
  const cidade = editCidade ? editCidade.value.trim() : obterCidadePonto(ponto);
  const endereco = editEndereco ? editEndereco.value.trim() : obterEnderecoPonto(ponto);

  const dataInicio = editContratoInicio ? editContratoInicio.value.trim() : "";
  const dataFim = editContratoFim ? editContratoFim.value.trim() : "";
  const valorContrato = editValorContrato ? editValorContrato.value.trim() : "";

  const responsavelNome = editResponsavelNome ? editResponsavelNome.value.trim() : "";
  const responsavelCpf = editResponsavelCpf ? editResponsCpfValor(editResponsavelCpf) : "";
  const responsavelTelefone = editResponsavelTelefone ? editResponsavelTelefone.value.trim() : "";
  const responsavelEmail = editResponsavelEmail ? editResponsavelEmail.value.trim() : "";

  const modeloComercial = parceriaAtiva
    ? `Parceria - ${valorContrato || "___"}% por venda`
    : `Valor fixo mensal - R$ ${valorContrato || "___"}`;

  const clausulaRemuneracao = parceriaAtiva
    ? `O CONTRATADO receberá participação de ${valorContrato || "___"}% sobre cada venda realizada pela CONTRATANTE relacionada ao espaço objeto deste contrato. A forma de apuração, periodicidade e pagamento serão definidos entre as partes.`
    : `A CONTRATANTE pagará ao CONTRATADO o valor mensal de R$ ${valorContrato || "___"} pela cessão do espaço publicitário objeto deste contrato.`;

  try {
    setStatus("Gerando contrato...", "normal");

    const { data: modelo, error } = await supabaseClient
      .from("contratos_modelos")
      .select("*")
      .eq("tipo", "estabelecimento")
      .maybeSingle();

    if (error) throw error;

    if (!modelo || !modelo.html_modelo) {
      janela.document.body.innerHTML = "<h2>Modelo de estabelecimento não encontrado.</h2>";
      setStatus("Modelo de estabelecimento não encontrado", "erro");
      return;
    }

    const dadosContratada = typeof modelo.dados_contratada === "string"
      ? JSON.parse(modelo.dados_contratada || "{}")
      : modelo.dados_contratada || {};

    const substituicoes = {
      "{{titulo}}": modelo.titulo || "Contrato de Parceria com Estabelecimento",
      "{{subtitulo}}": modelo.subtitulo || "Contrato de cessão de espaço publicitário para mídia digital.",
      "{{empresa}}": dadosContratada.empresa || "Duna Branding",
      "{{cnpj}}": dadosContratada.cnpj || "",
      "{{telefone_empresa}}": dadosContratada.telefone || "",
      "{{email_empresa}}": dadosContratada.email || "",
      "{{endereco_empresa}}": dadosContratada.endereco || "",
      "{{responsavel}}": dadosContratada.responsavel || "",
      "{{assinatura_url}}": dadosContratada.assinatura_url || "assinatura.png",

      "{{estabelecimento_nome}}": nome,
      "{{estabelecimento_cpf_cnpj}}": responsavelCpf,
      "{{estabelecimento_responsavel}}": responsavelNome,
      "{{estabelecimento_telefone}}": responsavelTelefone,
      "{{estabelecimento_email}}": responsavelEmail,
      "{{estabelecimento_cidade}}": cidade,
      "{{estabelecimento_endereco}}": endereco,
      "{{data_inicio}}": dataInicio,
      "{{data_fim}}": dataFim,
      "{{modelo_comercial}}": modeloComercial,
      "{{clausula_remuneracao}}": clausulaRemuneracao,

      "{{cliente_nome}}": nome,
      "{{cliente_cpf_cnpj}}": responsavelCpf,
      "{{cliente_telefone}}": responsavelTelefone,
      "{{cliente_email}}": responsavelEmail,
      "{{ambiente}}": nome,
      "{{pontos}}": nome,
      "{{valor}}": valorContrato
    };

    let htmlContrato = modelo.html_modelo;

    Object.entries(substituicoes).forEach(([chave, valor]) => {
      htmlContrato = htmlContrato.split(chave).join(escapeHtml(valor || ""));
    });

    janela.document.open();
    janela.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Contrato ${escapeHtml(nome)}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #eef3fb;
            color: #111827;
            margin: 0;
            padding: 32px;
          }

          .pagina-contrato {
            max-width: 900px;
            margin: 0 auto;
            background: #fff;
            padding: 44px;
            border-radius: 14px;
            box-shadow: 0 18px 50px rgba(15, 23, 42, 0.14);
          }

          .topo-contrato h1 {
            font-size: 24px;
            margin-bottom: 8px;
          }

          .topo-contrato p {
            color: #64748b;
            margin-bottom: 24px;
          }

          .bloco {
            margin-bottom: 24px;
          }

          .bloco h2 {
            font-size: 17px;
            margin-bottom: 12px;
            padding-left: 10px;
            border-left: 4px solid #2563eb;
          }

          .bloco p {
            font-size: 14px;
            line-height: 1.7;
            margin-bottom: 10px;
            text-align: justify;
          }

          .assinaturas {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 28px;
            margin-top: 70px;
            align-items: end;
          }

          .assinatura-box {
            text-align: center;
          }

          .assinatura-img {
            width: 260px;
            max-width: 100%;
            height: 90px;
            object-fit: contain;
            object-position: center bottom;
            display: block;
            margin: 0 auto -10px;
          }

          .linha-assinatura {
            border-top: 1px solid #111827;
            padding-top: 8px;
            font-weight: 700;
            font-size: 14px;
          }

          .acoes-contrato {
            max-width: 900px;
            margin: 18px auto 0;
            display: flex;
            gap: 10px;
            justify-content: flex-end;
          }

          .acoes-contrato button {
            border: none;
            border-radius: 10px;
            padding: 12px 16px;
            font-weight: 700;
            cursor: pointer;
          }

          .btn-imprimir {
            background: #2563eb;
            color: #fff;
          }

          .btn-fechar {
            background: #111827;
            color: #fff;
          }

          @media print {
            body {
              background: #fff;
              padding: 0;
            }

            .pagina-contrato {
              box-shadow: none;
              border-radius: 0;
              max-width: none;
              padding: 24px;
            }

            .acoes-contrato {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="pagina-contrato">
          ${htmlContrato}
        </div>

        <div class="acoes-contrato">
          <button class="btn-imprimir" onclick="window.print()">Imprimir / PDF</button>
          <button class="btn-fechar" onclick="window.close()">Fechar</button>
        </div>
      </body>
      </html>
    `);
    janela.document.close();

    setStatus("Contrato gerado", "ok");
  } catch (error) {
    console.error("Erro ao gerar contrato:", error);
    janela.document.body.innerHTML = "<h2>Erro ao gerar contrato.</h2>";
    setStatus("Erro ao gerar contrato", "erro");
  }
}

function editResponsCpfValor(input) {
  return input ? input.value.trim() : "";
}

async function salvarEdicaoPonto() {
  if (!codigoSelecionado) return;

  const ponto = pontosMap[codigoSelecionado] || {};
  const nome = editNome ? editNome.value.trim() : "";
  const cidade = editCidade ? editCidade.value.trim() : "";
  const endereco = editEndereco ? editEndereco.value.trim() : "";

  const contratoInicioBr = editContratoInicio ? editContratoInicio.value.trim() : "";
  const contratoFimBr = editContratoFim ? editContratoFim.value.trim() : "";
  const contratoInicio = dataBrParaIso(contratoInicioBr);
  const contratoFim = dataBrParaIso(contratoFimBr);
  const contratoParceria = editContratoParceriaSim ? editContratoParceriaSim.checked : false;
  const valorContrato = contratoParceria ? "" : (editValorContrato ? editValorContrato.value.trim() : "");
  const contratoTipo = contratoParceria ? "parceria" : "valor";

  const responsavelNome = editResponsavelNome ? editResponsavelNome.value.trim() : "";
  const responsavelCpf = editResponsavelCpf ? editResponsavelCpf.value.trim() : "";
  const responsavelTelefone = editResponsavelTelefone ? editResponsavelTelefone.value.trim() : "";
  const responsavelEmail = editResponsavelEmail ? editResponsavelEmail.value.trim() : "";

  if (
    !nome ||
    !cidade ||
    !endereco ||
    !contratoInicio ||
    !contratoFim ||
    !responsavelNome ||
    !responsavelCpf ||
    !responsavelTelefone ||
    !responsavelEmail
  ) {
    setStatus("Preencha todos os campos obrigatórios", "erro");
    return;
  }

  if (!contratoParceria && !valorContrato) {
    setStatus("Informe o valor/custo ou marque parceria", "erro");
    return;
  }

  if (!emailValido(responsavelEmail)) {
    setStatus("Digite um e-mail válido", "erro");
    return;
  }

  try {
    setStatus("Salvando informações...", "normal");

    const payloadCompleto = {
      nome,
      cidade,
      endereco,
      contrato_data_inicio: contratoInicio,
      contrato_data_fim: contratoFim,
      contrato_tipo: contratoTipo,
      contrato_valor: valorContrato,
      responsavel_nome: responsavelNome,
      responsavel_cpf: responsavelCpf,
      responsavel_telefone: responsavelTelefone,
      responsavel_email: responsavelEmail
    };

    const tentativaCompleta = await supabaseClient
      .from(TABELA_PONTOS)
      .update(payloadCompleto)
      .eq("codigo", codigoSelecionado);

    if (tentativaCompleta.error) {
      console.error("Erro ao salvar dados completos do ponto:", tentativaCompleta.error);
      setStatus("Erro ao salvar contrato/responsável. Verifique as colunas da tabela pontos.", "erro");
      return;
    }

    ponto.nome = nome;
    ponto.nome_local = nome;
    ponto.cidade = cidade;
    ponto.cidade_regiao = cidade;
    ponto.endereco = endereco;
    ponto.endereco_completo = endereco;
    ponto.contrato_data_inicio = contratoInicio;
    ponto.contrato_data_fim = contratoFim;
    ponto.contrato_tipo = contratoTipo;
    ponto.contrato_valor = valorContrato;
    ponto.responsavel_nome = responsavelNome;
    ponto.responsavel_cpf = responsavelCpf;
    ponto.responsavel_telefone = responsavelTelefone;
    ponto.responsavel_email = responsavelEmail;

    if (arquivoImagemEdicao) {
      setStatus("Enviando imagem...", "normal");

      const imagemUrlFinal = await uploadImagemPonto(arquivoImagemEdicao, codigoSelecionado);

      const payloadsImagem = [
        { imagem_url: imagemUrlFinal },
        { imagem: imagemUrlFinal }
      ];

      let erroImagemFinal = null;

      for (const payload of payloadsImagem) {
        const { error } = await supabaseClient
          .from(TABELA_PONTOS)
          .update(payload)
          .eq("codigo", codigoSelecionado);

        if (!error) {
          erroImagemFinal = null;
          break;
        }

        erroImagemFinal = error;
        console.warn("Erro ao salvar imagem com payload:", payload, error);
      }

      if (erroImagemFinal) {
        console.error("Erro ao salvar imagem:", erroImagemFinal);
        setStatus("Erro ao salvar imagem", "erro");
        return;
      }

      ponto.imagem_url = imagemUrlFinal;
    }

    pontosMap[codigoSelecionado] = ponto;
    salvarPosicaoImagem(codigoSelecionado, posicaoImagemAtual);
    salvarCachePontos(Object.values(pontosMap));

    fecharModalEdicao();
    abrirPonto(codigoSelecionado);
    renderizarCardsPontos(Object.values(pontosMap));
    setStatus("Atualizado com sucesso", "ok");
  } catch (error) {
    console.error("Erro geral ao salvar edição:", error);
    setStatus("Erro ao salvar edição", "erro");
  }
}

function ativarDragPontos() {
  if (!pontosBox) return;

  let estadoDrag = null;

  function obterCardSobMouse(x, y) {
    if (!estadoDrag) return null;

    const elementos = document.elementsFromPoint(x, y);

    for (const el of elementos) {
      const card = el.closest?.(".card-ponto");

      if (
        card &&
        pontosBox.contains(card) &&
        card !== estadoDrag.placeholder &&
        !card.classList.contains("card-ponto-placeholder")
      ) {
        return card;
      }
    }

    return null;
  }

  function finalizarDrag() {
    if (!estadoDrag) return;

    const { cardOriginal, clone, placeholder } = estadoDrag;

    cardOriginal.classList.remove("card-arrastando-original");

    if (placeholder?.parentNode) {
      placeholder.replaceWith(cardOriginal);
    } else {
      pontosBox.appendChild(cardOriginal);
    }

    clone?.remove();

    document.body.classList.remove("arrastando-ponto");
    pontosBox.classList.remove("drag-pontos-ativo");

    estadoDrag = null;
    salvarOrdemPontos();
  }

  pontosBox.querySelectorAll(".card-ponto").forEach((card) => {
    card.setAttribute("draggable", "false");

    card.onpointerdown = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      if (event.target.closest("button, a, input, textarea, select, .card-codigo")) return;

      const inicioX = event.clientX;
      const inicioY = event.clientY;
      const rect = card.getBoundingClientRect();

      const mover = (moveEvent) => {
        if (!estadoDrag) return;

        moveEvent.preventDefault();

        estadoDrag.clone.style.left = `${moveEvent.clientX - estadoDrag.offsetX}px`;
        estadoDrag.clone.style.top = `${moveEvent.clientY - estadoDrag.offsetY}px`;

        const cardAlvo = obterCardSobMouse(moveEvent.clientX, moveEvent.clientY);

        if (!cardAlvo) return;

        const alvoRect = cardAlvo.getBoundingClientRect();
        const meioX = alvoRect.left + alvoRect.width / 2;
        const meioY = alvoRect.top + alvoRect.height / 2;
        const mesmaLinha = moveEvent.clientY >= alvoRect.top && moveEvent.clientY <= alvoRect.bottom;
        const inserirDepois = mesmaLinha
          ? moveEvent.clientX > meioX
          : moveEvent.clientY > meioY;

        if (inserirDepois) {
          pontosBox.insertBefore(estadoDrag.placeholder, cardAlvo.nextSibling);
        } else {
          pontosBox.insertBefore(estadoDrag.placeholder, cardAlvo);
        }
      };

      const iniciar = (moveEvent) => {
        const distancia = Math.hypot(moveEvent.clientX - inicioX, moveEvent.clientY - inicioY);
        if (distancia < 8) return;

        window.removeEventListener("pointermove", iniciar);

        const placeholder = document.createElement("div");
        placeholder.className = "card-ponto card-ponto-placeholder";
        placeholder.style.width = `${rect.width}px`;
        placeholder.style.height = `${rect.height}px`;

        const clone = card.cloneNode(true);
        clone.classList.add("card-ponto-flutuante");
        clone.style.width = `${rect.width}px`;
        clone.style.height = `${rect.height}px`;
        clone.style.left = `${rect.left}px`;
        clone.style.top = `${rect.top}px`;

        pontosBox.insertBefore(placeholder, card);
        card.classList.add("card-arrastando-original");
        card.remove();

        document.body.appendChild(clone);

        document.body.classList.add("arrastando-ponto");
        pontosBox.classList.add("drag-pontos-ativo");

        estadoDrag = {
          cardOriginal: card,
          clone,
          placeholder,
          offsetX: moveEvent.clientX - rect.left,
          offsetY: moveEvent.clientY - rect.top
        };

        mover(moveEvent);
      };

      const soltar = () => {
        window.removeEventListener("pointermove", iniciar);
        window.removeEventListener("pointermove", mover);
        window.removeEventListener("pointerup", soltar);
        window.removeEventListener("pointercancel", soltar);
        finalizarDrag();
      };

      window.addEventListener("pointermove", iniciar);
      window.addEventListener("pointermove", mover);
      window.addEventListener("pointerup", soltar);
      window.addEventListener("pointercancel", soltar);
    };
  });
}

async function salvarOrdemPontos() {
  const cards = [...document.querySelectorAll(".pontos-box .card-ponto:not(.card-ponto-placeholder)")];

  const atualizacoes = cards
    .map((card, index) => ({
      codigo: String(card.dataset.codigo || "").trim(),
      ordem: index + 1
    }))
    .filter((item) => item.codigo);

  atualizacoes.forEach((item) => {
    if (pontosMap[item.codigo]) {
      pontosMap[item.codigo].ordem = item.ordem;
    }
  });

  salvarCachePontos(Object.values(pontosMap));
  setStatus("Salvando ordem dos pontos...", "normal");

  for (const item of atualizacoes) {
    const { error } = await supabaseClient
      .from(TABELA_PONTOS)
      .update({ ordem: item.ordem })
      .eq("codigo", item.codigo);

    if (error) {
      console.error(error);
      setStatus("Erro ao salvar ordem dos pontos", "erro");
      return;
    }
  }

  setStatus("Ordem dos pontos salva", "ok");
}

async function carregarPontosRemoto() {
  if (carregandoPontos) return;
  carregandoPontos = true;

  try {
    const pontos = await buscarPontosRemoto();

    salvarCachePontos(pontos);
    renderizarCardsPontos(pontos);
    setStatus("Painel Ativo", "ok");
  } catch (error) {
    console.error(error);
    setStatus("Erro ao carregar pontos", "erro");
  } finally {
    carregandoPontos = false;
  }
}

async function iniciarPainel() {
  if (painelIniciado) return;
  painelIniciado = true;

  const cache = lerCachePontos();

  if (cache?.pontos?.length) {
    renderizarCardsPontos(cache.pontos);
    setStatus(cache.fresco ? "Painel Ativo" : "Atualizando painel...", cache.fresco ? "ok" : "normal");

    if (cache.fresco) return;

    carregarPontosRemoto();
    return;
  }

  setStatus("Carregando pontos...", "normal");
  await carregarPontosRemoto();
}

function somenteNumeros(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function formatarTelefone(valor) {
  const n = somenteNumeros(valor).slice(0, 11);

  if (n.length <= 2) return n;
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;

  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

function formatarCpfCnpj(valor) {
  const n = somenteNumeros(valor).slice(0, 14);

  if (n.length <= 11) {
    return n
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  return n
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatarDataBr(valor) {
  const n = somenteNumeros(valor).slice(0, 8);

  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;

  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
}

function dataBrParaIso(valor) {
  const partes = String(valor || "").split("/");
  if (partes.length !== 3) return "";

  const [dia, mes, ano] = partes;
  if (!dia || !mes || !ano || ano.length !== 4) return "";

  return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

function dataIsoParaBr(valor) {
  if (!valor) return "";

  const partes = String(valor).split("-");
  if (partes.length !== 3) return "";

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function emailValido(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor || "").trim());
}

function atualizarVisualParceria() {
  if (!editValorContrato || !editContratoParceriaSim || !editContratoParceriaNao) return;

  const parceriaAtiva = editContratoParceriaSim.checked;

  editValorContrato.disabled = parceriaAtiva;
  editValorContrato.placeholder = parceriaAtiva ? "Parceria ativada" : "Valor / custo";

  if (parceriaAtiva) {
    editValorContrato.value = "";
  }
}

if (btnVoltar) {
  btnVoltar.onclick = () => {
    if (listaPontos) listaPontos.style.display = "block";
    if (pontoDetalhe) pontoDetalhe.style.display = "none";

    codigoSelecionado = null;
    document.body.classList.remove("modo-detalhe");
  };
}

if (btnCopiarCodigo) {
  btnCopiarCodigo.style.display = "none";

  btnCopiarCodigo.onclick = async () => {
    if (!codigoSelecionado) return;

    try {
      await navigator.clipboard.writeText(codigoSelecionado);
      setStatus("Código copiado", "ok");
    } catch {
      setStatus("Erro ao copiar código", "erro");
    }
  };
}

if (codigoAtual) {
  codigoAtual.onclick = async () => {
    if (!codigoSelecionado) return;

    try {
      await navigator.clipboard.writeText(codigoSelecionado);
      setStatus("Código copiado", "ok");
    } catch {
      setStatus("Erro ao copiar código", "erro");
    }
  };
}

if (btnEditarInfo) {
  btnEditarInfo.onclick = () => abrirModalEdicao();
}

if (btnToggleDisponibilidade) {
  btnToggleDisponibilidade.onclick = () => alternarDisponibilidadePonto();
}

if (btnUpgradePlaylist && inputUpgradePlaylist) {
  btnUpgradePlaylist.onclick = () => {
    inputUpgradePlaylist.click();
  };

  inputUpgradePlaylist.onchange = async (event) => {
    const file = event.target.files?.[0];
    await enviarMaterialDiretoPlaylist(file);
    inputUpgradePlaylist.value = "";
  };
}

if (btnNovoPonto) {
  btnNovoPonto.onclick = () => criarNovoPonto();
}

if (btnFecharModal) {
  btnFecharModal.onclick = () => fecharModalEdicao();
}

if (btnBaixarContrato) {
  btnBaixarContrato.onclick = baixarContratoAtual;
}

if (btnDeletarPonto) {
  btnDeletarPonto.onclick = deletarPontoAtual;
}

if (modalEditar) {
  modalEditar.addEventListener("click", (event) => {
    if (event.target === modalEditar) {
      fecharModalEdicao();
    }
  });
}

if (inputImagem) {
  inputImagem.addEventListener("change", (event) => {
    const arquivo = event.target.files && event.target.files[0] ? event.target.files[0] : null;
    if (!arquivo) return;

    arquivoImagemEdicao = arquivo;
    posicaoImagemAtual = { x: 50, y: 50 };

    const reader = new FileReader();

    reader.onload = (evento) => {
      if (previewImagem) {
        previewImagem.src = evento.target.result;
        aplicarPosicaoImagem(previewImagem, posicaoImagemAtual);
      }
    };

    reader.readAsDataURL(arquivo);
  });
}

if (previewImagem) {
  previewImagem.style.cursor = "grab";

  previewImagem.addEventListener("mousedown", (event) => {
    event.preventDefault();
    arrastandoPreview = true;
    previewImagem.style.cursor = "grabbing";
  });

  window.addEventListener("mouseup", () => {
    arrastandoPreview = false;

    if (previewImagem) {
      previewImagem.style.cursor = "grab";
    }
  });

  previewImagem.addEventListener("mousemove", (event) => {
    if (!arrastandoPreview) return;

    const rect = previewImagem.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    let x = ((event.clientX - rect.left) / rect.width) * 100;
    let y = ((event.clientY - rect.top) / rect.height) * 100;

    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    posicaoImagemAtual = { x, y };
    aplicarPosicaoImagem(previewImagem, posicaoImagemAtual);
  });

  previewImagem.addEventListener("dragstart", (event) => {
    event.preventDefault();
  });
}

if (btnSalvarEdicao) {
  btnSalvarEdicao.onclick = salvarEdicaoPonto;
}

if (editContratoInicio) {
  editContratoInicio.addEventListener("input", () => {
    editContratoInicio.value = formatarDataBr(editContratoInicio.value);
  });
}

if (editContratoFim) {
  editContratoFim.addEventListener("input", () => {
    editContratoFim.value = formatarDataBr(editContratoFim.value);
  });
}

if (editResponsavelTelefone) {
  editResponsavelTelefone.addEventListener("input", () => {
    editResponsavelTelefone.value = formatarTelefone(editResponsavelTelefone.value);
  });
}

if (editResponsavelCpf) {
  editResponsavelCpf.addEventListener("input", () => {
    editResponsavelCpf.value = formatarCpfCnpj(editResponsavelCpf.value);
  });
}

if (editContratoParceriaSim) {
  editContratoParceriaSim.onchange = atualizarVisualParceria;
}

if (editContratoParceriaNao) {
  editContratoParceriaNao.onchange = atualizarVisualParceria;
}

window.addEventListener("focus", () => {
  if (codigoSelecionado) {
    carregarPlaylist({ forcarAtualizacao: true });
  }
});

setInterval(() => {
  if (codigoSelecionado) {
    carregarPlaylist({ forcarAtualizacao: true });
  }
}, 30000);

setStatus("Painel Ativo", "ok");
iniciarPainel();
