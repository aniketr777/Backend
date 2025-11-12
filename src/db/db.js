import mongoose from "mongoose";

const connectDb =async()=>{
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected");
    }catch(err){
        console.log("Error connecting to MongoDB:", err);
    }
}

export default connectDb;