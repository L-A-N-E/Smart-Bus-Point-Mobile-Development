// Pontos turísticos fixos (estádios, museus e monumentos históricos) usados para recomendar
// rotas a partir da localização do usuário, sem depender de uma API de pontos de interesse.

export type TouristSpotCategory = 'stadium' | 'museum' | 'monument';

export type TouristSpot = {
  id: string;
  name: string;
  category: TouristSpotCategory;
  address: string;
  lat: number;
  lng: number;
};

export const touristSpots: TouristSpot[] = [
  { id: 'masp', name: 'MASP', category: 'museum', address: 'Av. Paulista, 1578', lat: -23.5613, lng: -46.6565 },
  { id: 'pinacoteca', name: 'Pinacoteca de São Paulo', category: 'museum', address: 'Praça da Luz, 2', lat: -23.5353, lng: -46.6334 },
  { id: 'museu-ipiranga', name: 'Museu do Ipiranga', category: 'museum', address: 'Parque da Independência', lat: -23.5809, lng: -46.6098 },
  { id: 'morumbi', name: 'Estádio do Morumbi', category: 'stadium', address: 'Praça Roberto Gomes Pedrosa, 1', lat: -23.6003, lng: -46.7196 },
  { id: 'arena-corinthians', name: 'Arena Corinthians', category: 'stadium', address: 'Av. Miguel Ignácio Curi, 111', lat: -23.5453, lng: -46.4731 },
  { id: 'theatro-municipal', name: 'Theatro Municipal', category: 'monument', address: 'Praça Ramos de Azevedo, s/n', lat: -23.5453, lng: -46.6388 },
  { id: 'catedral-se', name: 'Catedral da Sé', category: 'monument', address: 'Praça da Sé, s/n', lat: -23.5505, lng: -46.6339 },
  { id: 'monumento-bandeiras', name: 'Monumento às Bandeiras', category: 'monument', address: 'Parque Ibirapuera', lat: -23.5875, lng: -46.6587 },
];
