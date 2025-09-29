const AuthService = require('../services/authService');

class AuthMiddleware {
    constructor(db) {
        this.db = db;
        this.authService = null;
        
        // Bind methods to preserve context
        this.verifyToken = this.verifyToken.bind(this);
        this.verifyRefreshToken = this.verifyRefreshToken.bind(this);
        this.optionalAuth = this.optionalAuth.bind(this);
    }

    // Initialize authService when needed
    getAuthService() {
        if (!this.authService) {
            this.authService = new AuthService(this.db);
        }
        return this.authService;
    }

    // Middleware to verify JWT token
    async verifyToken(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ 
                    error: 'UNAUTHORIZED',
                    message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ'
                });
            }

            const token = authHeader.substring(7); // Remove 'Bearer ' prefix
            const authService = this.getAuthService();
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

            // Add user info to request
            req.user = userResult.user;
            next();

        } catch (error) {
            console.error('Token verification error:', error);
            return res.status(500).json({ 
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดภายในระบบ'
            });
        }
    }

    // Middleware to verify admin role
    requireAdmin(req, res, next) {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ 
                error: 'FORBIDDEN',
                message: 'ไม่มีสิทธิ์เข้าถึง'
            });
        }
        next();
    }

    // Middleware to get user from refresh token (for token refresh endpoint)
    async verifyRefreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            
            if (!refreshToken) {
                return res.status(400).json({ 
                    error: 'MISSING_REFRESH_TOKEN',
                    message: 'ไม่พบ refresh token'
                });
            }

            // Verify refresh token exists and is valid
            const authService = this.getAuthService();
            const session = await authService.db.get(`
                SELECT s.*, u.id, u.email, u.role, u.status
                FROM user_sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.refresh_token = ? AND s.expires_at > ?
            `, [refreshToken, new Date().toISOString()]);

            if (!session) {
                return res.status(401).json({ 
                    error: 'INVALID_REFRESH_TOKEN',
                    message: 'Refresh token ไม่ถูกต้องหรือหมดอายุ'
                });
            }

            // Check if user is blocked
            if (session.status === 'blocked') {
                return res.status(403).json({ 
                    error: 'USER_BLOCKED',
                    message: 'บัญชีนี้ถูกระงับการใช้งานชั่วคราว'
                });
            }

            req.user = {
                id: session.user_id,
                email: session.email,
                role: session.role,
                status: session.status
            };
            req.refreshToken = refreshToken;
            next();

        } catch (error) {
            console.error('Refresh token verification error:', error);
            return res.status(500).json({ 
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดภายในระบบ'
            });
        }
    }

    // Optional authentication - doesn't fail if no token
    async optionalAuth(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                req.user = null;
                return next();
            }

            const token = authHeader.substring(7);
            const authService = this.getAuthService();
            const decoded = authService.verifyAccessToken(token);

            if (!decoded) {
                req.user = null;
                return next();
            }

            const userResult = await authService.getUserById(decoded.userId);
            if (userResult.success && userResult.user.status !== 'blocked') {
                req.user = userResult.user;
            } else {
                req.user = null;
            }

            next();

        } catch (error) {
            console.error('Optional auth error:', error);
            req.user = null;
            next();
        }
    }
}

module.exports = AuthMiddleware;
