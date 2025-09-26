const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Serve static files from the current directory
app.use(express.static('.'));

// Proxy endpoint for SMS verification API
app.get('/api', async (req, res) => {
    try {
        console.log('🔄 Proxying request to SMS API...');
        console.log('📡 Request URL:', req.url);
        console.log('📡 Query params:', req.query);
        
        // Extract query parameters
        const queryString = new URLSearchParams(req.query).toString();
        
        // Construct the full API URL
        const apiUrl = `https://sms-verification-number.com/stubs/handler_api?${queryString}`;
        
        console.log('📡 API URL:', apiUrl);
        
        // Make the request to the SMS API
        const response = await axios.get(apiUrl, {
            timeout: 10000,
            headers: {
                'User-Agent': 'SMS-Verification-Proxy/1.0'
            }
        });
        
        console.log('✅ API Response received:', response.status);
        console.log('📄 Response data:', response.data);
        
        // Set appropriate headers
        res.set({
            'Content-Type': response.headers['content-type'] || 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        
        // Send the response back to the client
        // Handle numeric responses properly to avoid Express treating them as status codes
        if (typeof response.data === 'number') {
            res.status(200).send(response.data.toString());
        } else if (typeof response.data === 'string' && !isNaN(response.data)) {
            // Handle string numbers like "1.68"
            res.status(200).send(response.data);
        } else {
            res.status(200).send(response.data);
        }
        
    } catch (error) {
        console.error('❌ Proxy Error:', error.message);
        console.error('❌ Error details:', error.response?.data);
        
        res.status(500).json({
            error: 'Proxy Error',
            message: error.message,
            details: error.response?.data || 'No additional details'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'SMS Verification Proxy is running',
        timestamp: new Date().toISOString()
    });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log('🚀 SMS Verification Proxy Server started');
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log('🔧 Proxy endpoint: http://localhost:' + PORT + '/api/');
    console.log('💡 Open your browser and go to: http://localhost:' + PORT);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Shutting down server...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Shutting down server...');
    process.exit(0);
});
