import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBvNx7IXRbEChvr-BOigk0oDgJAQb77TvQ",
  authDomain: "bus-poupet.firebaseapp.com",
  projectId: "bus-poupet",
  storageBucket: "bus-poupet.firebasestorage.app",
  messagingSenderId: "736446852067",
  appId: "1:736446852067:web:aa9648506540ac87fa0ed6",
  measurementId: "G-1010EDTBJK"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
