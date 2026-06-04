import app, { auth as firebaseAuth, db as firebaseDb } from '../../config/firebase';

export const auth = firebaseAuth;
export const db = firebaseDb;
export default app;

