# Thunder Developer API Documentation

## Overview
Thunder Developer API คือเครื่องมือที่ช่วยให้นักพัฒนาสามารถตรวจสอบสลิปโอนเงินจาก ธนาคาร และ Truemoney Wallet ได้อย่างง่ายดาย และแม่นยำ คู่มือนี้จะช่วยให้คุณเข้าใจวิธีการใช้งาน API โดยมีข้อมูลสำคัญดังนี้

**Base URL:** `https://api.thunder.in.th/v1`

**API Key:** `cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23`

## Authentication
All requests must include an Authorization header with a valid Bearer token.

ทุกคำขอที่ส่งไปยัง API ต้องมีการยืนยันตัวตนโดยใช้ Authorization Header ที่ประกอบด้วย Bearer Token ที่ถูกต้อง ดังตัวอย่างด้านล่าง

```
Authorization: Bearer cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23
```

## API Endpoints

### 1. Me (ข้อมูลเกี่ยวกับแอปพลิเคชัน)
Get application informations

**URL:** `/me`  
**Method:** `GET`  
**Headers:**
```
Authorization: Bearer cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23
```

**Request Example:**
```bash
curl --location 'https://api.thunder.in.th/v1/me' \
--header 'Authorization: Bearer cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23'
```

**Response Type:**
```typescript
type Data = {
    status: number
    data: {
        application: string
        usedQuota: number
        maxQuota: number
        remainingQuota: number
        expiredAt: string
        currentCredit: number
    }
}
```

**Success Response (HTTP 200):**
```json
{
  "status": 200,
  "data": {
    "application": "Thunder Developer",
    "usedQuota": 16,
    "maxQuota": 35000,
    "remainingQuota": 34984,
    "expiredAt": "2024-02-22T18:47:34+07:00",
    "currentCredit": 1000
  }
}
```

### 2. Verify Bank Slip By Payload
Send a qr code payload for verification

**URL:** `/verify`  
**Method:** `GET`  
**Headers:**
```
Authorization: Bearer cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23
```

**Query Parameters:**
- `payload` (string, required): Data read from qr code
- `checkDuplicate` (boolean, optional): Check duplicate

**Request Example:**
```bash
curl --location 'https://api.thunder.in.th/v1/verify?payload=PAYLOAD' \
--header 'Authorization: Bearer cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23'
```

**Response Type:**
```typescript
type Data = {
    status: number
    data: {
        payload: string
        transRef: string
        date: string
        countryCode: string
        amount: {
            amount: number
            local: {
                amount?: number
                currency?: string
            }
        }
        fee?: number
        ref1?: string
        ref2?: string
        ref3?: string
        sender: {
            bank: {
                id?: string
                name?: string
                short?: string
            }
            account: {
                name: {
                    th?: string
                    en?: string
                }
                bank?: {
                    type: 'BANKAC' | 'TOKEN' | 'DUMMY'
                    account: string
                }
                proxy?: {
                    type: 'NATID' | 'MSISDN' | 'EWALLETID' | 'EMAIL' | 'BILLERID'
                    account: string
                }
            }
        }
        receiver: {
            bank: {
                id: string
                name?: string
                short?: string
            }
            account: {
                name: {
                    th?: string
                    en?: string
                }
                bank?: {
                    type: 'BANKAC' | 'TOKEN' | 'DUMMY'
                    account: string
                }
                proxy?: {
                    type: 'NATID' | 'MSISDN' | 'EWALLETID' | 'EMAIL' | 'BILLERID'
                    account: string
                }
            }
            merchantId?: string
        }
    }
}
```

