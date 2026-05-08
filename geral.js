const telas = [
  {
    nome: "Tela 01 - Entrada",
    ponto: "Salão de Beleza",
    status: "Online",
    conexao: "agora",
    cor: "orange-dot"
  },
  {
    nome: "Tela 02 - Recepção",
    ponto: "Mercado",
    status: "Online",
    conexao: "1 min atrás",
    cor: "orange-dot"
  },
  {
    nome: "Tela 01 - Balcão",
    ponto: "Padaria",
    status: "Inativo",
    conexao: "12 min atrás",
    cor: "red-dot"
  },
  {
    nome: "Tela 01 - Área Funcional",
    ponto: "Academia Alpha",
    status: "Online",
    conexao: "2 min atrás",
    cor: "orange-dot"
  },
  {
    nome: "Tela 02 - Cardio",
    ponto: "Academia Alpha",
    status: "Online",
    conexao: "2 min atrás",
    cor: "orange-dot"
  },
  {
    nome: "Tela 01 - Caixa",
    ponto: "Posto Central",
    status: "Online",
    conexao: "3 min atrás",
    cor: "orange-dot"
  }
];

const historico = [
  {
    texto: "Salão de Beleza ficou online",
    hora: "10:24",
    cor: "green-dot"
  },
  {
    texto: "Mercado ficou offline",
    hora: "10:12",
    cor: "red-dot"
  },
  {
    texto: "Academia Alpha voltou online",
    hora: "10:08",
    cor: "green-dot"
  },
  {
    texto: "Playlist atualizada",
    hora: "10:03",
    cor: "green-dot"
  },
  {
    texto: "Campanha alterada",
    hora: "09:58",
    cor: "green-dot"
  }
];

const tbody = document.getElementById("screenTable");

telas.forEach((tela) => {
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>
      <b class="dot ${tela.cor}"></b>
      ${tela.nome}
    </td>
    <td>${tela.ponto}</td>
    <td>
      <span class="status ${tela.status === "Online" ? "online" : "offline"}">
        ${tela.status}
      </span>
    </td>
    <td>${tela.conexao}</td>
  `;

  tbody.appendChild(tr);
});

const historyList = document.getElementById("historyList");

historico.forEach((item) => {
  const div = document.createElement("div");
  div.className = "history-item";

  div.innerHTML = `
    <b class="dot ${item.cor}"></b>
    <strong>${item.texto}</strong>
    <span>${item.hora}</span>
  `;

  historyList.appendChild(div);
});
