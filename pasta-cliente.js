const codigo = new URLSearchParams(window.location.search).get("codigo");

if (!codigo) {
  window.location.replace("/central-cliente.html");
}

const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";

const BUCKET = "midias";
const TABELA_CLIENTES = "clientes_app";
const TABELA_VINCULOS = "playercliente";
const TABELA_PLAYLISTS = "playlists";
const TABELA_PONTOS = "pontos";
const TABELA_CONTRATOS_MODELOS = "contratos_modelos";

const CACHE_PASTA_PREFIX = "pasta_cliente_cache_v2_";
const CACHE_PONTOS_TTL = 30 * 60 * 1000;
const CACHE_VINCULOS_TTL = 30 * 60 * 1000;
const CACHE_HISTORICO_ARQUIVOS_TTL = 60 * 60 * 1000;

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const inputCodigo = document.getElementById("codigo");
const inputNome = document.getElementById("nome");
const inputTelefone = document.getElementById("telefone");
const inputEmail = document.getElementById("email");
const inputCpfCnpj = document.getElementById("cpfCnpj");
const inputVencimento = document.getElementById("vencimentoExibicao");
const inputValorContratado = document.getElementById("valorContratado");
const inputDataPostagem = document.getElementById("dataPostagem");
const statusCliente = document.getElementById("statusCliente");

const listaPontos = document.getElementById("listaPontos");
const mensagem = document.getElementById("mensagem");
const botaoSalvar = document.getElementById("botaoSalvar");
const botaoVoltar = document.getElementById("botaoVoltar");
const botaoExcluirCliente = document.getElementById("botaoExcluirCliente");

const arquivoInput = document.getElementById("arquivoInput");
const btnUploadCliente = document.getElementById("btnUploadCliente");
const statusUpload = document.getElementById("statusUpload");

const historicoContratos = document.getElementById("historicoContratos");
const historicoArquivos = document.getElementById("historicoArquivos");

const contratoPreview = document.getElementById("contratoPreview");
const contratoStatus = document.getElementById("contratoStatus");
const btnBaixarContrato = document.getElementById("btnBaixarContrato");
const btnFiltroAgendamento = document.getElementById("btnFiltroAgendamento");
const btnFecharFiltroAgendamento = document.getElementById("btnFecharFiltroAgendamento");
const btnAplicarFiltroAgendamento = document.getElementById("btnAplicarFiltroAgendamento");
const btnLimparFiltroAgendamento = document.getElementById("btnLimparFiltroAgendamento");
const agendaAvancada = document.getElementById("agendaAvancada");
const agendaResumo = document.getElementById("agendaResumo");
const agendaMesesBloco = document.getElementById("agendaMesesBloco");
const agendaSemanaBloco = document.getElementById("agendaSemanaBloco");
const agendaCalendarioBloco = document.getElementById("agendaCalendarioBloco");
const agendamentoHoraInicio = document.getElementById("agendamentoHoraInicio");
const agendamentoHoraFim = document.getElementById("agendamentoHoraFim");

let pontosData = {};
let codigoClienteAtual = "";
let clausulasContrato = [];
let clienteAtual = null;
let agendamentoAtivo = false;

let dadosDunaContrato = {
  empresa: "Duna Branding",
  cnpj: "",
  telefone: "",
  email: "",
  endereco: "",
  responsavel: "",
  titulo_contrato: "Contrato de PrestaÃ§Ã£o de ServiÃ§os de Publicidade em Telas Digitais",
  subtitulo_contrato: "Contrato de prestaÃ§Ã£o de serviÃ§os de publicidade em telas digitais."
};

function obterChaveCache(sufixo) {
  return `${CACHE_PASTA_PREFIX}${codigoClienteAtual || "global"}_${sufixo}`;
}

function lerCache(sufixo, ttl) {
  try {
    const bruto = sessionStorage.getItem(obterChaveCache(sufixo));
    if (!bruto) return null;

    const cache = JSON.parse(bruto);
    return {
      dados: cache.dados,
      fresco: Date.now() - Number(cache.criadoEm || 0) < ttl
    };
  } catch {
    return null;
  }
}

function salvarCache(sufixo, dados) {
  try {
    sessionStorage.setItem(obterChaveCache(sufixo), JSON.stringify({
      criadoEm: Date.now(),
      dados
    }));
  } catch {
    return;
  }
}

function limparCacheClienteAtual() {
  if (!codigoClienteAtual) return;

  try {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith(`${CACHE_PASTA_PREFIX}${codigoClienteAtual}_`)) {
        sessionStorage.removeItem(key);
      }
    });
  } catch {
    return;
  }
}

function mostrarMensagem(texto, cor = "#ffffff") {
  if (!mensagem) return;
  mensagem.textContent = texto || "";
  mensagem.style.background = cor === "#ff6b6b"
    ? "rgba(220, 38, 38, 0.94)"
    : cor === "#ffb86b"
      ? "rgba(245, 158, 11, 0.94)"
      : "rgba(61, 145, 71, 0.96)";
  mensagem.style.color = "#ffffff";
}

function mostrarStatusUpload(texto, cor = "#4a5f52") {
  if (!statusUpload) return;
  statusUpload.textContent = texto || "";
  statusUpload.style.color = cor === "#ff6b6b" ? "#b91c1c" : "#176c36";
}

function obterCodigoDaUrl() {
  return String(new URLSearchParams(window.location.search).get("codigo") || "").trim().toUpperCase();
}

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizarCodigo(valor) {
  return String(valor || "").trim().toUpperCase();
}

