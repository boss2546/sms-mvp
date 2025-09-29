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
const AuthService = require('./server/services/authService');
const AuthMiddleware = require('./server/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services
let db, walletService, fxService, pricingService, thunderService, authService, authMiddleware;

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

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        error: 'TOO_MANY_ATTEMPTS',
        message: 'พยายามเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาที'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

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
        thunderService = new ThunderService(db);
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
    app.post('/api/auth/register', authLimiter, async (req, res) => {
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
                session: result.session,
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

    app.post('/api/auth/login', authLimiter, async (req, res) => {
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

    app.get('/api/auth/me', authMiddleware.verifyToken, async (req, res) => {
        try {
            res.json({ user: req.user });
        } catch (error) {
            console.error('❌ Get user error:', error);
            res.status(500).json({ 
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
                amount: result.amount
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
            const { serviceId, countryCode, operatorCode } = req.body;
            
            if (!serviceId || !countryCode || !operatorCode) {
                return res.status(400).json({ 
                    error: 'VALIDATION_ERROR',
                    message: 'ข้อมูลไม่ครบถ้วน' 
                });
            }

            // Get pricing
            const pricing = await pricingService.getPricing(serviceId, countryCode, operatorCode);
            
            if (!pricing.success) {
                return res.status(400).json({ 
                    error: pricing.error,
                    message: pricing.message 
                });
            }

            // Check if user has sufficient credit
            const hasCredit = await walletService.hasSufficientCredit(req.user.id, pricing.finalTHB);
            
            if (!hasCredit) {
                return res.status(400).json({ 
                    error: 'INSUFFICIENT_CREDIT',
                    message: 'เครดิตไม่เพียงพอ — โปรดเติมเงิน' 
                });
            }

            // Deduct credit
            const deductResult = await walletService.deductCredit(req.user.id, pricing.finalTHB, 'purchase', `SMS-${serviceId}-${countryCode}-${operatorCode}`);
            
            if (!deductResult.success) {
                return res.status(400).json({ 
                    error: deductResult.error,
                    message: deductResult.message 
                });
            }

            // Create order
            const orderResult = await db.run(`
                INSERT INTO orders (user_id, service_id, country_code, operator_code, base_vendor, fx_rate, base_thb, markup_thb, final_thb, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
            `, [req.user.id, serviceId, countryCode, operatorCode, pricing.baseVendor, pricing.fxRate, pricing.baseTHB, pricing.markupTHB, pricing.finalTHB]);

            const orderId = orderResult.lastID;

            // Call Thunder API
            const thunderResult = await thunderService.purchaseNumber(serviceId, countryCode, operatorCode);
            
            if (thunderResult.success) {
                // Update order status
                await db.run(`
                    UPDATE orders SET status = 'active', thunder_order_id = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [thunderResult.orderId, orderId]);

                // Create activation record
                await db.run(`
                    INSERT INTO activations (user_id, order_id, service_id, country_code, operator_code, phone_number, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
                `, [req.user.id, orderId, serviceId, countryCode, operatorCode, thunderResult.phoneNumber]);

                res.json({
                    success: true,
                    orderId: orderId,
                    phoneNumber: thunderResult.phoneNumber,
                    message: 'ซื้อบริการสำเร็จ'
                });
            } else {
                // Refund credit on failure
                await walletService.refundCredit(req.user.id, pricing.finalTHB, 'refund', `REFUND-${orderId}`);
                
                // Update order status
                await db.run(`
                    UPDATE orders SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [thunderResult.message, orderId]);

                res.status(400).json({ 
                    error: 'PURCHASE_FAILED',
                    message: thunderResult.message 
                });
            }
        } catch (error) {
            console.error('❌ Purchase error:', error);
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
