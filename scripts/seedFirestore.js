/**
 * Seeding Script — Seeds Firestore with 200 realistic Indian matchmaking profiles.
 * Usage: node scripts/seedFirestore.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
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


const CITY_STATE_MAP = {
  'Mumbai': 'Maharashtra',
  'Delhi': 'Delhi',
  'Bangalore': 'Karnataka',
  'Hyderabad': 'Telangana',
  'Pune': 'Maharashtra',
  'Ahmedabad': 'Gujarat',
  'Vadodara': 'Gujarat',
  'Surat': 'Gujarat',
  'Chennai': 'Tamil Nadu',
  'Kolkata': 'West Bengal',
  'Lucknow': 'Uttar Pradesh',
  'Jaipur': 'Rajasthan',
  'Indore': 'Madhya Pradesh',
};

const CITIES = Object.keys(CITY_STATE_MAP);
const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist'];
const CASTES = ['Brahmin', 'Kshatriya', 'Vaishya', 'Kayastha', 'Maratha', 'Rajput', 'Nair', 'Iyer', 'Reddy', 'Naidu', 'Patel', 'Agarwal'];
const DEGREES = ['Bachelors', 'Masters', 'MBA', 'PhD', 'Diploma', 'Post Graduate'];
const COLLEGES = [
  'IIT Bombay', 'IIT Delhi', 'IIM Ahmedabad', 'BITS Pilani', 'NIT Trichy',
  'Delhi University', 'Mumbai University', 'Pune University', 'VIT Vellore',
  'Jadavpur University', 'Anna University', 'Osmania University', 'XLRI Jamshedpur',
  'Symbiosis Pune', 'Christ University', 'Manipal University', 'Amity University',
];
const COMPANIES = [
  'TCS', 'Infosys', 'Wipro', 'HCL', 'Accenture', 'Google', 'Microsoft',
  'Deloitte', 'KPMG', 'Amazon', 'Flipkart', 'Zomato', 'HDFC Bank',
  'ICICI Bank', 'Bajaj Finance', 'Reliance', 'Tata Group', 'Mahindra',
  'JP Morgan', 'Goldman Sachs', 'McKinsey', 'BCG', 'Cognizant', 'Capgemini',
];
const DESIGNATIONS_M = [
  'Software Engineer', 'Senior Developer', 'Tech Lead', 'Project Manager',
  'Data Scientist', 'Business Analyst', 'Investment Banker', 'Consultant',
  'Doctor', 'Civil Engineer', 'Financial Analyst', 'Product Manager',
  'Operations Manager', 'Marketing Manager', 'Sales Manager', 'Architect',
];
const DESIGNATIONS_F = [
  'Software Engineer', 'UX Designer', 'HR Manager', 'Finance Analyst',
  'Doctor', 'Educator', 'Content Strategist', 'Brand Manager', 'Lawyer',
  'Project Manager', 'Data Analyst', 'Nurse', 'Architect', 'Consultant',
  'Teacher', 'Research Scientist', 'Marketing Lead', 'Operations Lead',
];
const LANGUAGES = ['Hindi', 'English', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati', 'Punjabi', 'Urdu'];
const STATUSES = ['New', 'Verified', 'Match Suggested', 'Match Sent', 'Interested', 'Meeting Scheduled', 'In Discussion', 'Closed'];
const DIET = ['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan'];
const SMOKING = ['Non-Smoker', 'Occasionally', 'Smoker'];
const DRINKING = ['Non-Drinker', 'Occasionally', 'Social Drinker'];
const HOBBIES_LIST = ['Reading', 'Traveling', 'Cooking', 'Music', 'Yoga', 'Gym', 'Photography', 'Gaming', 'Painting', 'Hiking', 'Dancing', 'Cricket', 'Swimming'];
const FAMILY_TYPE = ['Nuclear', 'Joint'];
const MARITAL = ['Never Married', 'Divorced', 'Widowed', 'Separated'];
const WANT_KIDS = ['Yes', 'No', 'Open'];
const RELOCATE = ['Yes', 'No', 'Open'];
const PETS = ['Yes', 'No', "Doesn't Matter"];

const MALE_FIRST = [
  'Aarav','Arjun','Rohit','Vikram','Karan','Siddharth','Raj','Dev','Aditya',
  'Nikhil','Rahul','Vivek','Amit','Suresh','Manish','Prateek','Varun','Kunal',
  'Shubham','Akash','Rishi','Hardik','Pranav','Gaurav','Tarun','Neeraj','Dhruv',
  'Ankit','Sumit','Rishabh','Kabir','Ishaan','Ayaan','Parth','Armaan','Harsh',
  'Sandeep','Vinay','Anand','Naveen','Kartik','Rohan','Ritesh','Yash','Deepak',
  'Saurabh','Piyush','Tushar','Abhinav','Sameer','Mihir','Arun','Sachin','Rajesh',
  'Mohit','Sharad','Nilesh','Chirag','Hitesh','Paresh','Jatin','Nilesh','Lalit',
  'Mukesh','Ajay','Vijay','Suraj','Gopal','Hemant','Kamlesh','Jagdish','Naresh',
  'Prashant','Ramesh','Sanjay','Mohan','Bharat','Aniket','Tejas','Abhishek','Mayur',
  'Girish','Brijesh','Omkar','Sachet','Yuvraj','Nakul','Satish','Dinesh','Vipul',
  'Shreyas','Lakshmikant','Milind','Kedar','Yogesh','Mahesh','Arvind','Sunil','Nayan',
];
const FEMALE_FIRST = [
  'Priya','Ananya','Neha','Pooja','Riya','Divya','Kavya','Sneha','Ishita','Anika',
  'Sanya','Nisha','Meera','Shreya','Aditi','Ankita','Deepika','Kritika','Sunita','Meghna',
  'Tanvi','Swati','Preeti','Rashmi','Shalini','Garima','Shweta','Bhavna','Richa','Mansi',
  'Puja','Sonali','Rekha','Amrita','Supriya','Varsha','Chandni','Nidhi','Komal','Rupal',
  'Simran','Seema','Pinky','Renu','Sapna','Geeta','Manju','Indira','Usha','Lalita',
  'Aishwarya','Pallavi','Tara','Vandana','Kiran','Sarla','Leela','Pushpa','Sheetal','Jyoti',
  'Karishma','Payal','Archana','Chetna','Prachi','Namrata','Shraddha','Kajal','Madhuri','Lata',
  'Surbhi','Radhika','Diya','Srishti','Nandini','Tejal','Bhumi','Minal','Shilpa','Alka',
  'Vibha','Babita','Shobha','Monika','Mamta','Pratibha','Savita','Padma','Sumitra','Anuradha',
  'Zara','Sana','Afroz','Dilnoza','Noor','Iqra','Shabana','Farzana','Reena','Aarti',
];
const LAST_NAMES = [
  'Sharma','Verma','Gupta','Singh','Patel','Shah','Mehta','Joshi','Kumar','Nair',
  'Reddy','Menon','Iyer','Pillai','Naidu','Rao','Chopra','Khanna','Malhotra','Bose',
  'Das','Chatterjee','Banerjee','Mukherjee','Ghosh','Sen','Choudhary','Mishra','Tiwari','Pandey',
  'Dubey','Shukla','Tripathi','Srivastava','Aggarwal','Agarwal','Mittal','Jain','Goel','Kapoor',
  'Arora','Bhatia','Tandon','Mehra','Bajaj','Soni','Desai','Modi','Parmar','Dave',
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Stable, high-quality avatar URLs from Unsplash for realistic representation
const avatarMale = (i) => `https://images.unsplash.com/photo-${[
  '1500648767791-00dcc994a43e', '1507003211169-0a1dd7228f2d', '1539571696357-5a69c17a67c6',
  '1506794778202-cad84cf45f1d', '1492562080023-ab3db95bfbce', '1522075469751-3a6694fb2f61',
  '1534528741775-53994a69daeb', '1517841905240-472988babdf9', '1501196354995-cbb51c65aaea',
  '1507003211169-0a1dd7228f2d'
][i % 10]}?w=150&h=150&fit=crop&crop=face`;

const avatarFemale = (i) => `https://images.unsplash.com/photo-${[
  '1494790108377-be9c29b29330', '1438761681033-6461ffad8d80', '1544005313-94ddf0286df2',
  '1517841905240-472988babdf9', '1534528741775-53994a69daeb', '1524504388940-b1c1722653e1',
  '1488426862026-3ee34a7d66df', '1508214751196-bcfd4ca60f91', '1531746020798-e6953c6e8e04',
  '1544005313-94ddf0286df2'
][i % 10]}?w=150&h=150&fit=crop&crop=face`;

function generateProfile(index, gender) {
  const isM = gender === 'Male';
  const firstName = isM ? MALE_FIRST[index % MALE_FIRST.length] : FEMALE_FIRST[index % FEMALE_FIRST.length];
  const lastName = LAST_NAMES[rand(0, LAST_NAMES.length - 1)];
  const age = isM ? rand(25, 40) : rand(22, 36);
  
  // Create Dob matching age
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - age;
  const dobMonth = String(rand(1, 12)).padStart(2, '0');
  const dobDay = String(rand(1, 28)).padStart(2, '0');
  const dateOfBirth = `${birthYear}-${dobMonth}-${dobDay}`;

  const heightFt = isM ? rand(5, 6) : rand(5, 5);
  const heightIn = rand(0, 11);
  const height = `${heightFt}'${heightIn}"`;

  const city = pick(CITIES);
  const state = CITY_STATE_MAP[city];
  const religion = pick(RELIGIONS);
  const caste = pick(CASTES);
  
  const income = isM
    ? [500000, 800000, 1200000, 1500000, 2000000, 3000000, 4500000][rand(0, 6)]
    : [400000, 650000, 900000, 1200000, 1800000, 2500000, 3500000][rand(0, 6)];

  const status = pick(STATUSES);
  const photoUrl = isM ? avatarMale(index) : avatarFemale(index);

  return {
    firstName,
    lastName,
    gender,
    age,
    dateOfBirth,
    city,
    state,
    country: 'India',
    religion,
    caste,
    maritalStatus: Math.random() > 0.9 ? pick(MARITAL.slice(1)) : 'Never Married',
    height,
    education: pick(DEGREES),
    degree: pick(DEGREES),
    college: pick(COLLEGES),
    company: pick(COMPANIES),
    designation: isM ? pick(DESIGNATIONS_M) : pick(DESIGNATIONS_F),
    income,
    languages: pickN(LANGUAGES, rand(2, 4)),
    hobbies: pickN(HOBBIES_LIST, rand(2, 5)),
    diet: pick(DIET),
    smoking: isM ? pick(SMOKING) : Math.random() > 0.8 ? pick(SMOKING) : 'Non-Smoker',
    drinking: pick(DRINKING),
    familyType: pick(FAMILY_TYPE),
    siblings: rand(0, 3),
    wantKids: pick(WANT_KIDS),
    relocate: pick(RELOCATE),
    pets: pick(PETS),
    status,
    photo: photoUrl,
    photoUrl,
  };
}

async function seedFirestore() {
  console.log('🔑 Authenticating as admin user...');
  const adminEmail = process.env.TDC_ADMIN_EMAIL || 'admin@tdc.com';
  const adminPassword = process.env.TDC_ADMIN_PASSWORD || 'password123';
  await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  console.log('✅ Authenticated successfully.');

  console.log('🚀 Generating 200 realistic Indian matchmaking profiles...');
  const profiles = [
    ...Array.from({ length: 100 }, (_, i) => generateProfile(i, 'Male')),
    ...Array.from({ length: 100 }, (_, i) => generateProfile(i, 'Female')),
  ];

  console.log('✅ Generated 100 Male + 100 Female profiles.');
  console.log('📤 Seeding to Firestore in batches of 100...');

  // Chunk array into batches of 100 documents for batch commits (Firestore batch limit is 500)
  const BATCH_SIZE = 100;
  for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = profiles.slice(i, i + BATCH_SIZE);
    
    chunk.forEach(profile => {
      const docRef = doc(collection(db, 'customers'));
      batch.set(docRef, {
        ...profile,
        createdAt: serverTimestamp(),
      });
    });

    await batch.commit();
    console.log(`✅ Uploaded batch: ${i + chunk.length} / ${profiles.length}`);
  }

  console.log('🎉 Firestore database seeding complete!');
  process.exit(0);
}

seedFirestore().catch(err => {
  console.error('❌ Error during seeding:', err);
  process.exit(1);
});