function formatarTelefone(valor) {
  const numeros = String(valor || "").replace(/\D/g, "").slice(0, 11);
  if (!numeros) return "";
  if (numeros.length <= 2) return `(${numeros}`;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function formatarCpfCnpj(valor) {
  const numeros = String(valor || "").replace(/\D/g, "").slice(0, 14);

  if (numeros.length <= 11) {
    if (numeros.length <= 3) return numeros;
    if (numeros.length <= 6) return `${numeros.slice(0, 3)}.${numeros.slice(3)}`;
    if (numeros.length <= 9) return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`;
    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9)}`;
  }

  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 5) return `${numeros.slice(0, 2)}.${numeros.slice(2)}`;
  if (numeros.length <= 8) return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5)}`;
  if (numeros.length <= 12) return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8)}`;
  return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8, 12)}-${numeros.slice(12)}`;
}

function formatarMoedaBR(valor) {
  const texto = String(valor ?? "").trim();
  let numero = 0;

  if (typeof valor === "number") {
    numero = valor;
  } else if (texto) {
    const limpo = texto.replace(/\s/g, "").replace("R$", "").replace(/[^\d,.-]/g, "");
    numero = limpo.includes(",")
      ? Number(limpo.replace(/\./g, "").replace(",", "."))
      : Number(limpo);
  }

  if (!Number.isFinite(numero)) numero = 0;
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function extrairNumeroMoeda(valor) {
  const texto = String(valor ?? "").trim();
  if (!texto) return 0;

  const limpo = texto.replace(/\s/g, "").replace("R$", "").replace(/[^\d,.-]/g, "");
  const numero = limpo.includes(",")
    ? Number(limpo.replace(/\./g, "").replace(",", "."))
    : Number(limpo);

  return Number.isFinite(numero) ? numero : 0;
}

function formatarDataBR(valor) {
  if (!valor) return "-";

  const partes = String(valor).split("-");
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);
  return data.toLocaleDateString("pt-BR");
}

function formatarDataHistorico(valor) {
  if (!valor) return "-";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);
  return data.toLocaleString("pt-BR");
}

function marcarErro(campo) {
  if (!campo) return;
  campo.style.border = "1px solid #ef4444";
}

function limparErro(campo) {
  if (!campo) return;
  campo.style.border = "1px solid #cfe8d4";
}

function ativarBotaoSalvar() {
  if (!botaoSalvar) return;
  botaoSalvar.disabled = false;
}

function desativarBotaoSalvar() {
  if (!botaoSalvar) return;
  botaoSalvar.disabled = true;
}

function aplicarCampoDesativado(campo, desativado) {
  if (!campo) return;
  campo.disabled = desativado;
  campo.style.opacity = desativado ? "0.45" : "1";
  campo.style.cursor = desativado ? "not-allowed" : "";
}

function executarComTimeout(promessa, mensagemErro, tempoLimite = 12000) {
  let timeoutId = null;

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(mensagemErro || "A operaÃ§Ã£o demorou demais. Tente novamente."));
    }, tempoLimite);
  });

  return Promise.race([promessa, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function atualizarStatusClienteVisual(statusTexto) {
  if (!statusCliente) return;

  const ativo = String(statusTexto || "").trim().toLowerCase() === "ativo";
  statusCliente.textContent = ativo ? "Ativo" : "NÃ£o ativo";
  statusCliente.style.color = ativo ? "#15803d" : "#b91c1c";
  statusCliente.style.background = ativo ? "rgba(22, 163, 74, 0.14)" : "rgba(220, 38, 38, 0.11)";
  statusCliente.style.borderColor = ativo ? "rgba(22, 163, 74, 0.24)" : "rgba(220, 38, 38, 0.2)";
}

function itemEstaInativo(item) {
  if (!item?.data_fim) return false;

  const fim = new Date(item.data_fim);
  if (Number.isNaN(fim.getTime())) return false;

  fim.setHours(23, 59, 59, 999);
  return new Date() > fim;
}

function pontoEstaDisponivel(ponto) {
  return ponto?.disponivel !== false;
}

function obterCodigoPonto(ponto) {
  return String(ponto?.codigo || "").trim();
}

function obterNomeDoPonto(ponto, codigo) {
  return ponto?.nome || ponto?.nome_painel || ponto?.titulo || ponto?.ambiente || `Ponto ${codigo}`;
}

async function carregarPontos(opcoes = {}) {
  const cache = lerCache("pontos", CACHE_PONTOS_TTL);

  if (!opcoes.forcarAtualizacao && cache?.dados) {
    pontosData = cache.dados || {};
    if (cache.fresco) return;
  }

  const tentativas = [
    () => supabaseClient
      .from(TABELA_PONTOS)
      .select("*")
      .order("codigo", { ascending: true }),
    () => supabaseClient
      .from(TABELA_PONTOS)
      .select("*")
      .order("nome", { ascending: true }),
    () => supabaseClient
      .from(TABELA_PONTOS)
      .select("*")
  ];

  let data = [];
  let erroFinal = null;

  for (const tentarBuscar of tentativas) {
    const { data: resultado, error } = await tentarBuscar();

    if (!error) {
      data = resultado || [];
      erroFinal = null;
      break;
    }

    erroFinal = error;
    console.warn("Tentativa de buscar pontos falhou:", error);
  }

  if (erroFinal) {
    if (cache?.dados) return;
    throw erroFinal;
  }

  pontosData = {};

  (data || []).forEach((ponto) => {
    const chave = obterCodigoPonto(ponto);
    if (chave) pontosData[chave] = ponto;
  });

  salvarCache("pontos", pontosData);
}

function extrairClausulasDoHtmlModelo(htmlModelo) {
  const temp = document.createElement("div");
  temp.innerHTML = htmlModelo || "";

  const ignorar = [
    "Empresa:",
    "CNPJ:",
    "Telefone:",
    "Email:",
    "EndereÃ§o:",
    "ResponsÃ¡vel:",
    "Nome:",
    "CPF/CNPJ:",
    "Valor:",
    "PerÃ­odo:",
    "Pontos:"
  ];

  return Array.from(temp.querySelectorAll("p"))
    .filter((p) => {
      const texto = p.textContent.trim();
      return texto && !ignorar.some((prefixo) => texto.startsWith(prefixo));
    })
    .map((p) => {
      const strong = p.querySelector("strong");
      const titulo = strong ? strong.textContent.replace(":", "").trim() : "CLÃUSULA";
      let texto = p.textContent.trim();

      if (strong) texto = texto.replace(strong.textContent, "").trim();
      return { titulo, texto, ativo: true };
    });
}

async function carregarModeloContrato() {
  try {
    const cache = lerCache("modelo_contrato", 24 * 60 * 60 * 1000);

    if (cache?.dados) {
      dadosDunaContrato = cache.dados.dadosDunaContrato;
      clausulasContrato = cache.dados.clausulasContrato || [];
      if (cache.fresco) return;
    }

    const { data, error } = await supabaseClient
      .from(TABELA_CONTRATOS_MODELOS)
      .select("*")
      .eq("tipo", "contratante")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      clausulasContrato = [];
      return;
    }

    const dados = typeof data.dados_contratada === "string"
      ? JSON.parse(data.dados_contratada || "{}")
      : data.dados_contratada || {};

    dadosDunaContrato = {
      empresa: dados.empresa || "Duna Branding",
      cnpj: dados.cnpj || "",
      telefone: dados.telefone || "",
      email: dados.email || "",
      endereco: dados.endereco || "",
      responsavel: dados.responsavel || "",
      titulo_contrato: data.titulo || "Contrato de PrestaÃ§Ã£o de ServiÃ§os de Publicidade em Telas Digitais",
      subtitulo_contrato: data.subtitulo || "Contrato de prestaÃ§Ã£o de serviÃ§os de publicidade em telas digitais."
    };

    clausulasContrato = extrairClausulasDoHtmlModelo(data.html_modelo);
    salvarCache("modelo_contrato", { dadosDunaContrato, clausulasContrato });
  } catch (error) {
    console.error("Erro ao carregar modelo do contrato:", error);
    clausulasContrato = [];
  }
}

function obterPontosMarcados() {
  return Array.from(document.querySelectorAll('#listaPontos input[name="pontos"]:checked'))
    .map((input) => String(input.value || "").trim())
    .filter(Boolean);
}

function obterPontosContratoTexto() {
  return obterPontosMarcados()
    .map((codigoVisual) => obterNomeDoPonto(pontosData[codigoVisual], codigoVisual))
    .filter(Boolean)
    .join(", ") || "Nenhum ponto selecionado";
}

function preencherMarcadoresContrato(texto, dados) {
  return String(texto || "")
    .replaceAll("{{empresa}}", dadosDunaContrato.empresa || "")
    .replaceAll("{{cnpj}}", dadosDunaContrato.cnpj || "")
    .replaceAll("{{telefone_empresa}}", dadosDunaContrato.telefone || "")
    .replaceAll("{{email_empresa}}", dadosDunaContrato.email || "")
    .replaceAll("{{endereco_empresa}}", dadosDunaContrato.endereco || "")
    .replaceAll("{{responsavel}}", dadosDunaContrato.responsavel || "")
    .replaceAll("{{telefoneEmpresa}}", dadosDunaContrato.telefone || "")
    .replaceAll("{{emailEmpresa}}", dadosDunaContrato.email || "")
    .replaceAll("{{enderecoEmpresa}}", dadosDunaContrato.endereco || "")
    .replaceAll("{{cliente_nome}}", dados.nome || "")
    .replaceAll("{{cliente_cpf_cnpj}}", dados.cpfCnpj || "")
    .replaceAll("{{cliente_telefone}}", dados.telefone || "")
    .replaceAll("{{cliente_email}}", dados.email || "")
    .replaceAll("{{cliente}}", dados.nome || "")
    .replaceAll("{{codigo}}", dados.codigo || "")
    .replaceAll("{{cpfCnpj}}", dados.cpfCnpj || "")
    .replaceAll("{{telefone}}", dados.telefone || "")
    .replaceAll("{{email}}", dados.email || "")
    .replaceAll("{{valor}}", dados.valor || "")
    .replaceAll("{{data_inicio}}", dados.dataInicio || "")
    .replaceAll("{{data_vencimento}}", dados.dataVencimento || "")
    .replaceAll("{{dataInicio}}", dados.dataInicio || "")
    .replaceAll("{{dataVencimento}}", dados.dataVencimento || "")
    .replaceAll("{{pontos}}", dados.pontos || "")
    .replaceAll("{{emissao}}", dados.emissao || "");
}

function obterDadosContratoCliente() {
  return {
    codigo: codigoClienteAtual || inputCodigo?.textContent || "-",
    nome: inputNome?.value?.trim() || "-",
    telefone: inputTelefone?.value?.trim() || "-",
    email: inputEmail?.value?.trim() || "-",
    cpfCnpj: inputCpfCnpj?.value?.trim() || "-",
    valor: inputValorContratado?.value || "R$ 0,00",
    dataInicio: formatarDataBR(inputDataPostagem?.value),
    dataVencimento: formatarDataBR(inputVencimento?.value),
    pontos: obterPontosContratoTexto(),
    emissao: new Date().toLocaleDateString("pt-BR")
  };
}

function gerarContratoCliente() {
  if (!contratoPreview || !contratoStatus) return;

  const dados = obterDadosContratoCliente();
  const htmlClausulas = clausulasContrato.length
    ? clausulasContrato.map((clausula) => `
        <p>
          <strong>${escaparHtml(clausula.titulo || "")}:</strong>
          ${escaparHtml(preencherMarcadoresContrato(clausula.texto || "", dados))}
        </p>
      `).join("")
    : `
        <p><strong>Cliente:</strong> ${escaparHtml(dados.nome)}</p>
        <p><strong>CPF/CNPJ:</strong> ${escaparHtml(dados.cpfCnpj)}</p>
        <p><strong>Telefone:</strong> ${escaparHtml(dados.telefone)}</p>
        <p><strong>Email:</strong> ${escaparHtml(dados.email)}</p>
        <p><strong>Valor:</strong> ${escaparHtml(dados.valor)}</p>
        <p><strong>PerÃ­odo:</strong> ${escaparHtml(dados.dataInicio)} atÃ© ${escaparHtml(dados.dataVencimento)}</p>
        <p><strong>Pontos:</strong> ${escaparHtml(dados.pontos)}</p>
      `;

  contratoPreview.innerHTML = `
    <div>
      <div style="font-size:1rem;font-weight:900;color:#122018;">${escaparHtml(dadosDunaContrato.titulo_contrato || "Contrato")}</div>
      <div style="font-size:0.82rem;color:#4a5f52;margin-top:4px;">${escaparHtml(dadosDunaContrato.subtitulo_contrato || "")}</div>
    </div>

    <div style="margin-top:12px;color:#33443a;">
      <p><strong>Cliente:</strong> ${escaparHtml(dados.nome)}</p>
      <p><strong>Pontos:</strong> ${escaparHtml(dados.pontos)}</p>
    </div>

    <div style="margin-top:12px;color:#33443a;">
      ${htmlClausulas}
    </div>
  `;

  contratoStatus.textContent = "Modelo carregado";
}

function montarHtmlContratoCompleto(dadosContrato = null) {
  const dados = dadosContrato || obterDadosContratoCliente();
  const clausulasHtml = clausulasContrato.length
    ? clausulasContrato.map((clausula) => `
        <p style="margin:0 0 12px 0;line-height:1.7;text-align:justify;">
          <strong>${escaparHtml(clausula.titulo || "")}:</strong>
          ${escaparHtml(preencherMarcadoresContrato(clausula.texto || "", dados))}
        </p>
      `).join("")
    : `
        <p><strong>Cliente:</strong> ${escaparHtml(dados.nome)}</p>
        <p><strong>CPF/CNPJ:</strong> ${escaparHtml(dados.cpfCnpj)}</p>
        <p><strong>Telefone:</strong> ${escaparHtml(dados.telefone)}</p>
        <p><strong>Email:</strong> ${escaparHtml(dados.email)}</p>
        <p><strong>Valor:</strong> ${escaparHtml(dados.valor)}</p>
        <p><strong>PerÃ­odo:</strong> ${escaparHtml(dados.dataInicio)} atÃ© ${escaparHtml(dados.dataVencimento)}</p>
        <p><strong>Pontos:</strong> ${escaparHtml(dados.pontos)}</p>
      `;

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Contrato ${escaparHtml(dados.nome)}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #111827; background: #fff; margin: 0; padding: 32px; }
        .topo { border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 20px; }
        h1 { font-size: 24px; margin: 0 0 6px 0; }
        .sub { color: #475569; font-size: 14px; }
        .bloco { margin-bottom: 18px; }
        .bloco h2 { font-size: 16px; margin: 0 0 10px 0; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .campo { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; background: #f8fafc; font-size: 14px; }
        .campo strong { display: block; margin-bottom: 4px; }
        .assinaturas { display: grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap: 20px; margin-top: 46px; align-items: end; }
        .assinatura-box { text-align: center; min-height: 120px; display: flex; flex-direction: column; justify-content: flex-end; }
        .assinatura-img { display: block; width: 300px; max-width: 90%; height: 120px; object-fit: contain; margin: 0 auto -10px; }
        .linha-assinatura { border-top: 1px solid #111827; padding-top: 8px; font-size: 14px; color: #111827; font-weight: 700; }
      </style>
    </head>
    <body>
      <div class="topo">
        <h1>${escaparHtml(dadosDunaContrato.titulo_contrato || "Contrato")}</h1>
        <div class="sub">${escaparHtml(dadosDunaContrato.subtitulo_contrato || "")}</div>
      </div>

      <div class="bloco">
        <h2>Dados da Contratada</h2>
        <div class="grid">
          <div class="campo"><strong>Empresa</strong>${escaparHtml(dadosDunaContrato.empresa || "-")}</div>
          <div class="campo"><strong>CNPJ</strong>${escaparHtml(dadosDunaContrato.cnpj || "-")}</div>
          <div class="campo"><strong>Telefone</strong>${escaparHtml(dadosDunaContrato.telefone || "-")}</div>
          <div class="campo"><strong>Email</strong>${escaparHtml(dadosDunaContrato.email || "-")}</div>
          <div class="campo"><strong>EndereÃ§o</strong>${escaparHtml(dadosDunaContrato.endereco || "-")}</div>
          <div class="campo"><strong>ResponsÃ¡vel</strong>${escaparHtml(dadosDunaContrato.responsavel || "-")}</div>
        </div>
      </div>

      <div class="bloco">
        <h2>Dados do Cliente</h2>
        <div class="grid">
          <div class="campo"><strong>Nome</strong>${escaparHtml(dados.nome)}</div>
          <div class="campo"><strong>CPF/CNPJ</strong>${escaparHtml(dados.cpfCnpj)}</div>
          <div class="campo"><strong>Telefone</strong>${escaparHtml(dados.telefone)}</div>
          <div class="campo"><strong>Email</strong>${escaparHtml(dados.email)}</div>
          <div class="campo"><strong>Valor</strong>${escaparHtml(dados.valor)}</div>
          <div class="campo"><strong>PerÃ­odo</strong>${escaparHtml(dados.dataInicio)} atÃ© ${escaparHtml(dados.dataVencimento)}</div>
          <div class="campo" style="grid-column:1 / -1;"><strong>Pontos</strong>${escaparHtml(dados.pontos)}</div>
        </div>
      </div>

      <div class="bloco">
        <h2>Termos do Contrato</h2>
        ${clausulasHtml}
      </div>
    </body>
    </html>
  `;
}

