const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";

const TABELA_CLIENTES = "clientes_app";
const TABELA_PLAYLISTS = "playlists";

const CACHE_CLIENTES_KEY = "central_clientes_cache_v4";
const CACHE_CLIENTES_TTL = 30 * 60 * 1000;
const ORDEM_PERSONALIZADA_KEY = "central_clientes_ordem_personalizada_v2";
const FILTRO_CLIENTES_KEY = "central_clientes_filtro_v2";

let supabaseClient = null;
let clientesCarregados = [];
let carregandoClientes = false;
let timerBusca = null;
let timerMensagem = null;
let timerLimparMensagem = null;
let dragCodigo = null;
let filtroAtual = sessionStorage.getItem(FILTRO_CLIENTES_KEY) || "status";

const listaClientes = document.getElementById("listaClientes");
const mensagem = document.getElementById("mensagem");
const botaoNovoCliente = document.getElementById("botaoNovoCliente");
const botaoAtualizar = document.getElementById("botaoAtualizar");
const buscaCliente = document.getElementById("buscaCliente");
const botoesFiltro = document.querySelectorAll("[data-filtro]");
const filtroClientes = document.getElementById("filtroClientes");
const botaoVoltarPainel = document.getElementById("botaoVoltarPainel");

function verificarAcesso() {
  return true;
}

function mostrarMensagem(texto, cor = "#ffffff") {
  if (!mensagem) return;

  if (timerMensagem) {
    clearTimeout(timerMensagem);
    timerMensagem = null;
  }

  if (timerLimparMensagem) {
    clearTimeout(timerLimparMensagem);
    timerLimparMensagem = null;
  }

  mensagem.classList.remove("saindo");
  mensagem.textContent = texto || "";
  mensagem.style.color = cor;
  mensagem.hidden = !texto;

  if (!texto) return;

  timerMensagem = setTimeout(() => {
    mensagem.classList.add("saindo");

    timerLimparMensagem = setTimeout(() => {
      mensagem.textContent = "";
      mensagem.classList.remove("saindo");
      mensagem.hidden = true;
    }, 300);
  }, 5000);
}

