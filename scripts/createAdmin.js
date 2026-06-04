/**
 * Run this script once to create the admin user in Firebase Auth.
 * Usage: node scripts/createAdmin.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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
const auth = getAuth(app);
const db = getFirestore(app);

const adminEmail = process.env.TDC_ADMIN_EMAIL || 'admin@tdc.com';
const adminPassword = process.env.TDC_ADMIN_PASSWORD || 'password123';

async function createAdmin() {
  try {
    const cred = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);

    console.log('✅ Admin user created:', cred.user.uid);
    
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      name: 'Admin Matchmaker',
      email: adminEmail,
      role: 'matchmaker',
    });
    console.log('✅ User document created in Firestore');
    process.exit(0);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log('ℹ️  Admin user already exists — you can sign in directly.');
    } else {
      console.error('❌ Error:', err.message);
    }
    process.exit(0);
  }
}

createAdmin();
