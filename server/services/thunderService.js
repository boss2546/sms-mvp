// Thunder API Service - Slip Verification
const axios = require('axios');
const FormData = require('form-data');

class ThunderService {
    constructor(database) {
        this.db = database;
        this.apiKey = 'c45a5db7-e073-4022-9786-4448688d85be';
        this.baseUrl = 'https://api.thunder.in.th/v1';
    }

    // Verify bank slip by payload
    async verifyByPayload(payload, checkDuplicate = true) {
        try {
            const response = await axios.get(`${this.baseUrl}/verify`, {
                params: {
                    payload: payload,
                    checkDuplicate: checkDuplicate
                },
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                },
                timeout: 30000
            });

            return {
                success: true,
                data: response.data.data,
                status: response.data.status
            };

        } catch (error) {
            console.error('❌ Thunder API payload verification error:', error.response?.data || error.message);
            return {
                success: false,
                error: this.mapThunderError(error.response?.data || error.message),
                status: error.response?.status || 500
            };
        }
    }

    // Verify bank slip by image file
    async verifyByImage(imageBuffer, checkDuplicate = true) {
        try {
            const formData = new FormData();
            formData.append('file', imageBuffer, {
                filename: 'slip.jpg',
                contentType: 'image/jpeg'
            });
            formData.append('checkDuplicate', checkDuplicate);

            const response = await axios.post(`${this.baseUrl}/verify`, formData, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    ...formData.getHeaders()
                },
                timeout: 30000
            });

            return {
                success: true,
                data: response.data.data,
                status: response.data.status
            };

        } catch (error) {
            console.error('❌ Thunder API image verification error:', error.response?.data || error.message);
            return {
                success: false,
                error: this.mapThunderError(error.response?.data || error.message),
                status: error.response?.status || 500
            };
        }
    }

    // Verify bank slip by base64
    async verifyByBase64(base64Image, checkDuplicate = true) {
        try {
            const response = await axios.post(`${this.baseUrl}/verify`, {
                image: base64Image,
                checkDuplicate: checkDuplicate
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            return {
                success: true,
                data: response.data.data,
                status: response.data.status
            };

        } catch (error) {
            console.error('❌ Thunder API base64 verification error:', error.response?.data || error.message);
            return {
                success: false,
                error: this.mapThunderError(error.response?.data || error.message),
                status: error.response?.status || 500
            };
        }
    }

    // Verify bank slip by URL
    async verifyByUrl(imageUrl, checkDuplicate = true) {
        try {
            const response = await axios.post(`${this.baseUrl}/verify`, {
                url: imageUrl,
                checkDuplicate: checkDuplicate
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            return {
                success: true,
                data: response.data.data,
                status: response.data.status
            };

        } catch (error) {
            console.error('❌ Thunder API URL verification error:', error.response?.data || error.message);
            return {
                success: false,
                error: this.mapThunderError(error.response?.data || error.message),
                status: error.response?.status || 500
            };
        }
    }

    // Verify TrueMoney wallet slip
    async verifyTrueWallet(imageBuffer, checkDuplicate = true) {
        try {
            const formData = new FormData();
            formData.append('file', imageBuffer, {
                filename: 'truewallet_slip.jpg',
                contentType: 'image/jpeg'
            });
            formData.append('checkDuplicate', checkDuplicate);

            const response = await axios.post(`${this.baseUrl}/verify/truewallet`, formData, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    ...formData.getHeaders()
                },
                timeout: 30000
            });

            return {
                success: true,
                data: response.data.data,
                status: response.data.status
            };

        } catch (error) {
            console.error('❌ Thunder API TrueWallet verification error:', error.response?.data || error.message);
            return {
                success: false,
                error: this.mapThunderError(error.response?.data || error.message),
                status: error.response?.status || 500
            };
        }
    }

    // Map Thunder API errors to user-friendly messages
    mapThunderError(error) {
        if (typeof error === 'string') {
            const errorMappings = {
                'invalid_payload': 'ข้อมูลสลิปไม่ถูกต้อง',
                'invalid_image': 'ไฟล์ภาพไม่ถูกต้อง',
                'invalid_check_duplicate': 'การตั้งค่าการตรวจสอบซ้ำไม่ถูกต้อง',
                'duplicate_slip': 'สลิปนี้เคยถูกใช้แล้ว',
                'image_size_too_large': 'ขนาดไฟล์ภาพใหญ่เกินไป',
                'invalid_url': 'URL รูปภาพไม่ถูกต้องหรือไม่ได้รับอนุญาต',
                'invalid_transaction_id': 'หมายเลขรายการไม่ถูกต้อง',
                'invalid_amount': 'จำนวนเงินไม่ถูกต้อง',
                'invalid_sender_name': 'ชื่อผู้โอนไม่ตรงกับข้อมูลในระบบ',
                'invalid_receiver_name': 'ชื่อผู้รับไม่ตรงกับข้อมูลในระบบ',
                'invalid_receiver_phone': 'เบอร์โทรของผู้รับไม่ถูกต้อง',
                'unauthorized': 'API Key ไม่ถูกต้อง',
                'access_denied': 'ไม่มีสิทธิ์ใช้งาน API',
                'account_not_verified': 'บัญชียังไม่ได้ทำการยืนยัน KYC',
                'application_expired': 'ระยะเวลาการใช้งานหมดอายุ',
                'application_deactivated': 'แอปพลิเคชันถูกปิดใช้งาน',
                'quota_exceeded': 'ใช้โควต้าเกินกำหนด',
                'slip_not_found': 'ไม่พบข้อมูลสลิปในระบบ',
                'qrcode_not_found': 'QR Code ไม่ถูกต้องหรือไม่รองรับ',
                'server_error': 'ข้อผิดพลาดของเซิร์ฟเวอร์',
                'api_server_error': 'ข้อผิดพลาดของระบบ API'
            };

            return errorMappings[error] || `ข้อผิดพลาด: ${error}`;
        }

        if (error.error) {
            return this.mapThunderError(error.error);
        }

        return 'ข้อผิดพลาดไม่ทราบสาเหตุ';
    }

    // Extract amount from verification result
    extractAmount(verificationData) {
        if (!verificationData || !verificationData.amount) {
            return null;
        }

        return {
            amount: parseFloat(verificationData.amount.amount || 0),
            currency: 'THB', // Thunder API returns THB amounts
            originalAmount: verificationData.amount.amount
        };
    }

    // Validate slip age (based on supported transfer-slip age)
    validateSlipAge(verificationData) {
        if (!verificationData || !verificationData.date) {
            return { valid: false, reason: 'ไม่พบวันที่ในสลิป' };
        }

        const slipDate = new Date(verificationData.date);
        const now = new Date();
        const ageInDays = Math.floor((now - slipDate) / (1000 * 60 * 60 * 24));

        // Check against supported slip age (most banks support 7-30 days)
        if (ageInDays > 30) {
            return { 
                valid: false, 
                reason: `สลิปเก่าเกินไป (${ageInDays} วัน) - รองรับสูงสุด 30 วัน` 
            };
        }

        return { valid: true, ageInDays };
    }
}

module.exports = ThunderService;