function obterChaveHistoricoContratos() {
  return `historico_contratos_cliente_${codigoClienteAtual}`;
}

function lerHistoricoContratosGerados() {
  try {
    const bruto = sessionStorage.getItem(obterChaveHistoricoContratos());
    const lista = JSON.parse(bruto || "[]");
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function salvarHistoricoContratosGerados(lista) {
  sessionStorage.setItem(obterChaveHistoricoContratos(), JSON.stringify(lista));
}

function obterProximoNumeroContrato() {
  const historico = lerHistoricoContratosGerados();
  return historico.reduce((maior, item) => {
    const match = String(item.nome_arquivo || "").match(/^branding-(\d+)\.html$/i);
    const numero = match ? Number(match[1]) : 0;
    return Number.isFinite(numero) && numero > maior ? numero : maior;
  }, 0) + 1;
}

function obterNomeArquivoContrato() {
  return `branding-${obterProximoNumeroContrato()}.html`;
}

function baixarHtmlContrato(html, nomeArquivo) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function gerarContratoClienteParaHistorico() {
  try {
    if (!validarDadosParaMaterialOuContrato()) return;

    const dados = obterDadosContratoCliente();
    const historico = lerHistoricoContratosGerados();
    const agoraIso = new Date().toISOString();
    const item = {
      id: `${Date.now()}`,
      criado_em: agoraIso,
      nome_arquivo: obterNomeArquivoContrato(),
      status: "pendente",
      dados
    };

    const htmlContrato = montarHtmlContratoCompleto(item.dados);
    historico.unshift(item);
    salvarHistoricoContratosGerados(historico);

    const payloadContrato = {
      contrato_titulo: dadosDunaContrato.titulo_contrato || "Contrato",
      contrato_texto: htmlContrato,
      contrato_modelo_nome: item.nome_arquivo,
      contrato_status: "pendente",
      contrato_enviado_em: agoraIso
    };

    const { data, error } = await supabaseClient
      .from(TABELA_CLIENTES)
      .update(payloadContrato)
      .eq("codigo", codigoClienteAtual)
      .select("*")
      .maybeSingle();

    if (error) throw error;

    clienteAtual = data || { ...(clienteAtual || {}), ...payloadContrato };
    gerarHistoricoContratoVisual();
    gerarContratoCliente();
    mostrarMensagem("Contrato enviado para assinatura do cliente.", "#7CFC9A");
  } catch (error) {
    console.error(error);
    mostrarMensagem(`Erro ao enviar contrato: ${error.message || "falha desconhecida"}`, "#ff6b6b");
  }
}

function baixarContratoDoHistorico(id) {
  const historico = lerHistoricoContratosGerados();
  const item = historico.find((contrato) => contrato.id === id);

  if (!item) {
    mostrarMensagem("Contrato nÃ£o encontrado no histÃ³rico.", "#ff6b6b");
    return;
  }

  baixarHtmlContrato(clienteAtual?.contrato_texto || montarHtmlContratoCompleto(item.dados), item.nome_arquivo || "contrato.html");
}

async function excluirContratoDoHistorico(id) {
  const confirmar = window.confirm("Deseja apagar este contrato do histÃ³rico?");
  if (!confirmar) return;

  const historicoAtual = lerHistoricoContratosGerados();
  const novoHistorico = historicoAtual.filter((contrato) => contrato.id !== id);
  salvarHistoricoContratosGerados(novoHistorico);
  gerarHistoricoContratoVisual();
  mostrarMensagem("Contrato removido do histÃ³rico.", "#7CFC9A");
}

function sincronizarContratoAtualNoHistorico() {
  if (!clienteAtual?.contrato_modelo_nome || !clienteAtual?.contrato_texto) return;

  const historico = lerHistoricoContratosGerados();
  const existe = historico.some((item) => item.nome_arquivo === clienteAtual.contrato_modelo_nome);
  if (existe) return;

  historico.unshift({
    id: String(Date.now()),
    criado_em: clienteAtual.contrato_enviado_em || new Date().toISOString(),
    nome_arquivo: clienteAtual.contrato_modelo_nome,
    status: clienteAtual.contrato_status || "pendente",
    dados: obterDadosContratoCliente()
  });

  salvarHistoricoContratosGerados(historico);
}

function gerarHistoricoContratoVisual() {
  if (!historicoContratos) return;
  sincronizarContratoAtualNoHistorico();

  const historico = lerHistoricoContratosGerados();

  if (!historico.length) {
    historicoContratos.innerHTML = `<div class="historico-vazio">Nenhum contrato gerado ainda.</div>`;
    return;
  }

  historicoContratos.innerHTML = historico.map((item) => {
    const concluido = String(item.status || "").toLowerCase() === "concluido";

    return `
      <div class="historico-card">
        <div class="historico-card-info">
          <strong>${escaparHtml(item.nome_arquivo || "contrato.html")}</strong>
          <span>Enviado em: ${escaparHtml(formatarDataHistorico(item.criado_em))}</span>
          <em class="${concluido ? "ok" : "pendente"}">${concluido ? "ConcluÃ­do" : "Pendente de assinatura"}</em>
        </div>
        <div class="historico-card-acoes">
          <button type="button" class="btn-baixar-contrato-historico" data-id="${escaparHtml(item.id)}">Baixar</button>
          <button type="button" class="btn-excluir-contrato-historico" data-id="${escaparHtml(item.id)}">Deletar</button>
        </div>
      </div>
    `;
  }).join("");

  document.querySelectorAll(".btn-baixar-contrato-historico").forEach((botao) => {
    botao.onclick = () => baixarContratoDoHistorico(botao.dataset.id);
  });

  document.querySelectorAll(".btn-excluir-contrato-historico").forEach((botao) => {
    botao.onclick = () => excluirContratoDoHistorico(botao.dataset.id);
  });
}

function obterTituloArquivo(item) {
  if (item.titulo_arquivo && String(item.titulo_arquivo).trim()) return String(item.titulo_arquivo).trim();
  if (item.storage_path) return String(item.storage_path).split("/").pop() || "Arquivo";
  if (item.video_url) return item.tipo === "url" ? "Link externo" : "Arquivo enviado";
  return "Arquivo";
}

function criarChaveGrupoHistorico(item) {
  return String(item.storage_path || `${item.video_url || ""}|${item.data_inicio || ""}|${item.nome || ""}`).trim();
}

function agruparHistoricoArquivos(itens = []) {
  const grupos = new Map();

  itens.forEach((item) => {
    const chave = criarChaveGrupoHistorico(item);
    if (!chave) return;

    if (!grupos.has(chave)) {
      grupos.set(chave, {
        ids: [],
        storage_path: item.storage_path || "",
        video_url: item.video_url || "",
        titulo: obterTituloArquivo(item),
        tipo: item.tipo || "-",
        data_inicio: item.data_inicio || item.created_at || null,
        data_fim: item.data_fim || null,
        pontos: []
      });
    }

    const grupo = grupos.get(chave);
    grupo.ids.push(item.id);
    const ponto = String(item.codigo || "").trim();
    if (ponto && !grupo.pontos.includes(ponto)) grupo.pontos.push(ponto);
    if (!grupo.data_fim && item.data_fim) grupo.data_fim = item.data_fim;
  });

  return Array.from(grupos.values());
}

function renderizarHistoricoArquivos(itens = []) {
  if (!historicoArquivos) return;

  if (!Array.isArray(itens) || !itens.length) {
    historicoArquivos.innerHTML = `<div class="historico-vazio">Nenhum arquivo enviado para esta pasta ainda.</div>`;
    return;
  }

  const grupos = agruparHistoricoArquivos(itens);

  historicoArquivos.innerHTML = grupos.map((grupo) => {
    const idsEncoded = encodeURIComponent(JSON.stringify(grupo.ids));
    const tituloSeguro = escaparHtml(grupo.titulo || "");
    const pontosTexto = grupo.pontos.length ? grupo.pontos.join(", ") : "-";

    return `
      <div class="historico-card">
        <div class="historico-card-info">
          <strong>${tituloSeguro}</strong>
          <span><b>Pontos:</b> ${escaparHtml(pontosTexto)}</span>
          <span><b>Tipo:</b> ${escaparHtml(grupo.tipo)}</span>
          <span><b>InÃ­cio:</b> ${escaparHtml(formatarDataHistorico(grupo.data_inicio))}</span>
          <span><b>Fim:</b> ${escaparHtml(grupo.data_fim ? formatarDataHistorico(grupo.data_fim) : "-")}</span>
        </div>
        <div class="historico-card-acoes">
          <button type="button" class="btn-renomear-historico" data-ids="${idsEncoded}" data-titulo="${tituloSeguro}">Renomear</button>
          <a href="${escaparHtml(grupo.video_url || "#")}" target="_blank" rel="noopener noreferrer">Abrir</a>
          <button type="button" class="btn-deletar-historico" data-ids="${idsEncoded}" data-storage-path="${escaparHtml(grupo.storage_path || "")}">Excluir</button>
        </div>
      </div>
    `;
  }).join("");

  ativarBotoesRenomearHistorico();
  ativarBotoesDeletarHistorico();
}

function ativarBotoesRenomearHistorico() {
  document.querySelectorAll(".btn-renomear-historico").forEach((botao) => {
    botao.onclick = async () => {
      let ids = [];
      try {
        ids = JSON.parse(decodeURIComponent(botao.dataset.ids || "[]"));
      } catch (error) {
        console.error("Erro ao ler ids para renomear:", error);
      }
      await renomearGrupoHistorico(ids, botao.dataset.titulo || "");
    };
  });
}

function ativarBotoesDeletarHistorico() {
  document.querySelectorAll(".btn-deletar-historico").forEach((botao) => {
    botao.onclick = async () => {
      let ids = [];
      try {
        ids = JSON.parse(decodeURIComponent(botao.dataset.ids || "[]"));
      } catch (error) {
        console.error("Erro ao ler ids do histÃ³rico:", error);
      }
      await deletarItemHistorico(ids, botao.dataset.storagePath || "");
    };
  });
}

async function renomearGrupoHistorico(ids, tituloAtual) {
  const listaIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (!listaIds.length) return;

  const novoTitulo = window.prompt("Digite o novo nome do arquivo:", tituloAtual || "");
  if (novoTitulo === null) return;

  const tituloFinal = String(novoTitulo || "").trim();

  if (!tituloFinal) {
    mostrarMensagem("Digite um nome vÃ¡lido para o arquivo.", "#ff6b6b");
    return;
  }

  try {
    const { error } = await supabaseClient
      .from(TABELA_PLAYLISTS)
      .update({ titulo_arquivo: tituloFinal })
      .in("id", listaIds);

    if (error) throw error;

    sessionStorage.removeItem(obterChaveCache("historico_arquivos"));
    await carregarHistoricoArquivos({ forcarAtualizacao: true });
    mostrarMensagem("Nome do arquivo atualizado com sucesso.", "#7CFC9A");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao renomear arquivo.", "#ff6b6b");
  }
}

async function deletarItemHistorico(ids, storagePath) {
  const listaIds = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (!listaIds.length) return;

  const confirmar = window.confirm("Deseja deletar este arquivo de todos os pontos?");
  if (!confirmar) return;

  try {
    const caminho = String(storagePath || "").trim();

    if (caminho) {
      const { error: storageError } = await supabaseClient.storage.from(BUCKET).remove([caminho]);
      if (storageError) console.error("Erro ao deletar do storage:", storageError);
    }

    const { error: deleteError } = await supabaseClient
      .from(TABELA_PLAYLISTS)
      .delete()
      .in("id", listaIds);

    if (deleteError) throw deleteError;

    sessionStorage.removeItem(obterChaveCache("historico_arquivos"));
    await carregarHistoricoArquivos({ forcarAtualizacao: true });
    await sincronizarStatusCliente();
    mostrarMensagem("Arquivo excluÃ­do de todos os pontos.", "#7CFC9A");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao excluir arquivo.", "#ff6b6b");
  }
}

async function carregarHistoricoArquivos(opcoes = {}) {
  try {
    const cache = lerCache("historico_arquivos", CACHE_HISTORICO_ARQUIVOS_TTL);

    if (!opcoes.forcarAtualizacao && cache?.dados) {
      renderizarHistoricoArquivos(cache.dados || []);
      if (cache.fresco) return cache.dados || [];
    }

    const { data, error } = await supabaseClient
      .from(TABELA_PLAYLISTS)
      .select("*")
      .eq("codigo_cliente", codigoClienteAtual)
      .order("ordem", { ascending: false });

    if (error) throw error;

    salvarCache("historico_arquivos", data || []);
    renderizarHistoricoArquivos(data || []);
    return data || [];
  } catch (error) {
    console.error(error);
    if (historicoArquivos) {
      historicoArquivos.innerHTML = `<div class="historico-vazio">Erro ao carregar histÃ³rico de arquivo.</div>`;
    }
    return [];
  }
}

function renderizarPontosSelecionaveis(selecionados = []) {
  if (!listaPontos) return;

  const codigos = Object.keys(pontosData);

  if (!codigos.length) {
    listaPontos.innerHTML = `<div class="vazio">Nenhum ponto encontrado na tabela pontos.</div>`;
    return;
  }

  const selecionadosSet = new Set(selecionados.map((item) => String(item || "").trim()));
  const cardsSelecionados = [];
  const cardsDisponiveis = [];
  const cardsIndisponiveis = [];

  codigos
    .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }))
    .forEach((codigoPonto) => {
      const ponto = pontosData[codigoPonto];
      const nome = obterNomeDoPonto(ponto, codigoPonto);
      const checked = selecionadosSet.has(codigoPonto);
      const disponivel = pontoEstaDisponivel(ponto);
      const disabled = !disponivel;

      const card = `
        <label class="ponto-selecao ${checked ? "selecionado" : disabled ? "indisponivel" : ""}">
          <input
            type="checkbox"
            name="pontos"
            value="${escaparHtml(codigoPonto)}"
            ${checked ? "checked" : ""}
            ${disabled ? "disabled" : ""}
          >
          <span>${escaparHtml(nome)}</span>
        </label>
      `;

      if (checked) cardsSelecionados.push(card);
      else if (!disponivel) cardsIndisponiveis.push(card);
      else cardsDisponiveis.push(card);
    });

  const montarGrupo = (titulo, classe, cards) => {
    if (!cards.length) return "";
    return `
      <div class="pontos-grupo ${classe}">
        <div class="pontos-grupo-titulo">${titulo}</div>
        <div class="grid-pontos-grupo">
          ${cards.join("")}
        </div>
      </div>
    `;
  };

  listaPontos.innerHTML = `
    <div class="pontos-grupos">
      ${montarGrupo("selecionado", "selecionado", cardsSelecionados)}
      ${montarGrupo("disponÃ­vel", "disponivel", cardsDisponiveis)}
      ${montarGrupo("indisponÃ­vel", "indisponivel", cardsIndisponiveis)}
    </div>
  `;
}