function escaparHtml(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function abrirCliente(codigo) {
  window.location.href = `/pasta-cliente.html?codigo=${encodeURIComponent(codigo)}`;
}

function obterDataHojeISO() {
  return new Date().toISOString().split("T")[0];
}

function normalizarCodigo(codigo) {
  return String(codigo || "").trim().toUpperCase();
}

function clienteEhSupervisor(cliente) {
  return String(cliente?.tipo_acesso || "").trim().toLowerCase() === "supervisor";
}

function normalizarStatusTexto(status) {
  const valor = String(status || "").trim().toLowerCase();

  if (valor === "ativo") return "Ativo";
  return "inativo";
}

function obterNomeCliente(cliente) {
  return String(cliente.nome_completo || "Novo Cliente").trim();
}

function obterTelefoneCliente(cliente) {
  return String(cliente.telefone || "").trim();
}

function lerCacheClientes() {
  try {
    const cache = JSON.parse(sessionStorage.getItem(CACHE_CLIENTES_KEY) || "null");
    if (!cache || !Array.isArray(cache.clientes)) return null;

    return {
      clientes: cache.clientes,
      fresco: Date.now() - Number(cache.criadoEm || 0) < CACHE_CLIENTES_TTL
    };
  } catch {
    return null;
  }
}

function salvarCacheClientes(clientes) {
  try {
    sessionStorage.setItem(CACHE_CLIENTES_KEY, JSON.stringify({
      criadoEm: Date.now(),
      clientes
    }));
  } catch {
    return;
  }
}

function lerOrdemPersonalizada() {
  try {
    const lista = JSON.parse(sessionStorage.getItem(ORDEM_PERSONALIZADA_KEY) || "[]");
    return Array.isArray(lista) ? lista.map(normalizarCodigo) : [];
  } catch {
    return [];
  }
}

function salvarOrdemPersonalizada(lista) {
  sessionStorage.setItem(
    ORDEM_PERSONALIZADA_KEY,
    JSON.stringify((lista || []).map(normalizarCodigo).filter(Boolean))
  );
}

async function copiarCodigoCliente(codigo) {
  const codigoFinal = String(codigo || "").trim();
  if (!codigoFinal) return;

  try {
    await navigator.clipboard.writeText(codigoFinal);
    mostrarMensagem(`Código ${codigoFinal} copiado.`, "#ffffff");
  } catch (error) {
    console.error(error);
    mostrarMensagem("Não foi possível copiar o código.", "#ffffff");
  }
}

function atualizarBotoesFiltro() {
  botoesFiltro.forEach((botao) => {
    botao.classList.toggle("ativo", botao.dataset.filtro === filtroAtual);
  });

  if (filtroClientes) {
    filtroClientes.value = filtroAtual;
  }
}

function obterListaFiltrada() {
  const termo = (buscaCliente?.value || "").trim().toLowerCase();

  if (!termo) {
    return clientesCarregados;
  }

  return clientesCarregados.filter((cliente) => {
    const textoBusca = [
      cliente.codigo,
      cliente.nome_completo,
      cliente.telefone,
      cliente.email,
      cliente.cpf_cnpj,
      cliente.status_real,
      cliente.tipo_acesso
    ].join(" ").toLowerCase();

    return textoBusca.includes(termo);
  });
}

function ordenarClientes(lista) {
  const copia = [...lista];

  if (filtroAtual === "personalizado") {
    const ordem = lerOrdemPersonalizada();
    const posicoes = new Map(ordem.map((codigo, index) => [normalizarCodigo(codigo), index]));

    return copia.sort((a, b) => {
      const codigoA = normalizarCodigo(a.codigo);
      const codigoB = normalizarCodigo(b.codigo);
      const posA = posicoes.has(codigoA) ? posicoes.get(codigoA) : 9999;
      const posB = posicoes.has(codigoB) ? posicoes.get(codigoB) : 9999;

      if (posA !== posB) return posA - posB;
      return obterNomeCliente(a).localeCompare(obterNomeCliente(b), "pt-BR");
    });
  }

  if (filtroAtual === "nome") {
    return copia.sort((a, b) => obterNomeCliente(a).localeCompare(obterNomeCliente(b), "pt-BR"));
  }

  if (filtroAtual === "data") {
    return copia.sort((a, b) => {
      const dataA = new Date(a.data_postagem || a.created_at || 0).getTime();
      const dataB = new Date(b.data_postagem || b.created_at || 0).getTime();

      if (dataA !== dataB) return dataB - dataA;
      return obterNomeCliente(a).localeCompare(obterNomeCliente(b), "pt-BR");
    });
  }

  return copia.sort((a, b) => {
    const supervisorA = clienteEhSupervisor(a) ? 0 : 1;
    const supervisorB = clienteEhSupervisor(b) ? 0 : 1;

    if (supervisorA !== supervisorB) return supervisorA - supervisorB;

    const ativoA = a.status_real === "Ativo" ? 0 : 1;
    const ativoB = b.status_real === "Ativo" ? 0 : 1;

    if (ativoA !== ativoB) return ativoA - ativoB;
    return obterNomeCliente(a).localeCompare(obterNomeCliente(b), "pt-BR");
  });
}

function atualizarOrdemAposArrastar(codigoOrigem, codigoDestino) {
  const visiveis = ordenarClientes(obterListaFiltrada()).map((cliente) => normalizarCodigo(cliente.codigo));
  const todos = clientesCarregados.map((cliente) => normalizarCodigo(cliente.codigo));
  const ordemAtual = lerOrdemPersonalizada().filter((codigo) => todos.includes(normalizarCodigo(codigo)));

  todos.forEach((codigo) => {
    if (!ordemAtual.includes(codigo)) {
      ordemAtual.push(codigo);
    }
  });

  const origem = normalizarCodigo(codigoOrigem);
  const destino = normalizarCodigo(codigoDestino);

  if (!origem || !destino || origem === destino) return;

  const ordemVisivel = visiveis.filter((codigo) => ordemAtual.includes(codigo));
  const indexOrigem = ordemVisivel.indexOf(origem);
  const indexDestino = ordemVisivel.indexOf(destino);

  if (indexOrigem < 0 || indexDestino < 0) return;

  ordemVisivel.splice(indexOrigem, 1);
  ordemVisivel.splice(indexDestino, 0, origem);

  const novaOrdem = ordemAtual.filter((codigo) => !visiveis.includes(codigo));
  ordemVisivel.forEach((codigo) => novaOrdem.push(codigo));

  salvarOrdemPersonalizada(novaOrdem);
}

function limparAlvosDrop() {
  document.querySelectorAll(".cliente-card.alvo-drop").forEach((card) => {
    card.classList.remove("alvo-drop");
  });
}

function ativarArrasteCards() {
  if (filtroAtual !== "personalizado") return;

  document.querySelectorAll(".cliente-card").forEach((card) => {
    card.addEventListener("dragstart", () => {
      dragCodigo = card.dataset.codigo;
      card.classList.add("arrastando");
    });

    card.addEventListener("dragend", () => {
      dragCodigo = null;
      card.classList.remove("arrastando");
      limparAlvosDrop();
    });

    card.addEventListener("dragenter", (event) => {
      event.preventDefault();
      if (!dragCodigo || card.dataset.codigo === dragCodigo) return;
      limparAlvosDrop();
      card.classList.add("alvo-drop");
    });

    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (!dragCodigo || card.dataset.codigo === dragCodigo) return;

      if (!card.classList.contains("alvo-drop")) {
        limparAlvosDrop();
        card.classList.add("alvo-drop");
      }
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("alvo-drop");
    });

    card.addEventListener("drop", (event) => {
      event.preventDefault();

      const destino = card.dataset.codigo;
      if (!dragCodigo || !destino || dragCodigo === destino) return;

      atualizarOrdemAposArrastar(dragCodigo, destino);
      limparAlvosDrop();
      renderizarClientes();
    });
  });
}

