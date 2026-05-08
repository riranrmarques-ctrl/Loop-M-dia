const telas = [
  ["Tela 01 - Entrada", "Salão de Beleza", "Online", "agora", "amarelo-dot"],
  ["Tela 02 - Recepção", "Mercado", "Online", "1 min atrás", "amarelo-dot"],
  ["Tela 01 - Balcão", "Padaria", "Inativo", "12 min atrás", "vermelho-dot"],
  ["Tela 01 - Área Funcional", "Academia Alpha", "Online", "2 min atrás", "amarelo-dot"],
  ["Tela 02 - Cardio", "Academia Alpha", "Online", "2 min atrás", "amarelo-dot"],
  ["Tela 01 - Caixa", "Posto Central", "Online", "3 min atrás", "amarelo-dot"]
];

const historicos = [
  ["Salão de Beleza ficou online", "10:24", "verde-dot"],
  ["Mercado ficou offline", "10:12", "vermelho-dot"],
  ["Academia Alpha voltou online", "10:08", "verde-dot"],
  ["Playlist atualizada", "10:03", "verde-dot"],
  ["Campanha alterada", "09:58", "verde-dot"]
];

const listaTelas = document.getElementById("listaTelas");
const historicoStatus = document.getElementById("historicoStatus");

listaTelas.innerHTML = telas.map(([nome, ponto, status, conexao, cor]) => `
  <div class="tela-linha">
    <span><i class="dot ${cor}"></i>${nome}</span>
    <span>${ponto}</span>
    <span class="status ${status === "Online" ? "online" : "inativo"}">${status}</span>
    <span>${conexao}</span>
  </div>
`).join("");

historicoStatus.innerHTML = historicos.map(([texto, hora, cor]) => `
  <div class="historico-item">
    <i class="dot ${cor}"></i>
    <strong>${texto}</strong>
    <span>${hora}</span>
  </div>
`).join("");

if (window.lucide) {
  lucide.createIcons();
}