**Success Response (HTTP 200):**
```json
{
  "status": 200,
  "data": {
    "payload": "00000000000000000000000000000000000000000000000000000000000",
    "transRef": "68370160657749I376388B35",
    "date": "2023-01-01T00:00:00+07:00",
    "countryCode": "TH",
    "amount": {
      "amount": 1000,
      "local": {
        "amount": 0,
        "currency": ""
      }
    },
    "fee": 0,
    "ref1": "",
    "ref2": "",
    "ref3": "",
    "sender": {
      "bank": {
        "id": "001",
        "name": "กสิกรไทย",
        "short": "KBANK"
      },
      "account": {
        "name": {
          "th": "นาย ธันเดอร์ มานะ",
          "en": "MR. THUNDER MANA"
        },
        "bank": {
          "type": "BANKAC",
          "account": "1234xxxx5678"
        }
      }
    },
    "receiver": {
      "bank": {
        "id": "030",
        "name": "ธนาคารออมสิน",
        "short": "GSB"
      },
      "account": {
        "name": {
          "th": "นาย ธันเดอร์ มานะ"
        },
        "bank": {
          "type": "BANKAC",
          "account": "12xxxx3456"
        },
        "proxy": {
          "type": "EWALLETID",
          "account": "123xxxxxxxx4567"
        }
      }
    }
  }
}
```

### 3. Verify Bank Slip By Image
Send a image for verification

**URL:** `/verify`  
**Method:** `POST`  
**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23
```

**Form Data:**
- `file` (file, required): Slip or QR Code image from bank
- `checkDuplicate` (boolean, optional): Check duplicate

**Request Example:**
```bash
curl --location 'https://api.thunder.in.th/v1/verify' \
--header 'Authorization: Bearer cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23' \
--form 'file=@"slip.jpg"'
```

### 4. Verify Bank Slip By Base64
Send a image for verification

**URL:** `/verify`  
**Method:** `POST`  
**Headers:**
```
Content-Type: application/json
Authorization: Bearer cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23
```

**Body (JSON):**
- `image` (string, required): Image base64 encoded
- `checkDuplicate` (boolean, optional): Check duplicate

**Request Example:**
```bash
curl --location 'https://api.thunder.in.th/v1/verify' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23' \
--data '{
    "image": "BASE64"
}'
```

### 5. Verify Bank Slip By URL
Send a image for verification

**URL:** `/verify`  
**Method:** `POST`  
**Headers:**
```
Content-Type: application/json
Authorization: Bearer cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23
```

**Body (JSON):**
- `url` (string, required): Image url
- `checkDuplicate` (boolean, optional): Check duplicate

**Request Example:**
```bash
curl --location 'https://api.thunder.in.th/v1/verify' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23' \
--data '{
    "url": "URL"
}'
```

### 6. Verify Truemoney Wallet Slip By Image
Send a image for verification

**URL:** `/verify/truewallet`  
**Method:** `POST`  
**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23
```

**Form Data:**
- `file` (file, required): Slip or QR Code image from bank
- `checkDuplicate` (boolean, optional): Check duplicate

**Request Example:**
```bash
curl --location 'https://api.thunder.in.th/v1/verify/truewallet' \
--header 'Authorization: Bearer cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23' \
--form 'file=@"slip.jpg"'
```

**Response Type:**
```typescript
type Data = {
    status: number
    data: {
        transactionId: string
        date: string
        amount: number
        sender: {
            name: string
        }
        receiver: {
            name: string
            phone: string
        }
    }
}
```

**Success Response (HTTP 200):**
```json
{
  "status": 200,
  "data": {
    "transactionId": "00000000000000",
    "date": "2023-01-01T00:00:00+07:00",
    "amount": 1000,
    "sender": {
      "name": "ธันเดอร์ มานะ"
    },
    "receiver": {
      "name": "ธันเดอร์ มานะ",
      "phone": "098-***-4321"
    }
  }
}
```

## Error Responses

