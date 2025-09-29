const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const multer = require('multer');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

// Import services
const Database = require('./server/db/models');
const DatabaseMigrations = require('./server/db/migrations');
const WalletService = require('./server/services/walletService');
const FXService = require('./server/services/fxService');
const PricingService = require('./server/services/pricingService');
const ThunderService = require('./server/services/thunderService');
const MockThunderService = require('./server/services/mockThunderService');
const SMSVerificationService = require('./server/services/smsVerificationService');
const AuthService = require('./server/services/authService');
const AuthMiddleware = require('./server/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services
let db, walletService, fxService, pricingService, thunderService, smsVerificationService, authService, authMiddleware;

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

// Rate limiting removed - no longer limiting login attempts

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'TOO_MANY_REQUESTS',
        message: 'คำขอมากเกินไป กรุณารอสักครู่'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(express.static('.'));

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize services function
async function initializeServices() {
    try {
        console.log('🔄 Initializing services...');
        
        // Initialize database
        db = new Database();
        await db.init();
        
        // Run database migrations
        const migrations = new DatabaseMigrations(db);
        const needsMigration = !(await migrations.checkMigrationStatus());
        
        if (needsMigration) {
            console.log('🔄 Running database migrations...');
            await migrations.migrateToAuthSystem();
        } else {
            console.log('✅ Database is up to date');
        }
        
        walletService = new WalletService(db);
        fxService = new FXService(db);
        pricingService = new PricingService(db, fxService);
        smsVerificationService = new SMSVerificationService(db);
        
        // Initialize Thunder Service with API status check
        try {
            thunderService = new ThunderService(db);
            
            // Test Thunder API status
            const axios = require('axios');
            const testResponse = await axios.get('https://api.thunder.in.th/v1/me', {
                headers: {
                    'Authorization': 'Bearer cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23'
                },
                timeout: 5000
            });
            
            console.log('✅ Thunder Service initialized and API is accessible');
        } catch (error) {
            console.log('⚠️ Thunder API unavailable, using Mock Service');
            console.log('   Reason:', error.response?.status, error.response?.data?.message || error.message);
            thunderService = new MockThunderService(db);
        }
        
        authService = new AuthService(db);
        authMiddleware = new AuthMiddleware(db);
        
        console.log('✅ All services initialized successfully');
        
        // Schedule cache cleanup every hour
        cron.schedule('0 * * * *', async () => {
            await fxService.cleanCache();
            await pricingService.cleanCache();
            await authService.cleanExpiredSessions();
            await authService.cleanOldLoginAttempts();
        });
        
        // Setup routes after services are initialized
        setupRoutes();
        
    } catch (error) {
        console.error('❌ Failed to initialize services:', error);
        process.exit(1);
    }
}

// Setup all routes after services are initialized
function setupRoutes() {
    // Authentication endpoints
    app.post('/api/auth/register', async (req, res) => {
        try {
            const { email, password } = req.body;
            
            if (!email || !password) {
                return res.status(400).json({ 
                    error: 'VALIDATION_ERROR',
                    message: 'กรุณากรอกอีเมลและรหัสผ่าน' 
                });
            }

            const result = await authService.register(email, password);
            
            if (!result.success) {
                return res.status(400).json({ 
                    error: result.error,
                    message: result.message 
                });
            }

            res.json({
                user: result.user,
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
                message: 'สมัครสมาชิกสำเร็จ — ยินดีต้อนรับ!'
            });
        } catch (error) {
            console.error('❌ Registration error:', error);
            res.status(500).json({ 
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดภายในระบบ' 
            });
        }
    });

    app.post('/api/auth/login', async (req, res) => {
        try {
            const { email, password } = req.body;
            
            if (!email || !password) {
                return res.status(400).json({ 
                    error: 'VALIDATION_ERROR',
                    message: 'กรุณากรอกอีเมลและรหัสผ่าน' 
                });
            }

            const result = await authService.login(email, password, req.ip);
            
            if (!result.success) {
                return res.status(401).json({ 
                    error: result.error,
                    message: result.error === 'INVALID_CREDENTIALS' ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' :
                            result.error === 'USER_BLOCKED' ? 'บัญชีนี้ถูกระงับการใช้งานชั่วคราว' :
                            result.error === 'ACCOUNT_LOCKED' ? 'บัญชีถูกล็อกชั่วคราว กรุณารอ 15 นาที' : 'เกิดข้อผิดพลาด'
                });
            }

            // Set refresh token as httpOnly cookie
            res.cookie('refreshToken', result.session.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.json({
                user: result.user,
                accessToken: result.session.accessToken
            });

        } catch (error) {
            console.error('❌ Login error:', error);
            res.status(500).json({ 
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดภายในระบบ'
            });
        }
    });

    app.post('/api/auth/logout', async (req, res) => {
        try {
            const refreshToken = req.cookies.refreshToken;
            
            if (refreshToken) {
                await authService.logout(refreshToken);
            }

            // Clear refresh token cookie
            res.clearCookie('refreshToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });

            res.json({ message: 'ออกจากระบบสำเร็จ' });

        } catch (error) {
            console.error('❌ Logout error:', error);
            res.status(500).json({ 
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดภายในระบบ'
            });
        }
    });

    app.post('/api/auth/refresh', async (req, res) => {
        try {
            const refreshToken = req.cookies.refreshToken;
            
            if (!refreshToken) {
                return res.status(401).json({ 
                    error: 'MISSING_REFRESH_TOKEN',
                    message: 'ไม่พบ refresh token'
                });
            }

            const result = await authService.refreshToken(refreshToken);
            
            if (!result.success) {
                return res.status(401).json({ 
                    error: result.error,
                    message: 'Refresh token ไม่ถูกต้องหรือหมดอายุ'
                });
            }

            res.json({
                accessToken: result.accessToken
            });

        } catch (error) {
            console.error('❌ Token refresh error:', error);
            res.status(500).json({ 
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดภายในระบบ'
            });
        }
    });

    app.get('/api/auth/me', async (req, res) => {
        try {
            // Try to get token from Authorization header
            const authHeader = req.headers.authorization;
            const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
            
            if (!token) {
                return res.status(401).json({ 
                    error: 'UNAUTHENTICATED',
                    message: 'ไม่พบการเข้าสู่ระบบ'
                });
            }

            // Verify token manually to avoid double response
            try {
                const authService = authMiddleware.getAuthService();
                const decoded = authService.verifyAccessToken(token);
                
                if (!decoded) {
                    return res.status(401).json({ 
                        error: 'INVALID_TOKEN',
                        message: 'โทเคนไม่ถูกต้องหรือหมดอายุ'
                    });
                }

                // Get user data
                const userResult = await authService.getUserById(decoded.userId);
                if (!userResult.success) {
                    return res.status(401).json({ 
                        error: 'USER_NOT_FOUND',
                        message: 'ไม่พบผู้ใช้'
                    });
                }

                // Check if user is blocked
                if (userResult.user.status === 'blocked') {
                    return res.status(403).json({ 
                        error: 'USER_BLOCKED',
                        message: 'บัญชีนี้ถูกระงับการใช้งานชั่วคราว'
                    });
                }

                return res.json({ user: userResult.user });

            } catch (tokenError) {
                return res.status(401).json({ 
                    error: 'INVALID_TOKEN',
                    message: 'โทเคนไม่ถูกต้องหรือหมดอายุ'
                });
            }
            
        } catch (error) {
            console.error('❌ Get user error:', error);
            return res.status(500).json({ 
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดภายในระบบ'
            });
        }
    });

    // Wallet endpoints (require authentication)
    app.get('/api/wallet/balance', authMiddleware.verifyToken, async (req, res) => {
        try {
            const balance = await walletService.getBalance(req.user.id);
            res.json({ balance });
        } catch (error) {
            console.error('❌ Get balance error:', error);
            res.status(500).json({ 
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดภายในระบบ'
            });
        }
    });

    app.get('/api/wallet/transactions', authMiddleware.verifyToken, async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 20;
            const transactions = await walletService.getTransactionHistory(req.user.id, limit);
            res.json({ transactions });
        } catch (error) {
            console.error('❌ Get transactions error:', error);
            res.status(500).json({ 
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดภายในระบบ'
            });
        }
    });

    // Top-up endpoints (require authentication)
    app.post('/api/topup/initiate', authMiddleware.verifyToken, async (req, res) => {
        try {
            const { amount } = req.body;
            
            if (!amount || amount <= 0) {
                return res.status(400).json({ 
                    error: 'VALIDATION_ERROR',
                    message: 'จำนวนเงินไม่ถูกต้อง' 
                });
            }

            const result = await thunderService.initiateTopup(req.user.id, amount);
            
            if (!result.success) {
                return res.status(400).json({ 
                    error: result.error,
                    message: result.message 
                });
            }

            res.json({
                topupId: result.topupId,
                qrCode: result.qrCode,
                amount: result.amount,
                message: 'กรุณาชำระเงินตาม QR Code'
            });
        } catch (error) {
            console.error('❌ Top-up initiate error:', error);
            res.status(500).json({ 
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดภายในระบบ'
            });
        }
    });

    app.post('/api/topup/verify/image', authMiddleware.verifyToken, upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ 
                    error: 'VALIDATION_ERROR',
                    message: 'กรุณาอัปโหลดไฟล์สลิป' 
                });
            }

            // No expected amount needed - use amount from slip
            const result = await thunderService.verifyTopupByImage(req.user.id, req.file);
            
            if (!result.success) {
                return res.status(400).json({ 
                    error: result.error,
                    message: result.message 
                });
            }

            res.json({
                success: result.success,
                message: result.message,
                amount: result.amount,
                newBalance: result.newBalance
            });
        } catch (error) {
            console.error('❌ Top-up verify image error:', error);
            res.status(500).json({ 
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดภายในระบบ'
            });
        }
    });

    app.post('/api/topup/verify/payload', authMiddleware.verifyToken, async (req, res) => {
        try {
            const { topupId, payload } = req.body;
            
            if (!topupId || !payload) {
                return res.status(400).json({ 
                    error: 'VALIDATION_ERROR',
                    message: 'ข้อมูลไม่ครบถ้วน' 
                });
            }

            const result = await thunderService.verifyTopupByPayload(req.user.id, topupId, payload);
            
            if (!result.success) {
                return res.status(400).json({ 
                    error: result.error,
                    message: result.message 
                });
            }

            res.json({
                success: result.success,
                message: result.message,
                amount: result.amount
            });
        } catch (error) {
            console.error('❌ Top-up verify payload error:', error);
            res.status(500).json({ 
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดภายในระบบ'
            });
        }
    });

    app.get('/api/topup/status/:topupId', authMiddleware.verifyToken, async (req, res) => {
        try {
            const { topupId } = req.params;
            const result = await thunderService.getTopupStatus(req.user.id, topupId);
            
            if (!result.success) {
                return res.status(404).json({ 
                    error: result.error,
                    message: result.message 
                });
            }

            res.json({
                status: result.status,
                amount: result.amount,
                message: result.message
            });
        } catch (error) {
            console.error('❌ Get top-up status error:', error);
            res.status(500).json({ 
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดภายในระบบ'
            });
        }
    });

    // Purchase endpoint (require authentication)
    app.post('/api/purchase', authMiddleware.verifyToken, async (req, res) => {
        try {
            console.log('🛒 Purchase request:', req.body);
            console.log('👤 User:', req.user);
            
            const { serviceId, countryCode, operatorCode } = req.body;
            
            if (!serviceId || !countryCode || !operatorCode) {
                console.log('❌ Missing required fields');
                return res.status(400).json({ 
                    error: 'VALIDATION_ERROR',
                    message: 'ข้อมูลไม่ครบถ้วน' 
                });
            }

            console.log('💰 Getting pricing for service:', serviceId, countryCode, operatorCode);
            // Get pricing
            const pricing = await pricingService.getPricing(serviceId, countryCode, operatorCode);
            console.log('💰 Pricing result:', pricing);
            
            if (!pricing.success) {
                console.log('❌ Pricing failed:', pricing.error);
                return res.status(400).json({ 
                    error: pricing.error,
                    message: pricing.message 
                });
            }

            console.log('💳 Checking credit for user:', req.user.id, 'amount:', pricing.finalTHB);
            // Check if user has sufficient credit
            const hasCredit = await walletService.hasSufficientCredit(req.user.id, pricing.finalTHB);
            console.log('💳 Credit check result:', hasCredit);
            
            if (!hasCredit) {
                console.log('❌ Insufficient credit');
                return res.status(400).json({ 
                    error: 'INSUFFICIENT_CREDIT',
                    message: 'เครดิตไม่เพียงพอ — โปรดเติมเงิน' 
                });
            }

            console.log('💸 Deducting credit...');
            // Deduct credit
            const deductResult = await walletService.deductCredit(req.user.id, pricing.finalTHB, `SMS-${serviceId}-${countryCode}-${operatorCode}`);
            console.log('💸 Deduct result:', deductResult);
            
            if (!deductResult || !deductResult.transactionId) {
                console.log('❌ Credit deduction failed:', deductResult?.error || 'Unknown error');
                return res.status(400).json({ 
                    error: deductResult?.error || 'CREDIT_DEDUCTION_FAILED',
                    message: deductResult?.message || 'ไม่สามารถหักเงินได้'
                });
            }

            console.log('📝 Creating order...');
            // Create order
            const orderResult = await db.run(`
                INSERT INTO orders (user_id, service_id, country_code, operator_code, base_vendor_amount, fx_rate, base_thb, markup_thb, final_price_thb, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
            `, [req.user.id, serviceId, countryCode, operatorCode, pricing.baseVendor, pricing.fxRate, pricing.baseTHB, pricing.markupTHB, pricing.finalTHB]);

            console.log('📝 Order result object:', JSON.stringify(orderResult, null, 2));
            const orderId = orderResult.lastInsertRowid;
            console.log('📝 Order created:', orderId);
            console.log('📝 Order result type:', typeof orderResult);
            console.log('📝 Order result keys:', Object.keys(orderResult));

            // Validate orderId
            if (!orderId) {
                console.error('❌ Failed to create order - orderId is null/undefined');
                // Refund credit
                await walletService.addCredit(req.user.id, pricing.finalTHB, 'refund', `Refund for failed order creation`);
                
                return res.status(500).json({
                    error: 'ORDER_CREATION_FAILED',
                    message: 'ไม่สามารถสร้างคำสั่งซื้อได้ กรุณาลองใหม่'
                });
            }

            console.log('💰 Getting current services and costs from SMS API...');
            // Get current services and costs first
            const servicesResult = await smsVerificationService.getServicesAndCost(countryCode, operatorCode, serviceId);
            console.log('💰 Current services:', servicesResult);
            
            if (!servicesResult.success) {
                console.log('❌ Failed to get current services:', servicesResult.error);
                // Refund credit
                await walletService.addCredit(req.user.id, pricing.finalTHB, 'refund', `Refund for failed service check ${orderId}`);
                
                // Update order status
                await db.run(`
                    UPDATE orders SET status = 'cancelled'
                    WHERE id = ?
                `, [orderId]);

                return res.status(400).json({
                    error: 'SERVICE_CHECK_FAILED',
                    message: servicesResult.message
                });
            }

            // Check if no services are available
            if (servicesResult.services === 'NO_SERVICES' || !servicesResult.services || servicesResult.services.length === 0) {
                console.log('❌ No services available in this country');
                // Refund credit
                await walletService.addCredit(req.user.id, pricing.finalTHB, 'refund', `Refund for no services ${orderId}`);
                
                // Update order status
                await db.run(`
                    UPDATE orders SET status = 'cancelled'
                    WHERE id = ?
                `, [orderId]);

                return res.status(400).json({
                    error: 'NO_SERVICES',
                    message: 'ไม่มีบริการใดๆ ที่พร้อมใช้งานในประเทศนี้',
                    suggestions: [
                        'เปลี่ยนประเทศ',
                        'ลองใหม่ภายหลัง',
                        'ติดต่อเจ้าหน้าที่'
                    ]
                });
            }

            // Check if service is available and get current price
            const currentService = findServiceInResponse(servicesResult.services, serviceId);
            if (!currentService) {
                console.log('❌ Service not found in current services');
                // Refund credit
                await walletService.addCredit(req.user.id, pricing.finalTHB, 'refund', `Refund for service not found ${orderId}`);
                
                // Update order status
                await db.run(`
                    UPDATE orders SET status = 'cancelled'
                    WHERE id = ?
                `, [orderId]);

                return res.status(400).json({
                    error: 'SERVICE_NOT_FOUND',
                    message: `ไม่พบบริการ ${serviceId} ในระบบ`,
                    suggestions: [
                        'ลองเลือกบริการอื่น',
                        'รีเฟรชหน้าจอ',
                        'ติดต่อเจ้าหน้าที่'
                    ]
                });
            }

            // Check if service has available numbers
            if (currentService.quantity === 0 || currentService.quantity === '0') {
                console.log('❌ No numbers available for service:', currentService);
                // Refund credit
                await walletService.addCredit(req.user.id, pricing.finalTHB, 'refund', `Refund for no numbers ${orderId}`);
                
                // Update order status
                await db.run(`
                    UPDATE orders SET status = 'cancelled'
                    WHERE id = ?
                `, [orderId]);

                return res.status(400).json({
                    error: 'NO_NUMBERS',
                    message: `ไม่มีหมายเลขว่างสำหรับบริการ ${serviceId} ในประเทศ/ผู้ให้บริการที่เลือก`,
                    suggestions: [
                        'ลองเลือกประเทศอื่น',
                        'ลองเลือกผู้ให้บริการอื่น', 
                        'รอสักครู่แล้วลองใหม่'
                    ]
                });
            }

            // Check if price has changed significantly (more than 10%)
            const currentPrice = parseFloat(currentService.price);
            if (currentPrice && Math.abs(currentPrice - pricing.baseVendor) / pricing.baseVendor > 0.1) {
                console.log('⚠️ Price has changed significantly:', {
                    old: pricing.baseVendor,
                    new: currentPrice,
                    change: ((currentPrice - pricing.baseVendor) / pricing.baseVendor * 100).toFixed(1) + '%'
                });
                
                // Refund credit
                await walletService.addCredit(req.user.id, pricing.finalTHB, 'refund', `Refund for price change ${orderId}`);
                
                // Update order status
                await db.run(`
                    UPDATE orders SET status = 'cancelled'
                    WHERE id = ?
                `, [orderId]);

                return res.status(400).json({
                    error: 'PRICE_CHANGED',
                    message: `ราคาเปลี่ยนแปลง ${((currentPrice - pricing.baseVendor) / pricing.baseVendor * 100).toFixed(1)}% กรุณาลองใหม่`,
                    oldPrice: pricing.finalTHB,
                    newPrice: currentPrice * pricing.fxRate + pricing.markupTHB
                });
            }

            console.log('✅ Service is available with current price:', {
                service: currentService.id,
                name: currentService.name,
                price: currentService.price,
                quantity: currentService.quantity
            });

            console.log('📱 Calling SMS Verification API...');
            // Call SMS Verification API with correct parameters
            const smsResult = await smsVerificationService.getNumber(serviceId, operatorCode, countryCode);
            console.log('📱 SMS API result:', smsResult);
            
            if (smsResult.success) {
                console.log('✅ SMS API success, updating order...');
                // Update order status
                await db.run(`
                    UPDATE orders SET status = 'active'
                    WHERE id = ?
                `, [orderId]);

                // Update order with phone number
                await db.run(`
                    UPDATE orders SET phone_number = ?
                    WHERE id = ?
                `, [smsResult.phoneNumber, orderId]);

                // Create activation record
                console.log('📱 Creating activation record with orderId:', orderId, 'thunderOrderId:', smsResult.activationId);
                
                const activationResult = await db.run(`
                    INSERT INTO activations (user_id, order_id, service_id, country_code, operator_code, phone_number, status, thunder_order_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP)
                `, [req.user.id, orderId, serviceId, countryCode, operatorCode, smsResult.phoneNumber, smsResult.activationId]);

                const activationId = activationResult.lastInsertRowid;
                console.log('✅ Activation created:', activationId);

                // Validate activationId
                if (!activationId) {
                    console.error('❌ Failed to create activation - activationId is null/undefined');
                    // Update order status to failed
                    await db.run(`
                        UPDATE orders SET status = 'failed'
                        WHERE id = ?
                    `, [orderId]);
                    
                    // Refund credit
                    await walletService.addCredit(req.user.id, pricing.finalTHB, 'refund', `Refund for failed activation creation ${orderId}`);
                    
                    return res.status(500).json({
                        error: 'ACTIVATION_CREATION_FAILED',
                        message: 'ไม่สามารถสร้างการใช้งานได้ กรุณาลองใหม่'
                    });
                }

                // Get updated balance
                const balance = await walletService.getBalance(req.user.id);
                console.log('💰 Final balance:', balance);

                res.json({
                    success: true,
                    orderId: orderId,
                    activationId: activationId,
                    phoneNumber: smsResult.phoneNumber,
                    finalPriceTHB: pricing.finalTHB,
                    balance: balance.balance,
                    createdAt: new Date().toISOString(),
                    message: 'ซื้อบริการสำเร็จ'
                });
            } else {
                console.log('❌ SMS API failed, refunding credit...');
                // Refund credit on failure
                await walletService.refundCredit(req.user.id, pricing.finalTHB, 'refund', `REFUND-${orderId}`);
                
                // Update order status
                await db.run(`
                    UPDATE orders SET status = 'cancelled'
                    WHERE id = ?
                `, [orderId]);

                res.status(400).json({ 
                    error: 'PURCHASE_FAILED',
                    message: smsResult.message 
                });
            }
        } catch (error) {
            console.error('❌ Purchase error:', error);
            console.error('❌ Error stack:', error.stack);
            res.status(500).json({ 
                error: 'INTERNAL_ERROR',
                message: `เกิดข้อผิดพลาดภายในระบบ: ${error.message}`
            });
        }
    });

    // Helper function to extract price from SMS API response
    function extractPriceFromResponse(pricesData, serviceId) {
        try {
            // Parse the prices data structure
            // Format: {"Country_Code":{"Service_Code":{"cost":Cost,"count":Quantity}}}
            if (typeof pricesData === 'object' && pricesData !== null) {
                for (const countryCode in pricesData) {
                    const countryData = pricesData[countryCode];
                    if (typeof countryData === 'object' && countryData !== null) {
                        for (const serviceCode in countryData) {
                            if (serviceCode === serviceId) {
                                const serviceData = countryData[serviceCode];
                                if (serviceData && typeof serviceData.cost === 'number') {
                                    return serviceData.cost;
                                }
                            }
                        }
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('❌ Error extracting price from response:', error);
            return null;
        }
    }

    // Helper function to find service in getServicesAndCost response
    function findServiceInResponse(servicesData, serviceId) {
        try {
            // Parse the services data structure
            // Format: [{"id":"vk","name":"Вконтакте","price":29.88,"quantity":"19"}]
            if (Array.isArray(servicesData)) {
                return servicesData.find(service => service.id === serviceId);
            }
            return null;
        } catch (error) {
            console.error('❌ Error finding service in response:', error);
            return null;
        }
    }

    // Get activation status from SMS API
    app.get('/api/activation/:id/status', authMiddleware.verifyToken, async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            // Get activation from database
            const activation = await db.get(`
                SELECT a.*, a.thunder_order_id, o.created_at as order_created_at
                FROM activations a 
                LEFT JOIN orders o ON a.order_id = o.id
                WHERE a.id = ? AND a.user_id = ?
            `, [id, userId]);

            if (!activation) {
                return res.status(404).json({
                    error: 'ACTIVATION_NOT_FOUND',
                    message: 'ไม่พบการใช้งาน'
                });
            }

            // Check if activation has expired (20 minutes from activation creation - when number was received)
            const activationTime = new Date(activation.created_at).getTime();
            const now = new Date().getTime();
            const timeLimit = 20 * 60 * 1000; // 20 minutes in milliseconds
            
            if (now - activationTime > timeLimit) {
                // Activation expired, cancel it
                await db.run(`
                    UPDATE activations SET status = 'expired'
                    WHERE id = ?
                `, [id]);
                
                await db.run(`
                    UPDATE orders SET status = 'expired'
                    WHERE id = ?
                `, [activation.order_id]);

                return res.json({
                    success: true,
                    status: 'expired',
                    message: 'หมายเลขหมดเวลาแล้ว (20 นาทีหลังได้รับหมายเลข)',
                    expired: true
                });
            }

            // Check status with SMS API
            const statusResult = await smsVerificationService.getStatus(activation.thunder_order_id);
            
            if (statusResult.success) {
                // Update local status
                await db.run(`
                    UPDATE activations SET status = ?
                    WHERE id = ?
                `, [statusResult.status, id]);

                res.json({
                    success: true,
                    status: statusResult.status,
                    message: statusResult.message,
                    smsCode: statusResult.smsCode
                });
            } else {
                res.status(400).json({
                    error: statusResult.error,
                    message: statusResult.message
                });
            }
        } catch (error) {
            console.error('❌ Get activation status error:', error);
            res.status(500).json({
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ'
            });
        }
    });

    // Request another SMS (status code 3)
    app.post('/api/activation/:id/request-sms', authMiddleware.verifyToken, async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            // Get activation from database
            const activation = await db.get(`
                SELECT a.*, a.thunder_order_id 
                FROM activations a 
                WHERE a.id = ? AND a.user_id = ?
            `, [id, userId]);

            if (!activation) {
                return res.status(404).json({
                    error: 'ACTIVATION_NOT_FOUND',
                    message: 'ไม่พบการใช้งาน'
                });
            }

            // Request another SMS with SMS API (status code 3)
            const requestResult = await smsVerificationService.setStatus(activation.thunder_order_id, 3);
            
            if (requestResult.success) {
                // Update local status to waiting
                await db.run(`
                    UPDATE activations SET status = 'waiting', updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [id]);

                res.json({
                    success: true,
                    message: 'ขอ SMS อีกสำเร็จ'
                });
            } else {
                res.status(400).json({
                    error: requestResult.error,
                    message: requestResult.message
                });
            }
        } catch (error) {
            console.error('❌ Request SMS error:', error);
            res.status(500).json({
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดในการขอ SMS อีก'
            });
        }
    });

    // Cancel activation
    app.post('/api/activation/:id/cancel', authMiddleware.verifyToken, async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            // Get activation from database
            const activation = await db.get(`
                SELECT a.*, a.thunder_order_id 
                FROM activations a 
                WHERE a.id = ? AND a.user_id = ?
            `, [id, userId]);

            if (!activation) {
                return res.status(404).json({
                    error: 'ACTIVATION_NOT_FOUND',
                    message: 'ไม่พบการใช้งาน'
                });
            }

            // Cancel with SMS API
            const cancelResult = await smsVerificationService.setStatus(activation.thunder_order_id, 8);
            
            if (cancelResult.success) {
                // Update local status
                await db.run(`
                    UPDATE activations SET status = 'cancelled'
                    WHERE id = ?
                `, [id]);

                res.json({
                    success: true,
                    message: 'ยกเลิกการใช้งานเรียบร้อย'
                });
            } else {
                res.status(400).json({
                    error: cancelResult.error,
                    message: cancelResult.message
                });
            }
        } catch (error) {
            console.error('❌ Cancel activation error:', error);
            res.status(500).json({
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดในการยกเลิก'
            });
        }
    });

    // Activation status endpoint
    app.get('/api/activations/:activationId/status', authMiddleware.verifyToken, async (req, res) => {
        try {
            const { activationId } = req.params;
            
            const activation = await db.get(`
                SELECT a.*, o.status as order_status
                FROM activations a
                LEFT JOIN orders o ON a.order_id = o.id
                WHERE a.id = ? AND a.user_id = ?
            `, [activationId, req.user.id]);
            
            if (!activation) {
                return res.status(404).json({ 
                    error: 'ACTIVATION_NOT_FOUND',
                    message: 'ไม่พบการใช้งาน' 
                });
            }
            
            res.json({
                status: activation.status,
                smsCode: activation.received_sms || null,
                phoneNumber: activation.phone_number,
                createdAt: activation.created_at
            });
        } catch (error) {
            console.error('❌ Get activation status error:', error);
            res.status(500).json({ 
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดภายในระบบ'
            });
        }
    });

    // Cancel activation endpoint
    app.post('/api/activations/:activationId/cancel', authMiddleware.verifyToken, async (req, res) => {
        try {
            const { activationId } = req.params;
            
            const activation = await db.get(`
                SELECT a.*, o.final_thb
                FROM activations a
                LEFT JOIN orders o ON a.order_id = o.id
                WHERE a.id = ? AND a.user_id = ?
            `, [activationId, req.user.id]);
            
            if (!activation) {
                return res.status(404).json({ 
                    error: 'ACTIVATION_NOT_FOUND',
                    message: 'ไม่พบการใช้งาน' 
                });
            }
            
            if (activation.status === 'cancelled') {
                return res.status(400).json({ 
                    error: 'ALREADY_CANCELLED',
                    message: 'การใช้งานถูกยกเลิกไปแล้ว' 
                });
            }
            
            // Update activation status
            await db.run(`
                UPDATE activations SET status = 'cancelled'
                WHERE id = ?
            `, [activationId]);
            
            // Update order status
            await db.run(`
                UPDATE orders SET status = 'cancelled'
                WHERE id = ?
            `, [activation.order_id]);
            
            // Refund credit if applicable
            if (activation.final_thb > 0) {
                await walletService.refundCredit(req.user.id, activation.final_thb, 'refund', `CANCEL-${activationId}`);
            }
            
            res.json({
                success: true,
                message: 'ยกเลิกการใช้งานสำเร็จ'
            });
        } catch (error) {
            console.error('❌ Cancel activation error:', error);
            res.status(500).json({ 
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดภายในระบบ'
            });
        }
    });

    // Get user's activations endpoint
    app.get('/api/activations', authMiddleware.verifyToken, async (req, res) => {
        try {
            const activations = await db.all(`
                SELECT 
                    a.id as activationId,
                    a.order_id as orderId,
                    a.service_id as serviceId,
                    a.country_code as countryCode,
                    a.operator_code as operatorCode,
                    a.phone_number as phoneNumber,
                    a.received_sms as receivedSms,
                    a.status,
                    a.thunder_order_id as thunderOrderId,
                    a.created_at as createdAt,
                    a.updated_at as updatedAt,
                    o.final_price_thb as finalPriceTHB,
                    COALESCE(s.name, a.service_id) as serviceName
                FROM activations a
                LEFT JOIN orders o ON a.order_id = o.id
                LEFT JOIN services s ON a.service_id = s.id
                WHERE a.user_id = ?
                ORDER BY a.created_at DESC
            `, [req.user.id]);
            
            res.json({ activations });
        } catch (error) {
            console.error('❌ Get activations error:', error);
            res.status(500).json({ 
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดภายในระบบ'
            });
        }
    });

    // Public endpoints (no authentication required)
    app.get('/api/services', generalLimiter, async (req, res) => {
        try {
            const services = await db.all(`
                SELECT id, name, description, base_vendor, markup_thb
                FROM services 
                WHERE status = 'active'
                ORDER BY name
            `);
            res.json({ services });
        } catch (error) {
            console.error('❌ Get services error:', error);
            res.status(500).json({ 
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดภายในระบบ'
            });
        }
    });

    app.get('/api/countries', generalLimiter, async (req, res) => {
        try {
            const countries = await db.all(`
                SELECT DISTINCT country_code, country_name
                FROM operators 
                WHERE status = 'active'
                ORDER BY country_name
            `);
            res.json({ countries });
        } catch (error) {
            console.error('❌ Get countries error:', error);
            res.status(500).json({ 
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดภายในระบบ'
            });
        }
    });

    app.get('/api/operators', generalLimiter, async (req, res) => {
        try {
            const { countryCode } = req.query;
            
            let query = `
                SELECT operator_code, operator_name, country_code, country_name
                FROM operators 
                WHERE status = 'active'
            `;
            let params = [];
            
            if (countryCode) {
                query += ' AND country_code = ?';
                params.push(countryCode);
            }
            
            query += ' ORDER BY country_name, operator_name';
            
            const operators = await db.all(query, params);
            res.json({ operators });
        } catch (error) {
            console.error('❌ Get operators error:', error);
            res.status(500).json({ 
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดภายในระบบ'
            });
        }
    });

    app.get('/api/pricing', generalLimiter, async (req, res) => {
        try {
            const { serviceId, countryCode, operatorCode } = req.query;
            
            if (!serviceId || !countryCode || !operatorCode) {
                return res.status(400).json({ 
                    error: 'VALIDATION_ERROR',
                    message: 'ข้อมูลไม่ครบถ้วน' 
                });
            }

            const pricing = await pricingService.getPricing(serviceId, countryCode, operatorCode);
            
            if (!pricing.success) {
                return res.status(400).json({ 
                    error: pricing.error,
                    message: pricing.message 
                });
            }

            res.json(pricing);
        } catch (error) {
            console.error('❌ Get pricing error:', error);
            res.status(500).json({ 
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดภายในระบบ'
            });
        }
    });

    // Legacy API endpoints for backward compatibility
    app.get('/api', generalLimiter, async (req, res) => {
        try {
            const { api_key, action, country, operator, lang, id, status } = req.query;
            
            // Validate API key (use a simple key for now)
            if (api_key !== '7ccb326980edc2bfec78dcd66326aad7') {
                return res.status(401).json('BAD_KEY');
            }
            
            switch (action) {
                case 'getCountryAndOperators':
                    // Call real SMS verification API
                    try {
                        const response = await axios.get('https://sms-verification-number.com/stubs/handler_api', {
                            params: {
                                api_key: api_key,
                                action: 'getCountryAndOperators',
                                lang: lang || 'en'
                            },
                            timeout: 10000
                        });
                        
                        // Transform the response to match expected format
                        const apiData = response.data;
                        const transformedData = apiData.map(item => ({
                            id: item.id,
                            name: item.name,
                            operators: Object.keys(item.operators || {}).map(opKey => ({
                                id: opKey,
                                name: item.operators[opKey],
                                country_code: item.id
                            }))
                        }));
                        
                        return res.json(transformedData);
                        
                    } catch (apiError) {
                        console.error('❌ External API error:', apiError.message);
                        
                        // Fallback to local data if API fails
                        const countries = await db.all(`
                            SELECT DISTINCT country_code as id, country_name as name
                            FROM operators 
                            WHERE status = 'active'
                            ORDER BY country_name
                        `);
                        
                        const operators = await db.all(`
                            SELECT operator_code as id, operator_name as name, country_code
                            FROM operators 
                            WHERE status = 'active'
                            ORDER BY country_name, operator_name
                        `);
                        
                        const result = countries.map(country => ({
                            id: country.id,
                            name: country.name,
                            operators: operators.filter(op => op.country_code === country.id)
                        }));
                        
                        return res.json(result);
                    }
                    
                case 'getServicesAndCost':
                    if (!country || !operator) {
                        return res.status(400).json('ERROR_API');
                    }
                    
                    // Call real SMS verification API for services and pricing
                    try {
                        const response = await axios.get('https://sms-verification-number.com/stubs/handler_api', {
                            params: {
                                api_key: api_key,
                                action: 'getServicesAndCost',
                                country: country,
                                operator: operator,
                                lang: lang || 'en'
                            },
                            timeout: 10000
                        });
                        
                        // Transform the response to match expected format
                        const apiData = response.data;
                        const transformedData = apiData.map(item => ({
                            id: item.id,
                            name: item.name,
                            description: `${item.name} verification service`,
                            cost: parseFloat(item.price) || 0
                        }));
                        
                        return res.json(transformedData);
                        
                    } catch (apiError) {
                        console.error('❌ External API error for services:', apiError.message);
                        
                        // Fallback to local data if API fails
                        const services = await db.all(`
                            SELECT s.id, s.name, s.description, s.base_vendor, s.markup_thb
                            FROM services s
                            WHERE s.status = 'active'
                            ORDER BY s.name
                        `);
                        
                        // Get pricing for each service
                        const servicesWithPricing = await Promise.all(services.map(async (service) => {
                            try {
                                const pricing = await pricingService.getPricing(service.id, country, operator);
                                return {
                                    id: service.id,
                                    name: service.name,
                                    description: service.description,
                                    cost: pricing.success ? pricing.finalTHB : 0
                                };
                            } catch (error) {
                                return {
                                    id: service.id,
                                    name: service.name,
                                    description: service.description,
                                    cost: 0
                                };
                            }
                        }));
                        
                        return res.json(servicesWithPricing);
                    }
                    
                case 'getStatus':
                    if (!id) {
                        return res.status(400).json('ERROR_API');
                    }
                    
                    // Call real SMS verification API for status
                    try {
                        const response = await axios.get('https://sms-verification-number.com/stubs/handler_api', {
                            params: {
                                api_key: api_key,
                                action: 'getStatus',
                                id: id,
                                lang: lang || 'en'
                            },
                            timeout: 10000
                        });
                        
                        // The API returns the status directly
                        return res.json(response.data);
                        
                    } catch (apiError) {
                        console.error('❌ External API error for status:', apiError.message);
                        
                        // Fallback to local data if API fails
                        const activation = await db.get(`
                            SELECT a.*, o.status as order_status
                            FROM activations a
                            LEFT JOIN orders o ON a.order_id = o.id
                            WHERE a.id = ?
                        `, [id]);
                        
                        if (!activation) {
                            return res.status(404).json('ERROR_API');
                        }
                        
                        // Map status codes
                        let statusCode = 0; // waiting
                        if (activation.status === 'active') {
                            statusCode = 1; // active
                        } else if (activation.status === 'completed') {
                            statusCode = 3; // completed
                        } else if (activation.status === 'cancelled') {
                            statusCode = 8; // cancelled
                        }
                        
                        return res.json({
                            id: activation.id,
                            status: statusCode,
                            phone: activation.phone_number,
                            sms: activation.received_sms || '',
                            time: activation.created_at
                        });
                    }
                    
                case 'setStatus':
                    if (!id || !status) {
                        return res.status(400).json('ERROR_API');
                    }
                    
                    // Call real SMS verification API for setStatus
                    try {
                        const response = await axios.get('https://sms-verification-number.com/stubs/handler_api', {
                            params: {
                                api_key: api_key,
                                action: 'setStatus',
                                id: id,
                                status: status,
                                lang: lang || 'en'
                            },
                            timeout: 10000
                        });
                        
                        // The API returns the result directly
                        return res.json(response.data);
                        
                    } catch (apiError) {
                        console.error('❌ External API error for setStatus:', apiError.message);
                        
                        // Fallback to local data update if API fails
                        // Map status codes
                        let newStatus = 'pending';
                        if (status === '1') newStatus = 'active';
                        else if (status === '3') newStatus = 'completed';
                        else if (status === '8') newStatus = 'cancelled';
                        
                        await db.run(`
                            UPDATE activations 
                            SET status = ?
                            WHERE id = ?
                        `, [newStatus, id]);
                        
                        return res.json('OK');
                    }
                    
                default:
                    return res.status(400).json('ERROR_API');
            }
            
        } catch (error) {
            console.error('❌ Legacy API error:', error);
            res.status(500).json('ERROR_API');
        }
    });

    console.log('✅ All routes configured successfully');
}

// Start server
async function startServer() {
    try {
        await initializeServices();
        
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log('✅ Authentication system ready');
            console.log('✅ Wallet system ready');
            console.log('✅ SMS verification system ready');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the server
startServer();
