// lib/provinces.ts
import { Timestamp } from 'firebase/firestore';
import { District, HistoricalPeriod, phitsanulokDistricts, chiangmaiDistricts } from './districts';

export interface Admin {
  name: string;
  id: string;
}

export interface Province {
  id: string;
  name: string;
  thaiName: string;
  totalArea: number;
  districts: District[];
  historicalPeriods: HistoricalPeriod[];
  collabSymbol?: string;
  tags: string[];
  createdAt: Timestamp;
  createdBy: Admin[]; // Updated to array of admin objects
  editor?: { id: string; name: string; role: "editor" | "viewer" }[];
  lock: boolean;
  version: number;
  backgroundSvgPath?: string | null;
  backgroundImageUrl?: string | null;
  backgroundDimensions?: { width: number; height: number } | null;
}

export const provinces: Province[] = [
  {
    id: 'phitsanulok',
    name: 'Phitsanulok',
    thaiName: 'พิษณุโลก',
    totalArea: 10815,
    districts: phitsanulokDistricts,
    historicalPeriods: [
      {
        era: 'Sukhothai Kingdom',
        startYear: 1238,
        endYear: 1438,
        yearRange: '13th-14th Century',
        color: 'rgba(239, 68, 68, 0.5)',
        description: 'Phitsanulok was a key province during the Sukhothai Kingdom, with Muang District as a major city and Nakhon Thai as the earlier Singhanavati capital.',
        events: ['Founded as a significant administrative center', 'Singhanavati Kingdom capital in 1188'],
        landmarks: ['Wat Phra Si Rattana Mahathat', 'Phu Hin Rong Kla National Park'],
        media: [
          {
            type: 'image',
            url: 'https://commons.wikimedia.org/wiki/File:Wat_Phra_Si_Rattana_Mahathat_Phitsanulok.jpg',
            altText: 'Wat Phra Si Rattana Mahathat',
            description: 'A key temple from the Sukhothai period in Phitsanulok.',
            license: 'CC BY-SA 4.0',
          },
        ],
        sources: ['https://en.wikipedia.org/wiki/Phitsanulok_Province'],
      },
      {
        era: 'Ayutthaya Period',
        startYear: 1438,
        endYear: 1767,
        yearRange: '15th-18th Century',
        color: 'rgba(59, 130, 246, 0.5)',
        description: 'Phitsanulok became the capital of Ayutthaya from 1463 to 1488 and was a significant administrative region, birthplace of King Naresuan.',
        events: ['Capital of Ayutthaya Kingdom (1463-1488)', 'Birth of King Naresuan in 1555'],
        landmarks: ['Wat Phra Si Rattana Mahathat', 'King Naresuan Shrine'],
        media: [
          {
            type: 'image',
            url: 'https://example.com/king-naresuan-shrine.jpg',
            altText: 'King Naresuan Shrine',
            description: 'Shrine dedicated to King Naresuan, born in Phitsanulok.',
          },
        ],
        sources: ['https://en.wikipedia.org/wiki/Phitsanulok'],
      },
      {
        era: 'Modern Era',
        startYear: 1767,
        endYear: 2025,
        yearRange: '18th Century-Present',
        color: 'rgba(34, 197, 94, 0.5)',
        description: 'Phitsanulok modernized with infrastructure like airports and national parks, becoming a blend of historical and natural attractions.',
        events: ['Development of Phitsanulok Airport', 'Establishment of multiple national parks'],
        landmarks: ['Phitsanulok Airport', 'Phu Hin Rong Kla National Park', 'Namtok Chat Trakan National Park'],
        media: [
          {
            type: 'image',
            url: 'https://example.com/phitsanulok-airport.jpg',
            altText: 'Phitsanulok Airport',
            description: 'Modern Phitsanulok Airport, a key transportation hub.',
          },
        ],
        sources: ['https://en.wikipedia.org/wiki/Phitsanulok_Airport'],
      },
    ],
    collabSymbol: 'https://example.com/phitsanulok-collab-logo.png',
    tags: ['Sukhothai', 'historical', 'nature', 'collaboration', 'graphic novel'],
    createdAt: Timestamp.now(),
    createdBy: [{ name: 'admin1', id: 'admin1' }], // Master admin created this
    editor: [{ name: 'admin1', id: '1',role:'editor' }], // Master admin is also an editor
    lock: true,
    version: 1,
    backgroundImageUrl: 'https://example.com/phitsanulok-background.jpg',
    backgroundDimensions: { width: 1920, height: 1080 },
  },
  {
    id: 'chiangMai',
    name: 'Chiang Mai',
    thaiName: 'เชียงใหม่',
    totalArea: 20107,
    districts: chiangmaiDistricts,
    historicalPeriods: [
      {
        era: 'Lanna Kingdom',
        startYear: 1296,
        endYear: 1558,
        yearRange: '13th-16th Century',
        color: 'rgba(239, 68, 68, 0.5)',
        description: 'Founded by King Mangrai in 1296 as the capital of the Lanna Kingdom, marking the beginning of Chiang Mai’s historical significance.',
        events: ['Founded by King Mangrai in 1296'],
        landmarks: ['Wat Chedi Luang', 'Wat Phra Singh'],
        media: [
          {
            type: 'image',
            url: 'https://example.com/wat-chedi-luang.jpg',
            altText: 'Wat Chedi Luang',
            description: 'Wat Chedi Luang, a significant Lanna temple.',
          },
        ],
        sources: ['https://en.wikipedia.org/wiki/Chiang_Mai'],
      },
      {
        era: 'Burmese Rule',
        startYear: 1558,
        endYear: 1774,
        yearRange: '16th-18th Century',
        color: 'rgba(59, 130, 246, 0.5)',
        description: 'Under Burmese control from 1558 until liberation in 1774, a period of cultural and political transition.',
        events: ['Conquered by Burmese in 1558', 'Liberated from Burmese in 1774'],
        landmarks: ['Wat Phra That Doi Suthep'],
        media: [
          {
            type: 'image',
            url: 'https://example.com/wat-phra-that-doi-suthep.jpg',
            altText: 'Wat Phra That Doi Suthep',
            description: 'Wat Phra That Doi Suthep, a key temple from the Burmese period.',
          },
        ],
        sources: ['https://en.wikipedia.org/wiki/Mueang_Chiang_Mai_District'],
      },
      {
        era: 'Siamese Integration',
        startYear: 1774,
        endYear: 1899,
        yearRange: 'Late 18th-19th Century',
        color: 'rgba(34, 197, 94, 0.5)',
        description: 'Integrated into the Siamese Kingdom, leading to administrative reforms and modernization.',
        events: ['Annexed by Siam in 1774', 'Established as Mueang Chiang Mai district in 1899'],
        landmarks: ['Chiang Mai Old City'],
        media: [
          {
            type: 'image',
            url: 'https://example.com/chiang-mai-old-city.jpg',
            altText: 'Chiang Mai Old City',
            description: 'The historic Old City of Chiang Mai.',
          },
        ],
        sources: ['https://en.wikipedia.org/wiki/Chiang_Mai'],
      },
      {
        era: 'Modern Era',
        startYear: 1900,
        endYear: 2025,
        yearRange: '20th-21st Century',
        color: 'rgba(34, 197, 94, 0.5)',
        description: 'Transitioned into a modern province, becoming a cultural and tourist hub with significant developments.',
        events: ['Establishment of Chiang Mai University in 1964', 'Hosting of the 2006 ASEAN Summit'],
        landmarks: ['Chiang Mai University', 'Doi Suthep-Pui National Park', 'Chiang Mai Night Market'],
        media: [
          {
            type: 'image',
            url: 'https://example.com/chiang-mai-night-market.jpg',
            altText: 'Chiang Mai Night Market',
            description: 'The bustling Chiang Mai Night Market, a modern tourist attraction.',
          },
        ],
        sources: ['https://en.wikipedia.org/wiki/Chiang_Mai_University'],
      },
    ],
    collabSymbol: 'https://example.com/chiangmai-collab-logo.png',
    tags: ['Lanna', 'culture', 'tourism', 'historical'],
    createdAt: Timestamp.now(),
    createdBy: [{ name: 'admin1', id: 'admin1' }],
    editor: [{ name: 'admin1', id: '1',role:'editor' }],
    lock: true,
    version: 1,
    backgroundImageUrl: 'https://example.com/chiangmai-background.jpg',
    backgroundDimensions: { width: 1920, height: 1080 },
  },
];

// Utility functions
export const getProvinceById = (provinces: Province[], id: string): Province | undefined => {
  return provinces.find((province) => province.id === id);
};