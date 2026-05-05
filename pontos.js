const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const BUCKET = "midias";

const TABELA = "playlists";
const TABELA_PONTOS = "pontos";
const TABELA_STATUS_PONTOS = "statuspontos";

const CACHE_PONTOS_KEY = "painel_pontos_cache_v12";
const CACHE_PONTOS_TTL = 30 * 60 * 1000;
const CACHE_PLAYLIST_PREFIX = "painel_playlist_cache_v11_";
const CACHE_PLAYLIST_TTL = 2 * 60 * 1000;

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const statusEl = document.querySelector(".status-topo") || document.getElementById("status");
const listaPontos = document.getElementById("listaPontos");
const pontoDetalhe = document.getElementById("pontoDetalhe");
const pontosBox = document.querySelector(".pontos-box");

const codigoAtual = document.getElementById("codigoAtual");
const tituloPasta = document.getElementById("tituloPasta");
const cidadePonto = document.getElementById("cidadePonto");
const enderecoPonto = document.getElementById("enderecoPonto");
const imagemPonto = document.getElementById("imagemPonto");
const statusPonto = document.getElementById("statusPonto");

const btnVoltar = document.getElementById("btnVoltar");
const btnEditarInfo = document.getElementById("btnEditarInfo");
const btnToggleDisponibilidade = document.getElementById("btnToggleDisponibilidade");
const btnNovoPonto = document.getElementById("btnNovoPonto");
const btnUpgradePlaylist = document.getElementById("btnUpgradePlaylist");
const inputUpgradePlaylist = document.getElementById("inputUpgradePlaylist");
const btnDeletarPonto = document.getElementById("btnDeletarPonto");
const btnCopiarPlaylist = document.getElementById("btnCopiarPlaylist");

const modalEditar = document.getElementById("modalEditar");
const editNome = document.getElementById("editNome");
const editCidade = document.getElementById("editCidade");
const editEndereco = document.getElementById("editEndereco");
const previewImagem = document.getElementById("previewImagem");
const inputImagem = document.getElementById("inputImagem");
const btnSalvarEdicao = document.getElementById("btnSalvarEdicao");
const btnFecharModal = document.getElementById("btnFecharModal");

const modalCopiarPlaylist = document.getElementById("modalCopiarPlaylist");
const playlistOrigemSelect = document.getElementById("playlistOrigemSelect");
const btnConfirmarCopiaPlaylist = document.getElementById("btnConfirmarCopiaPlaylist");
const btnFecharCopiaPlaylist = document.getElementById("btnFecharCopiaPlaylist");

let codigoSelecionado = null;
let pontosMap = {};
let playlistAtual = [];
let dragIndex = null;
let arquivoImagemEdicao = null;
let painelIniciado = false;
let carregandoPontos = false;
let carregandoPlaylist = false;
let criandoNovoPonto = false;

let posicaoImagemAtual = { x: 50, y: 50 };
let arrastandoPreview = false;

limparCachesAntigos();

function limparCachesAntigos() {
  try {
    Object.keys(sessionStorage).forEach((key) => {
      if (
        key.startsWith("painel_pontos_cache_v") ||
        key.startsWith("painel_playlist_cache_v")
      ) {
        sessionStorage.removeItem(key);
      }
    });
  } catch {
    return;
  }
}

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
