const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

function getFrontendUrl() {
  const explicitUrl = (process.env.FRONTEND_URL || '').trim();
  if (explicitUrl) return explicitUrl.replace(/\/+$/, '');

  const firstAllowedOrigin = (process.env.FRONTEND_URLS || '')
    .split(',')
    .map((origin) => origin.trim())
    .find(Boolean);

  return firstAllowedOrigin ? firstAllowedOrigin.replace(/\/+$/, '') : '';
}

function getProviderEmail(provider, profile) {
  const directEmail = profile?.emails?.[0]?.value;
  if (directEmail) return directEmail.toLowerCase().trim();

  return `${provider}.${profile.id}@oauth.local`;
}

function getDisplayName(profile, fallbackEmail) {
  const fullName = profile?.displayName?.trim();
  if (fullName) return fullName;

  const parts = [profile?.name?.givenName, profile?.name?.familyName].filter(Boolean);
  if (parts.length > 0) return parts.join(' ').trim();

  return fallbackEmail.split('@')[0];
}

function getSafeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
  };
}

function issueJwt(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function buildOAuthResponse(user, provider) {
  return {
    message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} login successful`,
    provider,
    token: issueJwt(user),
    user: getSafeUser(user),
  };
}

async function findOrCreateOAuthUser(provider, profile) {
  const email = getProviderEmail(provider, profile);
  const name = getDisplayName(profile, email);
  const existingUser = await User.findByEmail(email);

  if (existingUser) {
    if (existingUser.status === 'blocked') {
      const error = new Error('Account is blocked');
      error.statusCode = 403;
      throw error;
    }

    return existingUser;
  }

  const passwordSeed = `${provider}:${profile.id}:${email}:${Date.now()}`;
  const password = await bcrypt.hash(passwordSeed, 12);

  return User.create({
    email,
    name,
    password,
    role: 'student',
    status: 'active',
    enrolledCourses: [],
  });
}

function getOAuthRedirectUrl(provider, token) {
  const frontendUrl = getFrontendUrl();
  if (!frontendUrl) return '';

  const redirectUrl = new URL('/', frontendUrl);
  redirectUrl.hash = new URLSearchParams({
    token,
    provider,
  }).toString();

  return redirectUrl.toString();
}

module.exports = {
  buildOAuthResponse,
  findOrCreateOAuthUser,
  getOAuthRedirectUrl,
  getFrontendUrl,
  getSafeUser,
  issueJwt,
};