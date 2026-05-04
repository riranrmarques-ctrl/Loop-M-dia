const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const TABELA_PONTOS = "pontos";
const TABELA_PLAYLISTS = "playlists";

let supabaseClient = null;
let usandoSupabase = false;

const store = {
  selectedPointId: "ponto-001",
  manifestVersion: 1,
  pontos: [
    {
      id: "ponto-001",
      codigo: "DUNA-001",
      nome: "Academia Prime Barra",
      cidade: "Salvador / Barra",
      endereco: "Av. Oceanica, 1200",
      disponivel: true,
      imagem: "https://placehold.co/900x506/0f6b5a/ffffff/png?text=Academia+Prime",
      materiais: [
        {
          id: "mat-001",
          cliente: "Duna Branding",
          nome: "Institucional Duna",
          tipo: "video",
          posicao: 1,
          repeticoes: 2,
          duracao: 30,
          storagePath: "r2://duna/institucional-duna.mp4",
          checksum: "sha256-demo-001",
          status: "ativo",
        },
        {
          id: "mat-002",
          cliente: "Mega Burger",
          nome: "Combo almoco",
          tipo: "video",
          posicao: 2,
          repeticoes: 1,
          duracao: 20,
          storagePath: "r2://mega-burger/combo-almoco.mp4",
          checksum: "sha256-demo-002",
          status: "ativo",
        },
        {
          id: "mat-003",
          cliente: "Clinica Vida",
          nome: "Checkup preventivo",
          tipo: "imagem",
          posicao: 3,
          repeticoes: 3,
          duracao: 12,
          storagePath: "r2://clinica-vida/checkup.jpg",
          checksum: "sha256-demo-003",
          status: "ativo",
        },
      ],
    },
    {
      id: "ponto-002",
      codigo: "DUNA-002",
      nome: "Restaurante Mar Azul",
      cidade: "Salvador / Pituba",
      endereco: "Rua das Hortensias, 88",
      disponivel: true,
      imagem: "https://placehold.co/900x506/c99b36/111b17/png?text=Mar+Azul",
      materiais: [],
    },
  ],
};

const api = {
  async listarPontos() {
    if (supabaseClient) {
      try {
        const { data: pontos, error: pontosError } = await supabaseClient
          .from(TABELA_PONTOS)
          .select("*")
          .order("nome", { ascending: true });

        if (pontosError) throw pontosError;

        if (pontos?.length) {
          const codigosPontos = pontos.map((ponto) => ponto.codigo);
          const { data: materiais, error: materiaisError } = await supabaseClient
            .from(TABELA_PLAYLISTS)
            .select("*")
            .in("codigo", codigosPontos)
            .order("ordem", { ascending: true });

          if (materiaisError) throw materiaisError;

          store.pontos = pontos.map((ponto) => mapearPontoSupabase(ponto, materiais || []));

          if (!store.pontos.some((ponto) => ponto.id === store.selectedPointId)) {
            store.selectedPointId = store.pontos[0]?.id || "";
          }

          usandoSupabase = true;
        }
      } catch (error) {
        usandoSupabase = false;
        console.warn("Supabase indisponivel, usando mock local:", error);
      }
    }

    return copiarDados(store.pontos);
  },
  async salvarMaterial(pontoId, material) {
    const ponto = store.pontos.find((item) => item.id === pontoId);
    if (!ponto) return;

    const novoMaterial = {
      id: `mat-${Date.now()}`,
      posicao: ponto.materiais.length + 1,
      tipo: "video",
      duracao: 20,
      checksum: `sha256-local-${Date.now()}`,
      status: "ativo",
      ...material,
    };

    if (supabaseClient && usandoSupabase) {
      const { data, error } = await supabaseClient
        .from(TABELA_PLAYLISTS)
        .insert({
          codigo: ponto.codigo,
          codigo_cliente: novoMaterial.cliente,
          nome: novoMaterial.nome,
          tipo: novoMaterial.tipo,
          ordem: novoMaterial.posicao,
          titulo_arquivo: novoMaterial.nome,
          video_url: novoMaterial.storagePath,
          storage_path: novoMaterial.storagePath,
        })
        .select("*")
        .single();

      if (error) throw error;
      ponto.materiais.push(mapearMaterialSupabase(data));
    } else {
      ponto.materiais.push(novoMaterial);
    }

    store.manifestVersion += 1;
  },
  async copiarPlaylist({ origemId, destinoId }) {
    const origem = store.pontos.find((item) => item.id === origemId);
    const destino = store.pontos.find((item) => item.id === destinoId);

    if (!origem || !destino) return;

    const materiaisCopiados = origem.materiais.map((material, index) => ({
      ...copiarDados(material),
      id: `mat-copy-${Date.now()}-${index}`,
      posicao: index + 1,
    }));

    if (supabaseClient && usandoSupabase) {
      const { error: deleteError } = await supabaseClient
        .from(TABELA_PLAYLISTS)
        .delete()
        .eq("codigo", destino.codigo);

      if (deleteError) throw deleteError;

      if (materiaisCopiados.length) {
        const { data, error } = await supabaseClient
          .from(TABELA_PLAYLISTS)
          .insert(materiaisCopiados.map((material) => ({
            codigo: destino.codigo,
            codigo_cliente: material.cliente,
            nome: material.nome,
            tipo: material.tipo,
            ordem: material.posicao,
            titulo_arquivo: material.nome,
            video_url: material.storagePath,
            storage_path: material.storagePath,
          })))
          .select("*");

        if (error) throw error;
        destino.materiais = (data || []).map(mapearMaterialSupabase);
      } else {
        destino.materiais = [];
      }
    } else {
      destino.materiais = materiaisCopiados;
    }

    store.manifestVersion += 1;
  },
  async alternarDisponibilidade(pontoId, disponivel) {
    const ponto = store.pontos.find((item) => item.id === pontoId);
    if (!ponto) return;

    ponto.disponivel = disponivel;

    if (supabaseClient && usandoSupabase) {
      const { error } = await supabaseClient
        .from(TABELA_PONTOS)
        .update({ disponivel })
        .eq("codigo", ponto.codigo);

      if (error) throw error;
    }
  },
};

