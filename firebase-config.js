// Importation des modules Firebase indispensables (Version Web standard via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Tes clés Firebase officielles extraites de ta capture
const firebaseConfig = {
  apiKey: "AIzaSyCjg83OlM_BgSftkAkCapGrwV-FMvNZyY",
  authDomain: "yeagerbet-db.firebaseapp.com",
  projectId: "yeagerbet-db",
  storageBucket: "yeagerbet-db.firebasestorage.app",
  messagingSenderId: "1036562277525",
  appId: "1:1036562277525:web:61b4a09e5f93e7308f679c",
  measurementId: "G-D5V2JVS5SV",
};

// Initialisation de Firebase et liaison avec Cloud Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Exportation des outils pour les utiliser dans ton script d'inscription/connexion
export { db, collection, addDoc, getDocs, query, where };