### HTTP 400 Errors
| Error Code | Description |
|------------|-------------|
| `invalid_payload` | Payload ที่ส่งมาไม่ถูกต้อง |
| `invalid_image` | ไฟล์ภาพไม่ถูกต้อง |
| `invalid_check_duplicate` | checkDuplicate ที่ส่งมาไม่ถูกต้อง |
| `duplicate_slip` | สลิปซ้ำ |
| `image_size_too_large` | ขนาดไฟล์ภาพเกินกำหนด |
| `invalid_url` | รูปแบบ URL ไม่ถูกต้องหรือไม่ได้รับอนุญาต |
| `invalid_transaction_id` | หมายเลขรายการ (Transaction ID) ไม่ถูกต้อง |
| `invalid_amount` | จำนวนเงินไม่ถูกต้อง |
| `invalid_sender_name` | ชื่อผู้โอนไม่ตรงกับข้อมูลในระบบ |
| `invalid_receiver_name` | ชื่อผู้รับไม่ตรงกับข้อมูลในระบบ |
| `invalid_receiver_phone` | เบอร์โทรของผู้รับไม่ถูกต้อง |

### HTTP 401 Errors
| Error Code | Description |
|------------|-------------|
| `unauthorized` | Access Token ไม่ถูกต้องหรือไม่ได้ใส่ |

### HTTP 403 Errors
| Error Code | Description |
|------------|-------------|
| `access_denied` | บัญชีของคุณไม่มีสิทธิ์ใช้งาน API นี้ |
| `account_not_verified` | บัญชีผู้ใช้ไม่ได้ทำการยืนยัน KYC |
| `application_expired` | ระยะเวลาการใช้งานหรือการสมัครสมาชิกของแอปพลิเคชันหมดอายุ |
| `application_deactivated` | แอปพลิเคชันถูกปิดใช้งาน |
| `quota_exceeded` | คุณได้ใช้งาน API จนครบจำนวนครั้งที่โควต้าของบัญชีหรือแพ็กเกจกำหนด |

### HTTP 404 Errors
| Error Code | Description |
|------------|-------------|
| `slip_not_found` | ข้อมูลสลิปที่ส่งมาไม่ถูกต้องหรือไม่ตรงกับฐานข้อมูล |
| `qrcode_not_found` | QR Code ที่ส่งมาอาจไม่ถูกต้อง หรือรูปแบบไม่เป็นไปตามที่ระบบรองรับ |

### HTTP 500 Errors
| Error Code | Description |
|------------|-------------|
| `server_error` | มีข้อผิดพลาดภายในระบบเซิร์ฟเวอร์ |
| `api_server_error` | มีปัญหาเกี่ยวกับโครงสร้างหรือกระบวนการในระบบ API |

## Code Examples

### JavaScript Examples

#### Verify Bank Slip By Payload
```javascript
const axios = require('axios')

try {
    const { data } = await axios.get('https://api.thunder.in.th/v1/verify', {
        params: {
            payload: 'PAYLOAD',
        },
        headers: {
            Authorization: 'Bearer cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23',
        },
    })

    console.log(data)
} catch (error) {
    console.error('Error', error)
}
```

#### Verify Bank Slip By Image
```javascript
const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')

try {
    const formData = new FormData()
    formData.append('file', fs.createReadStream('IMAGE_PATH'))

    const { data } = await axios.post('https://api.thunder.in.th/v1/verify', formData, {
        headers: {
            Authorization: 'Bearer cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23',
        },
    })

    console.log(data)
} catch (error) {
    console.error('Error', error)
}
```

#### Verify Bank Slip By Base64
```javascript
const axios = require('axios')

try {
    const { data } = await axios.post(
        'https://api.thunder.in.th/v1/verify',
        {
            image: 'BASE64',
        },
        {
            headers: {
                Authorization: 'Bearer cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23',
            },
        },
    )

    console.log(data)
} catch (error) {
    console.error('Error', error)
}
```

#### Verify Bank Slip By URL
```javascript
const axios = require('axios')

try {
    const { data } = await axios.post(
        'https://api.thunder.in.th/v1/verify',
        {
            url: 'URL',
        },
        {
            headers: {
                Authorization: 'Bearer cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23',
            },
        },
    )

    console.log(data)
} catch (error) {
    console.error('Error', error)
}
```

### PHP Examples

