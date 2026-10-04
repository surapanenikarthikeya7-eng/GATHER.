const messages = {
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account already exists for this email. Please log in.',
  'auth/weak-password': 'Choose a password with at least 6 characters.',
  'auth/popup-closed-by-user': 'Google sign-in could not be completed. Please try again.',
  'auth/cancelled-popup-request': 'Google sign-in could not be completed. Please try again.',
  'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow pop-ups and try again.',
  'auth/unauthorized-domain': 'This website is not enabled for Firebase sign-in. Add its domain in Firebase Authentication settings.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Unable to reach Firebase. Check your internet connection and try again.',
  'auth/expired-action-code': 'This password reset link has expired. Request another one.',
  'auth/invalid-action-code': 'This password reset link is invalid or has already been used.'
};

export function firebaseErrorMessage(error, fallback = 'Sign-in could not be completed. Please try again.') {
  return messages[error?.code] || fallback;
}
