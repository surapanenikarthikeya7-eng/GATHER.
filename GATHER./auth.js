import { getAuth } from 'firebase-admin/auth';
import { getApps, initializeApp } from 'firebase-admin/app';
import pool from '../config/db.js';
import { HttpError, asyncHandler } from '../utils/http.js';

function firebaseAdminAuth() {
  const app = getApps()[0] || initializeApp();
  return getAuth(app);
}

async function getFirebaseUser(req) {
  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  let claims;
  try {
    claims = await firebaseAdminAuth().verifyIdToken(match[1]);
  } catch (error) {
    if (error.code?.startsWith('auth/')) {
      throw new HttpError(401, 'Your Firebase session is invalid or expired. Please sign in again.');
    }
    console.error('Firebase token verification failed:', error.code || error.message);
    throw new HttpError(503, 'Firebase Authentication is not configured on the API server.');
  }

  if (!claims.uid || !claims.email) {
    throw new HttpError(401, 'Your Firebase account must include an email address.');
  }

  const profile = {
    uid: claims.uid,
    name: claims.name || claims.email.split('@')[0] || 'Gather member',
    email: claims.email,
    photoURL: claims.picture || null,
    emailVerified: Boolean(claims.email_verified)
  };
  let [users] = await pool.execute(
    'SELECT user_id, firebase_uid, name, email, profile_image, role, is_active, created_at FROM users WHERE firebase_uid = ?',
    [profile.uid]
  );

  if (users.length === 0) {
    try {
      [users] = await pool.execute(
        `INSERT INTO users (firebase_uid, name, email, profile_image, email_verified)
         VALUES (?, ?, ?, ?, ?)
         RETURNING user_id, firebase_uid, name, email, profile_image, role, is_active, created_at`,
        [profile.uid, profile.name, profile.email, profile.photoURL, Number(profile.emailVerified)]
      );
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new HttpError(409, 'A GATHER account already exists for this email address.');
      }
      throw error;
    }
  } else {
    [users] = await pool.execute(
      `UPDATE users
       SET name = ?, email = ?, profile_image = ?, email_verified = ?, updated_at = CURRENT_TIMESTAMP
       WHERE firebase_uid = ?
       RETURNING user_id, firebase_uid, name, email, profile_image, role, is_active, created_at`,
      [profile.name, profile.email, profile.photoURL, Number(profile.emailVerified), profile.uid]
    );
  }

  const user = users[0];
  if (!user || !user.is_active) {
    throw new HttpError(403, 'This GATHER account is not active.');
  }
  return {
    ...user,
    uid: user.firebase_uid,
    photoURL: user.profile_image,
    emailVerified: Boolean(user.email_verified)
  };
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const user = await getFirebaseUser(req);
  if (!user) throw new HttpError(401, 'Please sign in to continue.');
  req.user = user;
  next();
});

export const requireAdmin = (req, _res, next) => {
  if (req.user?.role !== 'ADMIN') return next(new HttpError(403, 'Administrator access required.'));
  next();
};

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  if (req.headers.authorization) {
    const user = await getFirebaseUser(req);
    if (!user) throw new HttpError(401, 'Your Firebase session is invalid or expired. Please sign in again.');
    req.user = user;
  }
  next();
});
