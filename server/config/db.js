/**
 * Database Configuration
 * Establishes MongoDB connection using Mongoose ORM
 */

import mongoose from "mongoose";

/**
 * Initializes MongoDB connection
 * Exits process with code 1 if connection fails
 * @throws {Error} If MongoDB connection fails
 */
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
    } catch {
        process.exit(1);
    }
};

export default connectDB;
