import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDbTImRzVu328XtH_7VexxhUQP4i_k8Sq4",
    authDomain: "paginalym.firebaseapp.com",
    projectId: "paginalym",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);