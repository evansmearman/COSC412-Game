import mongoose from 'mongoose';

const DB_URI = process.env.DB_URI || 'mongodb://localhost:27017/your_database_name';

const connectDB = async () => {
    try {
        await mongoose.connect(DB_URI);
        console.log('Database connected successfully!');
    } catch (error) {
        console.error('Database connection failed:', error.message);
        process.exit(1); // Exit process with failure
    }
};

export { connectDB };