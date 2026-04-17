/**
 * Firebase Authentication Module
 * Handles login, register, password reset with Firebase
 */

// Create a global FirebaseAuth object
const FirebaseAuth = (function() {
    let auth = null;
    let db = null;
    let initialized = false;

    /**
     * Initialize Firebase Auth
     */
    function initFirebase() {
        if (initialized) return { auth, db };
        
        if (typeof firebase === 'undefined') {
            console.error('Firebase SDK not loaded');
            return null;
        }
        
        const config = window.firebaseConfig;
        if (!config) {
            console.error('Firebase config not found');
            return null;
        }
        
        // Initialize Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(config);
        }
        
        auth = firebase.auth();
        db = firebase.firestore();
        initialized = true;
        
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
            if (!auth) {
                resolve(null);
                return;
            }
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
     * Get error message
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
            'auth/auth-domain-config-required': 'Auth domain not configured',
            'auth/popup-closed-by-user': 'Google login was cancelled',
            'auth/cancelled-popup-request': 'Only one popup allowed'
        };
        return messages[code] || 'An error occurred. Please try again.';
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
            console.error('Register error:', error);
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
            console.error('Login error:', error);
            return { success: false, error: getErrorMessage(error.code) };
        }
    }

    /**
     * Login with Google
     */
    async function loginWithGoogle() {
        try {
            if (!auth) {
                return { success: false, error: 'Firebase not initialized' };
            }
            
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
            console.error('Google login error:', error);
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
            console.error('Reset password error:', error);
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
            console.error('Logout error:', error);
            return { success: false, error: getErrorMessage(error.code) };
        }
    }

    // Public API
    return {
        initFirebase,
        getCurrentUser,
        isLoggedIn,
        getCurrentUserId,
        register,
        login,
        loginWithGoogle,
        resetPassword,
        logout
    };
})();
