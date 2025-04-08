// scripts/seedFirebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { provinces } from '../lib/provinces';
import { District, HistoricalPeriod, Media, CollabData } from '../lib/districts';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper function to normalize Timestamp objects
const normalizeTimestamp = (value: any): any => {
  if (value instanceof Timestamp) {
    return Timestamp.fromMillis(value.toMillis());
  }
  return value;
};

// Helper function to recursively normalize Timestamps and handle complex objects
const normalizeData = (data: any): any => {
  if (data === null || data === undefined) return data;
  if (data instanceof Timestamp) return normalizeTimestamp(data);
  if (Array.isArray(data)) return data.map(normalizeData);
  if (typeof data === 'object') {
    const normalized: { [key: string]: any } = {};
    for (const key in data) {
      normalized[key] = normalizeData(data[key]);
    }
    return normalized;
  }
  return data;
};

const seedFirebase = async () => {
  console.log('Starting to seed Firebase with provinces data...');

  try {
    for (const province of provinces) {
      console.log(`Seeding province: ${province.name} (${province.thaiName})`);

      // Prepare province data and normalize Timestamps
      const provinceData = normalizeData({
        id: province.id,
        name: province.name,
        thaiName: province.thaiName,
        totalArea: province.totalArea,
        historicalPeriods: province.historicalPeriods.map((period: HistoricalPeriod) => ({
          era: period.era,
          startYear: period.startYear,
          endYear: period.endYear,
          yearRange: period.yearRange,
          color: period.color,
          description: period.description,
          events: period.events,
          landmarks: period.landmarks,
          media: period.media.map((mediaItem: Media) => ({
            type: mediaItem.type,
            url: mediaItem.url,
            altText: mediaItem.altText,
            description: mediaItem.description,
            thumbnailUrl: mediaItem.thumbnailUrl || null,
            duration: mediaItem.duration || null,
            license: mediaItem.license || null,
            createdAt: mediaItem.createdAt || null,
          })),
          sources: period.sources || null,
        })),
        collabSymbol: province.collabSymbol || null,
        tags: province.tags,
        createdAt: province.createdAt || Timestamp.now(),
        createdBy: province.createdBy.map(admin => ({ name: admin.name, id: admin.id })),
        editor: province.editor?.map(admin => ({ 
          name: admin.name, 
          id: admin.id, 
          role: admin.role 
        })) || [],
        lock: province.lock,
        version: province.version,
        backgroundSvgPath: province.backgroundSvgPath || null,
        backgroundImageUrl: province.backgroundImageUrl || null,
        backgroundDimensions: province.backgroundDimensions || null,
      });

      // Set province document
      const provinceRef = doc(db, 'provinces', province.id);
      await setDoc(provinceRef, provinceData);
      console.log(`Successfully seeded province document: ${province.name}`);

      // Seed districts as a subcollection
      const districtsCollection = collection(provinceRef, 'districts');
      for (const district of province.districts) {
        console.log(`Seeding district: ${district.name} (${district.thaiName}) under province: ${province.name}`);

        // Prepare district data and normalize Timestamps
        const districtData = normalizeData({
          id: district.id,
          name: district.name,
          thaiName: district.thaiName,
          mapImageUrl: district.mapImageUrl || null,
          googleMapsUrl: district.googleMapsUrl || null,
          coordinates: district.coordinates,
          historicalColor: district.historicalColor,
          historicalPeriods: district.historicalPeriods.map((period: HistoricalPeriod) => ({
            era: period.era,
            startYear: period.startYear,
            endYear: period.endYear,
            yearRange: period.yearRange,
            color: period.color,
            description: period.description,
            events: period.events,
            landmarks: period.landmarks,
            media: period.media.map((mediaItem: Media) => ({
              type: mediaItem.type,
              url: mediaItem.url,
              altText: mediaItem.altText,
              description: mediaItem.description,
              thumbnailUrl: mediaItem.thumbnailUrl || null,
              duration: mediaItem.duration || null,
              license: mediaItem.license || null,
              createdAt: mediaItem.createdAt || null,
            })),
            sources: period.sources || null,
          })),
          collab: district.collab
            ? {
                novelTitle: district.collab.novelTitle,
                storylineSnippet: district.collab.storylineSnippet,
                characters: district.collab.characters.map((char) => ({
                  name: char.name,
                  historicalFigure: char.historicalFigure || false,
                  bio: char.bio || null,
                })),
                relatedLandmarks: district.collab.relatedLandmarks,
                media: district.collab.media.map((mediaItem: Media) => ({
                  type: mediaItem.type,
                  url: mediaItem.url,
                  altText: mediaItem.altText,
                  description: mediaItem.description,
                  thumbnailUrl: mediaItem.thumbnailUrl || null,
                  duration: mediaItem.duration || null,
                  license: mediaItem.license || null,
                  createdAt: mediaItem.createdAt || null,
                })),
                isActive: district.collab.isActive,
                author: district.collab.author || null,
                collaborators: district.collab.collaborators || null,
                publicationDate: district.collab.publicationDate || null,
                externalLink: district.collab.externalLink || null,
                version: district.collab.version || null,
                duplicatedDistricts: district.collab.duplicatedDistricts || null,
                duplicatedProvinces: district.collab.duplicatedProvinces || null,
              }
            : null,
          culturalSignificance: district.culturalSignificance || null,
          visitorTips: district.visitorTips || null,
          interactiveFeatures: district.interactiveFeatures || null,
          areaSize: district.areaSize || null,
          climate: district.climate || null,
          population: district.population || null,
          tags: district.tags || null,
          createdAt: district.createdAt || Timestamp.now(),
          createdBy: district.createdBy.map(admin => ({ name: admin.name, id: admin.id })),
          editor: district.editor?.map(admin => ({ 
            name: admin.name, 
            id: admin.id, 
            role: admin.role 
          })) || [],
          lock: district.lock,
          version: district.version,
        });

        // Set district document
        await setDoc(doc(districtsCollection, district.id), districtData);
        console.log(`Successfully seeded district: ${district.name}`);
      }
    }

    console.log('All provinces and their districts have been successfully seeded to Firestore!');
  } catch (error) {
    console.error('Error seeding data to Firestore:', error);
    process.exit(1);
  }
};

// Run the seeding function
(async () => {
  await seedFirebase();
  console.log('Seeding process completed.');
  process.exit(0);
})();