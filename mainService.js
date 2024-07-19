const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios')
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

//Connect to the MongoDB database using the URI from environment variables
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });


//Define the user schema for MongoDB
const UserSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  email: String,
  password_hash: String,
  api_key: String
});


//Define the Candidate schemna for MongoDB
const CandidateSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  email: String,
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const User = mongoose.model('User', UserSchema);
const Candidate = mongoose.model('Candidate', CandidateSchema);


// Home route to indicate the service is running
app.get('/', (req,res) =>{

   res.json("HOME PAGE")
})

// Function to generate a unique API key
function generateApiKey() {
  return crypto.randomBytes(16).toString('hex');
}


// Endpoint to register a new user
app.post('/api/register', async (req, res) => {
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const apiKey = uuidv4(); // Generate a unique API key

  const user = new User({
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    email: req.body.email,
    password_hash: hashedPassword,
    api_key: apiKey
  });
  await user.save();
  res.status(201).send('User registered');
});

// Endpoint to log in a user
app.post('/api/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user && await bcrypt.compare(req.body.password, user.password_hash)) {
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).send('Invalid credentials');
  }
});


// Protected endpoint that requires a valid JWT token
app.post('/api/protected', verifyToken, (req, res) => {
  jwt.verify(req.token, process.env.JWT_SECRET, (err, authData) => {
    if (err) {
      res.sendStatus(403);
    } else {
      res.json({ message: 'Protected content', authData });
    }
  });
});


// Endpoint to add a new candidate associated with a user
app.post('/api/candidate', verifyToken, async (req, res) => {
  const candidate = new Candidate({
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    email: req.body.email,
    user_id: req.user.userId,
  });
  await candidate.save();
  res.status(201).send('Candidate added');
});

// Endpoint to fetch candidates associated with a user
app.get('/api/candidate', verifyToken, async (req, res) => {
  const candidates = await Candidate.find({ user_id: req.user.userId });
  res.json(candidates);
});


// Middleware to verify JWT token
function verifyToken(req, res, next) {
  const bearerHeader = req.headers['authorization'];
  if (typeof bearerHeader !== 'undefined') {
    const bearerToken = bearerHeader.split(' ')[1];
    req.token = bearerToken;
    jwt.verify(req.token, process.env.JWT_SECRET, (err, authData) => {
      if (!err) req.user = authData;
    });
    next();
  } else {
    res.sendStatus(403);
  }
}


// Endpoint to fetch user profile from the Public API Microservice
app.post('/api/fetch-profile', async (req, res) => {
  try {
    const apiKey = req.body.api_key; // Assuming the API key is sent in the request body

    if (!apiKey) {
      return res.status(400).send('API Key is required');
    }

    const response = await axios.post('http://localhost:3001/api/public/profile', {
      api_key: apiKey
    });

    res.json(response.data);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).send(error.response.data);
    } else if (error.request) {
      res.status(500).send('No response received from the server');
    } else {
      res.status(500).send('Error setting up the request');
    }
  }
});


// Endpoint to fetch candidates from the Public API Microservice
app.get('/api/fetch-candidates', async (req, res) => {
  try {
    const apiKey = req.query.api_key; // Assuming the API key is sent as a query parameter

    if (!apiKey) {
      return res.status(400).send('API Key is required');
    }

    const response = await axios.get(`http://localhost:3001/api/public/candidate?api_key=${apiKey}`);

    res.json(response.data);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).send(error.response.data);
    } else if (error.request) {
      res.status(500).send('No response received from the server');
    } else {
      res.status(500).send('Error setting up the request');
    }
  }
});


// Start the server and listen on port 3000
app.listen(3000, () => {
  console.log('Main Service running on port 3000');
});


// mongodb://localhost:27017/crm-db