const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ThunderService = require('../services/thunder');
const WalletService = require('../services/wallet');
const { getDb } = require('../db/init');

const router = express.Router();
const thunderService = new ThunderService();
const walletService = new WalletService();
const db = getDb();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif').split(',');
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('ประเภทไฟล์ไม่ถูกต้อง'), false);
    }
  }
});

// Initiate top-up request
router.post('/initiate', async (req, res) => {
  try {
    const { amount, method, meta } = req.body;
    const userId = req.user?.id || 1; // Mock user ID for MVP

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'จำนวนเงินไม่ถูกต้อง'
        }
      });
    }

    if (!method || !['bank', 'truewallet'].includes(method)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'วิธีการเติมเงินไม่ถูกต้อง'
        }
      });
    }

    // Create top-up request
    const stmt = db.prepare(`
      INSERT INTO topup_requests (user_id, amount, method, status)
      VALUES (?, ?, ?, 'pending')
    `);
    const result = stmt.run(userId, amount, method);
    const topupId = result.lastInsertRowid;

    res.json({
      success: true,
      data: {
        topupId,
        amount,
        method,
        status: 'pending',
        uploadOptions: {
          image: 'Upload image file',
          base64: 'Send base64 encoded image',
          url: 'Send image URL',
          payload: 'Send QR payload',
          truewallet: method === 'truewallet' ? 'Upload TrueMoney slip' : null
        }
      }
    });
  } catch (error) {
    console.error('Error initiating top-up:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'ไม่สามารถเริ่มต้นการเติมเงินได้',
        details: error.message
      }
    });
  }
});

