// Wallet Service - Credit Management with User Authentication
class WalletService {
    constructor(database) {
        this.db = database;
    }

    // Get user balance by user ID
    async getBalance(userId) {
        const wallet = await this.db.get(
            'SELECT balance FROM wallets WHERE user_id = ?',
            [userId]
        );

        if (!wallet) {
            // Create wallet if it doesn't exist
            await this.db.run(
                'INSERT INTO wallets (user_id, balance) VALUES (?, 0.00)',
                [userId]
            );
            return { balance: 0.00 };
        }

        return {
            balance: parseFloat(wallet.balance.toFixed(2))
        };
    }

    // Get transaction history by user ID
    async getTransactionHistory(userId, limit = 50) {
        const transactions = await this.db.all(`
            SELECT id, type, amount, ref, description, created_at
            FROM wallet_ledger 
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `, [userId, limit]);

        return transactions.map(tx => ({
            id: tx.id,
            type: tx.type,
            amount: parseFloat(tx.amount.toFixed(2)),
            reference: tx.ref,
            description: tx.description,
            createdAt: tx.created_at
        }));
    }

    // Add transaction and update balance
    async addTransaction(userId, type, amount, reference = null, description = null) {
        // Insert transaction
        const result = await this.db.run(`
            INSERT INTO wallet_ledger (user_id, type, amount, ref, description)
            VALUES (?, ?, ?, ?, ?)
        `, [userId, type, amount, reference, description]);

        // Update wallet balance
        const currentWallet = await this.db.get(
            'SELECT balance FROM wallets WHERE user_id = ?',
            [userId]
        );

        if (!currentWallet) {
            // Create wallet if it doesn't exist
            await this.db.run(
                'INSERT INTO wallets (user_id, balance) VALUES (?, ?)',
                [userId, amount]
            );
        } else {
            const newBalance = currentWallet.balance + amount;
            await this.db.run(
                'UPDATE wallets SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                [newBalance, userId]
            );
        }

        return {
            transactionId: result.id,
            newBalance: parseFloat((currentWallet ? currentWallet.balance + amount : amount).toFixed(2))
        };
    }

    // Check if user has sufficient credit
    async hasSufficientCredit(userId, requiredAmount) {
        const wallet = await this.db.get(
            'SELECT balance FROM wallets WHERE user_id = ?',
            [userId]
        );

        if (!wallet) {
            return false;
        }

        return wallet.balance >= requiredAmount;
    }

    // Deduct credit (for purchases)
    async deductCredit(userId, amount, orderId) {
        const wallet = await this.db.get(
            'SELECT balance FROM wallets WHERE user_id = ?',
            [userId]
        );

        if (!wallet || wallet.balance < amount) {
            throw new Error('INSUFFICIENT_CREDIT');
        }

        return await this.addTransaction(
            userId,
            'purchase',
            -amount,
            orderId,
            `Purchase order #${orderId}`
        );
    }

    // Add credit (for top-ups)
    async addCredit(userId, amount, topupId) {
        return await this.addTransaction(
            userId,
            'topup',
            amount,
            topupId,
            `Top-up #${topupId}`
        );
    }

    // Refund credit
    async refundCredit(userId, amount, orderId) {
        return await this.addTransaction(
            userId,
            'refund',
            amount,
            orderId,
            `Refund for order #${orderId}`
        );
    }

    // Get wallet summary
    async getWalletSummary(userId) {
        const wallet = await this.getBalance(userId);
        const recentTransactions = await this.getTransactionHistory(userId, 10);
        
        return {
            balance: wallet.balance,
            recentTransactions
        };
    }
}

module.exports = WalletService;
