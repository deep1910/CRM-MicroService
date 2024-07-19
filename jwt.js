// Generates the JWT SECERET KEY

const crypto = require('crypto');
const jwtSecret = crypto.randomBytes(32).toString('base64');
console.log(jwtSecret);

