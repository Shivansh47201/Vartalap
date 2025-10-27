import mongoose from "mongoose";

const connectDb = async (URI) => {
  try{
    await mongoose.connect(URI);
    console.log("Database connected Successfully!")
  }
  catch(error){console.error("Database connection failed!")}
  
}



export default connectDb;