// Verify top-up with different methods
router.post('/verify', upload.single('file'), async (req, res) => {
  try {
    const { topupId, type, base64, url, payload, checkDuplicate = true } = req.body;
    const userId = req.user?.id || 1; // Mock user ID for MVP

    // Get top-up request
    const topupStmt = db.prepare(`
      SELECT * FROM topup_requests WHERE id = ? AND user_id = ?
    `);
    const topupRequest = topupStmt.get(topupId, userId);

    if (!topupRequest) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'ไม่พบคำขอเติมเงิน'
        }
      });
    }

    if (topupRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'คำขอเติมเงินนี้ได้รับการประมวลผลแล้ว'
        }
      });
    }

    let thunderResult;

    try {
      // Call Thunder API based on verification type
      switch (type) {
        case 'image':
          if (!req.file) {
            throw new Error('ไม่พบไฟล์ภาพ');
          }
          thunderResult = await thunderService.verifyByImage(req.file.path, checkDuplicate);
          break;

        case 'base64':
          if (!base64) {
            throw new Error('ไม่พบข้อมูล base64');
          }
          thunderResult = await thunderService.verifyByBase64(base64, checkDuplicate);
          break;

        case 'url':
          if (!url) {
            throw new Error('ไม่พบ URL รูปภาพ');
          }
          thunderResult = await thunderService.verifyByUrl(url, checkDuplicate);
          break;

        case 'payload':
          if (!payload) {
            throw new Error('ไม่พบ QR payload');
          }
          thunderResult = await thunderService.verifyByPayload(payload, checkDuplicate);
          break;

        case 'truewallet':
          if (!req.file) {
            throw new Error('ไม่พบไฟล์สลิป TrueMoney');
          }
          thunderResult = await thunderService.verifyTrueWallet(req.file.path, checkDuplicate);
          break;

        default:
          throw new Error('ประเภทการยืนยันไม่ถูกต้อง');
      }

      if (thunderResult.success) {
        // Extract amount from Thunder response
        const thunderAmount = thunderResult.data.data?.amount?.amount || 0;
        const thunderTransRef = thunderResult.data.data?.transRef || thunderResult.data.data?.transactionId;
        
        // Verify amount matches
        if (Math.abs(thunderAmount - topupRequest.amount) > 0.01) {
          // Update top-up request as failed
          const updateStmt = db.prepare(`
            UPDATE topup_requests 
            SET status = 'failed', 
                error_message = ?, 
                thunder_raw_response = ?,
                verified_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `);
          updateStmt.run(
            'จำนวนเงินไม่ตรงกับสลิป',
            JSON.stringify(thunderResult.data),
            topupId
          );

          return res.json({
            success: false,
            error: {
              message: 'จำนวนเงินในสลิปไม่ตรงกับที่ระบุ',
              details: `สลิป: ${thunderAmount}, ระบุ: ${topupRequest.amount}`
            }
          });
        }

        // Update top-up request as verified
        const updateStmt = db.prepare(`
          UPDATE topup_requests 
          SET status = 'verified', 
              thunder_ref = ?,
              thunder_trans_ref = ?,
              thunder_raw_response = ?,
              verified_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        updateStmt.run(
          thunderResult.data.data?.payload || thunderResult.data.data?.transactionId,
          thunderTransRef,
          JSON.stringify(thunderResult.data),
          topupId
        );

        // Add credit to wallet
        const creditResult = await walletService.addCredit(
          userId,
          topupRequest.amount,
          topupId.toString(),
          `เติมเงินผ่าน${topupRequest.method === 'bank' ? 'ธนาคาร' : 'TrueMoney'}`
        );

        if (!creditResult.success) {
          // Rollback top-up request status
          const rollbackStmt = db.prepare(`
            UPDATE topup_requests 
            SET status = 'failed', 
                error_message = ?
            WHERE id = ?
          `);
          rollbackStmt.run('ไม่สามารถเพิ่มเครดิตได้', topupId);

          return res.json({
            success: false,
            error: {
              message: 'ไม่สามารถเพิ่มเครดิตได้',
              details: creditResult.error.message
            }
          });
        }

        // Clean up uploaded file
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        res.json({
          success: true,
          data: {
            message: 'ยืนยันสลิปสำเร็จ',
            topupId,
            amount: topupRequest.amount,
            status: 'verified',
            thunderData: {
              transRef: thunderTransRef,
              amount: thunderAmount,
              date: thunderResult.data.data?.date
            }
          }
        });
      } else {
        // Update top-up request as failed
        const updateStmt = db.prepare(`
          UPDATE topup_requests 
          SET status = 'failed', 
              error_message = ?,
              thunder_raw_response = ?,
              verified_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        updateStmt.run(
          thunderResult.error.message,
          JSON.stringify(thunderResult.error),
          topupId
        );

        // Clean up uploaded file
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        res.json({
          success: false,
          error: {
            message: thunderResult.error.message,
            code: thunderResult.error.code,
            details: thunderResult.error.details
          }
        });
      }
    } catch (error) {
      console.error('Thunder verification error:', error);

      // Update top-up request as failed
      const updateStmt = db.prepare(`
        UPDATE topup_requests 
        SET status = 'failed', 
            error_message = ?,
            verified_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      updateStmt.run(error.message, topupId);

      // Clean up uploaded file
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        error: {
          message: 'เกิดข้อผิดพลาดในการยืนยันสลิป',
          details: error.message
        }
      });
    }
  } catch (error) {
    console.error('Error verifying top-up:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'ไม่สามารถยืนยันสลิปได้',
        details: error.message
      }
    });
  }
});

// Get top-up status
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 1; // Mock user ID for MVP

    const stmt = db.prepare(`
      SELECT 
        id,
        amount,
        method,
        status,
        error_message,
        created_at,
        verified_at,
        thunder_trans_ref
      FROM topup_requests 
      WHERE id = ? AND user_id = ?
    `);
    const topupRequest = stmt.get(id, userId);

    if (!topupRequest) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'ไม่พบคำขอเติมเงิน'
        }
      });
    }

    res.json({
      success: true,
      data: topupRequest
    });
  } catch (error) {
    console.error('Error getting top-up status:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'ไม่สามารถดึงสถานะการเติมเงินได้',
        details: error.message
      }
    });
  }
});

module.exports = router;
