// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { browser } from "$app/environment";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBXNUOiNv3QjQRjooFRcooMeTOKRZ2MJCg",
  authDomain: "helplink-10237.firebaseapp.com",
  projectId: "helplink-10237",
  storageBucket: "helplink-10237.firebasestorage.app",
  messagingSenderId: "347386147615",
  appId: "1:347386147615:web:2134d3702e21243b3b362a",
  measurementId: "G-GYVZSMKDWE"
};

export const app = initializeApp(firebaseConfig);

export async function getFirebaseMessaging() {
    if (!browser)
        return null;

    const { getMessaging } = await import("firebase/messaging");

    return getMessaging(app);
}