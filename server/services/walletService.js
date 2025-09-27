// Wallet Service - Credit Management
class WalletService {
    constructor(database) {
        this.db = database;
    }

    // Get or create user by session
    async getUserBySession(sessionId) {
        let user = await this.db.get(
            'SELECT * FROM users WHERE session_id = ?',
            [sessionId]
        );

        if (!user) {
            const result = await this.db.run(
                'INSERT INTO users (session_id, balance) VALUES (?, ?)',
                [sessionId, 0.00]
            );
            user = await this.db.get(
                'SELECT * FROM users WHERE id = ?',
                [result.id]
            );
        }

        return user;
    }

    // Get user balance
    async getBalance(sessionId) {
        const user = await this.getUserBySession(sessionId);
        return {
            balance: parseFloat(user.balance.toFixed(2))
        };
    }

    // Get transaction history
    async getTransactionHistory(sessionId, limit = 50) {
        const user = await this.getUserBySession(sessionId);
        
        const transactions = await this.db.all(`
            SELECT id, type, amount, reference, description, created_at
            FROM wallet_transactions 
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `, [user.id, limit]);

        return transactions.map(tx => ({
            id: tx.id,
            type: tx.type,
            amount: parseFloat(tx.amount.toFixed(2)),
            reference: tx.reference,
            description: tx.description,
            createdAt: tx.created_at
        }));
    }

    // Add transaction and update balance
    async addTransaction(sessionId, type, amount, reference = null, description = null) {
        const user = await this.getUserBySession(sessionId);
        
        // Insert transaction
        const result = await this.db.run(`
            INSERT INTO wallet_transactions (user_id, type, amount, reference, description)
            VALUES (?, ?, ?, ?, ?)
        `, [user.id, type, amount, reference, description]);

        // Update user balance
        const newBalance = user.balance + amount;
        await this.db.run(
            'UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newBalance, user.id]
        );

        return {
            transactionId: result.id,
            newBalance: parseFloat(newBalance.toFixed(2))
        };
    }

    // Check if user has sufficient credit
    async hasSufficientCredit(sessionId, requiredAmount) {
        const user = await this.getUserBySession(sessionId);
        return user.balance >= requiredAmount;
    }

    // Deduct credit (for purchases)
    async deductCredit(sessionId, amount, orderId) {
        const user = await this.getUserBySession(sessionId);
        
        if (user.balance < amount) {
            throw new Error('INSUFFICIENT_CREDIT');
        }

        return await this.addTransaction(
            sessionId,
            'purchase',
            -amount,
            orderId,
            `Purchase order #${orderId}`
        );
    }

    // Add credit (for top-ups)
    async addCredit(sessionId, amount, topupId) {
        return await this.addTransaction(
            sessionId,
            'topup',
            amount,
            topupId,
            `Top-up #${topupId}`
        );
    }

    // Refund credit
    async refundCredit(sessionId, amount, orderId) {
        return await this.addTransaction(
            sessionId,
            'refund',
            amount,
            orderId,
            `Refund for order #${orderId}`
        );
    }
}

module.exports = WalletService;
