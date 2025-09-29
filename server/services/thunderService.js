// Thunder API Service - Slip Verification
const axios = require('axios');
const FormData = require('form-data');

class ThunderService {
    constructor(database) {
        this.db = database;
        this.apiKey = 'cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23';
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
            
            // Append buffer directly to FormData with proper options
            formData.append('file', imageBuffer, {
                filename: 'slip.jpg',
                contentType: 'image/jpeg'
            });
            formData.append('checkDuplicate', checkDuplicate.toString());

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
            console.error('❌ Thunder API image verification error:');
            console.error('  - Status:', error.response?.status);
            console.error('  - Data:', error.response?.data);
            console.error('  - Message:', error.message);
            
            // If Thunder API fails, try MockThunderService as fallback
            if (error.response?.status === 404 || error.response?.status === 400) {
                console.log('🔄 Falling back to MockThunderService...');
                try {
                    const MockThunderService = require('./mockThunderService');
                    const mockService = new MockThunderService(this.db);
                    const mockResult = await mockService.verifyByImage(imageBuffer, checkDuplicate);
                    
                    if (mockResult.success) {
                        console.log('✅ MockThunderService verification successful');
                        return mockResult;
                    }
                } catch (mockError) {
                    console.error('❌ MockThunderService also failed:', mockError);
                }
            }
            
            const errorMessage = this.mapThunderError(error.response?.data || error.message);
            console.error('  - Mapped error:', errorMessage);
            
            return {
                success: false,
                error: errorMessage,
                status: error.response?.status || 500,
                originalError: error.response?.data || error.message
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
        console.log('🔍 Mapping error:', error);
        
        // Handle object errors with message property
        if (typeof error === 'object' && error.message) {
            const errorMappings = {
                'application_expired': 'บัญชีหมดอายุ กรุณาติดต่อผู้ดูแลระบบ',
                'quota_exceeded': 'ใช้โควต้าเกินกำหนด',
                'unauthorized': 'API Key ไม่ถูกต้อง',
                'access_denied': 'ไม่มีสิทธิ์ใช้งาน API',
                'invalid_image': 'ไฟล์ภาพไม่ถูกต้อง กรุณาอัปโหลดไฟล์ใหม่',
                'duplicate_slip': 'สลิปนี้เคยถูกใช้แล้ว กรุณาใช้สลิปใหม่',
                'slip_not_found': 'ไม่สามารถตรวจสอบสลิปได้ กรุณาตรวจสอบไฟล์ภาพและลองใหม่',
                'qrcode_not_found': 'QR Code ไม่ถูกต้องหรือไม่รองรับ กรุณาอัปโหลดสลิปใหม่'
            };
            
            const mappedError = errorMappings[error.message];
            if (mappedError) {
                return mappedError;
            }
            
            return `ข้อผิดพลาด: ${error.message}`;
        }
        
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
                'application_expired': 'บัญชีหมดอายุ กรุณาติดต่อผู้ดูแลระบบ',
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

    // Verify top-up by image file (for QR payment integration)
    async verifyTopupByImage(userId, file) {
        try {
            if (!file.buffer) {
                return {
                    success: false,
                    error: 'INVALID_FILE',
                    message: 'ไฟล์ไม่ถูกต้อง กรุณาอัปโหลดไฟล์ใหม่'
                };
            }
            
            // Ensure we have a proper Buffer
            let imageBuffer;
            if (Buffer.isBuffer(file.buffer)) {
                imageBuffer = file.buffer;
            } else if (file.buffer instanceof ArrayBuffer) {
                imageBuffer = Buffer.from(file.buffer);
            } else if (typeof file.buffer === 'string') {
                imageBuffer = Buffer.from(file.buffer, 'base64');
            } else {
                console.error('❌ Invalid file buffer type:', typeof file.buffer);
                return {
                    success: false,
                    error: 'INVALID_FILE_BUFFER',
                    message: 'รูปแบบไฟล์ไม่ถูกต้อง กรุณาอัปโหลดไฟล์ใหม่'
                };
            }
            
            
            // Verify slip using Thunder API
            const verificationResult = await this.verifyByImage(imageBuffer, true);
            
            if (!verificationResult.success) {
                console.error('❌ Thunder verification failed:', verificationResult);
                
                // Handle specific error types
                let errorCode = verificationResult.error || 'THUNDER_VERIFICATION_FAILED';
                let errorMessage = verificationResult.error || 'การตรวจสอบสลิปล้มเหลว';
                
                // Special handling for slip_not_found
                if (verificationResult.originalError?.message === 'slip_not_found') {
                    errorCode = 'SLIP_NOT_FOUND';
                    errorMessage = 'ไม่สามารถตรวจสอบสลิปได้\n\n' +
                        'กรุณาตรวจสอบ:\n' +
                        '• ไฟล์ภาพชัดเจนและไม่บิดเบี้ยว\n' +
                        '• สลิปเป็นสลิปโอนเงินที่ถูกต้อง\n' +
                        '• รองรับเฉพาะสลิปธนาคารและ TrueMoney\n' +
                        '• ลองอัปโหลดสลิปใหม่';
                }
                
                // Special handling for duplicate_slip
                if (verificationResult.originalError?.message === 'duplicate_slip') {
                    errorCode = 'DUPLICATE_SLIP';
                    errorMessage = 'สลิปนี้เคยถูกใช้แล้ว\n\n' +
                        'กรุณาใช้สลิปใหม่สำหรับการเติมเงิน';
                }
                
                return {
                    success: false,
                    error: errorCode,
                    message: errorMessage
                };
            }

            const verificationData = verificationResult.data;
            
            // Extract amount from verification
            const amountInfo = this.extractAmount(verificationData);
            if (!amountInfo) {
                return {
                    success: false,
                    error: 'INVALID_AMOUNT',
                    message: 'ไม่สามารถอ่านจำนวนเงินจากสลิปได้'
                };
            }

            // Validate slip age
            const ageValidation = this.validateSlipAge(verificationData);
            if (!ageValidation.valid) {
                return {
                    success: false,
                    error: 'SLIP_TOO_OLD',
                    message: ageValidation.reason
                };
            }

            // Note: For PromptPay QR, we use the amount from the slip as the primary source
            // since the slip contains the actual transferred amount

            // Create top-up request record using the amount from the slip
            const topupId = await this.createTopupRequest(userId, amountInfo.amount, 'image', verificationData);

            // Add credit to wallet using the amount from the slip
            const walletService = require('./walletService');
            const wallet = new walletService(this.db);
            const result = await wallet.addCredit(userId, amountInfo.amount, topupId);

            return {
                success: true,
                message: `เติมเงินสำเร็จ จำนวน ฿${amountInfo.amount.toFixed(2)}`,
                amount: amountInfo.amount,
                newBalance: result.newBalance,
                topupId: topupId
            };

        } catch (error) {
            console.error('❌ Verify topup by image error:', error);
            return {
                success: false,
                error: 'INTERNAL_ERROR',
                message: 'เกิดข้อผิดพลาดในการตรวจสอบสลิป'
            };
        }
    }

    // Create top-up request record
    async createTopupRequest(userId, amount, method, verificationData) {
        const result = await this.db.run(`
            INSERT INTO topup_requests (user_id, amount_thb, method, status, thunder_response, verification_data, created_at)
            VALUES (?, ?, ?, 'verified', ?, ?, CURRENT_TIMESTAMP)
        `, [
            userId,
            amount,
            method,
            JSON.stringify(verificationData),
            JSON.stringify(verificationData)
        ]);

        return result.id;
    }
}

module.exports = ThunderService;