function extrairCodigoClienteVinculo(item) {
  return normalizarCodigo(item?.cliente_codigo || item?.codigo_cliente || item?.codigo || "");
}

function extrairCodigoPontoVinculo(item) {
  return String(item?.ponto_codigo || item?.codigo_ponto || item?.codigo || "").trim();
}

async function carregarVinculosCliente(opcoes = {}) {
  const cache = lerCache("vinculos", CACHE_VINCULOS_TTL);

  if (!opcoes.forcarAtualizacao && cache?.dados) {
    if (cache.fresco) return cache.dados || [];
  }

  try {
    const { data, error } = await supabaseClient
      .from(TABELA_VINCULOS)
      .select("*");

    if (error) throw error;

    const vinculos = (data || [])
      .filter((item) => extrairCodigoClienteVinculo(item) === codigoClienteAtual)
      .map(extrairCodigoPontoVinculo)
      .filter(Boolean);

    salvarCache("vinculos", vinculos);
    return vinculos;
  } catch (error) {
    console.error("Erro ao buscar vÃ­nculos em playercliente:", error);
    return cache?.dados || [];
  }
}

async function calcularStatusClienteRealPorCodigoCliente() {
  const cache = lerCache("historico_arquivos", CACHE_HISTORICO_ARQUIVOS_TTL);
  let data = Array.isArray(cache?.dados) ? cache.dados : null;

  if (!data) {
    const resposta = await supabaseClient
      .from(TABELA_PLAYLISTS)
      .select("data_fim")
      .eq("codigo_cliente", codigoClienteAtual);

    if (resposta.error) return "NÃ£o ativo";
    data = resposta.data || [];
  }

  const ativos = (data || []).filter((item) => !itemEstaInativo(item));
  return ativos.length ? "Ativo" : "NÃ£o ativo";
}

