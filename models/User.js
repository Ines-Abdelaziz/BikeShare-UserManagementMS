const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  address: {
    type: String,
  },
  date_created: {
    type: Date,
    default: Date.now,
  },
  date_updated: {
    type: Date,
    default: Date.now,
  },
  role: {
    type: String,
    enum: ['renter', 'owner', 'administrator'],
    default: 'renter',
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: {
    type: String,
  },
  emailVerificationTokenExpires: {
    type: Date,
  },
  isDoubleAuthCompleted: {
    type: Boolean,
    default: false,
  },
  doubleAuthToken: {
    type: String,
  },
  doubleAuthTokenExpires: {
    type: Date,
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