function renderizarClientes() {
  if (!listaClientes) return;

  atualizarBotoesFiltro();

  const filtrados = ordenarClientes(obterListaFiltrada());
  const personalizado = filtroAtual === "personalizado";

  listaClientes.innerHTML = "";

  if (!filtrados.length) {
    listaClientes.innerHTML = `<div class="vazio">Nenhum cliente encontrado.</div>`;
    return;
  }

  const fragmento = document.createDocumentFragment();

  filtrados.forEach((cliente) => {
    const card = document.createElement("div");
    const statusReal = cliente.status_real || "inativo";
    const ativo = statusReal === "Ativo";
    const supervisor = clienteEhSupervisor(cliente);

    card.className = `cliente-card painel-card ${supervisor ? "supervisor" : ativo ? "ativo" : "nao-ativo"} ${personalizado ? "personalizado" : ""} ${!supervisor && cliente.contrato_ativo === false ? "contrato-off" : ""}`;
    card.dataset.codigo = cliente.codigo;
    card.draggable = personalizado;

    card.innerHTML = `
      <div class="cliente-topo">
        <button
          class="cliente-codigo"
          type="button"
          data-codigo="${escaparHtml(cliente.codigo)}"
          title="Clique para copiar o código"
        >${escaparHtml(cliente.codigo)}</button>

        <div class="cliente-selos">
          ${
            supervisor
              ? `<span class="cliente-tipo supervisor">Supervisor</span>`
              : `<span class="cliente-status ${ativo ? "ativo" : "nao-ativo"}">
                  ${escaparHtml(statusReal)}
                </span>`
          }
        </div>
      </div>

      <div class="cliente-corpo">
        <h3>${escaparHtml(cliente.nome_completo || "Novo Cliente")}</h3>
        <p><strong>Telefone:</strong> ${escaparHtml(cliente.telefone || "-")}</p>
        <p><strong>Email:</strong> ${escaparHtml(cliente.email || "-")}</p>
      </div>

      <div class="cliente-rodape">
        <span>${personalizado ? "Arraste para ordenar" : "Abrir pasta"}</span>
        <strong>&rarr;</strong>
      </div>
    `;

    card.addEventListener("click", () => abrirCliente(cliente.codigo));

    const botaoCodigo = card.querySelector(".cliente-codigo");

    if (botaoCodigo) {
      botaoCodigo.addEventListener("click", (event) => {
        event.stopPropagation();
        copiarCodigoCliente(cliente.codigo);
      });
    }

    fragmento.appendChild(card);
  });

  listaClientes.appendChild(fragmento);
  ativarArrasteCards();
}

function aplicarClientes(clientes, mensagemTexto = "Carregado.") {
  clientesCarregados = clientes || [];

  if (!lerOrdemPersonalizada().length) {
    salvarOrdemPersonalizada(clientesCarregados.map((cliente) => cliente.codigo));
  }

  renderizarClientes();
  mostrarMensagem(mensagemTexto, "#ffffff");
}

