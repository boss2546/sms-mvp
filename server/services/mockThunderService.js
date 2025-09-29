// Mock Thunder Service for testing when real API is unavailable
const fs = require('fs');

class MockThunderService {
    constructor(database) {
        this.db = database;
        console.log('🔧 Mock Thunder Service initialized');
    }

    // Mock verification by image file
    async verifyByImage(imageBuffer, checkDuplicate = true) {
        try {
            console.log('🔍 Mock verifying slip...');
            console.log('  - Buffer size:', imageBuffer.length, 'bytes');
            console.log('  - Check duplicate:', checkDuplicate);
            
            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Mock successful verification - always succeed for testing
            console.log('🔍 Mock simulating successful slip verification');
            
            // Mock successful verification with random amount
            const mockAmounts = [100, 200, 500, 1000, 1500, 2000, 2500, 3000];
            const randomAmount = mockAmounts[Math.floor(Math.random() * mockAmounts.length)];
            
            const mockResult = {
                success: true,
                data: {
                    payload: "00020101021229370016A0000006770101110113006665918355853037645407" + randomAmount + ".005802TH63042E40",
                    transRef: "MOCK" + Date.now(),
                    date: new Date().toISOString(),
                    countryCode: "TH",
                    amount: {
                        amount: randomAmount,
                        local: {
                            amount: randomAmount,
                            currency: "THB"
                        }
                    },
                    fee: 0,
                    ref1: "",
                    ref2: "",
                    ref3: "",
                    sender: {
                        bank: {
                            id: "006",
                            name: "ธนาคารกรุงไทย",
                            short: "KTB"
                        },
                        account: {
                            name: {
                                th: "นายรัชชานนท์ รัตนวิจิตร",
                                en: "MR. RATCHANON RATTANAWICIT"
                            },
                            bank: {
                                type: "BANKAC",
                                account: "8080666601"
                            }
                        }
                    },
                    receiver: {
                        bank: {
                            id: "006",
                            name: "ธนาคารกรุงไทย",
                            short: "KTB"
                        },
                        account: {
                            name: {
                                th: "บริษัท SMS Verification จำกัด"
                            },
                            bank: {
                                type: "BANKAC",
                                account: "1234567890"
                            },
                            proxy: {
                                type: "EWALLETID",
                                account: "SMSVERIFICATION"
                            }
                        }
                    }
                },
                status: 200
            };
            
            console.log('✅ Mock verification successful - Amount:', randomAmount, 'THB');
            return mockResult;

        } catch (error) {
            console.error('❌ Mock verification error:', error.message);
            return {
                success: false,
                error: 'MOCK_ERROR',
                message: 'Mock verification failed: ' + error.message
            };
        }
    }

    // Mock verification by payload
    async verifyByPayload(payload, checkDuplicate = true) {
        try {
            console.log('🔍 Mock verifying payload...');
            console.log('  - Payload:', payload);
            
            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Extract amount from payload if possible
            let amount = 1000; // Default amount
            const amountMatch = payload.match(/5407(\d+\.?\d*)5802TH/);
            if (amountMatch) {
                amount = parseFloat(amountMatch[1]);
            }
            
            const mockResult = {
                success: true,
                data: {
                    payload: payload,
                    transRef: "MOCK" + Date.now(),
                    date: new Date().toISOString(),
                    countryCode: "TH",
                    amount: {
                        amount: amount,
                        local: {
                            amount: amount,
                            currency: "THB"
                        }
                    },
                    fee: 0,
                    ref1: "",
                    ref2: "",
                    ref3: "",
                    sender: {
                        bank: {
                            id: "006",
                            name: "ธนาคารกรุงไทย",
                            short: "KTB"
                        },
                        account: {
                            name: {
                                th: "นายรัชชานนท์ รัตนวิจิตร",
                                en: "MR. RATCHANON RATTANAWICIT"
                            },
                            bank: {
                                type: "BANKAC",
                                account: "8080666601"
                            }
                        }
                    },
                    receiver: {
                        bank: {
                            id: "006",
                            name: "ธนาคารกรุงไทย",
                            short: "KTB"
                        },
                        account: {
                            name: {
                                th: "บริษัท SMS Verification จำกัด"
                            },
                            bank: {
                                type: "BANKAC",
                                account: "1234567890"
                            },
                            proxy: {
                                type: "EWALLETID",
                                account: "SMSVERIFICATION"
                            }
                        }
                    }
                },
                status: 200
            };
            
            console.log('✅ Mock payload verification successful - Amount:', amount, 'THB');
            return mockResult;

        } catch (error) {
            console.error('❌ Mock payload verification error:', error.message);
            return {
                success: false,
                error: 'MOCK_ERROR',
                message: 'Mock payload verification failed: ' + error.message
            };
        }
    }

    // Extract amount from verification result
    extractAmount(verificationData) {
        if (!verificationData || !verificationData.amount) {
            return null;
        }

        return {
            amount: parseFloat(verificationData.amount.amount || 0),
            currency: 'THB',
            originalAmount: verificationData.amount.amount
        };
    }

    // Validate slip age (mock - always valid)
    validateSlipAge(verificationData) {
        return { valid: true, ageInDays: 0 };
    }

    // Map errors (mock - simplified)
    mapThunderError(error) {
        console.log('🔍 Mock mapping error:', error);
        
        if (typeof error === 'object' && error.message) {
            const errorMappings = {
                'application_expired': 'บัญชีหมดอายุ กรุณาติดต่อผู้ดูแลระบบ',
                'quota_exceeded': 'ใช้โควต้าเกินกำหนด',
                'unauthorized': 'API Key ไม่ถูกต้อง',
                'access_denied': 'ไม่มีสิทธิ์ใช้งาน API',
                'invalid_image': 'ไฟล์ภาพไม่ถูกต้อง',
                'duplicate_slip': 'สลิปนี้เคยถูกใช้แล้ว',
                'slip_not_found': 'ไม่พบข้อมูลสลิปในระบบ',
                'qrcode_not_found': 'QR Code ไม่ถูกต้องหรือไม่รองรับ'
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
                'api_server_error': 'ข้อผิดพลาดของ API'
            };
            
            const mappedError = errorMappings[error];
            if (mappedError) {
                return mappedError;
            }
        }
        
        return 'ข้อผิดพลาดไม่ทราบสาเหตุ';
    }

    // Mock top-up verification
    async verifyTopupByImage(userId, file) {
        try {
            console.log('🔍 Mock verifying top-up by image for user:', userId);
            
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
            
            // Verify slip using mock service
            const verificationResult = await this.verifyByImage(imageBuffer, true);
            
            if (!verificationResult.success) {
                console.error('❌ Mock verification failed:', verificationResult);
                return {
                    success: false,
                    error: verificationResult.error || 'MOCK_VERIFICATION_FAILED',
                    message: verificationResult.error || 'การตรวจสอบสลิปล้มเหลว'
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
                    message: 'สลิปเก่าเกินไป กรุณาใช้สลิปใหม่'
                };
            }

            console.log('✅ Mock top-up verification successful:', amountInfo);

            return {
                success: true,
                amount: amountInfo.amount,
                currency: amountInfo.currency,
                transactionRef: verificationData.transRef,
                date: verificationData.date,
                verificationData: verificationData
            };

        } catch (error) {
            console.error('❌ Mock top-up verification error:', error);
            return {
                success: false,
                error: 'MOCK_ERROR',
                message: 'Mock verification failed: ' + error.message
            };
        }
    }
}

module.exports = MockThunderService;
