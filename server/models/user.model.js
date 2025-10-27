import mongoose from 'mongoose';


const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false,
  },
    username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
 password: {
    type: String,
    required: true,
  },
 gender: {
  type: String,
  required: true,
 },
  date: 
  { 
    type: Date, 
    default: Date.now,
  },
  avatar: {
    type: String, 
    default: '', 
  },
  language: {
    type: String,
    default: 'en',
  },
}, {timestamps: true})




export default mongoose.model('User', userSchema);
