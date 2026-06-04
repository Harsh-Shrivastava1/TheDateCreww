/**
 * cleanFirestore.js — Deletes ALL documents from the customers collection.
 * Run this ONCE to clear duplicate seeded profiles.
 *
 * Usage: node scripts/cleanFirestore.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env parser to avoid external dependencies in scripts
function loadEnv() {
  try {
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          value = value.trim();
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      });
    }
  } catch (e) {
    console.error('Error loading .env file:', e);
  }
}

loadEnv();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


async function deleteCollection(collectionName) {
  const snap = await getDocs(collection(db, collectionName));
  if (snap.empty) {
    console.log(`  ✓ ${collectionName}: already empty`);
    return 0;
  }

  const BATCH_SIZE = 400;
  const docs = snap.docs;
  let deleted = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    docs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(doc(db, collectionName, d.id)));
    await batch.commit();
    deleted += Math.min(BATCH_SIZE, docs.length - i);
    console.log(`  ✓ ${collectionName}: deleted ${deleted} / ${docs.length}`);
  }

  return deleted;
}

async function main() {
  console.log('🔑 Authenticating...');
  const adminEmail = process.env.TDC_ADMIN_EMAIL || 'admin@tdc.com';
  const adminPassword = process.env.TDC_ADMIN_PASSWORD || 'password123';
  await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  console.log('✅ Authenticated.\n');

  const collections = ['customers', 'matches', 'activities'];

  for (const col of collections) {
    console.log(`🗑️  Clearing collection: ${col}`);
    const count = await deleteCollection(col);
    console.log(`   Total deleted: ${count}\n`);
  }

  console.log('✅ Cleanup complete. Run scripts/seedFirestore.js to seed 200 fresh profiles.');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
