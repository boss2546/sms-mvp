// Database Models and Schema
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const dbPath = path.join(__dirname, 'sms_verification.db');
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('❌ Database connection error:', err);
                    reject(err);
                } else {
                    console.log('✅ Connected to SQLite database');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async createTables() {
        const tables = [
            // Users table with authentication
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'unverified')),
                role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
                display_name TEXT,
                avatar_url TEXT,
                phone TEXT,
                last_login_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // User sessions for JWT token management
            `CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                refresh_token TEXT UNIQUE NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`,

            // Wallet table (separate from users for better normalization)
            `CREATE TABLE IF NOT EXISTS wallets (
                user_id INTEGER PRIMARY KEY,
                balance REAL DEFAULT 0.00,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`,

            // Wallet transactions (renamed from wallet_transactions)
            `CREATE TABLE IF NOT EXISTS wallet_ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('topup', 'purchase', 'refund', 'adjustment')),
                amount REAL NOT NULL,
                ref TEXT,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`,

            // Top-up requests
            `CREATE TABLE IF NOT EXISTS topup_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                amount_thb REAL NOT NULL,
                method TEXT NOT NULL,
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed')),
                thunder_response TEXT,
                verification_data TEXT,
                reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                verified_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`,

            // Orders/Purchases
            `CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                service_id TEXT NOT NULL,
                operator_code TEXT,
                country_code TEXT,
                final_price_thb REAL NOT NULL,
                fx_rate REAL,
                base_vendor_currency TEXT,
                base_vendor_amount REAL,
                base_thb REAL,
                markup_thb REAL DEFAULT 10.00,
                phone_number TEXT,
                status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'expired', 'failed')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`,

            // FX Rate cache
            `CREATE TABLE IF NOT EXISTS fx_rates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                from_currency TEXT NOT NULL,
                to_currency TEXT NOT NULL,
                rate REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Service pricing cache
            `CREATE TABLE IF NOT EXISTS service_pricing (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service_id TEXT NOT NULL,
                country_code TEXT NOT NULL,
                operator_code TEXT NOT NULL,
                base_vendor_price REAL NOT NULL,
                vendor_currency TEXT NOT NULL,
                cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Login attempts for rate limiting
            `CREATE TABLE IF NOT EXISTS login_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                ip_address TEXT NOT NULL,
                success BOOLEAN NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Services table
            `CREATE TABLE IF NOT EXISTS services (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                base_vendor TEXT NOT NULL,
                markup_thb REAL DEFAULT 10.00,
                status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Countries and Operators table
            `CREATE TABLE IF NOT EXISTS operators (
                operator_code TEXT PRIMARY KEY,
                operator_name TEXT NOT NULL,
                country_code TEXT NOT NULL,
                country_name TEXT NOT NULL,
                status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Activations table
            `CREATE TABLE IF NOT EXISTS activations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                order_id INTEGER NOT NULL,
                service_id TEXT NOT NULL,
                country_code TEXT NOT NULL,
                operator_code TEXT NOT NULL,
                phone_number TEXT,
                received_sms TEXT,
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'expired', 'waiting')),
                thunder_order_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
            )`
        ];

        for (const table of tables) {
            await this.run(table);
        }

        // Create indexes for better performance
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)',
            'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token)',
            'CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_id ON wallet_ledger(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_wallet_ledger_created_at ON wallet_ledger(created_at)',
            'CREATE INDEX IF NOT EXISTS idx_topup_requests_user_id ON topup_requests(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_topup_requests_status ON topup_requests(status)',
            'CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)',
            'CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email)',
            'CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address)',
            'CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at)'
        ];

        for (const index of indexes) {
            try {
                await this.run(index);
            } catch (error) {
                // Skip index creation if column doesn't exist yet (will be created during migration)
                if (error.message.includes('no such column')) {
                    console.log(`⚠️  Skipping index creation (column not found): ${index}`);
                } else {
                    throw error;
                }
            }
        }

        // Insert sample data if tables are empty
        await this.insertSampleData();
    }

    async insertSampleData() {
        try {
            // Check if services table is empty
            const serviceCount = await this.get('SELECT COUNT(*) as count FROM services');
            if (serviceCount.count === 0) {
                console.log('📋 Inserting sample services...');
                await this.run(`
                    INSERT INTO services (id, name, description, base_vendor, markup_thb) VALUES
                    ('whatsapp', 'WhatsApp', 'WhatsApp verification service', '5sim', 15.00),
                    ('telegram', 'Telegram', 'Telegram verification service', '5sim', 12.00),
                    ('instagram', 'Instagram', 'Instagram verification service', '5sim', 20.00),
                    ('facebook', 'Facebook', 'Facebook verification service', '5sim', 18.00),
                    ('twitter', 'Twitter', 'Twitter verification service', '5sim', 16.00),
                    ('google', 'Google', 'Google verification service', '5sim', 14.00),
                    ('apple', 'Apple', 'Apple verification service', '5sim', 22.00),
                    ('microsoft', 'Microsoft', 'Microsoft verification service', '5sim', 19.00),
                    ('discord', 'Discord', 'Discord verification service', '5sim', 13.00),
                    ('tiktok', 'TikTok', 'TikTok verification service', '5sim', 21.00)
                `);
                console.log('✅ Sample services inserted');
            }

            // Check if operators table is empty
            const operatorCount = await this.get('SELECT COUNT(*) as count FROM operators');
            if (operatorCount.count === 0) {
                console.log('📋 Inserting sample operators...');
                await this.run(`
                    INSERT INTO operators (operator_code, operator_name, country_code, country_name) VALUES
                    ('th_ais', 'AIS', 'TH', 'Thailand'),
                    ('th_true', 'True', 'TH', 'Thailand'),
                    ('th_dtac', 'dtac', 'TH', 'Thailand'),
                    ('us_verizon', 'Verizon', 'US', 'United States'),
                    ('us_att', 'AT&T', 'US', 'United States'),
                    ('us_tmobile', 'T-Mobile', 'US', 'United States'),
                    ('gb_ee', 'EE', 'GB', 'United Kingdom'),
                    ('gb_vodafone', 'Vodafone', 'GB', 'United Kingdom'),
                    ('gb_o2', 'O2', 'GB', 'United Kingdom'),
                    ('de_tmobile', 'T-Mobile', 'DE', 'Germany'),
                    ('de_vodafone', 'Vodafone', 'DE', 'Germany'),
                    ('fr_orange', 'Orange', 'FR', 'France'),
                    ('fr_sfr', 'SFR', 'FR', 'France'),
                    ('jp_docomo', 'NTT Docomo', 'JP', 'Japan'),
                    ('jp_softbank', 'SoftBank', 'JP', 'Japan'),
                    ('kr_sk', 'SK Telecom', 'KR', 'South Korea'),
                    ('kr_kt', 'KT', 'KR', 'South Korea'),
                    ('cn_china_mobile', 'China Mobile', 'CN', 'China'),
                    ('cn_china_unicom', 'China Unicom', 'CN', 'China'),
                    ('in_airtel', 'Airtel', 'IN', 'India'),
                    ('in_jio', 'Jio', 'IN', 'India')
                `);
                console.log('✅ Sample operators inserted');
            }

        } catch (error) {
            console.error('❌ Error inserting sample data:', error);
            // Don't throw here as this is not critical
        }
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('❌ Database run error:', err);
                    reject(err);
                } else {
                    resolve({ 
                        id: this.lastID, 
                        lastInsertRowid: this.lastID,
                        changes: this.changes 
                    });
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('❌ Database get error:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('❌ Database all error:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('❌ Database close error:', err);
                } else {
                    console.log('✅ Database connection closed');
                }
            });
        }
    }
}

module.exports = Database;
