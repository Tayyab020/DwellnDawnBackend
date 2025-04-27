const mongoose = require('mongoose');
const {MONGODB_CONNECTION_STRING} = require('../config/index');

const dbConnect = async () => {
    try {
        // mongodb+srv://tayyab:crazy302@cluster0.h9okxii.mongodb.net/
        mongoose.set('strictQuery', false);
        const conn = await mongoose.connect("mongodb://localhost:27017/tailor");
        console.log(`Database connected to host: ${conn.connection.host}`);
        
    } catch (error) {
        console.log(`Error: ${error}`);
    }
}

module.exports = dbConnect;