async function buscarClientesRemoto() {
  const consultasClientes = [
    "codigo,nome_completo,telefone,email,cpf_cnpj,status,data_postagem,tipo_acesso,created_at,contrato",
    "codigo,nome_completo,telefone,email,cpf_cnpj,status,data_postagem,tipo_acesso,created_at",
    "*"
  ];

  let clientes = null;
  let errorClientesFinal = null;

  for (const colunas of consultasClientes) {
    const { data, error } = await supabaseClient
      .from(TABELA_CLIENTES)
      .select(colunas)
      .order("codigo", { ascending: true });

    if (!error) {
      clientes = data || [];
      errorClientesFinal = null;
      break;
    }

    errorClientesFinal = error;
    console.warn(`Falha ao buscar clientes com colunas: ${colunas}`, error);
  }

  if (errorClientesFinal) {
    throw errorClientesFinal;
  }

  const hoje = obterDataHojeISO();

  const consultasPlaylists = [
    {
      colunas: "codigo_cliente,data_fim",
      filtro: `data_fim.is.null,data_fim.gte.${hoje}`
    },
    {
      colunas: "codigo_cliente,fim_exibicao",
      filtro: `fim_exibicao.is.null,fim_exibicao.gte.${hoje}`
    },
    {
      colunas: "codigo_cliente",
      filtro: null
    }
  ];

  let playlists = [];
  let encontrouPlaylist = false;

  for (const consulta of consultasPlaylists) {
    let query = supabaseClient
      .from(TABELA_PLAYLISTS)
      .select(consulta.colunas);

    if (consulta.filtro) {
      query = query.or(consulta.filtro);
    }

    const { data, error } = await query;

    if (!error) {
      playlists = data || [];
      encontrouPlaylist = true;
      break;
    }

    console.warn(`Falha ao buscar playlists com colunas: ${consulta.colunas}`, error);
  }

  if (!encontrouPlaylist) {
    playlists = [];
  }

  const mapaAtivos = new Map();

  playlists.forEach((item) => {
    const codigo = normalizarCodigo(item?.codigo_cliente);
    if (!codigo) return;
    mapaAtivos.set(codigo, true);
  });

  return (clientes || []).map((cliente) => {
    const codigoOriginal = String(cliente.codigo || "").trim();
    const codigoNormalizado = normalizarCodigo(codigoOriginal);
    const statusBanco = normalizarStatusTexto(cliente.status);
    const supervisor = clienteEhSupervisor(cliente);
    const statusReal = supervisor || mapaAtivos.has(codigoNormalizado) ? "Ativo" : statusBanco;
    const contratoAtivo = cliente.contrato_ativo !== undefined
      ? cliente.contrato_ativo !== false
      : Boolean(String(cliente.contrato || "").trim());

    return {
      ...cliente,
      codigo: codigoOriginal,
      nome_completo: String(cliente.nome_completo || "Novo Cliente").trim(),
      telefone: obterTelefoneCliente(cliente),
      status_real: statusReal,
      contrato_ativo: contratoAtivo
    };
  });
}

async function carregarClientes(opcoes = {}) {
  const forcarAtualizacao = opcoes.forcarAtualizacao === true;

  if (carregandoClientes) return;

  const cache = lerCacheClientes();

  if (!forcarAtualizacao && cache?.clientes?.length) {
    aplicarClientes(cache.clientes, cache.fresco ? "Carregado." : "Atualizando...");
    if (cache.fresco) return;
  }

  if (!supabaseClient) {
    if (listaClientes) {
      listaClientes.innerHTML = `<div class="vazio">Erro ao conectar com o Supabase.</div>`;
    }

    mostrarMensagem("Supabase não carregou. Verifique o script CDN no HTML.", "#ffffff");
    return;
  }

  carregandoClientes = true;

  if (botaoAtualizar) {
    botaoAtualizar.disabled = true;
    botaoAtualizar.style.opacity = "0.6";
    botaoAtualizar.style.cursor = "not-allowed";
  }

  try {
    mostrarMensagem(cache?.clientes?.length ? "Atualizando..." : "Carregando clientes...");

    const final = await buscarClientesRemoto();

    salvarCacheClientes(final);
    aplicarClientes(final, "Carregado.");
  } catch (error) {
    console.error(error);

    if (cache?.clientes?.length) {
      aplicarClientes(cache.clientes, "Carregado pelo cache.");
      return;
    }

    if (listaClientes) {
      listaClientes.innerHTML = `<div class="vazio">Erro ao carregar clientes.</div>`;
    }

    mostrarMensagem("Erro ao carregar clientes do Supabase.", "#ffffff");
  } finally {
    carregandoClientes = false;

    if (botaoAtualizar) {
      botaoAtualizar.disabled = false;
      botaoAtualizar.style.opacity = "1";
      botaoAtualizar.style.cursor = "pointer";
    }
  }
}

function gerarCodigoAleatorio() {
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numeros = "0123456789";

  return (
    letras[Math.floor(Math.random() * letras.length)] +
    numeros[Math.floor(Math.random() * numeros.length)] +
    letras[Math.floor(Math.random() * letras.length)] +
    numeros[Math.floor(Math.random() * numeros.length)]
  );
}

