const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class ThunderService {
  constructor() {
    this.baseURL = process.env.THUNDER_BASE_URL || 'https://api.thunder.in.th/v1';
    this.apiKey = process.env.THUNDER_API_KEY;
    
    if (!this.apiKey) {
      throw new Error('THUNDER_API_KEY is required');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
  }

  // Get application info and quota
  async getMe() {
    try {
      const response = await this.client.get('/me');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Verify bank slip by QR payload
  async verifyByPayload(payload, checkDuplicate = true) {
    try {
      const response = await this.client.get('/verify', {
        params: {
          payload,
          checkDuplicate
        }
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Verify bank slip by image file
  async verifyByImage(imagePath, checkDuplicate = true) {
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(imagePath));
      formData.append('checkDuplicate', checkDuplicate);

      const response = await this.client.post('/verify', formData, {
        headers: {
          ...formData.getHeaders()
        }
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Verify bank slip by base64 image
  async verifyByBase64(imageBase64, checkDuplicate = true) {
    try {
      const response = await this.client.post('/verify', {
        image: imageBase64,
        checkDuplicate
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Verify bank slip by image URL
  async verifyByUrl(imageUrl, checkDuplicate = true) {
    try {
      const response = await this.client.post('/verify', {
        url: imageUrl,
        checkDuplicate
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Verify TrueMoney wallet slip
  async verifyTrueWallet(imagePath, checkDuplicate = true) {
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(imagePath));
      formData.append('checkDuplicate', checkDuplicate);

      const response = await this.client.post('/verify/truewallet', formData, {
        headers: {
          ...formData.getHeaders()
        }
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Handle API errors and map to user-friendly messages
  handleError(error) {
    console.error('Thunder API Error:', error.response?.data || error.message);

    if (error.response) {
      const { status, data } = error.response;
      
      // Map error codes to Thai messages
      const errorMessages = {
        'invalid_payload': 'ข้อมูล QR Code ไม่ถูกต้อง',
        'invalid_image': 'ไฟล์ภาพไม่ถูกต้อง',
        'invalid_check_duplicate': 'การตรวจสอบซ้ำไม่ถูกต้อง',
        'duplicate_slip': 'สลิปนี้ถูกใช้แล้ว กรุณาใช้สลิปใหม่',
        'image_size_too_large': 'ขนาดไฟล์ภาพใหญ่เกินไป',
        'invalid_url': 'URL รูปภาพไม่ถูกต้อง',
        'invalid_transaction_id': 'หมายเลขรายการไม่ถูกต้อง',
        'invalid_amount': 'จำนวนเงินไม่ถูกต้อง',
        'invalid_sender_name': 'ชื่อผู้โอนไม่ตรงกับข้อมูลในระบบ',
        'invalid_receiver_name': 'ชื่อผู้รับไม่ตรงกับข้อมูลในระบบ',
        'invalid_receiver_phone': 'เบอร์โทรของผู้รับไม่ถูกต้อง',
        'unauthorized': 'API Key ไม่ถูกต้อง',
        'access_denied': 'ไม่มีสิทธิ์ใช้งาน API นี้',
        'account_not_verified': 'บัญชียังไม่ได้ทำการยืนยัน',
        'application_expired': 'แอปพลิเคชันหมดอายุ',
        'application_deactivated': 'แอปพลิเคชันถูกปิดใช้งาน',
        'quota_exceeded': 'ใช้โควต้าเกินกำหนดแล้ว',
        'slip_not_found': 'ไม่พบข้อมูลสลิป',
        'qrcode_not_found': 'QR Code ไม่ถูกต้องหรือไม่รองรับ',
        'server_error': 'เกิดข้อผิดพลาดในระบบ',
        'api_server_error': 'เกิดข้อผิดพลาดใน API'
      };

      const errorCode = data?.error || 'unknown_error';
      const message = errorMessages[errorCode] || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';

      return {
        success: false,
        error: {
          code: errorCode,
          message,
          status,
          details: data
        }
      };
    }

    return {
      success: false,
      error: {
        code: 'network_error',
        message: 'ไม่สามารถเชื่อมต่อกับ Thunder API ได้',
        status: 0,
        details: error.message
      }
    };
  }
}

module.exports = ThunderService;
