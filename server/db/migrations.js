// Database Migration Functions
const bcrypt = require('bcryptjs');

class DatabaseMigrations {
    constructor(db) {
        this.db = db;
    }

    async migrateToAuthSystem() {
        console.log('🔄 Starting authentication system migration...');
        
        try {
            // Step 1: Check if old users table exists with session_id
            const oldUsersExist = await this.checkOldUsersTable();
            
            if (oldUsersExist) {
                console.log('📋 Found old users table with session_id, migrating data...');
                await this.migrateOldUsers();
            }
            
            // Step 2: Create system user for orphaned data
            await this.createSystemUser();
            
            // Step 3: Migrate orphaned transactions
            await this.migrateOrphanedData();
            
            // Step 4: Clean up old tables
            await this.cleanupOldTables();
            
            console.log('✅ Authentication system migration completed successfully!');
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }

    async checkOldUsersTable() {
        try {
            const tableInfo = await this.db.all(`PRAGMA table_info(users)`);
            const hasSessionId = tableInfo.some(column => column.name === 'session_id');
            const hasEmail = tableInfo.some(column => column.name === 'email');
            
            // If table has session_id but no email, it's the old format
            return hasSessionId && !hasEmail;
        } catch (error) {
            return false;
        }
    }

    async migrateOldUsers() {
        try {
            // Get all old users with session_id
            const oldUsers = await this.db.all(`
                SELECT id, session_id, balance, created_at, updated_at 
                FROM users 
                WHERE session_id IS NOT NULL
            `);

            console.log(`📋 Found ${oldUsers.length} old users to migrate`);

            if (oldUsers.length === 0) return;

            // Create temporary backup of old users
            await this.db.run(`
                CREATE TABLE IF NOT EXISTS users_backup AS 
                SELECT * FROM users WHERE session_id IS NOT NULL
            `);

            // For each old user, create a new user with generated email
            for (const oldUser of oldUsers) {
                const generatedEmail = `session_${oldUser.session_id}@system.local`;
                const generatedPassword = this.generateRandomPassword();
                const passwordHash = await bcrypt.hash(generatedPassword, 12);

                // Insert new user with email and password
                const newUserResult = await this.db.run(`
                    INSERT INTO users (email, password_hash, status, role, created_at, updated_at)
                    VALUES (?, ?, 'active', 'user', ?, ?)
                `, [generatedEmail, passwordHash, oldUser.created_at, oldUser.updated_at]);

                const newUserId = newUserResult.id;

                // Create wallet for new user
                await this.db.run(`
                    INSERT INTO wallets (user_id, balance, created_at, updated_at)
                    VALUES (?, ?, ?, ?)
                `, [newUserId, oldUser.balance || 0, oldUser.created_at, oldUser.updated_at]);

                // Update wallet_transactions (if exists) to point to new user
                await this.db.run(`
                    UPDATE wallet_transactions 
                    SET user_id = ? 
                    WHERE user_id = ?
                `, [newUserId, oldUser.id]);

                // Update wallet_ledger to point to new user
                await this.db.run(`
                    UPDATE wallet_ledger 
                    SET user_id = ? 
                    WHERE user_id = ?
                `, [newUserId, oldUser.id]);

                // Update topup_requests to point to new user
                await this.db.run(`
                    UPDATE topup_requests 
                    SET user_id = ? 
                    WHERE user_id = ?
                `, [newUserId, oldUser.id]);

                // Update orders to point to new user
                await this.db.run(`
                    UPDATE orders 
                    SET user_id = ? 
                    WHERE user_id = ?
                `, [newUserId, oldUser.id]);

                console.log(`✅ Migrated user ${oldUser.id} (session: ${oldUser.session_id}) to new user ${newUserId}`);
            }

            console.log('✅ Old users migration completed');

        } catch (error) {
            console.error('❌ Error migrating old users:', error);
            throw error;
        }
    }

    async createSystemUser() {
        try {
            // Check if system user already exists
            const systemUser = await this.db.get(`
                SELECT id FROM users WHERE email = 'system@local'
            `);

            if (systemUser) {
                console.log('📋 System user already exists');
                return systemUser.id;
            }

            // Create system user for orphaned data
            const systemPassword = await bcrypt.hash('system_user_password', 12);
            const result = await this.db.run(`
                INSERT INTO users (email, password_hash, status, role)
                VALUES ('system@local', ?, 'active', 'admin')
            `, [systemPassword]);

            const systemUserId = result.id;

            // Create wallet for system user
            await this.db.run(`
                INSERT INTO wallets (user_id, balance)
                VALUES (?, 0.00)
            `, [systemUserId]);

            console.log(`✅ Created system user with ID: ${systemUserId}`);
            return systemUserId;

        } catch (error) {
            console.error('❌ Error creating system user:', error);
            throw error;
        }
    }

    async migrateOrphanedData() {
        try {
            const systemUser = await this.db.get(`
                SELECT id FROM users WHERE email = 'system@local'
            `);

            if (!systemUser) {
                throw new Error('System user not found');
            }

            const systemUserId = systemUser.id;

            // Find and migrate orphaned wallet_ledger records
            const orphanedLedger = await this.db.all(`
                SELECT * FROM wallet_ledger 
                WHERE user_id NOT IN (SELECT id FROM users WHERE email != 'system@local')
            `);

            if (orphanedLedger.length > 0) {
                console.log(`📋 Found ${orphanedLedger.length} orphaned ledger entries, assigning to system user`);
                await this.db.run(`
                    UPDATE wallet_ledger 
                    SET user_id = ? 
                    WHERE user_id NOT IN (SELECT id FROM users WHERE email != 'system@local')
                `, [systemUserId]);
            }

            // Find and migrate orphaned topup_requests
            const orphanedTopups = await this.db.all(`
                SELECT * FROM topup_requests 
                WHERE user_id NOT IN (SELECT id FROM users WHERE email != 'system@local')
            `);

            if (orphanedTopups.length > 0) {
                console.log(`📋 Found ${orphanedTopups.length} orphaned topup requests, assigning to system user`);
                await this.db.run(`
                    UPDATE topup_requests 
                    SET user_id = ? 
                    WHERE user_id NOT IN (SELECT id FROM users WHERE email != 'system@local')
                `, [systemUserId]);
            }

            // Find and migrate orphaned orders
            const orphanedOrders = await this.db.all(`
                SELECT * FROM orders 
                WHERE user_id NOT IN (SELECT id FROM users WHERE email != 'system@local')
            `);

            if (orphanedOrders.length > 0) {
                console.log(`📋 Found ${orphanedOrders.length} orphaned orders, assigning to system user`);
                await this.db.run(`
                    UPDATE orders 
                    SET user_id = ? 
                    WHERE user_id NOT IN (SELECT id FROM users WHERE email != 'system@local')
                `, [systemUserId]);
            }

            console.log('✅ Orphaned data migration completed');

        } catch (error) {
            console.error('❌ Error migrating orphaned data:', error);
            throw error;
        }
    }

    async cleanupOldTables() {
        try {
            // Check if old users table has session_id column
            const tableInfo = await this.db.all(`PRAGMA table_info(users)`);
            const hasSessionId = tableInfo.some(column => column.name === 'session_id');

            if (hasSessionId) {
                // Remove session_id column and balance column from users table
                console.log('🧹 Cleaning up old table structure...');
                
                // SQLite doesn't support DROP COLUMN, so we need to recreate the table
                await this.db.run(`
                    CREATE TABLE users_new (
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
                    )
                `);

                // Copy data to new table
                await this.db.run(`
                    INSERT INTO users_new (id, email, password_hash, status, role, display_name, avatar_url, phone, last_login_at, created_at, updated_at)
                    SELECT id, email, password_hash, status, role, display_name, avatar_url, phone, last_login_at, created_at, updated_at
                    FROM users
                    WHERE email IS NOT NULL
                `);

                // Drop old table and rename new one
                await this.db.run('DROP TABLE users');
                await this.db.run('ALTER TABLE users_new RENAME TO users');

                console.log('✅ Old table structure cleaned up');
            }

            // Remove old wallet_transactions table if it exists
            const walletTransactionsExists = await this.tableExists('wallet_transactions');
            if (walletTransactionsExists) {
                await this.db.run('DROP TABLE wallet_transactions');
                console.log('✅ Removed old wallet_transactions table');
            }

        } catch (error) {
            console.error('❌ Error cleaning up old tables:', error);
            // Don't throw here as cleanup is not critical
        }
    }

    async tableExists(tableName) {
        try {
            const result = await this.db.get(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name=?
            `, [tableName]);
            return !!result;
        } catch (error) {
            return false;
        }
    }

    generateRandomPassword() {
        return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
    }

    async checkMigrationStatus() {
        try {
            // Check if we have the new user structure
            const tableInfo = await this.db.all(`PRAGMA table_info(users)`);
            const hasEmail = tableInfo.some(column => column.name === 'email');
            const hasPasswordHash = tableInfo.some(column => column.name === 'password_hash');
            
            return hasEmail && hasPasswordHash;
        } catch (error) {
            return false;
        }
    }
}

module.exports = DatabaseMigrations;
