/**
 * Complete directory of all 36 Nigerian States + FCT Abuja
 * along with popular commercial delivery hubs and default fees.
 */

export interface NigerianStateInfo {
  name: string;
  code: string;
  popularAreas: string[];
  defaultFee: number;
}

export const NIGERIAN_STATES: NigerianStateInfo[] = [
  {
    name: 'Lagos',
    code: 'LA',
    defaultFee: 2500,
    popularAreas: [
      'Lagos Island (Marina / Victoria Island / Ikoyi)',
      'Lekki Phase 1 / Oniru',
      'Lekki Phase 2 / Chevron / Ajah',
      'Sangotedo / Awoyaya / Epe',
      'Ikeja / GRA / Allen / Opebi',
      'Surulere / Yaba / Akoka',
      'Gbagada / Ogudu / Anthony / Maryland',
      'Magodo / Shangisha / Isheri',
      'Festac / Amuwo Odofin / Mile 2',
      'Oshodi / Ilupeju / Mushin',
      'Ikorodu Central / Agric',
      'Alimosho / Egbeda / Iyana Ipaja',
      'Badagry / Ojo',
    ],
  },
  {
    name: 'Abuja (FCT)',
    code: 'FC',
    defaultFee: 3500,
    popularAreas: [
      'Central Business District (CBD)',
      'Maitama / Asokoro / Guzape',
      'Wuse 1 / Wuse 2',
      'Garki 1 / Garki 2',
      'Jabi / Utako',
      'Gwarinpa / Life Camp',
      'Apo / Lokogoma',
      'Lugbe / Airport Road',
      'Kubwa / Dutse',
      'Bwari / Dawaki / Mpape',
    ],
  },
  {
    name: 'Rivers (Port Harcourt)',
    code: 'RI',
    defaultFee: 4000,
    popularAreas: [
      'Old GRA / New GRA',
      'Peter Odili / Trans-Amadi',
      'D/Line / Port Harcourt Township',
      'Woji / Rumuomasi / Rumuobiokani',
      'Rumuokoro / Choba / Uniport',
      'Ada George / Rumuola',
      'Eleme / Onne',
      'Oyigbo',
    ],
  },
  {
    name: 'Oyo (Ibadan)',
    code: 'OY',
    defaultFee: 3500,
    popularAreas: [
      'Bodija / Old Bodija',
      'Ring Road / Challenge / Oluyole',
      'Dugbe / Mokola',
      'Samonda / UI / Agbowo',
      'Akobo / Bashorun',
      'Iwo Road / Monatan',
      'Ogbomoso Town',
    ],
  },
  {
    name: 'Ogun',
    code: 'OG',
    defaultFee: 3500,
    popularAreas: [
      'Abeokuta Central',
      'Arepo / Magboro / Berger Axis',
      'Mowe / Ibafo',
      'Ota / Sango Ota',
      'Sagamu / Remo',
      'Ijebu-Ode',
    ],
  },
  {
    name: 'Kano',
    code: 'KN',
    defaultFee: 4000,
    popularAreas: [
      'Nassarawa GRA',
      'Bompai / Sabon Gari',
      'Fagge / Kofar Ruwa',
      'Kano Municipal / City',
      'Tarauni / Hotoro',
    ],
  },
  {
    name: 'Enugu',
    code: 'EN',
    defaultFee: 4000,
    popularAreas: [
      'Independence Layout',
      'New Haven / Ogui',
      'GRA / Trans-Ekulu',
      'Abakpa Nike',
      'Nsukka Town',
    ],
  },
  {
    name: 'Delta',
    code: 'DE',
    defaultFee: 4000,
    popularAreas: [
      'Asaba Town / GRA',
      'Warri / Effurun',
      'Sapele',
      'Ughelli',
      'Agbor',
    ],
  },
  {
    name: 'Anambra',
    code: 'AN',
    defaultFee: 4000,
    popularAreas: [
      'Awka / UNIZIK Axis',
      'Onitsha Main / Fegge',
      'Nnewi Industrial',
      'Ekwulobia',
    ],
  },
  {
    name: 'Edo (Benin)',
    code: 'ED',
    defaultFee: 4000,
    popularAreas: [
      'GRA Benin City',
      'Airport Road / Sapele Road',
      'Ugbowo / Uniben Axis',
      'Ikpoba Hill',
      'Ekpoma',
    ],
  },
  {
    name: 'Abia',
    code: 'AB',
    defaultFee: 4500,
    popularAreas: ['Aba Commercial Hub', 'Umuahia Capital', 'Ohafia'],
  },
  {
    name: 'Adamawa',
    code: 'AD',
    defaultFee: 5000,
    popularAreas: ['Yola Capital', 'Jimeta', 'Mubi'],
  },
  {
    name: 'Akwa Ibom',
    code: 'AK',
    defaultFee: 4500,
    popularAreas: ['Uyo Capital', 'Eket', 'Ikot Ekpene', 'Oron'],
  },
  {
    name: 'Bauchi',
    code: 'BA',
    defaultFee: 5000,
    popularAreas: ['Bauchi Town', 'Azare', 'Misau'],
  },
  {
    name: 'Bayelsa',
    code: 'BY',
    defaultFee: 4500,
    popularAreas: ['Yenagoa Capital', 'Ogbia', 'Amassoma'],
  },
  {
    name: 'Benue',
    code: 'BE',
    defaultFee: 4500,
    popularAreas: ['Makurdi Town', 'Gboko', 'Otukpo'],
  },
  {
    name: 'Borno',
    code: 'BO',
    defaultFee: 5500,
    popularAreas: ['Maiduguri Town', 'Biu'],
  },
  {
    name: 'Cross River',
    code: 'CR',
    defaultFee: 4500,
    popularAreas: ['Calabar Municipal', 'Calabar South', 'Ikom', 'Ogoja'],
  },
  {
    name: 'Ebonyi',
    code: 'EB',
    defaultFee: 4500,
    popularAreas: ['Abakaliki Capital', 'Afikpo', 'Onueke'],
  },
  {
    name: 'Ekiti',
    code: 'EK',
    defaultFee: 4000,
    popularAreas: ['Ado-Ekiti Capital', 'Ikere-Ekiti', 'Oye-Ekiti'],
  },
  {
    name: 'Gombe',
    code: 'GO',
    defaultFee: 5000,
    popularAreas: ['Gombe Capital', 'Kaltungo', 'Billiri'],
  },
  {
    name: 'Imo',
    code: 'IM',
    defaultFee: 4000,
    popularAreas: ['Owerri Municipal / Ikenegbu', 'Orlu', 'Okigwe'],
  },
  {
    name: 'Jigawa',
    code: 'JI',
    defaultFee: 5000,
    popularAreas: ['Dutse Capital', 'Hadejia', 'Gumel'],
  },
  {
    name: 'Kaduna',
    code: 'KD',
    defaultFee: 4000,
    popularAreas: ['Kaduna North / Barnawa', 'Kaduna South / Sabon Tasha', 'Zaria Town', 'Kafanchan'],
  },
  {
    name: 'Katsina',
    code: 'KT',
    defaultFee: 5000,
    popularAreas: ['Katsina Town', 'Daura', 'Funtua'],
  },
  {
    name: 'Kebbi',
    code: 'KB',
    defaultFee: 5000,
    popularAreas: ['Birnin Kebbi', 'Argungu', 'Yauri'],
  },
  {
    name: 'Kogi',
    code: 'KO',
    defaultFee: 4000,
    popularAreas: ['Lokoja Capital', 'Okene', 'Anyigba', 'Kabba'],
  },
  {
    name: 'Kwara',
    code: 'KW',
    defaultFee: 4000,
    popularAreas: ['Ilorin Central / GRA', 'Offa', 'Omu-Aran'],
  },
  {
    name: 'Nasarawa',
    code: 'NA',
    defaultFee: 4000,
    popularAreas: ['Lafia Capital', 'Mararaba / Nyanya Corridor', 'Keffi', 'Akwanga'],
  },
  {
    name: 'Niger',
    code: 'NI',
    defaultFee: 4000,
    popularAreas: ['Minna Capital', 'Suleja', 'Bida', 'Kontagora'],
  },
  {
    name: 'Ondo',
    code: 'ON',
    defaultFee: 4000,
    popularAreas: ['Akure Capital', 'Ondo City', 'Owo', 'Ikare'],
  },
  {
    name: 'Osun',
    code: 'OS',
    defaultFee: 4000,
    popularAreas: ['Osogbo Capital', 'Ile-Ife', 'Ede', 'Ilesa'],
  },
  {
    name: 'Plateau',
    code: 'PL',
    defaultFee: 4500,
    popularAreas: ['Jos North / Jos South', 'Bukuru', 'Pankshin'],
  },
  {
    name: 'Sokoto',
    code: 'SO',
    defaultFee: 5000,
    popularAreas: ['Sokoto City', 'Wamakko', 'Tambuwal'],
  },
  {
    name: 'Taraba',
    code: 'TA',
    defaultFee: 5500,
    popularAreas: ['Jalingo Capital', 'Wukari', 'Bali'],
  },
  {
    name: 'Yobe',
    code: 'YO',
    defaultFee: 5500,
    popularAreas: ['Damaturu Capital', 'Potiskum', 'Gashua'],
  },
  {
    name: 'Zamfara',
    code: 'ZA',
    defaultFee: 5500,
    popularAreas: ['Gusau Capital', 'Kaura Namoda', 'Talata Mafara'],
  },
];

export const ALL_NIGERIAN_STATE_NAMES = NIGERIAN_STATES.map((s) => s.name);

export function getStateByName(name: string): NigerianStateInfo | undefined {
  const clean = name.trim().toLowerCase();
  return NIGERIAN_STATES.find(
    (s) => s.name.toLowerCase() === clean || s.name.toLowerCase().includes(clean)
  );
}