async function sincronizarStatusCliente() {
  const statusReal = await calcularStatusClienteRealPorCodigoCliente();
  const statusBanco = statusReal === "Ativo" ? "ativo" : "inativo";
  atualizarStatusClienteVisual(statusReal);

  const { error } = await supabaseClient
    .from(TABELA_CLIENTES)
    .update({ status: statusBanco, statuscliente: statusBanco })
    .eq("codigo", codigoClienteAtual);

  if (error) console.error(error);
}

function validarDadosCliente() {
  let valido = true;
  const camposObrigatorios = [inputNome, inputTelefone, inputEmail, inputCpfCnpj];

  [inputNome, inputTelefone, inputEmail, inputCpfCnpj, inputVencimento].forEach(limparErro);

  camposObrigatorios.forEach((campo) => {
    if (!String(campo?.value || "").trim()) {
      marcarErro(campo);
      valido = false;
    }
  });

  if (!valido) {
    mostrarMensagem("Preencha os dados obrigatÃ³rios do cliente.", "#ff6b6b");
    return false;
  }

  return true;
}

function validarDadosParaMaterialOuContrato() {
  if (!validarDadosCliente()) return false;
  let valido = true;

  if (!String(inputVencimento?.value || "").trim()) {
    marcarErro(inputVencimento);
    valido = false;
  }

  if (!obterPontosMarcados().length) {
    mostrarMensagem("Selecione ao menos um ponto.", "#ff6b6b");
    valido = false;
  }

  if (!valido) {
    mostrarMensagem("Selecione os pontos e informe o vencimento da mÃ­dia.", "#ff6b6b");
    return false;
  }

  return true;
}

async function carregarCliente() {
  const { data, error } = await supabaseClient
    .from(TABELA_CLIENTES)
    .select("*")
    .eq("codigo", codigoClienteAtual)
    .maybeSingle();

  if (error) throw error;
  if (inputCodigo) inputCodigo.textContent = codigoClienteAtual;
  clienteAtual = data || null;

  if (!data) {
    if (inputNome) inputNome.value = "";
    if (inputTelefone) inputTelefone.value = "";
    if (inputEmail) inputEmail.value = "";
    if (inputCpfCnpj) inputCpfCnpj.value = "";
    if (inputVencimento) inputVencimento.value = data.vencimento_exibicao || data.vencimento_midia || "";
    if (inputValorContratado) inputValorContratado.value = formatarMoedaBR(0);
    if (inputDataPostagem) inputDataPostagem.value = new Date().toISOString().split("T")[0];

    atualizarStatusClienteVisual("NÃ£o ativo");
    renderizarPontosSelecionaveis([]);
    renderizarHistoricoArquivos([]);
    gerarHistoricoContratoVisual();
    gerarContratoCliente();
    ativarBotaoSalvar();
    mostrarMensagem(`Cliente ${codigoClienteAtual} ainda nÃ£o existe no banco. Preencha e clique em Salvar.`, "#ffb86b");
    return;
  }

  if (inputNome) inputNome.value = data.nome_completo || data.nome || "";
  if (inputTelefone) inputTelefone.value = formatarTelefone(data.telefone || "");
  if (inputEmail) inputEmail.value = data.email || "";
  if (inputCpfCnpj) inputCpfCnpj.value = formatarCpfCnpj(data.cpf_cnpj || "");
  if (inputVencimento) inputVencimento.value = data.vencimento_midia || "";
  if (inputValorContratado) inputValorContratado.value = formatarMoedaBR(data.valor_contratado ?? 0);
  if (inputDataPostagem) inputDataPostagem.value = data.data_postagem || new Date().toISOString().split("T")[0];

  const statusBanco = data.statuscliente || data.status || "inativo";
  atualizarStatusClienteVisual(String(statusBanco).toLowerCase() === "ativo" ? "Ativo" : "NÃ£o ativo");

  const selecionados = await carregarVinculosCliente();
  renderizarPontosSelecionaveis(selecionados);
  await carregarHistoricoArquivos();
  await sincronizarStatusCliente();
  gerarHistoricoContratoVisual();
  gerarContratoCliente();
  desativarBotaoSalvar();
  mostrarMensagem(`Cliente ${codigoClienteAtual} carregado com sucesso.`, "#7CFC9A");
}

