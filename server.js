const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const multer = require('multer');
const cron = require('node-cron');

// Import services
const Database = require('./server/db/models');
const WalletService = require('./server/services/walletService');
const FXService = require('./server/services/fxService');
const PricingService = require('./server/services/pricingService');
const ThunderService = require('./server/services/thunderService');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services
let db, walletService, fxService, pricingService, thunderService;

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from the current directory
app.use(express.static('.'));

// Initialize database and services
async function initializeServices() {
    try {
        db = new Database();
        await db.init();
        
        walletService = new WalletService(db);
        fxService = new FXService(db);
        pricingService = new PricingService(db, fxService);
        thunderService = new ThunderService(db);
        
        console.log('✅ All services initialized successfully');
        
        // Schedule cache cleanup every hour
        cron.schedule('0 * * * *', async () => {
            await fxService.cleanCache();
            await pricingService.cleanCache();
        });
        
    } catch (error) {
        console.error('❌ Failed to initialize services:', error);
        process.exit(1);
    }
}

// Initialize services before starting server
initializeServices();

// Utility function to get session ID
function getSessionId(req) {
    return req.headers['x-session-id'] || req.ip || 'default';
}

// API Routes

// Wallet API
app.get('/api/wallet/balance', async (req, res) => {
    try {
        const sessionId = getSessionId(req);
        const balance = await walletService.getBalance(sessionId);
        res.json(balance);
    } catch (error) {
        console.error('❌ Wallet balance error:', error);
        res.status(500).json({ error: 'Failed to get balance' });
    }
});

app.get('/api/wallet/transactions', async (req, res) => {
    try {
        const sessionId = getSessionId(req);
        const limit = parseInt(req.query.limit) || 50;
        const transactions = await walletService.getTransactionHistory(sessionId, limit);
        res.json(transactions);
    } catch (error) {
        console.error('❌ Wallet transactions error:', error);
        res.status(500).json({ error: 'Failed to get transactions' });
    }
});

