// TODO: Firebase Google OAuth — uncomment and install firebase package when ready
// Run: npm install firebase  in the Frontend directory first
//
// import { initializeApp } from "firebase/app";
// import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
//
// const firebaseConfig = {
//     apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//     authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//     projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//     storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
//     messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//     appId: import.meta.env.VITE_FIREBASE_APP_ID,
// };
//
// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);
// const googleProvider = new GoogleAuthProvider();
//
// export const signInWithGoogle = async () => {
//     const result = await signInWithPopup(auth, googleProvider);
//     const idToken = await result.user.getIdToken();
//     return idToken;
// };
//
// export { auth };

// Placeholder export so imports don't break while Firebase is disabled
export const signInWithGoogle = async () => {
    throw new Error("Firebase is not configured yet. Please set up Firebase first.");
};
