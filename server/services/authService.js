const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthService {
    constructor(db) {
        this.db = db;
        this.JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
        this.JWT_EXPIRES_IN = '15m'; // 15 minutes
        this.REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        this.MAX_LOGIN_ATTEMPTS = 5;
        this.LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
    }

    // Generate secure random token
    generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    // Hash password using bcrypt
    async hashPassword(password) {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }

    // Verify password
    async verifyPassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    // Generate JWT access token
    generateAccessToken(user) {
        return jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role 
            },
            this.JWT_SECRET,
            { expiresIn: this.JWT_EXPIRES_IN }
        );
    }

    // Generate refresh token
    generateRefreshToken() {
        return this.generateToken();
    }

    // Verify JWT token
    verifyAccessToken(token) {
        try {
            return jwt.verify(token, this.JWT_SECRET);
        } catch (error) {
            return null;
        }
    }

    // Register new user
    async register(email, password) {
        try {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('INVALID_EMAIL');
            }

            // Validate password strength
            if (password.length < 8) {
                throw new Error('WEAK_PASSWORD');
            }

            // Check if email already exists
            const existingUser = await this.db.get(
                'SELECT id FROM users WHERE email = ?', 
                [email.toLowerCase()]
            );

            if (existingUser) {
                throw new Error('EMAIL_TAKEN');
            }

            // Hash password
            const passwordHash = await this.hashPassword(password);

            // Create user
            const result = await this.db.run(`
                INSERT INTO users (email, password_hash, status, role)
                VALUES (?, ?, 'active', 'user')
            `, [email.toLowerCase(), passwordHash]);

            const userId = result.id;

            // Create wallet for user
            await this.db.run(`
                INSERT INTO wallets (user_id, balance)
                VALUES (?, 0.00)
            `, [userId]);

            // Get user data
            const user = await this.db.get(
                'SELECT id, email, status, role, created_at FROM users WHERE id = ?',
                [userId]
            );

            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    createdAt: user.created_at
                }
            };

        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Login user
    async login(email, password, ipAddress) {
        try {
            // Check for recent failed attempts
            const recentAttempts = await this.getRecentFailedAttempts(email, ipAddress);
            if (recentAttempts >= this.MAX_LOGIN_ATTEMPTS) {
                throw new Error('ACCOUNT_LOCKED');
            }

            // Get user by email
            const user = await this.db.get(
                'SELECT id, email, password_hash, status, role FROM users WHERE email = ?',
                [email.toLowerCase()]
            );

            if (!user) {
                await this.recordLoginAttempt(email, ipAddress, false);
                throw new Error('INVALID_CREDENTIALS');
            }

            // Check if account is blocked
            if (user.status === 'blocked') {
                throw new Error('USER_BLOCKED');
            }

            // Verify password
            const isValidPassword = await this.verifyPassword(password, user.password_hash);
            if (!isValidPassword) {
                await this.recordLoginAttempt(email, ipAddress, false);
                throw new Error('INVALID_CREDENTIALS');
            }

            // Record successful login
            await this.recordLoginAttempt(email, ipAddress, true);

            // Update last login
            await this.db.run(
                'UPDATE users SET last_login_at = ? WHERE id = ?',
                [new Date().toISOString(), user.id]
            );

            // Generate tokens
            const accessToken = this.generateAccessToken(user);
            const refreshToken = this.generateRefreshToken();
            const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_EXPIRES_IN);

            // Store refresh token
            await this.db.run(`
                INSERT INTO user_sessions (user_id, refresh_token, expires_at)
                VALUES (?, ?, ?)
            `, [user.id, refreshToken, expiresAt.toISOString()]);

            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    status: user.status
                },
                session: {
                    accessToken,
                    refreshToken,
                    expiresAt: expiresAt.toISOString()
                }
            };

        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Refresh access token
    async refreshToken(refreshToken) {
        try {
            // Get session
            const session = await this.db.get(`
                SELECT s.*, u.id, u.email, u.role, u.status
                FROM user_sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.refresh_token = ? AND s.expires_at > ?
            `, [refreshToken, new Date().toISOString()]);

            if (!session) {
                throw new Error('INVALID_REFRESH_TOKEN');
            }

            // Check if user is still active
            if (session.status === 'blocked') {
                throw new Error('USER_BLOCKED');
            }

            // Generate new access token
            const accessToken = this.generateAccessToken({
                id: session.user_id,
                email: session.email,
                role: session.role
            });

            return {
                success: true,
                accessToken
            };

        } catch (error) {
            console.error('Token refresh error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Logout user
    async logout(refreshToken) {
        try {
            if (refreshToken) {
                await this.db.run(
                    'DELETE FROM user_sessions WHERE refresh_token = ?',
                    [refreshToken]
                );
            }

            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get user by ID
    async getUserById(userId) {
        try {
            const user = await this.db.get(
                'SELECT id, email, status, role, display_name, avatar_url, phone, last_login_at, created_at FROM users WHERE id = ?',
                [userId]
            );

            if (!user) {
                return { success: false, error: 'USER_NOT_FOUND' };
            }

            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    status: user.status,
                    role: user.role,
                    displayName: user.display_name,
                    avatarUrl: user.avatar_url,
                    phone: user.phone,
                    lastLoginAt: user.last_login_at,
                    createdAt: user.created_at
                }
            };
        } catch (error) {
            console.error('Get user error:', error);
            return { success: false, error: error.message };
        }
    }

    // Record login attempt
    async recordLoginAttempt(email, ipAddress, success) {
        try {
            await this.db.run(`
                INSERT INTO login_attempts (email, ip_address, success)
                VALUES (?, ?, ?)
            `, [email.toLowerCase(), ipAddress, success]);
        } catch (error) {
            console.error('Record login attempt error:', error);
        }
    }

    // Get recent failed attempts
    async getRecentFailedAttempts(email, ipAddress) {
        try {
            const cutoffTime = new Date(Date.now() - this.LOCKOUT_DURATION).toISOString();
            
            const result = await this.db.get(`
                SELECT COUNT(*) as count
                FROM login_attempts
                WHERE (email = ? OR ip_address = ?) 
                AND success = 0 
                AND created_at > ?
            `, [email.toLowerCase(), ipAddress, cutoffTime]);

            return result.count || 0;
        } catch (error) {
            console.error('Get recent failed attempts error:', error);
            return 0;
        }
    }

    // Clean expired sessions
    async cleanExpiredSessions() {
        try {
            await this.db.run(
                'DELETE FROM user_sessions WHERE expires_at < ?',
                [new Date().toISOString()]
            );
        } catch (error) {
            console.error('Clean expired sessions error:', error);
        }
    }

    // Clean old login attempts
    async cleanOldLoginAttempts() {
        try {
            const cutoffTime = new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString(); // 24 hours ago
            await this.db.run(
                'DELETE FROM login_attempts WHERE created_at < ?',
                [cutoffTime]
            );
        } catch (error) {
            console.error('Clean old login attempts error:', error);
        }
    }
}

module.exports = AuthService;
