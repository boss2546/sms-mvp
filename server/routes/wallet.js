const express = require('express');
const WalletService = require('../services/wallet');

const router = express.Router();
const walletService = new WalletService();

// Get wallet balance
router.get('/balance', async (req, res) => {
  try {
    const userId = req.user?.id || 1; // Mock user ID for MVP
    const result = await walletService.getBalance(userId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error getting balance:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'ไม่สามารถดึงยอดเงินได้',
        details: error.message
      }
    });
  }
});

// Get wallet transactions
router.get('/transactions', async (req, res) => {
  try {
    const userId = req.user?.id || 1; // Mock user ID for MVP
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const result = await walletService.getTransactions(userId, limit, offset);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'ไม่สามารถดึงประวัติการทำรายการได้',
        details: error.message
      }
    });
  }
});

// Check if user has sufficient balance for purchase
router.post('/check-balance', async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user?.id || 1; // Mock user ID for MVP

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'จำนวนเงินไม่ถูกต้อง'
        }
      });
    }

    const result = await walletService.hasSufficientBalance(userId, amount);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error checking balance:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'ไม่สามารถตรวจสอบยอดเงินได้',
        details: error.message
      }
    });
  }
});

// Deduct credit for purchase
router.post('/deduct', async (req, res) => {
  try {
    const { amount, ref, description } = req.body;
    const userId = req.user?.id || 1; // Mock user ID for MVP

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'จำนวนเงินไม่ถูกต้อง'
        }
      });
    }

    if (!ref) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'ต้องระบุหมายเลขอ้างอิง'
        }
      });
    }

    const result = await walletService.deductCredit(
      userId,
      amount,
      ref,
      description || 'ซื้อบริการ'
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error deducting credit:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'ไม่สามารถหักเงินได้',
        details: error.message
      }
    });
  }
});

// Refund credit
router.post('/refund', async (req, res) => {
  try {
    const { amount, ref, description } = req.body;
    const userId = req.user?.id || 1; // Mock user ID for MVP

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'จำนวนเงินไม่ถูกต้อง'
        }
      });
    }

    if (!ref) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'ต้องระบุหมายเลขอ้างอิง'
        }
      });
    }

    const result = await walletService.refundCredit(
      userId,
      amount,
      ref,
      description || 'คืนเงิน'
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error refunding credit:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'ไม่สามารถคืนเงินได้',
        details: error.message
      }
    });
  }
});

module.exports = router;
