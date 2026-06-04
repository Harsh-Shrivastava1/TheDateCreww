import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  setDoc,
  writeBatch,
  limit,
} from 'firebase/firestore';
import { db } from './config';
import { scoreCompatibility } from '../matching/engine';

// ─── Customers ────────────────────────────────────────────────────────────────

export const getCustomers = async () => {
  const snap = await getDocs(collection(db, 'customers'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getCustomerById = async (id) => {
  const snap = await getDoc(doc(db, 'customers', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const updateCustomer = async (id, data) => {
  await updateDoc(doc(db, 'customers', id), { ...data, updatedAt: serverTimestamp() });
};

export const addCustomer = async (data) => {
  return await addDoc(collection(db, 'customers'), {
    ...data,
    createdAt: serverTimestamp(),
    status: 'New',
  });
};

export const batchAddCustomers = async (profiles) => {
  const CHUNK = 400;
  for (let i = 0; i < profiles.length; i += CHUNK) {
    const batch = writeBatch(db);
    profiles.slice(i, i + CHUNK).forEach((p) => {
      const ref = doc(collection(db, 'customers'));
      batch.set(ref, { ...p, createdAt: serverTimestamp() });
    });
    await batch.commit();
  }
};

// ─── Notes ────────────────────────────────────────────────────────────────────

export const getNotes = async (customerId) => {
  const q = query(
    collection(db, 'notes'),
    where('customerId', '==', customerId)
  );
  const snap = await getDocs(q);
  const notes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // Sort in JS to avoid requiring a composite Firestore index
  return notes.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0;
    const tb = b.createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
};

export const addNote = async (customerId, note, createdBy) => {
  return await addDoc(collection(db, 'notes'), {
    customerId,
    note,
    createdBy,
    pinned: false,
    createdAt: serverTimestamp(),
  });
};

export const updateNote = async (noteId, fields) => {
  const data = typeof fields === 'string' ? { note: fields } : fields;
  await updateDoc(doc(db, 'notes', noteId), { ...data, updatedAt: serverTimestamp() });
};

export const deleteNote = async (noteId) => {
  await deleteDoc(doc(db, 'notes', noteId));
};

export const getAllNotes = async () => {
  const snap = await getDocs(collection(db, 'notes'));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return list.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0;
    const tb = b.createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
};

// ─── Matches ──────────────────────────────────────────────────────────────────

export const getMatches = async (customerId) => {
  const q = query(
    collection(db, 'matches'),
    where('customerId', '==', customerId)
  );
  const snap = await getDocs(q);
  const matches = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return matches.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
};

export const saveMatch = async (matchData) => {
  return await addDoc(collection(db, 'matches'), {
    ...matchData,
    createdAt: serverTimestamp(),
  });
};

export const updateMatchStatus = async (matchId, status) => {
  await updateDoc(doc(db, 'matches', matchId), { status, updatedAt: serverTimestamp() });
};

export const getAllMatches = async () => {
  const snap = await getDocs(collection(db, 'matches'));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return list.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0;
    const tb = b.createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
};

// ─── Activities ───────────────────────────────────────────────────────────────

export const getActivities = async (customerId) => {
  const q = query(
    collection(db, 'activities'),
    where('customerId', '==', customerId)
  );
  const snap = await getDocs(q);
  const acts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return acts.sort((a, b) => {
    const ta = a.timestamp?.toMillis?.() ?? 0;
    const tb = b.timestamp?.toMillis?.() ?? 0;
    return tb - ta;
  });
};

export const logActivity = async (customerId, action) => {
  return await addDoc(collection(db, 'activities'), {
    customerId,
    action,
    timestamp: serverTimestamp(),
  });
};

export const getAllActivities = async () => {
  const snap = await getDocs(collection(db, 'activities'));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return list.sort((a, b) => {
    const ta = a.timestamp?.toMillis?.() ?? 0;
    const tb = b.timestamp?.toMillis?.() ?? 0;
    return tb - ta;
  });
};

// ─── Meetings ─────────────────────────────────────────────────────────────────

export const getAllMeetings = async () => {
  const snap = await getDocs(collection(db, 'meetings'));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return list.sort((a, b) => new Date(`${a.date}T${a.startTime || '00:00'}`) - new Date(`${b.date}T${b.startTime || '00:00'}`));
};

export const getMeetingsForCustomer = async (customerId) => {
  const q = query(
    collection(db, 'meetings'),
    where('customerOne', '==', customerId)
  );
  const q2 = query(
    collection(db, 'meetings'),
    where('customerTwo', '==', customerId)
  );
  const [snap1, snap2] = await Promise.all([getDocs(q), getDocs(q2)]);
  const list1 = snap1.docs.map((d) => ({ id: d.id, ...d.data() }));
  const list2 = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
  
  const unique = new Map();
  [...list1, ...list2].forEach((m) => unique.set(m.id, m));
  const combined = Array.from(unique.values());
  return combined.sort((a, b) => new Date(`${a.date}T${a.startTime || '00:00'}`) - new Date(`${b.date}T${b.startTime || '00:00'}`));
};

export const addMeeting = async (meetingData) => {
  return await addDoc(collection(db, 'meetings'), {
    ...meetingData,
    createdAt: serverTimestamp(),
  });
};

export const updateMeeting = async (meetingId, data) => {
  await updateDoc(doc(db, 'meetings', meetingId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteMeeting = async (meetingId) => {
  await deleteDoc(doc(db, 'meetings', meetingId));
};

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export const getDashboardStats = async () => {
  const [customerSnap, matchSnap, activitySnap, meetingSnap] = await Promise.all([
    getDocs(collection(db, 'customers')),
    getDocs(collection(db, 'matches')),
    getDocs(collection(db, 'activities')),
    getDocs(collection(db, 'meetings')),
  ]);

  const customers = customerSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const matches = matchSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const allActivities = activitySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const meetings = meetingSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const activities = allActivities
    .sort((a, b) => {
      const ta = a.timestamp?.toMillis?.() ?? 0;
      const tb = b.timestamp?.toMillis?.() ?? 0;
      return tb - ta;
    })
    .slice(0, 15);

  return {
    totalCustomers: customers.length,
    verifiedProfiles: customers.filter((c) => c.status === 'Verified').length,
    matchesSent: matches.filter((m) => m.status === 'Sent').length,
    meetingsScheduled: meetings.filter((m) => m.status === 'Scheduled').length,
    recentActivities: activities,
    customers,
    meetings,
    matches,
  };
};

export const recalculateMatches = async () => {
  const [matchesSnap, customersSnap] = await Promise.all([
    getDocs(collection(db, 'matches')),
    getDocs(collection(db, 'customers')),
  ]);

  const customers = {};
  customersSnap.docs.forEach((doc) => {
    customers[doc.id] = { id: doc.id, ...doc.data() };
  });

  const batch = writeBatch(db);
  let updatedCount = 0;

  for (const matchDoc of matchesSnap.docs) {
    const matchData = matchDoc.data();
    // Only update pending suggestions (Suggested or Match Suggested or Suggested status)
    if (matchData.status === 'Suggested') {
      const c1 = customers[matchData.customerOne];
      const c2 = customers[matchData.customerTwo];
      if (c1 && c2) {
        const { score, breakdown, label, color } = scoreCompatibility(c1, c2);
        if (score !== matchData.score) {
          batch.update(matchDoc.ref, {
            score,
            breakdown,
            label,
            color,
            updatedAt: serverTimestamp(),
          });
          updatedCount++;
        }
      }
    }
  }

  if (updatedCount > 0) {
    await batch.commit();
  }
  return updatedCount;
};
