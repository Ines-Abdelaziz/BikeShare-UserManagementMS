const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const { MongoClient } = require('mongodb');
const url = process.env.DATABASE_URL;
const db_Name = process.env.DATABASE_NAME;
require('dotenv').config();

const bodyParser = require('body-parser');


const generateVerificationToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const sgMail = require('./services/sendgrid');






async function startServer() {
  try {
    const db = await connectToMongo();
    

    const app = express();
    app.use(cors());


    app.use(express.json());
    app.use(cors());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
   // User registration
    app.post('/register', async (req, res) => {
      try {
        const { name, email, password, phone, address } = req.body;
        // Check if user with the same email already exists
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
          return res.status(400).json({ error: 'Email already exists' });
        }
    
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
    
        // Create a new user
        const newUser = new User({
          name:name,
          email:email,
          password: hashedPassword,
          phone:phone,
          address:address,
        });
    
        // Generate an email verification token
        const emailVerificationToken = generateVerificationToken({ userId: newUser._id });
    
        // Set the verification token and expiration date in the user object
        newUser.emailVerificationToken = emailVerificationToken;
    
        await db.collection('users').insertOne(newUser);
    
        // Send the verification email
        const verificationLink = `${process.env.CLIENT_URL}/verify-email?token=${emailVerificationToken}`;
    
        const msg = {
          to: email,
          from: 'ines.abdelaziz19@gmail.com', // Set your verified sender email address here
          subject: 'BikeShare Email Verification',
          text: `Please click the following link to verify your email: ${verificationLink}`,
          html: `Please click the following link to verify your email: <a href="${verificationLink}">${verificationLink}</a>`,
        };
    
        await sgMail.send(msg);
    
        res.json({ message: 'Registration successful. Please check your email for the verification link.' });
      } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
      }
    });

    // Email verification
    app.get('/verify-email', async (req, res) => {
      try {
        const { token } = req.query;
        console.log(token);
        // Find the user by email verification token
        const user = await db.collection('users').findOne({
          emailVerificationToken: token, 
        });
        console.log(user);
        if (!user) {
          return res.status(400).json({ error: 'Invalid or expired verification token' });
        }
    
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        await db.collection('users').updateOne({_id:user._id},{$set:user})
    
        res.json({ message: 'Email verified successfully' });
      } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
      }
    
    });

    // User login
    app.post('/login', async (req, res) => {
      try {
        const { email, password } = req.body;
    
        // Check if user exists
        const user = await db.collection('users').findOne({ email });
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
    
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({ error: 'Invalid password' });
        }
    
        // Check if email is verified
        if (!user.isEmailVerified) {
          return res.status(401).json({ error: 'Email not verified' });
        }
    
        // Generate and send authentication code of 4 digits  via email for double authentication
        const doubleAuthToken = Math.floor(1000 + Math.random() * 9000);
       //set double auth token and expiration date in the user object
        user.doubleAuthToken = doubleAuthToken;
        await db.collection('users').updateOne({_id:user._id},{$set:user});
        const msg = {
          to: email,
          from: 'ines.abdelaziz19@gmail.com', // Set your verified sender email address here
          subject: 'BikeShare Double Authentication',
          text: `This is your double authentication code:${doubleAuthToken}`,
          html: `This is your double authentication code:<b> ${doubleAuthToken}</b>`,
        };
    
        await sgMail.send(msg);
    
        res.json({ message: 'Authentication code sent to your email' });
      } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
      }
    });

    // Completing double authentication
    app.post('/double-auth', async (req, res) => {
      try {
        const {email, token } = req.body;
       console.log(email);
        // Find the user by double authentication token
        const user = await db.collection('users').findOne({
          email: email,
        });
        console.log(user);
        
        if (!user && user.doubleAuthToken !== token) {
          return res.status(400).json({ error: 'Invalid or expired double authentication token' });
        }
    
        user.isDoubleAuthCompleted = true;
        user.doubleAuthToken = undefined;
        await db.collection('users').updateOne({_id:user.id},{$set:user});
       
        // Generate and send JWT
        const authToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
        res.json({ authToken });
      } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
      }
    });
   
      
  
    const PORT = 3002;

    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting the server:', error);
  }
}

// Connect to MongoDB
async function connectToMongo() {
  try {
    const client = await MongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Storing a reference to the database so you can use it later
    const db = client.db(db_Name);

    console.log(`Connected MongoDB: ${url}`);
    console.log(`Database: ${db_Name}`);
    module.exports = db;
    return db;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

// Call the startServer function to begin the server initialization
startServer();

