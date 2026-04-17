/**
 * Firebase Authentication Module
 * Handles login, register, password reset with Firebase
 */

// Firebase SDK imports (using CDN in HTML)
let auth = null;
let db = null;

/**
 * Initialize Firebase Auth
 */
function initFirebase() {
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded');
        return null;
    }
    
    // Initialize Firebase with config from window
    if (!firebase.apps.length) {
        firebase.initializeApp(window.firebaseConfig);
    }
    
    auth = firebase.auth();
    db = firebase.firestore();
    
    // Enable persistence
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .catch(err => console.log('Auth persistence error:', err));
    
    return { auth, db };
}

/**
 * Get current user
 */
function getCurrentUser() {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            unsubscribe();
            resolve(user);
        });
    });
}

/**
 * Check if user is logged in
 */
function isLoggedIn() {
    return auth?.currentUser !== null;
}

/**
 * Get current user ID
 */
function getCurrentUserId() {
    return auth?.currentUser?.uid;
}

/**
 * Register new user with email and password
 */
async function register(email, password, displayName) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Update display name
        if (displayName) {
            await userCredential.user.updateProfile({ displayName });
        }
        
        // Create user document in Firestore
        if (db) {
            await db.collection('users').doc(userCredential.user.uid).set({
                uid: userCredential.user.uid,
                email: email,
                displayName: displayName || email.split('@')[0],
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            });
        }
        
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: getErrorMessage(error.code) };
    }
}

/**
 * Login with email and password
 */
async function login(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        // Update last login
        if (db) {
            await db.collection('users').doc(userCredential.user.uid).update({
                lastLogin: new Date().toISOString()
            });
        }
        
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: getErrorMessage(error.code) };
    }
}

/**
 * Login with Google
 */
async function loginWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const userCredential = await auth.signInWithPopup(provider);
        
        // Check if user document exists, create if not
        if (db) {
            const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
            if (!userDoc.exists) {
                await db.collection('users').doc(userCredential.user.uid).set({
                    uid: userCredential.user.uid,
                    email: userCredential.user.email,
                    displayName: userCredential.user.displayName,
                    photoURL: userCredential.user.photoURL,
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                });
            } else {
                await db.collection('users').doc(userCredential.user.uid).update({
                    lastLogin: new Date().toISOString()
                });
            }
        }
        
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: getErrorMessage(error.code) };
    }
}

/**
 * Send password reset email
 */
async function resetPassword(email) {
    try {
        await auth.sendPasswordResetEmail(email);
        return { success: true };
    } catch (error) {
        return { success: false, error: getErrorMessage(error.code) };
    }
}

/**
 * Logout
 */
async function logout() {
    try {
        await auth.signOut();
        return { success: true };
    } catch (error) {
        return { success: false, error: getErrorMessage(error.code) };
    }
}

/**
 * Get user data from Firestore
 */
async function getUserData(uid) {
    if (!db) return null;
    
    try {
        const doc = await db.collection('users').doc(uid).get();
        return doc.exists ? doc.data() : null;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

/**
 * Update user profile
 */
async function updateProfile(data) {
    if (!auth?.currentUser) return { success: false, error: 'Not logged in' };
    
    try {
        const updates = {};
        
        if (data.displayName) {
            await auth.currentUser.updateProfile({ displayName: data.displayName });
            updates.displayName = data.displayName;
        }
        
        if (db && Object.keys(updates).length > 0) {
            await db.collection('users').doc(auth.currentUser.uid).update({
                ...updates,
                updatedAt: new Date().toISOString()
            });
        }
        
        return { success: true };
    } catch (error) {
        return { success: false, error: getErrorMessage(error.code) };
    }
}

/**
 * Get error message from error code
 */
function getErrorMessage(code) {
    const messages = {
        'auth/email-already-in-use': 'This email is already registered',
        'auth/invalid-email': 'Invalid email address',
        'auth/operation-not-allowed': 'Operation not allowed',
        'auth/weak-password': 'Password is too weak',
        'auth/user-disabled': 'This account has been disabled',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/invalid-credential': 'Invalid email or password',
        'auth/too-many-requests': 'Too many attempts. Please try again later',
        'auth/popup-closed-by-user': 'Sign in cancelled',
        'auth/account-exists-with-different-credential': 'Account already exists with different sign in method',
        'auth/network-request-failed': 'Network error. Please check your connection'
    };
    
    return messages[code] || 'An error occurred. Please try again';
}

// Export for use in other modules
window.FirebaseAuth = {
    initFirebase,
    getCurrentUser,
    isLoggedIn,
    getCurrentUserId,
    register,
    login,
    loginWithGoogle,
    resetPassword,
    logout,
    getUserData,
    updateProfile
};