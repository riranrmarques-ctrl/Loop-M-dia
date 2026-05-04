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
    return structuredClone(store.pontos);
  },
  async salvarMaterial(pontoId, material) {
    const ponto = store.pontos.find((item) => item.id === pontoId);
    if (!ponto) return;

    ponto.materiais.push({
      id: `mat-${Date.now()}`,
      posicao: ponto.materiais.length + 1,
      tipo: "video",
      duracao: 20,
      checksum: `sha256-local-${Date.now()}`,
      status: "ativo",
      ...material,
    });

    store.manifestVersion += 1;
  },
  async copiarPlaylist({ origemId, destinoId }) {
    const origem = store.pontos.find((item) => item.id === origemId);
    const destino = store.pontos.find((item) => item.id === destinoId);

    if (!origem || !destino) return;

    destino.materiais = origem.materiais.map((material, index) => ({
      ...structuredClone(material),
      id: `mat-copy-${Date.now()}-${index}`,
      posicao: index + 1,
    }));

    store.manifestVersion += 1;
  },
};
