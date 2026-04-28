const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/userModel');
const { findOrCreateOAuthUser } = require('../services/oauthAuthService');

const configuredStrategies = new Set();

function registerStrategy(passport, name, StrategyCtor, options) {
  if (!options.clientID || !options.clientSecret) {
    return;
  }

  passport.use(
    new StrategyCtor(options, async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateOAuthUser(name, profile);
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  configuredStrategies.add(name);
}

module.exports = function configurePassport(passport) {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      if (!user) {
        return done(null, false);
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  });

  registerStrategy(passport, 'google', GoogleStrategy, {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
    passReqToCallback: false,
  });

  registerStrategy(passport, 'github', GitHubStrategy, {
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || '/auth/github/callback',
    scope: ['user:email'],
    passReqToCallback: false,
  });

  registerStrategy(passport, 'facebook', FacebookStrategy, {
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'emails', 'name', 'photos'],
    passReqToCallback: false,
  });

  return passport;
};

module.exports.isStrategyConfigured = function isStrategyConfigured(name) {
  return configuredStrategies.has(name);
};