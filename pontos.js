const SUPABASE_URL = "https://dfzvmambzhhsijopcizk.supabase.co";
const SUPABASE_KEY = "sb_publishable_gSPO1gNfcdy3JNOxMprCbg_Wca6u6WQ";
const TABELA_PONTOS = "pontos";
const TABELA_PLAYLISTS = "playlists";

let supabaseClient = null;
let usandoSupabase = false;
let criandoNovoPonto = false;

const store = {
  selectedPointId: "",
  manifestVersion: 1,
  pontos: [],
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
        console.error("Erro ao carregar pontos da Supabase:", error);
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
  async salvarPonto(pontoId, payload) {
    if (!supabaseClient) throw new Error("Supabase nao carregou.");

    if (pontoId) {
      const ponto = store.pontos.find((item) => item.id === pontoId);
      if (!ponto) return null;

      const { data, error } = await supabaseClient
        .from(TABELA_PONTOS)
        .update(payload)
        .eq("codigo", ponto.codigo)
        .select("*")
        .single();

      if (error) throw error;
      return mapearPontoSupabase(data, ponto.materiais.map((material) => ({
        ...material,
        codigo: ponto.codigo,
      })));
    }

    const { data, error } = await supabaseClient
      .from(TABELA_PONTOS)
      .insert({
        codigo: gerarCodigoPonto(),
        disponivel: true,
        ...payload,
      })
      .select("*")
      .single();

    if (error) throw error;
    return mapearPontoSupabase(data, []);
  },
  async deletarPonto(pontoId) {
    if (!supabaseClient) throw new Error("Supabase nao carregou.");

    const ponto = store.pontos.find((item) => item.id === pontoId);
    if (!ponto) return;

    const { error: playlistsError } = await supabaseClient
      .from(TABELA_PLAYLISTS)
      .delete()
      .eq("codigo", ponto.codigo);

    if (playlistsError) throw playlistsError;

    const { error } = await supabaseClient
      .from(TABELA_PONTOS)
      .delete()
      .eq("codigo", ponto.codigo);

    if (error) throw error;
  },
  async uploadImagemPonto(pontoId, arquivo) {
    if (!supabaseClient) throw new Error("Supabase nao carregou.");

    const ponto = store.pontos.find((item) => item.id === pontoId);
    if (!ponto) return "";

    const storagePath = `${ponto.codigo}/${Date.now()}-${normalizarNomeArquivo(arquivo.name)}`;
    const { error } = await supabaseClient.storage
      .from("pontos")
      .upload(storagePath, arquivo, { upsert: true });

    if (error) throw error;

    const { data } = supabaseClient.storage.from("pontos").getPublicUrl(storagePath);
    const imagemUrl = data.publicUrl;

    await this.salvarPonto(pontoId, { imagem_url: imagemUrl });
    ponto.imagem = imagemUrl;
    return imagemUrl;
  },
  async uploadMidiaPlaylist(pontoId, arquivo) {
    if (!supabaseClient) throw new Error("Supabase nao carregou.");

    const ponto = store.pontos.find((item) => item.id === pontoId);
    if (!ponto) return;

    const storagePath = `playlists/${ponto.codigo}/${Date.now()}-${normalizarNomeArquivo(arquivo.name)}`;
    const { error: uploadError } = await supabaseClient.storage
      .from("pontos")
      .upload(storagePath, arquivo, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabaseClient.storage.from("pontos").getPublicUrl(storagePath);
    const tipo = arquivo.type.startsWith("image/") ? "imagem" : "video";

    await this.salvarMaterial(pontoId, {
      cliente: "",
      nome: arquivo.name,
      tipo,
      storagePath: publicData.publicUrl,
    });
  },
};

function copiarDados(valor) {
  return JSON.parse(JSON.stringify(valor));
}

function gerarCodigoPonto() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 7 }, () => letras[Math.floor(Math.random() * letras.length)]).join("");
}

