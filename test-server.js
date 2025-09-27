// Simple test to check if server can start
console.log('Testing server startup...');

try {
    require('dotenv').config();
    console.log('✅ dotenv loaded');
    
    const express = require('express');
    console.log('✅ express loaded');
    
    const cors = require('cors');
    console.log('✅ cors loaded');
    
    const Database = require('better-sqlite3');
    console.log('✅ better-sqlite3 loaded');
    
    const axios = require('axios');
    console.log('✅ axios loaded');
    
    const multer = require('multer');
    console.log('✅ multer loaded');
    
    const FormData = require('form-data');
    console.log('✅ form-data loaded');
    
    console.log('✅ All dependencies loaded successfully');
    
    // Try to create a simple Express app
    const app = express();
    app.get('/test', (req, res) => {
        res.json({ message: 'Server is working!' });
    });
    
    console.log('✅ Express app created successfully');
    console.log('🎉 Server test passed!');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
}
