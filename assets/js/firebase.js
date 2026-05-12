import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, deleteUser, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHArVPtiyBvsL26OZWW_IhCrqKBeJbiwE",
  authDomain: "quest-log-mon26.firebaseapp.com",
  projectId: "quest-log-mon26",
  storageBucket: "quest-log-mon26.firebasestorage.app",
  messagingSenderId: "736121171661",
  appId: "1:736121171661:web:44abf73032c285c3d88384",
  measurementId: "G-S0NVSFQ2TT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const dbCloud = getFirestore(app);

/**
 * CLOUD SYNC ENGINE
 */
export const cloudSync = {
    // Auth logic
    async register(email, password) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // Send verification email
            await sendEmailVerification(userCredential.user);
            return { status: 'success', userId: userCredential.user.uid };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    },

    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            
            // Check if email is verified
            if (!userCredential.user.emailVerified) {
                return { status: 'error', message: 'Please verify your email address before logging in. Check your inbox!' };
            }

            return { status: 'success', userId: userCredential.user.uid };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    },

    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(auth, email);
            return { status: 'success', message: 'Recovery scroll sent! Check your inbox for the reset link.' };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    },

    // Delete entire account and data
    async deleteAccount() {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("No user logged in.");

            const userId = user.uid;

            // 1. Delete Firestore Data
            await deleteDoc(doc(dbCloud, "users", userId));

            // 2. Delete Auth User
            await deleteUser(user);

            return { status: 'success' };
        } catch (error) {
            console.error("Delete Account Error:", error);
            // If it's a re-auth error, we might need the user to log in again
            if (error.code === 'auth/requires-recent-login') {
                return { status: 'error', code: 'reauth_required', message: 'For security, please log out and log back in before deleting your account.' };
            }
            return { status: 'error', message: error.message };
        }
    },

    // Save all local data to the cloud
    async uploadData(userId, localData) {
        try {
            await setDoc(doc(dbCloud, "users", userId), {
                ...localData,
                lastUpdated: new Date().toISOString()
            });
            console.log("Cloud Sync: Data uploaded successfully.");
            return true;
        } catch (error) {
            console.error("Cloud Sync Error (Upload):", error);
            return false;
        }
    },

    // Get all data from the cloud for this user
    async downloadData(userId) {
        try {
            const docSnap = await getDoc(doc(dbCloud, "users", userId));
            if (docSnap.exists()) {
                console.log("Cloud Sync: Data downloaded.");
                return docSnap.data();
            } else {
                console.log("Cloud Sync: No cloud data found for this user.");
                return null;
            }
        } catch (error) {
            console.error("Cloud Sync Error (Download):", error);
            return null;
        }
    }
};