// Pricing API
app.get('/api/pricing/calculate', async (req, res) => {
    try {
        const { serviceId, countryCode, operatorCode } = req.query;
        
        if (!serviceId || !countryCode || !operatorCode) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        
        const pricing = await pricingService.calculatePrice(serviceId, countryCode, operatorCode);
        const summary = pricingService.getPricingSummary(pricing);
        res.json(summary);
    } catch (error) {
        console.error('❌ Pricing calculation error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/pricing/bulk', async (req, res) => {
    try {
        const { services, countryCode, operatorCode } = req.body;
        
        if (!services || !Array.isArray(services) || !countryCode || !operatorCode) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        
        const pricing = await pricingService.getBulkPricing(services, countryCode, operatorCode);
        res.json(pricing);
    } catch (error) {
        console.error('❌ Bulk pricing error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Top-up API
app.post('/api/topup/initiate', async (req, res) => {
    try {
        const { amountTHB, method } = req.body;
        const sessionId = getSessionId(req);
        
        if (!amountTHB || amountTHB <= 0 || !method) {
            return res.status(400).json({ error: 'Invalid top-up request' });
        }
        
        // Create top-up request
        const result = await db.run(`
            INSERT INTO topup_requests (user_id, amount_thb, method, status)
            SELECT id, ?, ?, 'pending' FROM users WHERE session_id = ?
        `, [amountTHB, method, sessionId]);
        
        res.json({ topupId: result.id });
    } catch (error) {
        console.error('❌ Top-up initiation error:', error);
        res.status(500).json({ error: 'Failed to initiate top-up' });
    }
});

app.post('/api/topup/verify/image', upload.single('file'), async (req, res) => {
    try {
        const { topupId, checkDuplicate = true } = req.body;
        const sessionId = getSessionId(req);
        
        if (!topupId || !req.file) {
            return res.status(400).json({ error: 'Missing topupId or file' });
        }
        
        // Verify slip with Thunder API
        const verification = await thunderService.verifyByImage(req.file.buffer, checkDuplicate === 'true');
        
        // Update top-up request
        await db.run(`
            UPDATE topup_requests 
            SET status = ?, thunder_response = ?, verification_data = ?, verified_at = ?
            WHERE id = ? AND user_id = (SELECT id FROM users WHERE session_id = ?)
        `, [
            verification.success ? 'verified' : 'failed',
            JSON.stringify(verification),
            JSON.stringify(verification.data || verification.error),
            verification.success ? new Date().toISOString() : null,
            topupId,
            sessionId
        ]);
        
        if (verification.success) {
            // Add credit to wallet
            const amount = thunderService.extractAmount(verification.data);
            if (amount && amount.amount > 0) {
                await walletService.addCredit(sessionId, amount.amount, topupId);
            }
        }
        
        res.json({
            topupId: parseInt(topupId),
            status: verification.success ? 'verified' : 'failed',
            reason: verification.success ? null : verification.error,
            amountTHB: verification.success ? thunderService.extractAmount(verification.data)?.amount : null
        });
        
    } catch (error) {
        console.error('❌ Top-up verification error:', error);
        res.status(500).json({ error: 'Failed to verify slip' });
    }
});

app.post('/api/topup/verify/payload', async (req, res) => {
    try {
        const { topupId, payload, checkDuplicate = true } = req.body;
        const sessionId = getSessionId(req);
        
        if (!topupId || !payload) {
            return res.status(400).json({ error: 'Missing topupId or payload' });
        }
        
        // Verify slip with Thunder API
        const verification = await thunderService.verifyByPayload(payload, checkDuplicate);
        
        // Update top-up request
        await db.run(`
            UPDATE topup_requests 
            SET status = ?, thunder_response = ?, verification_data = ?, verified_at = ?
            WHERE id = ? AND user_id = (SELECT id FROM users WHERE session_id = ?)
        `, [
            verification.success ? 'verified' : 'failed',
            JSON.stringify(verification),
            JSON.stringify(verification.data || verification.error),
            verification.success ? new Date().toISOString() : null,
            topupId,
            sessionId
        ]);
        
        if (verification.success) {
            // Add credit to wallet
            const amount = thunderService.extractAmount(verification.data);
            if (amount && amount.amount > 0) {
                await walletService.addCredit(sessionId, amount.amount, topupId);
            }
        }
        
        res.json({
            topupId: parseInt(topupId),
            status: verification.success ? 'verified' : 'failed',
            reason: verification.success ? null : verification.error,
            amountTHB: verification.success ? thunderService.extractAmount(verification.data)?.amount : null
        });
        
    } catch (error) {
        console.error('❌ Top-up verification error:', error);
        res.status(500).json({ error: 'Failed to verify slip' });
    }
});

app.get('/api/topup/status/:topupId', async (req, res) => {
    try {
        const { topupId } = req.params;
        const sessionId = getSessionId(req);
        
        const topup = await db.get(`
            SELECT id, amount_thb, method, status, reason, created_at, verified_at
            FROM topup_requests 
            WHERE id = ? AND user_id = (SELECT id FROM users WHERE session_id = ?)
        `, [topupId, sessionId]);
        
        if (!topup) {
            return res.status(404).json({ error: 'Top-up not found' });
        }
        
        res.json({
            topupId: topup.id,
            amountTHB: topup.amount_thb,
            method: topup.method,
            status: topup.status,
            reason: topup.reason,
            createdAt: topup.created_at,
            verifiedAt: topup.verified_at
        });
        
    } catch (error) {
        console.error('❌ Top-up status error:', error);
        res.status(500).json({ error: 'Failed to get top-up status' });
    }
});

// Purchase API
app.post('/api/purchase', async (req, res) => {
    try {
        const { serviceId, operatorCode, countryCode } = req.body;
        const sessionId = getSessionId(req);
        
        if (!serviceId || !operatorCode || !countryCode) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        
        // Calculate price
        const pricing = await pricingService.calculatePrice(serviceId, countryCode, operatorCode);
        
        // Check if user has sufficient credit
        const hasCredit = await walletService.hasSufficientCredit(sessionId, pricing.finalTHB);
        
        if (!hasCredit) {
            return res.status(400).json({ code: 'INSUFFICIENT_CREDIT' });
        }
        
        // Create order
        const orderResult = await db.run(`
            INSERT INTO orders (user_id, service_id, operator_code, country_code, final_price_thb, fx_rate, base_vendor_currency, base_vendor_amount, base_thb, markup_thb)
            SELECT id, ?, ?, ?, ?, ?, ?, ?, ?, ?
            FROM users WHERE session_id = ?
        `, [
            serviceId, operatorCode, countryCode, pricing.finalTHB, 
            pricing.fxRate, pricing.vendorCurrency, pricing.baseVendor, 
            pricing.baseTHB, pricing.markupTHB, sessionId
        ]);
        
        // Deduct credit
        const walletResult = await walletService.deductCredit(sessionId, pricing.finalTHB, orderResult.id);
        
        // Call SMS API to get number
        const smsApiUrl = process.env.SMS_API_URL || 'https://sms-verification-number.com/stubs/handler_api';
        const apiKey = process.env.SMS_API_KEY || '7ccb326980edc2bfec78dcd66326aad7';
        
        const smsResponse = await axios.get(smsApiUrl, {
            params: {
                api_key: apiKey,
                action: 'getNumber',
                service: serviceId,
                operator: operatorCode,
                country: countryCode,
                lang: 'en'
            },
            timeout: 15000
        });
        
        const smsResult = smsResponse.data;
        
        if (smsResult.includes('ACCESS_NUMBER:')) {
            const parts = smsResult.split(':');
            const activationId = parts[1];
            const phoneNumber = parts[2];
            
            // Update order with activation details
            await db.run(`
                UPDATE orders 
                SET activation_id = ?, phone_number = ?, status = 'active'
                WHERE id = ?
            `, [activationId, phoneNumber, orderResult.id]);
            
            res.json({
                orderId: orderResult.id,
                finalPriceTHB: pricing.finalTHB,
                balance: walletResult.newBalance,
                fxRate: pricing.fxRate,
                baseVendor: pricing.baseVendor,
                baseVendorCurrency: pricing.vendorCurrency,
                baseTHB: pricing.baseTHB,
                markupTHB: pricing.markupTHB,
                activationId: parseInt(activationId),
                phoneNumber: phoneNumber,
                createdAt: new Date().toISOString()
            });
        } else {
            // SMS API failed, refund credit
            await walletService.refundCredit(sessionId, pricing.finalTHB, orderResult.id);
            await db.run('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', orderResult.id]);
            
            res.status(400).json({ error: `SMS API error: ${smsResult}` });
        }
        
    } catch (error) {
        console.error('❌ Purchase error:', error);
        res.status(500).json({ error: error.message });
    }
});

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
        // Handle different response types properly
        if (typeof response.data === 'number') {
            res.status(200).send(response.data.toString());
        } else if (typeof response.data === 'string' && !isNaN(response.data)) {
            // Handle string numbers like "1.68"
            res.status(200).send(response.data);
        } else if (typeof response.data === 'object') {
            // Handle JSON objects
            res.status(200).json(response.data);
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
    console.log('🚀 SMS Verification Business Server เริ่มทำงานแล้ว');
    console.log(`📡 เซิร์ฟเวอร์ทำงานที่ http://localhost:${PORT}`);
    console.log('🔧 API Endpoints:');
    console.log('   - Wallet: /api/wallet/*');
    console.log('   - Pricing: /api/pricing/*');
    console.log('   - Top-up: /api/topup/*');
    console.log('   - Purchase: /api/purchase');
    console.log('   - SMS Proxy: /api');
    console.log('💡 เปิดเบราว์เซอร์และไปที่: http://localhost:' + PORT);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 กำลังปิดเซิร์ฟเวอร์...');
    if (db) {
        db.close();
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 กำลังปิดเซิร์ฟเวอร์...');
    if (db) {
        db.close();
    }
    process.exit(0);
});
