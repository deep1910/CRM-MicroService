const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

// Initialize the Express application
const app = express();
app.use(bodyParser.json());

// Connect to the MongoDB database using the URI from environment variables
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Define the User schema for MongoDB
const User = mongoose.model('User', new mongoose.Schema({
  first_name: String,
  last_name: String,
  email: String,
  api_key: String,
}));

// Define the Candidate schema for MongoDB
const Candidate = mongoose.model('Candidate', new mongoose.Schema({
  first_name: String,
  last_name: String,
  email: String,
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}));

app.get("/", (req,res)=>{
  res.json("HOME PAGE")
})

// Endpoint to fetch user profile data
app.post('/api/public/profile', verifyApiKey, async (req, res) => {
  const user = await User.findOne({ api_key: req.body.api_key });
  if (user) {
    res.json({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
    
    });
  } else {
    res.status(404).send('User not found');
  }
});


// Endpoint to fetch candidate data associated with a user
app.get('/api/public/candidate', verifyApiKey, async (req, res) => {
  const user = await User.findOne({ api_key: req.query.api_key });
  if (user) {
    const candidates = await Candidate.find({ user_id: user._id });
    res.json(candidates);
  } else {
    res.status(404).send('User not found');
  }
});


// Middleware to verify the API key
function verifyApiKey(req, res, next) {
  const apiKey = req.body.api_key || req.query.api_key;
  if (apiKey) {
    req.apiKey = apiKey;
    next();
  } else {
    res.sendStatus(403);
  }
}


// Start the server and listen on port 3001
app.listen(3001, () => {
  console.log('Public API Service running on port 3001');
});