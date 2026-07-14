import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,       // type WEB — required to receive an idToken
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID, // your Android OAuth client
  offlineAccess: false,
  scopes: ['profile', 'email'],
});

export { isErrorWithCode, statusCodes };

// Opens the native Google account picker and returns a Google idToken.
// Throws on cancel/failure — caller decides how to handle it.
export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();

  // Newer versions (v13+) wrap the payload in `.data`, older versions return it directly.
  const idToken = result?.data?.idToken ?? result?.idToken;

  if (!idToken) {
    throw new Error('Google did not return an ID token. Check that webClientId is set correctly.');
  }
  return idToken;
}

export async function signOutGoogle() {
  try {
    await GoogleSignin.signOut();
  } catch {
    // safe to ignore
  }
}