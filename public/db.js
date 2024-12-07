import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

const DB_URI = process.env.DB_URI || 'mongodb://127.0.0.1:27017/your_database_name';

const checkMongoDBServer = async () => {
    try {
        const client = new MongoClient(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        await client.connect();
        console.log('MongoDB server is running and accessible');
        await client.close();
    } catch (error) {
        console.error('MongoDB server is not running or not accessible:', error.message);
    }
};

const connectDB = async () => {
    await checkMongoDBServer();
    try {
        await mongoose.connect(DB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        });
        console.log('Database connected successfully!');
    } catch (error) {
        console.error('Database connection failed:', error.message);
        console.error('Error details:', error);
        process.exit(1); // Exit process with failure
    }
};

export { connectDB };