async function inserirVinculosCliente(vinculos) {
  if (!vinculos.length) return;

  const { error } = await supabaseClient
    .from(TABELA_VINCULOS)
    .insert(vinculos);

  if (!error) return;

  const fallback = vinculos.map((item) => ({
    codigo_cliente: item.cliente_codigo,
    ponto_codigo: item.ponto_codigo,
    tipo_vinculo: item.tipo_vinculo
  }));

  const { error: fallbackError } = await supabaseClient
    .from(TABELA_VINCULOS)
    .insert(fallback);

  if (fallbackError) throw fallbackError;
}

async function apagarVinculosCliente() {
  const tentativas = [
    ["cliente_codigo", codigoClienteAtual],
    ["codigo_cliente", codigoClienteAtual]
  ];

  let ultimoErro = null;

  for (const [campo, valor] of tentativas) {
    const { error } = await executarComTimeout(
      supabaseClient
        .from(TABELA_VINCULOS)
        .delete()
        .eq(campo, valor),
      "Tempo esgotado ao apagar vÃ­nculos do cliente."
    );

    if (!error) return;
    ultimoErro = error;
  }

  if (ultimoErro) throw ultimoErro;
}

async function salvarVinculosSelecionados() {
  const pontosSelecionados = obterPontosMarcados();
  await apagarVinculosCliente();

  const vinculos = pontosSelecionados.map((codigoPonto) => ({
    cliente_codigo: codigoClienteAtual,
    ponto_codigo: codigoPonto,
    tipo_vinculo: "cliente"
  }));

  await inserirVinculosCliente(vinculos);
  sessionStorage.removeItem(obterChaveCache("vinculos"));
}

async function salvarCliente() {
  if (!validarDadosCliente()) return false;

  const statusReal = await calcularStatusClienteRealPorCodigoCliente();
  const statusBanco = statusReal === "Ativo" ? "ativo" : "inativo";
  const nomeCliente = inputNome.value.trim();
  const payload = {
    codigo: codigoClienteAtual,
    nome: nomeCliente,
    nome_completo: nomeCliente,
    telefone: inputTelefone.value.trim(),
    email: inputEmail.value.trim(),
    cpf_cnpj: inputCpfCnpj.value.trim(),
    valor_contratado: extrairNumeroMoeda(inputValorContratado.value),
    vencimento_exibicao: inputVencimento.value || null,
    data_postagem: inputDataPostagem.value || new Date().toISOString().split("T")[0],
    status: statusBanco,
    statuscliente: statusBanco,
    tipo_acesso: "cliente"
  };

  try {
    const { data: clienteAtualizado, error: errorUpdate } = await supabaseClient
      .from(TABELA_CLIENTES)
      .update(payload)
      .eq("codigo", codigoClienteAtual)
      .select("codigo");

    if (errorUpdate) throw errorUpdate;

    if (!clienteAtualizado || !clienteAtualizado.length) {
      const { error: errorInsert } = await supabaseClient
        .from(TABELA_CLIENTES)
        .insert([payload]);

      if (errorInsert) throw errorInsert;
    }

    await salvarVinculosSelecionados();
    atualizarStatusClienteVisual(statusReal);
    gerarHistoricoContratoVisual();
    gerarContratoCliente();
    mostrarMensagem("Cliente salvo com sucesso.", "#7CFC9A");
    desativarBotaoSalvar();
    return true;
  } catch (error) {
    console.error("Erro ao salvar cliente:", error);
    mostrarMensagem(`Erro ao salvar cliente: ${error.message || "falha desconhecida"}`, "#ff6b6b");
    return false;
  }
}

function detectarTipoArquivoPlaylist(file) {
  const nome = String(file?.name || "").toLowerCase();
  if (/\.(jpg|jpeg|png|webp)$/i.test(nome)) return "imagem";
  if (nome.endsWith(".txt")) return "url";
  return "video";
}

function limparNomeArquivo(nome) {
  return String(nome || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function agendaAvancadaEstaAtiva() {
  return agendamentoAtivo;
}

function obterDiasAgendamentoSelecionados() {
  return Array.from(document.querySelectorAll('input[name="agendamentoDias"]:checked'))
    .map((input) => String(input.value || "").trim())
    .filter(Boolean);
}

function obterMesesAgendamentoSelecionados() {
  return Array.from(document.querySelectorAll('input[name="agendamentoMeses"]:checked'))
    .map((input) => String(input.value || "").trim())
    .filter(Boolean);
}

function obterDiasMesAgendamentoSelecionados() {
  return Array.from(document.querySelectorAll('input[name="agendamentoDiasMes"]:checked'))
    .map((input) => String(input.value || "").trim())
    .filter(Boolean);
}

function limparSelecaoAgendamento(seletor) {
  document.querySelectorAll(seletor).forEach((input) => {
    input.checked = false;
  });
}

function obterDataLocalInput(campo) {
  const valor = String(campo?.value || "").trim();
  if (!valor) return null;

  const partes = valor.split("-").map(Number);
  if (partes.length !== 3 || partes.some((parte) => !Number.isFinite(parte))) return null;

  return new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0, 0);
}

function obterMesesPeriodoMaterial() {
  const inicio = obterDataLocalInput(inputDataPostagem);
  const fim = obterDataLocalInput(inputVencimento);
  if (!inicio || !fim || inicio > fim) return [];

  const meses = [];
  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1, 12, 0, 0, 0);
  const limite = new Date(fim.getFullYear(), fim.getMonth(), 1, 12, 0, 0, 0);

  while (cursor <= limite && meses.length < 12) {
    const mes = String(cursor.getMonth() + 1);
    if (!meses.includes(mes)) meses.push(mes);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return meses;
}

function obterDiasSemanaPeriodoMaterial() {
  const inicio = obterDataLocalInput(inputDataPostagem);
  const fim = obterDataLocalInput(inputVencimento);
  if (!inicio || !fim || inicio > fim) return [];

  const dias = [];
  const cursor = new Date(inicio);
  let limiteSeguro = 0;

  while (cursor <= fim && limiteSeguro < 370) {
    const dia = String(cursor.getDay());
    if (!dias.includes(dia)) dias.push(dia);
    if (dias.length === 7) break;

    cursor.setDate(cursor.getDate() + 1);
    limiteSeguro++;
  }

  return dias;
}

function aplicarPeriodoMaterialSeVazio() {
  const mesesAtuais = obterMesesAgendamentoSelecionados();
  const diasSemanaAtuais = obterDiasAgendamentoSelecionados();
  const diasMesAtuais = obterDiasMesAgendamentoSelecionados();

  if (agendamentoAtivo || mesesAtuais.length || diasSemanaAtuais.length || diasMesAtuais.length) return;

  const mesesPeriodo = obterMesesPeriodoMaterial();
  const diasSemanaPeriodo = obterDiasSemanaPeriodoMaterial();

  document.querySelectorAll('input[name="agendamentoMeses"]').forEach((input) => {
    input.checked = mesesPeriodo.includes(String(input.value || ""));
  });

  document.querySelectorAll('input[name="agendamentoDias"]').forEach((input) => {
    input.checked = diasSemanaPeriodo.includes(String(input.value || ""));
  });
}

function atualizarConcordanciaAgendamento(origem = "") {
  if (origem === "semana" && obterDiasAgendamentoSelecionados().length) {
    limparSelecaoAgendamento('input[name="agendamentoDiasMes"]');
  }

  if (origem === "calendario" && obterDiasMesAgendamentoSelecionados().length) {
    limparSelecaoAgendamento('input[name="agendamentoDias"]');
  }

  const temSemana = obterDiasAgendamentoSelecionados().length > 0;
  const temDiasMes = obterDiasMesAgendamentoSelecionados().length > 0;

  if (agendaMesesBloco) {
    agendaMesesBloco.hidden = false;
  }

  if (agendaCalendarioBloco) {
    agendaCalendarioBloco.hidden = temSemana;
  }

  if (agendaSemanaBloco) {
    agendaSemanaBloco.hidden = temDiasMes;
  }

  atualizarResumoAgendamento();
}

function obterNomeDiaSemana(valor) {
  const nomes = {
    0: "domingo",
    1: "segunda",
    2: "terca",
    3: "quarta",
    4: "quinta",
    5: "sexta",
    6: "sabado"
  };

  return nomes[String(valor)] || "";
}

function obterNomeMes(valor) {
  const nomes = {
    1: "jan",
    2: "fev",
    3: "mar",
    4: "abr",
    5: "mai",
    6: "jun",
    7: "jul",
    8: "ago",
    9: "set",
    10: "out",
    11: "nov",
    12: "dez"
  };

  return nomes[String(valor)] || "";
}

function atualizarResumoAgendamento() {
  if (!agendaResumo) return;

  const meses = obterMesesAgendamentoSelecionados().map(obterNomeMes).filter(Boolean);
  const dias = obterDiasAgendamentoSelecionados().map(obterNomeDiaSemana).filter(Boolean);
  const diasMes = obterDiasMesAgendamentoSelecionados();
  const horaInicio = String(agendamentoHoraInicio?.value || "").trim();
  const horaFim = String(agendamentoHoraFim?.value || "").trim();
  const partes = [];

  if (meses.length) {
    partes.push(`meses: ${meses.join(", ")}`);
  }

  if (dias.length) {
    partes.push(`dias: ${dias.join(", ")}`);
  }

  if (diasMes.length) {
    partes.push(`dias do mes: ${diasMes.join(", ")}`);
  }

  if (horaInicio && horaFim) {
    partes.push(`horario: ${horaInicio} as ${horaFim}`);
  }

  agendaResumo.textContent = partes.length
    ? `Filtro aplicado para ${partes.join(" | ")}.`
    : "Sem filtro aplicado. A midia aparece durante todo o periodo escolhido.";
}

function obterConfiguracaoAgendamento() {
  const ativo = agendaAvancadaEstaAtiva();

  return {
    ativo,
    tipo: "calendario",
    meses: ativo ? obterMesesAgendamentoSelecionados() : [],
    diasSemana: ativo ? obterDiasAgendamentoSelecionados() : [],
    diasMes: ativo ? obterDiasMesAgendamentoSelecionados() : [],
    horaInicio: ativo ? String(agendamentoHoraInicio?.value || "").trim() : "",
    horaFim: ativo ? String(agendamentoHoraFim?.value || "").trim() : ""
  };
}

function montarCamposAgendamento() {
  const config = obterConfiguracaoAgendamento();

  return {
    agendamento_ativo: config.ativo,
    agendamento_tipo: config.tipo,
    agendamento_meses: config.meses.join(","),
    agendamento_dias_semana: config.diasSemana.join(","),
    agendamento_dias_mes: config.diasMes.join(","),
    agendamento_dia_mes: config.diasMes.join(",") || null,
    agendamento_hora_inicio: config.horaInicio || null,
    agendamento_hora_fim: config.horaFim || null
  };
}

function validarConfiguracaoAgendamento() {
  const config = obterConfiguracaoAgendamento();
  if (!config.ativo) return true;

  for (const item of config.diasMes) {
    const dia = Number(item);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      mostrarStatusUpload("Escolha dias do mes entre 1 e 31.", "#ff6b6b");
      return false;
    }
  }

  if ((config.horaInicio && !config.horaFim) || (!config.horaInicio && config.horaFim)) {
    mostrarStatusUpload("Informe horÃ¡rio inicial e final.", "#ff6b6b");
    return false;
  }

  if (config.horaInicio && config.horaFim && config.horaInicio >= config.horaFim) {
    mostrarStatusUpload("O horÃ¡rio final precisa ser maior que o inicial.", "#ff6b6b");
    return false;
  }

  return true;
}

