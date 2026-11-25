// Dados fictícios do RZ Airsoft para as gravações: catálogo, 10 clientes inventados e ~50 ordens.
// Grava numa instância isolada (pasta de dados temporária) através da API do próprio app.
import { randomBytes } from 'node:crypto';

const USUARIO = 'armeiro';

/** Cria o usuário de teste e os dados. Devolve o cookie da sessão e os ids usados no roteiro. */
export async function popularRz(BASE) {
const SENHA = randomBytes(18).toString('base64url'); // descartável, só desta instância
let cookie = '';
async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}
const put = (coll, doc) => api('PUT', `/api/v1/c/${coll}/${doc.id}`, { doc });

// Gerador determinístico, para as capturas saírem iguais se rodar de novo
let semente = 42;
const rnd = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const between = (a, b) => a + Math.floor(rnd() * (b - a + 1));
let seq = 0;
const id = (p) => `${p}_${(++seq).toString(36).padStart(6, '0')}`;

const HOJE = new Date('2026-11-24T12:00:00');
const dia = (offset) => {
  const d = new Date(HOJE);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

// ---------------------------------------------------------------- catálogo
const svc = (name, description, price, unit = 'Serviço') => ({ id: id('svc'), name, description, unit, price: price * 100 });
const catalog = {
  id: 'main',
  categories: [
    { id: id('cat'), name: 'Manutenção e revisão', items: [
      svc('Revisão completa', 'Sistema interno e externo, hop-up e cano', 180),
      svc('Manutenção em AEG', 'Revisão, limpeza e correção de problemas', 150),
      svc('Limpeza e lubrificação', 'Gearbox, cano e hop-up', 90),
      svc('Diagnóstico', 'Avaliação do equipamento', 50, 'Consulta'),
    ] },
    { id: id('cat'), name: 'Peças e upgrades', items: [
      svc('Troca de mola', 'Ajuste de FPS para o campo', 60),
      svc('Troca de bucking e nub', 'Regulagem de hop-up inclusa', 70),
      svc('Instalação de MOSFET', 'Proteção de contatos e gatilho mais rápido', 120),
      svc('Shimming de gearbox', 'Ajuste das engrenagens e redução de ruído', 110),
      svc('Troca de conector XT60', '', 35),
    ] },
    { id: id('cat'), name: 'GBB e HPA', items: [
      svc('Troca de O-rings', 'Resolução de vazamentos em carregadores', 60),
      svc('Regulagem de HPA', 'Pressão, dwell e teste de cronógrafo', 100),
    ] },
  ],
};
const servicos = catalog.categories.flatMap((c) => c.items);

// ---------------------------------------------------------------- clientes
const NOMES = ['Lucas Ferreira', 'Marina Costa', 'Diego Almeida', 'Rafael Souza', 'Bruno Martins', 'Camila Rocha', 'Thiago Lima', 'Patrícia Nunes', 'Gustavo Pereira', 'Felipe Andrade'];
const CIDADES = ['Içara', 'Criciúma', 'Tubarão', 'Araranguá', 'Florianópolis'];
const EQUIPS = [
  { type: 'AEG', model: 'M4A1', brand: 'Specna Arms' },
  { type: 'AEG', model: 'AK-74', brand: 'Cyma' },
  { type: 'AEG', model: 'G36C', brand: 'Specna Arms' },
  { type: 'AEG', model: 'MP5', brand: 'Cyma' },
  { type: 'AEG', model: 'SCAR-L', brand: 'Cybergun' },
  { type: 'GBB', model: 'Glock 17', brand: 'Tokyo Marui' },
  { type: 'GBB', model: 'Hi-Capa 5.1', brand: 'Tokyo Marui' },
  { type: 'Sniper', model: 'VSR-10', brand: 'Tokyo Marui' },
  { type: 'HPA', model: 'M4 CQB', brand: 'Wolverine' },
];
const clients = NOMES.map((name, i) => ({
  id: id('c'),
  name,
  phone: '',
  email: '',
  instagram: '',
  city: CIDADES[i % CIDADES.length],
  document: '',
  notes: '',
  equipment: [{ id: id('e'), ...EQUIPS[i % EQUIPS.length], serial: '', notes: '' }],
}));

// ---------------------------------------------------------------- ordens
const PROBLEMAS = {
  AEG: ['Perdendo alcance e com hop-up irregular', 'Gearbox travando no meio do disparo', 'Motor esquentando e bateria acabando rápido', 'FPS acima do limite do campo', 'Revisão antes do jogo de fim de semana', 'Disparo duplo no semi'],
  GBB: ['Vazamento no carregador', 'Ferrolho não volta até o fim', 'Revisão antes do jogo de fim de semana'],
  Sniper: ['Perdendo alcance e com hop-up irregular', 'FPS acima do limite do campo', 'Revisão antes do jogo de fim de semana'],
  HPA: ['Pressão instável entre disparos', 'Revisão antes do jogo de fim de semana'],
};
const METODOS = ['pix', 'pix', 'pix', 'dinheiro', 'credito', 'debito'];

let numero = 0;
function ordem({ status, recebido, entregue = '', prazo = '', pago = false, cliente = pick(clients), relatorio = null, servicosOs = null, problema = null, comFpsDepois = false }) {
  const equip = cliente.equipment[0];
  const escolhidos = servicosOs || [pick(servicos.slice(0, 3)), ...(rnd() > 0.45 ? [pick(servicos.slice(4))] : [])];
  const items = escolhidos.map((s) => ({ id: id('i'), kind: 'servico', description: s.name, qty: 1, price: s.price }));
  const antes = equip.type === 'GBB' ? between(280, 300) : between(330, 355);
  const ganho = equip.type === 'GBB' ? between(5, 15) : between(18, 42);
  const fps = (v) => ({ g20: v, g28: Math.round(v * 0.845), g32: Math.round(v * 0.79) });
  const temFps = status !== 'fila';
  const criado = new Date(recebido + 'T10:00:00').toISOString();
  return {
    id: id('o'),
    number: String(++numero).padStart(4, '0'),
    status,
    receivedAt: recebido,
    dueAt: prazo,
    deliveredAt: entregue,
    createdAt: criado,
    client: { id: cliente.id, name: cliente.name, phone: '' },
    equipment: { type: equip.type, model: equip.model, brand: equip.brand, serial: '' },
    problem: problema || pick(PROBLEMAS[equip.type] || PROBLEMAS.AEG),
    items,
    discount: 0,
    payment: pago ? { status: 'pago', method: pick(METODOS), paidAt: entregue || recebido } : { status: 'pendente', method: '', paidAt: '' },
    fps: {
      before: temFps ? fps(antes) : { g20: null, g28: null, g32: null },
      after: comFpsDepois || ['pronto', 'entregue'].includes(status) ? fps(antes + ganho) : { g20: null, g28: null, g32: null },
    },
    notes: '',
    technician: 'Equipe RZ',
    warrantyDays: 90,
    report: relatorio || {
      date: '', technician: '', gearbox: '', nozzle: '', motor: '', mola: '', cilindro: '', cano: '', bb: '',
      fpsBeforeNote: '', fpsAfterNote: '', gainNote: '', observation: '', diagnosis: [], services: [], photos: [], opinion: '',
    },
    events: [{ at: criado, type: 'created' }],
  };
}

const orders = [];
// Histórico: entregues e pagas nos últimos 12 meses
for (let mes = 11; mes >= 0; mes--) {
  const quantas = between(2, 5) + (mes < 4 ? 1 : 0);
  for (let k = 0; k < quantas; k++) {
    const recebido = dia(-(mes * 30) - between(5, 25));
    const dias = between(3, 9);
    const r = new Date(recebido + 'T12:00:00');
    r.setDate(r.getDate() + dias);
    const entregue = r > HOJE ? dia(-1) : r.toISOString().slice(0, 10);
    orders.push(ordem({ status: 'entregue', recebido, entregue, pago: true }));
  }
}

// Em aberto, para o quadro da bancada
const relatorio = {
  date: dia(-1),
  technician: 'Equipe RZ',
  gearbox: 'V2, shimming refeito',
  nozzle: 'Nozzle selado novo',
  motor: 'High torque',
  mola: 'M110',
  cilindro: 'Tipo 1',
  cano: '6,03 mm · 363 mm',
  bb: '0,28 g',
  fpsBeforeNote: '',
  fpsAfterNote: '',
  gainNote: '',
  observation: 'Equipamento chegou com perda de compressão e hop-up irregular.',
  diagnosis: ['Compressão fraca por vazamento no nozzle', 'Bucking ressecado e hop-up desregulado', 'Engrenagens com folga excessiva'],
  services: ['Troca do nozzle e do o-ring do pistão', 'Novo bucking e regulagem do hop-up', 'Shimming, limpeza e lubrificação da gearbox'],
  photos: [],
  opinion: 'Pronta para jogo, com mais alcance e consistência. Recomendo usar BBs 0,28 g.',
};
const s = (nome) => servicos.find((x) => x.name === nome);
orders.push(
  ordem({ status: 'fila', recebido: dia(-1), prazo: dia(5), cliente: clients[2] }),
  ordem({ status: 'fila', recebido: dia(0), prazo: dia(7), cliente: clients[6] }),
  ordem({ status: 'bancada', recebido: dia(-4), prazo: dia(2), cliente: clients[0], relatorio, servicosOs: [s('Revisão completa'), s('Troca de bucking e nub'), s('Shimming de gearbox')], problema: 'Perdendo alcance e com hop-up irregular', comFpsDepois: true }),
  ordem({ status: 'bancada', recebido: dia(-3), prazo: dia(3), cliente: clients[3] }),
  ordem({ status: 'aguardando', recebido: dia(-8), prazo: dia(4), cliente: clients[4] }),
  ordem({ status: 'pronto', recebido: dia(-6), prazo: dia(-1), cliente: clients[1], pago: false }),
  ordem({ status: 'pronto', recebido: dia(-5), prazo: dia(0), cliente: clients[7], pago: true }),
);

// ---------------------------------------------------------------- grava
const setup = await api('POST', '/api/v1/auth/setup', { username: USUARIO, password: SENHA });
await put('settings', { id: 'main', business: { name: 'RZ Airsoft', phone: '(00) 00000-0000', email: '', instagram: '', city: '', address: '', document: '' }, orders: { digits: 4, warrantyDays: 90, technician: 'Equipe RZ' } });
await put('catalog', catalog);
for (const c of clients) await put('clients', c);
for (const o of orders) await put('orders', o);

const ordemRelatorio = orders.find((o) => o.report?.services?.length);
console.log(`dados: usuário ${setup.username}, ${clients.length} clientes, ${orders.length} ordens, ${servicos.length} serviços`);
return { cookie, ids: { relatorio: ordemRelatorio.id, cliente: clients[0].id } };
}
