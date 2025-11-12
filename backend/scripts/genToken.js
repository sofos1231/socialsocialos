/* eslint-disable */
const jwt = require('jsonwebtoken');
require('dotenv').config();

const secret = process.env.JWT_SECRET;
const alg = (process.env.JWT_ALG || '').toUpperCase();
const iss = process.env.JWT_ISS;
const aud = process.env.JWT_AUD;
const expiresIn = process.env.JWT_EXPIRES_IN || '15m';

if (!secret) throw new Error('Missing JWT_SECRET');
if (!alg) throw new Error('Missing JWT_ALG');
if (!iss) throw new Error('Missing JWT_ISS');
if (!aud) throw new Error('Missing JWT_AUD');

const token = jwt.sign({ sub: 'self-test-user' }, secret, {
  algorithm: alg,
  issuer: iss,
  audience: aud,
  expiresIn,
});

console.log(token);