function copiarDados(valor) {
  return JSON.parse(JSON.stringify(valor));
}

function iniciarSupabase() {
  if (!window.supabase?.createClient) {
    console.warn("SDK da Supabase nao carregou. Usando mock local.");
    return;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

function mapearPontoSupabase(ponto, materiais) {
  return {
    id: ponto.codigo,
    codigo: ponto.codigo || ponto.code || "----",
    nome: ponto.nome || ponto.name || "Ponto sem nome",
    cidade: ponto.cidade || ponto.city || "",
    endereco: ponto.endereco || ponto.address || "",
    disponivel: ponto.disponivel !== false,
    imagem: ponto.imagem_url || ponto.imagem || "https://placehold.co/900x506/0f6b5a/ffffff/png?text=Ponto",
    materiais: materiais
      .filter((material) => material.codigo === ponto.codigo)
      .map(mapearMaterialSupabase),
  };
}

function mapearMaterialSupabase(material) {
  return {
    id: material.id,
    cliente: material.codigo_cliente || material.cliente || material.client_name || "Cliente",
    nome: material.titulo_arquivo || material.nome || material.name || "Material",
    tipo: material.tipo || material.type || "video",
    posicao: Number(material.ordem || material.posicao || material.position || 1),
    repeticoes: Number(material.repeticoes || material.plays_per_cycle || 1),
    duracao: Number(material.duracao || material.duration_seconds || 20),
    storagePath: material.storage_path || material.video_url || material.storagePath || "",
    checksum: material.checksum || "",
    status: material.status || "ativo",
  };
}

const els = {
  listaPontos: document.querySelector("#listaPontos"),
  pontosBox: document.querySelector("#pontosBox"),
  pontoDetalhe: document.querySelector("#pontoDetalhe"),
  btnVoltar: document.querySelector("#btnVoltar"),
  btnNovoPonto: document.querySelector("#btnNovoPonto"),
  btnEditarInfo: document.querySelector("#btnEditarInfo"),
  btnToggleDisponibilidade: document.querySelector("#btnToggleDisponibilidade"),
  btnNovoMaterial: document.querySelector("#btnNovoMaterial"),
  btnSalvarMaterial: document.querySelector("#btnSalvarMaterial"),
  btnCopiarPlaylist: document.querySelector("#btnCopiarPlaylist"),
  btnConfirmarCopiaPlaylist: document.querySelector("#btnConfirmarCopiaPlaylist"),
  modalEditar: document.querySelector("#modalEditar"),
  modalMaterial: document.querySelector("#modalMaterial"),
  modalCopiarPlaylist: document.querySelector("#modalCopiarPlaylist"),
  playlistOrigemSelect: document.querySelector("#playlistOrigemSelect"),
  statusPonto: document.querySelector("#statusPonto"),
  imagemPonto: document.querySelector("#imagemPonto"),
  tituloPasta: document.querySelector("#tituloPasta"),
  cidadePonto: document.querySelector("#cidadePonto"),
  enderecoPonto: document.querySelector("#enderecoPonto"),
  codigoAtual: document.querySelector("#codigoAtual"),
  playlistAtiva: document.querySelector("#playlistAtiva"),
  historicoEncerramento: document.querySelector("#historicoEncerramento"),
  historicoStatus: document.querySelector("#historicoStatus"),
  manifestoPreview: document.querySelector("#manifestoPreview"),
  manifestoVersao: document.querySelector("#manifestoVersao"),
  manifestoMateriais: document.querySelector("#manifestoMateriais"),
  manifestoClientes: document.querySelector("#manifestoClientes"),
  manifestoRepeticoes: document.querySelector("#manifestoRepeticoes"),
  editNome: document.querySelector("#editNome"),
  editCidade: document.querySelector("#editCidade"),
  editEndereco: document.querySelector("#editEndereco"),
  previewImagem: document.querySelector("#previewImagem"),
  materialCliente: document.querySelector("#materialCliente"),
  materialNome: document.querySelector("#materialNome"),
  materialStoragePath: document.querySelector("#materialStoragePath"),
  materialRepeticoes: document.querySelector("#materialRepeticoes"),
};

document.addEventListener("DOMContentLoaded", iniciar);

async function iniciar() {
  iniciarSupabase();
  vincularEventos();
  await renderizarPontos();
}

function vincularEventos() {
  els.btnVoltar?.addEventListener("click", fecharDetalhe);
  els.btnNovoPonto?.addEventListener("click", () => alert("Criacao de ponto fica para conectar na base."));
  els.btnEditarInfo?.addEventListener("click", abrirModalEdicao);
  els.btnNovoMaterial?.addEventListener("click", abrirModalMaterial);
  els.btnSalvarMaterial?.addEventListener("click", salvarMaterial);
  els.btnCopiarPlaylist?.addEventListener("click", abrirModalCopiarPlaylist);
  els.btnConfirmarCopiaPlaylist?.addEventListener("click", copiarPlaylistInteira);
  els.btnToggleDisponibilidade?.addEventListener("click", alternarDisponibilidade);
}

async function renderizarPontos() {
  const pontos = await api.listarPontos();

  els.pontosBox.innerHTML = pontos
    .map((ponto) => {
      const ativo = ponto.id === store.selectedPointId ? " ativo" : "";
      const statusTexto = ponto.disponivel ? "Ativo" : "Inativo";
      const localizacao = [ponto.cidade, ponto.endereco].filter(Boolean).join(" | ") || "Localizacao nao definida";

      return `
        <article class="ponto-card${ativo}">
          <div class="ponto-status ${ponto.disponivel ? "online" : "offline"}">
            <span></span>${statusTexto}
          </div>
          <div class="ponto-thumb">
            <img src="${ponto.imagem}" alt="${ponto.nome}">
          </div>
          <h3>${ponto.nome}</h3>
          <p>${localizacao}</p>
          <div class="ponto-meta">
            <span class="ponto-codigo">${ponto.codigo}</span>
            <small>${ponto.materiais.length} materiais na playlist</small>
          </div>
          <button class="abrir-pasta-btn" type="button" data-ponto-id="${ponto.id}">Abrir pasta</button>
        </article>
      `;
    })
    .join("");

  els.pontosBox.querySelectorAll("[data-ponto-id]").forEach((button) => {
    button.addEventListener("click", () => abrirPonto(button.dataset.pontoId));
  });
}

function abrirPonto(pontoId) {
  store.selectedPointId = pontoId;
  const ponto = pontoAtual();

  els.pontoDetalhe.style.display = "";
  document.body.classList.add("pasta-aberta");
  els.statusPonto.textContent = ponto.disponivel ? "Disponivel" : "Indisponivel";
  els.imagemPonto.src = ponto.imagem;
  els.tituloPasta.textContent = ponto.nome;
  els.cidadePonto.textContent = ponto.cidade;
  els.enderecoPonto.textContent = ponto.endereco;
  els.codigoAtual.textContent = ponto.codigo;

  atualizarToggle(ponto.disponivel);
  preencherModalEdicao(ponto);
  renderizarPlaylist(ponto);
  renderizarHistoricos();
  renderizarManifesto(ponto);
}

function fecharDetalhe() {
  els.pontoDetalhe.style.display = "none";
  document.body.classList.remove("pasta-aberta");
  renderizarPontos();
}

function renderizarPlaylist(ponto) {
  const materiais = [...ponto.materiais].sort((a, b) => a.posicao - b.posicao);

  els.playlistAtiva.innerHTML = materiais.length
    ? materiais.map(renderizarMaterial).join("")
    : `<div class="historico-item">Nenhum material cadastrado para este ponto.</div>`;
}

function renderizarMaterial(material) {
  return `
    <article class="material-card">
      <span class="material-posicao">${String(material.posicao).padStart(2, "0")}</span>
      <div>
        <h5>${material.nome}</h5>
        <p>${material.cliente} Â· ${material.storagePath}</p>
      </div>
      <span class="material-repeticao">${material.repeticoes}x por ciclo</span>
      <span class="material-status">${material.status}</span>
    </article>
  `;
}

function renderizarManifesto(ponto) {
  const clientes = new Set(ponto.materiais.map((item) => item.cliente));
  const repeticoes = ponto.materiais.reduce((total, item) => total + Number(item.repeticoes || 0), 0);

  const manifesto = {
    point_id: ponto.id,
    point_code: ponto.codigo,
    version: store.manifestVersion,
    generated_at: new Date().toISOString(),
    storage_provider: "cloudflare_r2",
    playback_strategy: "ordered_cycle_with_repetition",
    items: ponto.materiais
      .sort((a, b) => a.posicao - b.posicao)
      .map((item) => ({
        media_id: item.id,
        client_name: item.cliente,
        order: item.posicao,
        plays_per_cycle: item.repeticoes,
        duration_seconds: item.duracao,
        storage_path: item.storagePath,
        checksum: item.checksum,
        status: item.status,
      })),
  };

  els.manifestoVersao.textContent = `v${store.manifestVersion}`;
  els.manifestoMateriais.textContent = ponto.materiais.length;
  els.manifestoClientes.textContent = clientes.size;
  els.manifestoRepeticoes.textContent = repeticoes;
  els.manifestoPreview.textContent = JSON.stringify(manifesto, null, 2);
}

function renderizarHistoricos() {
  els.historicoEncerramento.innerHTML = `
    <div class="historico-item">Nenhum encerramento registrado no mock local.</div>
  `;
  els.historicoStatus.innerHTML = `
    <div class="historico-item">Manifesto preparado para conexao posterior.</div>
  `;
}

function abrirModalEdicao() {
  preencherModalEdicao(pontoAtual());
  els.modalEditar.showModal();
}

function preencherModalEdicao(ponto) {
  els.editNome.value = ponto.nome;
  els.editCidade.value = ponto.cidade;
  els.editEndereco.value = ponto.endereco;
  els.previewImagem.src = ponto.imagem;
}

function abrirModalMaterial() {
  els.materialCliente.value = "";
  els.materialNome.value = "";
  els.materialStoragePath.value = "";
  els.materialRepeticoes.value = "1";
  els.modalMaterial.showModal();
}

async function abrirModalCopiarPlaylist() {
  await api.listarPontos();

  const ponto = pontoAtual();
  const opcoes = store.pontos
    .filter((item) => item.id !== ponto.id)
    .map((item) => `
      <option value="${item.id}">
        ${item.nome} Â· ${item.materiais.length} materiais
      </option>
    `)
    .join("");

  els.playlistOrigemSelect.innerHTML = opcoes || `<option value="">Nenhuma pasta disponivel</option>`;
  els.btnConfirmarCopiaPlaylist.disabled = !opcoes;
  els.modalCopiarPlaylist.showModal();
}

async function copiarPlaylistInteira() {
  const origemId = els.playlistOrigemSelect.value;

  if (!origemId) {
    alert("Selecione uma pasta de origem.");
    return;
  }

  await api.copiarPlaylist({
    origemId,
    destinoId: store.selectedPointId,
  });

  els.modalCopiarPlaylist.close();
  abrirPonto(store.selectedPointId);
}

async function salvarMaterial() {
  const cliente = els.materialCliente.value.trim();
  const nome = els.materialNome.value.trim();
  const storagePath = els.materialStoragePath.value.trim();
  const repeticoes = Number(els.materialRepeticoes.value || 1);

  if (!cliente || !nome || !storagePath) {
    alert("Preencha cliente, nome do material e caminho do arquivo.");
    return;
  }

  await api.salvarMaterial(store.selectedPointId, {
    cliente,
    nome,
    repeticoes,
    storagePath,
  });

  els.modalMaterial.close();
  abrirPonto(store.selectedPointId);
}

async function alternarDisponibilidade() {
  const ponto = pontoAtual();

  try {
    await api.alternarDisponibilidade(ponto.id, !ponto.disponivel);
    abrirPonto(ponto.id);
  } catch (error) {
    console.error(error);
    alert("Erro ao atualizar disponibilidade no Supabase.");
  }
}

function atualizarToggle(disponivel) {
  els.btnToggleDisponibilidade.classList.toggle("ativo", disponivel);
  els.btnToggleDisponibilidade.classList.toggle("indisponivel", !disponivel);
  els.btnToggleDisponibilidade.querySelector(".toggle-texto").textContent = disponivel ? "Disponivel" : "Indisponivel";
}

function pontoAtual() {
  return store.pontos.find((ponto) => ponto.id === store.selectedPointId) || store.pontos[0];
}
