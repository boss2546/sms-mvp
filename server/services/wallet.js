const { getDb } = require('../db/init');

class WalletService {
  constructor() {
    this.db = getDb();
  }

  // Get user wallet balance
  async getBalance(userId) {
    try {
      const stmt = this.db.prepare(`
        SELECT balance FROM wallets WHERE user_id = ?
      `);
      const result = stmt.get(userId);
      
      return {
        success: true,
        data: {
          balance: result ? result.balance : 0
        }
      };
    } catch (error) {
      console.error('Error getting balance:', error);
      return {
        success: false,
        error: {
          message: 'ไม่สามารถดึงข้อมูลยอดเงินได้',
          details: error.message
        }
      };
    }
  }

  // Get wallet transactions
  async getTransactions(userId, limit = 50, offset = 0) {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          id,
          type,
          amount,
          ref,
          description,
          created_at
        FROM wallet_ledger 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `);
      const transactions = stmt.all(userId, limit, offset);

      return {
        success: true,
        data: transactions
      };
    } catch (error) {
      console.error('Error getting transactions:', error);
      return {
        success: false,
        error: {
          message: 'ไม่สามารถดึงประวัติการทำรายการได้',
          details: error.message
        }
      };
    }
  }

  // Add credit to wallet (top-up)
  async addCredit(userId, amount, ref, description = 'เติมเงิน') {
    const transaction = this.db.transaction(() => {
      try {
        // Insert ledger entry
        const ledgerStmt = this.db.prepare(`
          INSERT INTO wallet_ledger (user_id, type, amount, ref, description)
          VALUES (?, 'topup', ?, ?, ?)
        `);
        ledgerStmt.run(userId, amount, ref, description);

        // Update wallet balance
        const walletStmt = this.db.prepare(`
          INSERT OR REPLACE INTO wallets (user_id, balance, updated_at)
          VALUES (?, 
            COALESCE((SELECT balance FROM wallets WHERE user_id = ?), 0) + ?,
            CURRENT_TIMESTAMP
          )
        `);
        walletStmt.run(userId, userId, amount);

        return { success: true };
      } catch (error) {
        throw error;
      }
    });

    try {
      const result = transaction();
      return {
        success: true,
        data: {
          message: 'เติมเงินสำเร็จ',
          amount,
          ref
        }
      };
    } catch (error) {
      console.error('Error adding credit:', error);
      return {
        success: false,
        error: {
          message: 'ไม่สามารถเติมเงินได้',
          details: error.message
        }
      };
    }
  }

  // Deduct credit from wallet (purchase)
  async deductCredit(userId, amount, ref, description = 'ซื้อบริการ') {
    const transaction = this.db.transaction(() => {
      try {
        // Check if user has sufficient balance
        const balanceStmt = this.db.prepare(`
          SELECT balance FROM wallets WHERE user_id = ?
        `);
        const wallet = balanceStmt.get(userId);
        
        if (!wallet || wallet.balance < amount) {
          throw new Error('INSUFFICIENT_BALANCE');
        }

        // Insert ledger entry
        const ledgerStmt = this.db.prepare(`
          INSERT INTO wallet_ledger (user_id, type, amount, ref, description)
          VALUES (?, 'purchase', ?, ?, ?)
        `);
        ledgerStmt.run(userId, -amount, ref, description);

        // Update wallet balance
        const walletStmt = this.db.prepare(`
          UPDATE wallets 
          SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `);
        walletStmt.run(amount, userId);

        return { success: true };
      } catch (error) {
        throw error;
      }
    });

    try {
      const result = transaction();
      return {
        success: true,
        data: {
          message: 'หักเงินสำเร็จ',
          amount,
          ref
        }
      };
    } catch (error) {
      if (error.message === 'INSUFFICIENT_BALANCE') {
        return {
          success: false,
          error: {
            message: 'ยอดเงินไม่เพียงพอ',
            code: 'INSUFFICIENT_BALANCE'
          }
        };
      }
      
      console.error('Error deducting credit:', error);
      return {
        success: false,
        error: {
          message: 'ไม่สามารถหักเงินได้',
          details: error.message
        }
      };
    }
  }

  // Refund credit to wallet
  async refundCredit(userId, amount, ref, description = 'คืนเงิน') {
    const transaction = this.db.transaction(() => {
      try {
        // Insert ledger entry
        const ledgerStmt = this.db.prepare(`
          INSERT INTO wallet_ledger (user_id, type, amount, ref, description)
          VALUES (?, 'refund', ?, ?, ?)
        `);
        ledgerStmt.run(userId, amount, ref, description);

        // Update wallet balance
        const walletStmt = this.db.prepare(`
          UPDATE wallets 
          SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `);
        walletStmt.run(amount, userId);

        return { success: true };
      } catch (error) {
        throw error;
      }
    });

    try {
      const result = transaction();
      return {
        success: true,
        data: {
          message: 'คืนเงินสำเร็จ',
          amount,
          ref
        }
      };
    } catch (error) {
      console.error('Error refunding credit:', error);
      return {
        success: false,
        error: {
          message: 'ไม่สามารถคืนเงินได้',
          details: error.message
        }
      };
    }
  }

  // Check if user has sufficient balance
  async hasSufficientBalance(userId, amount) {
    try {
      const stmt = this.db.prepare(`
        SELECT balance FROM wallets WHERE user_id = ?
      `);
      const result = stmt.get(userId);
      
      return {
        success: true,
        data: {
          hasSufficient: result ? result.balance >= amount : false,
          currentBalance: result ? result.balance : 0,
          requiredAmount: amount
        }
      };
    } catch (error) {
      console.error('Error checking balance:', error);
      return {
        success: false,
        error: {
          message: 'ไม่สามารถตรวจสอบยอดเงินได้',
          details: error.message
        }
      };
    }
  }

  // Create wallet for new user
  async createWallet(userId) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO wallets (user_id, balance)
        VALUES (?, 0)
      `);
      stmt.run(userId);

      return {
        success: true,
        data: {
          message: 'สร้างกระเป๋าเงินสำเร็จ'
        }
      };
    } catch (error) {
      console.error('Error creating wallet:', error);
      return {
        success: false,
        error: {
          message: 'ไม่สามารถสร้างกระเป๋าเงินได้',
          details: error.message
        }
      };
    }
  }
}

module.exports = WalletService;
