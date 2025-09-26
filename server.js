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
        console.log('🔄 กำลังส่งคำขอไปยัง SMS API...');
        console.log('📡 URL คำขอ:', req.url);
        console.log('📡 พารามิเตอร์:', req.query);
        
        // Extract query parameters
        const queryString = new URLSearchParams(req.query).toString();
        
        // Construct the full API URL
        const apiUrl = `https://sms-verification-number.com/stubs/handler_api?${queryString}`;
        
        console.log('📡 URL API:', apiUrl);
        
        // Make the request to the SMS API with retry mechanism
        const response = await axios.get(apiUrl, {
            timeout: 15000, // Increased timeout
            headers: {
                'User-Agent': 'SMS-Verification-Proxy/1.0',
                'Accept': 'application/json, text/plain, */*',
                'Cache-Control': 'no-cache'
            },
            maxRedirects: 5,
            validateStatus: function (status) {
                return status >= 200 && status < 300; // Only resolve for 2xx status codes
            }
        });
        
        console.log('✅ ได้รับการตอบสนองจาก API:', response.status);
        console.log('📄 ข้อมูลการตอบสนอง:', response.data);
        
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
        console.error('❌ ข้อผิดพลาด Proxy:', error.message);
        console.error('❌ รายละเอียดข้อผิดพลาด:', error.response?.data);
        
        // Handle different types of errors
        let statusCode = 500;
        let errorMessage = 'ข้อผิดพลาด Proxy';
        
        if (error.code === 'ECONNABORTED') {
            statusCode = 408;
            errorMessage = 'หมดเวลารอ - เซิร์ฟเวอร์ API ช้า';
        } else if (error.code === 'ENOTFOUND') {
            statusCode = 503;
            errorMessage = 'ไม่พบเซิร์ฟเวอร์ API';
        } else if (error.response) {
            statusCode = error.response.status;
            errorMessage = `ข้อผิดพลาด API: ${error.response.statusText}`;
        }
        
        res.status(statusCode).json({
            error: errorMessage,
            message: error.message,
            details: error.response?.data || 'ไม่มีรายละเอียดเพิ่มเติม',
            timestamp: new Date().toISOString()
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'SMS Verification Proxy กำลังทำงาน',
        timestamp: new Date().toISOString()
    });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log('🚀 SMS Verification Proxy Server เริ่มทำงานแล้ว');
    console.log(`📡 เซิร์ฟเวอร์ทำงานที่ http://localhost:${PORT}`);
    console.log('🔧 Proxy endpoint: http://localhost:' + PORT + '/api/');
    console.log('💡 เปิดเบราว์เซอร์และไปที่: http://localhost:' + PORT);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 กำลังปิดเซิร์ฟเวอร์...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 กำลังปิดเซิร์ฟเวอร์...');
    process.exit(0);
});