function filtroAgendamentoTemRegra() {
  const config = obterConfiguracaoAgendamento();
  return Boolean(
    config.meses.length ||
    config.diasSemana.length ||
    config.diasMes.length ||
    config.horaInicio ||
    config.horaFim
  );
}

function erroPareceColunaAgendamento(error) {
  const texto = String(error?.message || error?.details || "").toLowerCase();
  return texto.includes("agendamento_")
    || texto.includes("schema cache")
    || texto.includes("column")
    || texto.includes("does not exist");
}

async function inserirPlaylistsComAgendamento(registrosBase) {
  const camposAgendamento = montarCamposAgendamento();
  const registrosComAgenda = registrosBase.map((registro) => ({
    ...registro,
    ...camposAgendamento
  }));

  const { error } = await supabaseClient
    .from(TABELA_PLAYLISTS)
    .insert(registrosComAgenda);

  if (!error) return { agendaSalva: camposAgendamento.agendamento_ativo };
  if (!camposAgendamento.agendamento_ativo || !erroPareceColunaAgendamento(error)) throw error;

  console.warn("A tabela playlists ainda nÃ£o aceita campos de agendamento. Enviando mÃ­dia sem agenda avanÃ§ada.", error);

  const { error: fallbackError } = await supabaseClient
    .from(TABELA_PLAYLISTS)
    .insert(registrosBase);

  if (fallbackError) throw fallbackError;
  return { agendaSalva: false };
}

