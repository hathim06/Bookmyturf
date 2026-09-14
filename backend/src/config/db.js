import mongoose from "mongoose";

const connectDB = async ()=>{
    try{
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is not configured");
        }
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
        })
        console.log("MongoDB connected successfully")
    } catch (error) {
        console.error("Error connecting to MongoDB:", error)
        throw error;
    }
}
export default connectDB