function normalizarNomeArquivo(nome) {
  return String(nome || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function escapeHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
    imagem: ponto.imagem_url || ponto.imagem || "",
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
  btnSalvarEdicao: document.querySelector("#btnSalvarEdicao"),
  btnDeletarPonto: document.querySelector("#btnDeletarPonto"),
  btnUpgradePlaylist: document.querySelector("#btnUpgradePlaylist"),
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
  inputImagem: document.querySelector("#inputImagem"),
  inputUpgradePlaylist: document.querySelector("#inputUpgradePlaylist"),
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
  els.btnNovoPonto?.addEventListener("click", abrirModalNovoPonto);
  els.btnEditarInfo?.addEventListener("click", abrirModalEdicao);
  els.btnNovoMaterial?.addEventListener("click", abrirModalMaterial);
  els.btnSalvarMaterial?.addEventListener("click", salvarMaterial);
  els.btnCopiarPlaylist?.addEventListener("click", abrirModalCopiarPlaylist);
  els.btnConfirmarCopiaPlaylist?.addEventListener("click", copiarPlaylistInteira);
  els.btnSalvarEdicao?.addEventListener("click", salvarEdicaoPonto);
  els.btnDeletarPonto?.addEventListener("click", deletarPontoAtual);
  els.btnUpgradePlaylist?.addEventListener("click", () => els.inputUpgradePlaylist?.click());
  els.inputImagem?.addEventListener("change", atualizarImagemPonto);
  els.inputUpgradePlaylist?.addEventListener("change", uploadMidiaPlaylist);
  els.btnToggleDisponibilidade?.addEventListener("click", alternarDisponibilidade);
}

async function renderizarPontos() {
  const pontos = await api.listarPontos();

  if (!pontos.length) {
    els.pontosBox.innerHTML = `
      <div class="estado-carregando">
        Nenhum ponto foi carregado do banco. Verifique a tabela pontos e as politicas de leitura.
      </div>
    `;
    return;
  }

  els.pontosBox.innerHTML = pontos
    .map((ponto) => {
      const ativo = ponto.id === store.selectedPointId ? " ativo" : "";
      const statusTexto = ponto.disponivel ? "Ativo" : "Inativo";
      const localizacao = [ponto.cidade, ponto.endereco].filter(Boolean).join(" | ") || "Localizacao nao definida";

      return `
        <article class="ponto-card${ativo}">
          <div class="ponto-status ${ponto.disponivel ? "online" : "offline"}">
            <span></span>${escapeHtml(statusTexto)}
          </div>
          <div class="ponto-thumb">
            ${ponto.imagem ? `<img src="${escapeHtml(ponto.imagem)}" alt="${escapeHtml(ponto.nome)}">` : `<div class="sem-imagem">Sem imagem</div>`}
          </div>
          <h3>${escapeHtml(ponto.nome)}</h3>
          <p>${escapeHtml(localizacao)}</p>
          <div class="ponto-meta">
            <span class="ponto-codigo">${escapeHtml(ponto.codigo)}</span>
            <small>${ponto.materiais.length} materiais na playlist</small>
          </div>
          <button class="abrir-pasta-btn" type="button" data-ponto-id="${escapeHtml(ponto.id)}">Abrir pasta</button>
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
  if (!ponto) return;

  els.pontoDetalhe.style.display = "";
  document.body.classList.add("pasta-aberta");
  els.statusPonto.textContent = ponto.disponivel ? "Disponivel" : "Indisponivel";
  els.imagemPonto.style.display = ponto.imagem ? "block" : "none";
  els.imagemPonto.src = ponto.imagem || "";
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
        <h5>${escapeHtml(material.nome)}</h5>
        <p>${escapeHtml(material.cliente || "Sem cliente")} Â· ${escapeHtml(material.storagePath)}</p>
      </div>
      <span class="material-repeticao">${material.repeticoes}x por ciclo</span>
      <span class="material-status">${escapeHtml(material.status)}</span>
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
  criandoNovoPonto = false;
  preencherModalEdicao(pontoAtual());
  els.modalEditar.showModal();
}

function preencherModalEdicao(ponto) {
  els.editNome.value = ponto?.nome || "";
  els.editCidade.value = ponto?.cidade || "";
  els.editEndereco.value = ponto?.endereco || "";
  els.previewImagem.style.display = ponto?.imagem ? "block" : "none";
  els.previewImagem.src = ponto?.imagem || "";
  if (els.inputImagem) els.inputImagem.value = "";
}

function abrirModalNovoPonto() {
  criandoNovoPonto = true;
  preencherModalEdicao(null);
  els.modalEditar.showModal();
}

async function salvarEdicaoPonto() {
  const payload = {
    nome: els.editNome.value.trim(),
    cidade: els.editCidade.value.trim(),
    endereco: els.editEndereco.value.trim(),
  };

  if (!payload.nome) {
    alert("Informe o nome do ponto.");
    return;
  }

  try {
    const pontoSalvo = await api.salvarPonto(criandoNovoPonto ? "" : store.selectedPointId, payload);
    els.modalEditar.close();
    await renderizarPontos();

    if (pontoSalvo?.id) {
      abrirPonto(pontoSalvo.id);
    } else if (store.selectedPointId) {
      abrirPonto(store.selectedPointId);
    }
  } catch (error) {
    console.error(error);
    alert("Erro ao salvar ponto no banco.");
  }
}

async function deletarPontoAtual() {
  const ponto = pontoAtual();
  if (!ponto || criandoNovoPonto) return;

  if (!confirm(`Deletar o ponto "${ponto.nome}" e sua playlist?`)) return;

  try {
    await api.deletarPonto(ponto.id);
    els.modalEditar.close();
    fecharDetalhe();
    store.selectedPointId = "";
    await renderizarPontos();
  } catch (error) {
    console.error(error);
    alert("Erro ao deletar ponto no banco.");
  }
}

async function atualizarImagemPonto() {
  const arquivo = els.inputImagem?.files?.[0];
  if (!arquivo || criandoNovoPonto) return;

  try {
    const imagemUrl = await api.uploadImagemPonto(store.selectedPointId, arquivo);
    els.previewImagem.style.display = imagemUrl ? "block" : "none";
    els.previewImagem.src = imagemUrl;
    await renderizarPontos();
    abrirPonto(store.selectedPointId);
  } catch (error) {
    console.error(error);
    alert("Erro ao enviar imagem para o Storage.");
  }
}

async function uploadMidiaPlaylist() {
  const arquivo = els.inputUpgradePlaylist?.files?.[0];
  if (!arquivo || !store.selectedPointId) return;

  try {
    await api.uploadMidiaPlaylist(store.selectedPointId, arquivo);
    els.inputUpgradePlaylist.value = "";
    await renderizarPontos();
    abrirPonto(store.selectedPointId);
  } catch (error) {
    console.error(error);
    alert("Erro ao enviar midia para o Storage.");
  }
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