#### Verify Bank Slip By Payload
```php
<?php

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://api.thunder.in.th/v1/verify?payload=PAYLOAD',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'GET',
  CURLOPT_HTTPHEADER => array(
    'Authorization: Bearer cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23',
  ),
));

$response = curl_exec($curl);

curl_close($curl);
echo $response;
```

#### Verify Bank Slip By Image
```php
<?php

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://api.thunder.in.th/v1/verify',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS => array('file'=> new CURLFILE('IMAGE_PATH')),
  CURLOPT_HTTPHEADER => array(
    'Authorization: Bearer cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23',
  ),
));

$response = curl_exec($curl);

curl_close($curl);
echo $response;
```

#### Verify Bank Slip By Base64
```php
<?php

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://api.thunder.in.th/v1/verify',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS =>'{
    "image": "BASE64"
}',
  CURLOPT_HTTPHEADER => array(
    'Content-Type: application/json',
    'Authorization: Bearer cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23'
  ),
));

$response = curl_exec($curl);

curl_close($curl);
echo $response;
```

#### Verify Bank Slip By URL
```php
<?php

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://api.thunder.in.th/v1/verify',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS =>'{
    "url": "URL"
}',
  CURLOPT_HTTPHEADER => array(
    'Content-Type: application/json',
    'Authorization: Bearer cc8bc598-bde0-4e4c-967d-d4bdd2b9bb23'
  ),
));

$response = curl_exec($curl);

curl_close($curl);
echo $response;
```

## Bank Codes List

| Bank Code | Abbreviation | Full Name (TH) |
|-----------|--------------|----------------|
| 002 | BBL | ธนาคารกรุงเทพ |
| 004 | KBANK | ธนาคารกสิกรไทย |
| 006 | KTB | ธนาคารกรุงไทย |
| 011 | TTB | ธนาคารทหารไทยธนชาต |
| 014 | SCB | ธนาคารไทยพาณิชย์ |
| 022 | CIMBT | ธนาคารซีไอเอ็มบีไทย |
| 024 | UOBT | ธนาคารยูโอบี |
| 025 | BAY | ธนาคารกรุงศรีอยุธยา |
| 030 | GSB | ธนาคารออมสิน |
| 033 | GHB | ธนาคารอาคารสงเคราะห์ |
| 034 | BAAC | ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร |
| 035 | EXIM | ธนาคารเพื่อการส่งออกและนำเข้าแห่งประเทศไทย |
| 067 | TISCO | ธนาคารทิสโก้ |
| 069 | KKP | ธนาคารเกียรตินาคินภัทร |
| 070 | ICBCT | ธนาคารไอซีบีซี (ไทย) |
| 071 | TCD | ธนาคารไทยเครดิตเพื่อรายย่อย |
| 073 | LHFG | ธนาคารแลนด์ แอนด์ เฮ้าส์ |
| 098 | SME | ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย |

## Supported Transfer-Slip Age for Verification

| No. | Application | Supported Slip Age |
|-----|-------------|-------------------|
| 1 | K PLUS | 30 days |
| 2 | MAKE by KBank | 30 days |
| 3 | Krungthai NEXT | 30 days |
| 4 | Paotang | 30 days |
| 5 | Bangkok Bank | 30 days |
| 6 | CIMB THAI | 30 days |
| 7 | UOB TMRW Thailand | 30 days |
| 8 | SCB Easy | 7 days |
| 9 | TTB Touch | 7 days |
| 10 | MyMo by GSB | 7 days |
| 11 | KMA-Krungsri | 7 days |
| 12 | Kept | 7 days |
| 13 | Dime! | 7 days |
| 14 | KKP MOBILE | 7 days |
| 15 | GHB ALL GEN | 7 days |
| 16 | TISCO My Wealth | 7 days |
| 17 | LHB You | 7 days |

**Note:** These periods may change according to each bank's policy.

---

*This documentation covers the Thunder Developer API for bank slip and Truemoney wallet verification services.*