async function obterCodigoUnico() {
  const usadosLocais = new Set(clientesCarregados.map((cliente) => normalizarCodigo(cliente.codigo)));

  for (let tentativa = 0; tentativa < 50; tentativa++) {
    const codigo = gerarCodigoAleatorio();

    if (usadosLocais.has(codigo)) {
      continue;
    }

    const { data, error } = await supabaseClient
      .from(TABELA_CLIENTES)
      .select("codigo")
      .eq("codigo", codigo)
      .maybeSingle();

    if (error) throw error;
    if (!data) return codigo;
  }

  throw new Error("Não foi possível gerar um código único.");
}

async function criarNovoCliente() {
  try {
    if (botaoNovoCliente) {
      botaoNovoCliente.disabled = true;
      botaoNovoCliente.style.opacity = "0.6";
      botaoNovoCliente.style.cursor = "not-allowed";
    }

    mostrarMensagem("Criando novo cliente...");

    const codigoLivre = await obterCodigoUnico();

    const tentativasPayload = [
      {
        codigo: codigoLivre,
        nome_completo: "Novo Cliente",
        telefone: "",
        email: "",
        cpf_cnpj: "",
        status: "inativo",
        tipo_acesso: "cliente"
      },
      {
        codigo: codigoLivre,
        nome_completo: "Novo Cliente",
        telefone: "",
        email: "",
        cpf_cnpj: "",
        status: "inativo",
        tipo_acesso: "cliente",
        contrato: ""
      },
      {
        codigo: codigoLivre,
        nome_completo: "Novo Cliente",
        telefone: "",
        email: "",
        cpf_cnpj: "",
        status: "inativo",
        data_postagem: new Date().toISOString(),
        tipo_acesso: "cliente",
        contrato: ""
      }
    ];

    let errorFinal = null;

    for (const payload of tentativasPayload) {
      const { error } = await supabaseClient
        .from(TABELA_CLIENTES)
        .insert(payload);

      if (!error) {
        errorFinal = null;
        break;
      }

      errorFinal = error;
      console.warn("Falha ao criar cliente com payload:", payload, error);
    }

    if (errorFinal) throw errorFinal;

    sessionStorage.removeItem(CACHE_CLIENTES_KEY);

    mostrarMensagem(`Cliente ${codigoLivre} criado com sucesso.`, "#ffffff");
    await carregarClientes({ forcarAtualizacao: true });
    abrirCliente(codigoLivre);
  } catch (error) {
    console.error(error);
    mostrarMensagem("Erro ao criar novo cliente.", "#ffffff");
  } finally {
    if (botaoNovoCliente) {
      botaoNovoCliente.disabled = false;
      botaoNovoCliente.style.opacity = "1";
      botaoNovoCliente.style.cursor = "pointer";
    }
  }
}

function iniciarPagina() {
  if (botaoVoltarPainel) {
    botaoVoltarPainel.addEventListener("click", () => {
      window.location.href = "/centralpainel.html";
    });
  }

  if (!verificarAcesso()) {
    return;
  }

  if (!window.supabase) {
    if (listaClientes) {
      listaClientes.innerHTML = `<div class="vazio">Supabase não carregou.</div>`;
    }

    mostrarMensagem("Supabase não carregou. Verifique o script no HTML.", "#ffffff");
    return;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  if (botaoNovoCliente) {
    botaoNovoCliente.addEventListener("click", criarNovoCliente);
  }

  if (botaoAtualizar) {
    botaoAtualizar.addEventListener("click", () => carregarClientes({ forcarAtualizacao: true }));
  }

  if (buscaCliente) {
    buscaCliente.addEventListener("input", () => {
      clearTimeout(timerBusca);
      timerBusca = setTimeout(renderizarClientes, 180);
    });
  }

  botoesFiltro.forEach((botao) => {
    botao.addEventListener("click", () => {
      filtroAtual = botao.dataset.filtro || "status";
      sessionStorage.setItem(FILTRO_CLIENTES_KEY, filtroAtual);
      renderizarClientes();
    });
  });

  if (filtroClientes) {
    filtroClientes.addEventListener("change", () => {
      filtroAtual = filtroClientes.value || "status";
      sessionStorage.setItem(FILTRO_CLIENTES_KEY, filtroAtual);
      renderizarClientes();
    });
  }

  atualizarBotoesFiltro();
  carregarClientes();

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

iniciarPagina();