async function uploadArquivoCliente() {
  const file = arquivoInput?.files?.[0];

  if (!file) {
    mostrarStatusUpload("Selecione um arquivo.", "#ff6b6b");
    return;
  }

  const codigosDestino = obterPontosMarcados();

  if (!codigosDestino.length) {
    mostrarStatusUpload("Selecione ao menos um ponto antes de enviar.", "#ff6b6b");
    mostrarMensagem("Selecione ao menos um ponto antes de enviar o material.", "#ff6b6b");
    return;
  }

  if (!validarDadosParaMaterialOuContrato()) return;
  if (!validarConfiguracaoAgendamento()) return;

  try {
    mostrarStatusUpload("Salvando cliente...", "#176c36");
    const clienteSalvo = await salvarCliente();
    if (!clienteSalvo) return;

    const dataFim = inputVencimento.value || null;
    const dataInicio = inputDataPostagem?.value || new Date().toISOString().split("T")[0];
    const baseOrdem = Date.now();
    const tipoFinal = detectarTipoArquivoPlaylist(file);
    let videoUrl = "";
    let storagePath = null;

    if (tipoFinal === "url") {
      const texto = await file.text();
      videoUrl = texto.trim();

      if (!videoUrl) {
        mostrarStatusUpload("O arquivo TXT estÃ¡ vazio.", "#ff6b6b");
        return;
      }
    } else {
      mostrarStatusUpload("Enviando arquivo...", "#176c36");
      const nomeLimpo = limparNomeArquivo(file.name);
      storagePath = `clientes/${codigoClienteAtual}/${Date.now()}-${nomeLimpo}`;

      const { error: uploadError } = await supabaseClient.storage
        .from(BUCKET)
        .upload(storagePath, file, {
          cacheControl: "86400",
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabaseClient.storage
        .from(BUCKET)
        .getPublicUrl(storagePath);

      videoUrl = publicData.publicUrl;
    }

    const registros = codigosDestino.map((codigoPonto, index) => ({
      codigo: codigoPonto,
      codigo_cliente: codigoClienteAtual,
      nome: inputNome.value.trim(),
      titulo_arquivo: file.name,
      video_url: videoUrl,
      storage_path: storagePath,
      tipo: tipoFinal,
      data_inicio: dataInicio,
      data_fim: dataFim,
      ordem: baseOrdem + index
    }));

    const resultadoInsert = await inserirPlaylistsComAgendamento(registros);

    sessionStorage.removeItem(obterChaveCache("historico_arquivos"));
    await carregarHistoricoArquivos({ forcarAtualizacao: true });
    await sincronizarStatusCliente();
    gerarHistoricoContratoVisual();
    gerarContratoCliente();
    mostrarStatusUpload(
      resultadoInsert.agendaSalva ? "Material enviado com agenda avanÃ§ada." : "Material enviado para a playlist.",
      "#176c36"
    );
    mostrarMensagem(
      resultadoInsert.agendaSalva ? "Material enviado com filtro de agenda." : "Material enviado para os pontos selecionados.",
      "#7CFC9A"
    );
    arquivoInput.value = "";
  } catch (error) {
    console.error("Erro ao enviar material:", error);
    mostrarStatusUpload(`Erro ao enviar: ${error.message || "falha desconhecida"}`, "#ff6b6b");
  }
}

async function executarComAnimacaoBotao(botao, acao) {
  if (!botao || botao.disabled) return;

  botao.classList.add("carregando");
  botao.disabled = true;

  try {
    await acao();
  } finally {
    setTimeout(() => {
      botao.classList.remove("carregando");
      botao.disabled = false;
    }, 450);
  }
}

async function excluirClienteAtual() {
  if (!codigoClienteAtual) return;

  const confirmar = window.confirm(
    `Tem certeza que deseja apagar?.`
  );

  if (!confirmar) return;

  try {
    mostrarMensagem("Apagando vÃ­nculos do cliente...", "#9fd2ff");

    try {
      await apagarVinculosCliente();
    } catch (error) {
      console.warn("NÃ£o foi possÃ­vel apagar vÃ­nculos antes do cliente:", error);
    }

    mostrarMensagem("Apagando playlists do cliente...", "#9fd2ff");

    const { error: erroPlaylists } = await executarComTimeout(
      supabaseClient
        .from(TABELA_PLAYLISTS)
        .delete()
        .eq("codigo_cliente", codigoClienteAtual),
      "Tempo esgotado ao apagar playlists do cliente."
    );

    if (erroPlaylists) {
      console.warn("NÃ£o foi possÃ­vel apagar playlists antes do cliente:", erroPlaylists);
    }

    mostrarMensagem("Apagando pasta do cliente...", "#9fd2ff");

    const { data: clienteApagado, error: erroCliente } = await executarComTimeout(
      supabaseClient
        .from(TABELA_CLIENTES)
        .delete()
        .eq("codigo", codigoClienteAtual)
        .select("codigo"),
      "Tempo esgotado ao apagar a pasta do cliente."
    );

    if (erroCliente) throw erroCliente;
    if (!clienteApagado || !clienteApagado.length) {
      throw new Error("Nenhuma pasta foi apagada. Verifique se este cliente ainda existe ou se o Supabase bloqueou a exclusÃ£o.");
    }

    try {
      sessionStorage.removeItem("central_clientes_cache_v4");
    } catch {
      // Ignora falha de cache local; o cliente jÃ¡ foi apagado no banco.
    }

    sessionStorage.removeItem(obterChaveHistoricoContratos());
    limparCacheClienteAtual();
    mostrarMensagem("Cliente apagado com sucesso.", "#7CFC9A");

    setTimeout(() => {
      window.location.href = "/central-cliente.html";
    }, 500);
  } catch (error) {
    console.error(error);
    mostrarMensagem(`Erro ao apagar cliente: ${error.message || "falha desconhecida"}`, "#ff6b6b");
  }
}

if (listaPontos) {
  listaPontos.addEventListener("change", () => {
    renderizarPontosSelecionaveis(obterPontosMarcados());
    ativarBotaoSalvar();
    gerarContratoCliente();
  });
}

if (inputNome) inputNome.addEventListener("input", () => { ativarBotaoSalvar(); gerarContratoCliente(); });
if (inputEmail) inputEmail.addEventListener("input", () => { ativarBotSalvarContrato(); });
if (inputVencimento) inputVencimento.addEventListener("input", () => { ativarBotaoSalvar(); gerarContratoCliente(); });
if (inputDataPostagem) {
  inputDataPostagem.addEventListener("change", () => {
    if (!agendamentoAtivo) {
      limparSelecaoAgendamento('input[name="agendamentoMeses"]');
      limparSelecaoAgendamento('input[name="agendamentoDias"]');
      limparSelecaoAgendamento('input[name="agendamentoDiasMes"]');
      aplicarPeriodoMaterialSeVazio();
      atualizarConcordanciaAgendamento();
    }
    ativarBotaoSalvar();
    gerarContratoCliente();
  });
}

if (inputVencimento) {
  inputVencimento.addEventListener("change", () => {
    if (!agendamentoAtivo) {
      limparSelecaoAgendamento('input[name="agendamentoMeses"]');
      limparSelecaoAgendamento('input[name="agendamentoDias"]');
      limparSelecaoAgendamento('input[name="agendamentoDiasMes"]');
      aplicarPeriodoMaterialSeVazio();
      atualizarConcordanciaAgendamento();
    }
  });
}

function ativarBotSalvarContrato() {
  ativarBotaoSalvar();
  gerarContratoCliente();
}

if (inputTelefone) {
  inputTelefone.addEventListener("input", (event) => {
    event.target.value = formatarTelefone(event.target.value);
    ativarBotSalvarContrato();
  });
}

if (inputCpfCnpj) {
  inputCpfCnpj.addEventListener("input", (event) => {
    event.target.value = formatarCpfCnpj(event.target.value);
    ativarBotSalvarContrato();
  });
}

if (inputValorContratado) {
  inputValorContratado.addEventListener("blur", (event) => {
    event.target.value = formatarMoedaBR(event.target.value);
    ativarBotSalvarContrato();
  });

  if (!inputValorContratado.value) {
    inputValorContratado.value = formatarMoedaBR(0);
  }
}

if (botaoSalvar) {
  botaoSalvar.addEventListener("click", () => {
    executarComAnimacaoBotao(botaoSalvar, salvarCliente);
  });
}

if (botaoExcluirCliente) {
  botaoExcluirCliente.addEventListener("click", () => {
    executarComAnimacaoBotao(botaoExcluirCliente, excluirClienteAtual);
  });
}

if (botaoVoltar) {
  botaoVoltar.addEventListener("click", () => {
    botaoVoltar.classList.add("carregando");
    setTimeout(() => {
      window.location.href = "/central-cliente.html";
    }, 250);
  });
}

if (btnUploadCliente) {
  btnUploadCliente.addEventListener("click", () => {
    executarComAnimacaoBotao(btnUploadCliente, uploadArquivoCliente);
  });
}

if (btnBaixarContrato) {
  btnBaixarContrato.addEventListener("click", () => {
    executarComAnimacaoBotao(btnBaixarContrato, gerarContratoClienteParaHistorico);
  });
}

if (btnFiltroAgendamento && agendaAvancada) {
  btnFiltroAgendamento.addEventListener("click", () => {
    aplicarPeriodoMaterialSeVazio();
    atualizarConcordanciaAgendamento();
    agendaAvancada.hidden = false;
    btnFiltroAgendamento.setAttribute("aria-expanded", "true");
  });
}

function fecharFiltroAgendamento() {
  if (!agendaAvancada) return;
  agendaAvancada.hidden = true;
  if (btnFiltroAgendamento) {
    btnFiltroAgendamento.setAttribute("aria-expanded", "false");
  }
}

function limparFiltroAgendamento() {
  agendamentoAtivo = false;
  if (agendamentoHoraInicio) agendamentoHoraInicio.value = "";
  if (agendamentoHoraFim) agendamentoHoraFim.value = "";
  document.querySelectorAll('input[name="agendamentoMeses"], input[name="agendamentoDias"], input[name="agendamentoDiasMes"]').forEach((input) => {
    input.checked = false;
  });
  atualizarConcordanciaAgendamento();
  if (btnFiltroAgendamento) {
    btnFiltroAgendamento.classList.remove("ativo");
  }
  fecharFiltroAgendamento();
}

function aplicarFiltroAgendamento() {
  const estadoAnterior = agendamentoAtivo;
  agendamentoAtivo = true;

  if (!validarConfiguracaoAgendamento()) {
    agendamentoAtivo = estadoAnterior;
    return;
  }

  if (!filtroAgendamentoTemRegra()) {
    agendamentoAtivo = false;
    if (btnFiltroAgendamento) {
      btnFiltroAgendamento.classList.remove("ativo");
    }
    atualizarResumoAgendamento();
    fecharFiltroAgendamento();
    return;
  }

  if (btnFiltroAgendamento) {
    btnFiltroAgendamento.classList.add("ativo");
  }

  fecharFiltroAgendamento();
}

if (btnFecharFiltroAgendamento) {
  btnFecharFiltroAgendamento.addEventListener("click", fecharFiltroAgendamento);
}

if (btnLimparFiltroAgendamento) {
  btnLimparFiltroAgendamento.addEventListener("click", limparFiltroAgendamento);
}

if (btnAplicarFiltroAgendamento) {
  btnAplicarFiltroAgendamento.addEventListener("click", aplicarFiltroAgendamento);
}

if (agendaAvancada) {
  agendaAvancada.addEventListener("click", (event) => {
    if (event.target === agendaAvancada) {
      fecharFiltroAgendamento();
    }
  });
}

[agendamentoHoraInicio, agendamentoHoraFim].forEach((campo) => {
  if (campo) {
    campo.addEventListener("input", atualizarResumoAgendamento);
  }
});

document.querySelectorAll('input[name="agendamentoMeses"], input[name="agendamentoDias"], input[name="agendamentoDiasMes"]').forEach((input) => {
  input.addEventListener("change", () => {
    const origem = input.name === "agendamentoDias" ? "semana" : "calendario";
    atualizarConcordanciaAgendamento(origem);
  });
});

atualizarConcordanciaAgendamento();

async function iniciar() {
  try {
    codigoClienteAtual = obterCodigoDaUrl();

    if (!codigoClienteAtual) {
      if (inputCodigo) inputCodigo.textContent = "";
      mostrarMensagem("CÃ³digo do cliente nÃ£o encontrado na URL.", "#ff6b6b");
      return;
    }

    if (inputCodigo) inputCodigo.textContent = codigoClienteAtual;
    mostrarMensagem(`Carregando cliente ${codigoClienteAtual}...`, "#9fd2ff");
    await carregarPontos();
    await carregarModeloContrato();
    await carregarCliente();
    gerarContratoCliente();
  } catch (error) {
    console.error("Erro ao iniciar pasta-cliente:", error);
    mostrarMensagem(`Erro ao carregar dados: ${error.message || "falha desconhecida"}`, "#ff6b6b");
  }
}

iniciar();
