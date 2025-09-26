# SMS Verification Number API Documentation

## Overview
API is a protocol for interaction between your software and our server of temporary phone numbers for SMS activations and verifications.

The API is needed to automate the process of ordering temporary numbers and receiving SMS messages on your side. All requests (POST and GET are supported) should be sent to:

**Base URL:** `https://sms-verification-number.com/stubs/handler_api`

**API Key:** `7ccb326980edc2bfec78dcd66326aad7`

## Important Notes
- The "lang" parameter is mandatory and determines the language and currency for displaying data
- Available values: "ru" (rubles) and "en" (dollars)
- Make sure the parameter value matches your balance currency
- The method name is the "action" parameter
- Request rate limit per second (RPS): 150

## Useful Options for API Optimization
- **Cost Optimization**: Use `getServicesAndCostWithStatistics` method to find minimum prices for numbers in different countries
- **SMS Delivery Statistics**: View percentage of successful SMS delivery by other users
- **Price Limiting**: Set maximum price for purchasing to avoid sudden price increases due to high demand
- **API Key**: Get your API key in the Profile section

## API Methods

### 1. getBalance
Check Balance

**URL:** `https://sms-verification-number.com/stubs/handler_api?api_key=7ccb326980edc2bfec78dcd66326aad7&action=getBalance&lang=LANG`

**Parameters:**
| Field | Type | Description |
|-------|------|-------------|
| api_key | string | Your API key, provides access to paid services. The API key should be kept secret |
| action | string | Method name |
| lang | string | Localization ru or en |

**Response Example:**
```
463.02
```

### 2. getCountryAndOperators
Get all available countries and mobile operators for countries.

**URL:** `https://sms-verification-number.com/stubs/handler_api?api_key=7ccb326980edc2bfec78dcd66326aad7&action=getCountryAndOperators&lang=LANG`

**Parameters:**
| Field | Type | Description |
|-------|------|-------------|
| api_key | string | Your API key, provides access to paid services. The API key should be kept secret |
| lang | string | Localization ru or en |

**Response Example:**
```json
[
  {
    "id": 2,
    "name": "Russia",
    "operators": {
      "any": "any",
      "tele2": "tele2",
      "tinkoff": "tinkoff",
      "ttk": "ttk",
      "yota": "yota"
    }
  },
  {
    "id": 1,
    "name": "Ukraine",
    "operators": {
      "any": "any",
      "kyivstar": "kyivstar",
      "life": "life",
      "lycamobile": "lycamobile",
      "mts": "mts",
      "utel": "utel",
      "vodafone": "vodafone"
    }
  }
]
```

### 3. getPrices
Get current prices by country

**URL:** `https://sms-verification-number.com/stubs/handler_api?api_key=7ccb326980edc2bfec78dcd66326aad7&action=getPrices&country=COUNTRY&lang=LANG`

**Parameters:**
| Field | Type | Description |
|-------|------|-------------|
| api_key | string | Your API key, provides access to paid services. The API key should be kept secret |
| operator | string | Mobile operator whose number needs to be obtained, see "List of countries" |
| country | integer | Country code from which you want to get numbers for SMS, see "List of countries" |
| service | string | Service for which the number needs to be obtained, see "List of services" |
| lang | string | Localization ru or en |

**Response Example:**
```json
{"Country_Code":{"Service_Code":{"cost":Cost,"count":Quantity}}}
```

### 4. getServicesAndCost
Get current prices and the number of available numbers

**URL:** `https://sms-verification-number.com/stubs/handler_api?api_key=7ccb326980edc2bfec78dcd66326aad7&action=getServicesAndCost&country=COUNTRY&operator=OPERATOR&service=SERVICE&lang=LANG`

**Parameters:**
| Field | Type | Description |
|-------|------|-------------|
| api_key | string | Your API key, provides access to paid services. The API key should be kept secret |
| operator | string | Mobile operator whose number needs to be obtained, see "List of countries" |
| country | integer | Country code from which you want to get numbers for SMS, see "List of countries" |
| service | string | Service for which the number needs to be obtained, see "List of services" |
| lang | string | Localization ru or en |

**Response Example:**
```json
[
  {
    "id": "vk",
    "name": "Вконтакте",
    "price": 29.88,
    "quantity": "19"
  },
  {
    "id": "ok",
    "name": "Ok.ru",
    "price": 1.34,
    "quantity": "2776"
  },
  {
    "id": "wa",
    "name": "Whatsapp",
    "price": 0,
    "quantity": "0"
  }
]
```

### 5. getServicesAndCostWithStatistics
Get current prices, the number of online numbers with SMS delivery statistics by services/sites, and a list of minimum prices by country.

**URL:** `https://sms-verification-number.com/stubs/handler_api?api_key=7ccb326980edc2bfec78dcd66326aad7&action=getServicesAndCostWithStatistics&country=COUNTRY&operator=OPERATOR&service=SERVICE&lang=LANG`

**Parameters:**
| Field | Type | Description |
|-------|------|-------------|
| api_key | string | Your API key, provides access to paid services. The API key should be kept secret |
| operator | string | Mobile operator whose number needs to be obtained, see "List of countries" |
| country | integer | Country code from which you want to get numbers for SMS, see "List of countries" |
| service | string | Service for which the number needs to be obtained, see "List of services" |
| lang | string | Localization ru or en |

**Response Example:**
```json
[
  {
    "id": "tg",
    "name": "Telegram",
    "price": 0.71,
    "quantity": 1429,
    "deliverability": "25.82",
    "cheap_prices_countries": [
      {
        "country_id": 6,
        "country_name": "Indonesia",
        "price": "0.20"
      },
      {
        "country_id": 10,
        "country_name": "Viet Nam",
        "price": "0.33"
      }
    ]
  }
]
```

### 6. getNumber
Order a number

**URL:** `https://sms-verification-number.com/stubs/handler_api?api_key=7ccb326980edc2bfec78dcd66326aad7&action=getNumber&service=SERVICE&operator=OPERATOR&country=COUNTRY&lang=LANG`

**Parameters:**
| Field | Type | Description |
|-------|------|-------------|
| api_key | string | Your API key, provides access to paid services. The API key should be kept secret |
| action | string | Method name |
| service | string | Service for which the number needs to be obtained, see "List of services" |
| operator | string | Mobile operator whose number needs to be obtained, see "List of countries" |
| country | integer | Country code from which you want to get numbers for SMS, see "List of countries" |
| lang | string | Localization ru or en |
| maxPrice | string/float | Maximum price you are willing to pay for a number (optional parameter) |

**Response Examples:**
| Server response | Example | Description |
|-----------------|---------|-------------|
| NO_BALANCE | NO_BALANCE | Insufficient balance on the API account |
| NO_NUMBERS | NO_NUMBERS | No numbers with the specified parameters, try again or try changing the country, operator |
| ACCESS_NUMBER:ID:NUMBER | ACCESS_NUMBER:234242:79991728822 | Get the order ID, the ordered temporary number with the country code |
| WRONG_MAX_PRICE:MIN_PRICE | WRONG_MAX_PRICE:13.21 | MIN_PRICE minimum price for which you can buy a number |

### 7. getNumberV2
Order a number (Enhanced version)

**URL:** `https://sms-verification-number.com/stubs/handler_api?api_key=7ccb326980edc2bfec78dcd66326aad7&action=getNumberV2&service=SERVICE&operator=OPERATOR&country=COUNTRY&lang=LANG`

**Parameters:** Same as getNumber

**Response Example:**
```json
{
  "activationId": 4100,
  "phoneNumber": "62838*****",
  "activationCost": 2.4,
  "currency": 643,
  "countryCode": "6",
  "canGetAnotherSms": 1,
  "activationTime": "2025-07-26 13:50:08",
  "activationOperator": "any"
}
```

### 8. setStatus
Change status

**URL:** `https://sms-verification-number.com/stubs/handler_api?api_key=7ccb326980edc2bfec78dcd66326aad7&action=setStatus&id=ID&status=STATUS&lang=LANG`

**Parameters:**
| Field | Type | Description |
|-------|------|-------------|
| api_key | string | Your API key, provides access to paid services. The API key should be kept secret |
| action | string | Method name |
| id | integer | Order ID received when ordering a temporary number |
| status | integer | Specifies the status to be set for the order |
| lang | string | Localization ru or en |

**Available status values:**
- 3 - Request another SMS
- 6 - Finish working with the ordered number
- 8 - Cancel the number (only if no SMS has been received)

**Response Examples:**
| Server response | Description |
|-----------------|-------------|
| NO_BALANCE | Insufficient balance on the API account |
| ACCESS_CANCEL | Order canceled |
| ACCESS_RETRY_GET | Waiting for a new SMS |
| ACCESS_ACTIVATION | Order successfully completed |
| CANNOT_BEFORE_2_MIN | Cannot cancel earlier than 2 minutes after ordering a number |

### 9. getStatus
Check the current status of the ordered number

**URL:** `https://sms-verification-number.com/stubs/handler_api?api_key=7ccb326980edc2bfec78dcd66326aad7&action=getStatus&id=ID&lang=LANG`

**Parameters:**
| Field | Type | Description |
|-------|------|-------------|
| api_key | string | Your API key, provides access to paid services. The API key should be kept secret |
| action | string | Method name |
| id | integer | Order ID received when ordering a temporary number |
| lang | string | Localization ru or en |

**Response Examples:**
| Server response | Description |
|-----------------|-------------|
| STATUS_WAIT_CODE | Waiting for an SMS from the sender |
| STATUS_CANCEL | Order canceled |
| STATUS_OK:CODE | Code received (where CODE is the verification code from the SMS) |

### 10. getCurrentActivationsList
List of current orders

**URL:** `https://sms-verification-number.com/stubs/handler_api?api_key=7ccb326980edc2bfec78dcd66326aad7&action=getCurrentActivationsList&status=STATUS&limit=LIMIT&order=ORDER&orderBy=ORDERBY&lang=LANG`

**Parameters:**
| Field | Type | Description |
|-------|------|-------------|
| api_key | string | Your API key, provides access to paid services. The API key should be kept secret |
| action | string | Method name |
| status | integer | Status number by which to filter (available - 0 (new, waiting for SMS) \| 1 (completed) \| 2 (canceled) \| 3 (SMS received) \| 4 (waiting for additional SMS)) |
| order | string | By which field to sort (available - id/number/date) |
| orderBy | string | Sort in ascending/descending order (ASC/DESC) |
| lang | string | Localization ru or en |

**Response Example:**
```json
[
  {
    "numberid": 1539723,
    "number": "380916172774",
    "status": 1
  },
  {
    "numberid": 1081409,
    "number": "380916147785",
    "status": 1
  }
]
```

## Possible Errors

| Server response | Description |
|-----------------|-------------|
| BAD_ACTION | Incorrect request formation |
| BAD_KEY | Invalid API key |
| BAD_LANG | Invalid localization, only ru or en are accepted |
| NO_ACTIVATION | Order ID does not exist or the rental time has expired |
| ERROR_SQL | SQL server database error |
| ERROR_API | Processing error |
| REQUEST_LIMIT | Request rate limit per second |

## Useful Tips

1. **Cost Optimization:** Use the "getServicesAndCostWithStatistics" method to find minimum prices for numbers in different countries
2. **SMS Delivery Statistics:** View the percentage of successful SMS delivery by other users
3. **Price Limiting:** Set a maximum price for purchasing to avoid sudden price increases due to high demand

## Payment Methods Supported

The service supports various payment methods:
- **Credit Cards:** Visa, Mastercard
- **Digital Wallets:** PayPal, Alipay
- **Cryptocurrency:** Bitcoin, Ethereum, USDT
- **Other:** UPI, AdvCash, Payeer

## Contact Information

- **Support Email:** support@sms-verification-number.com
- **Company:** THREETWOTWO LTD (Company Number: 14603753)
- **Registration Date:** 19 January 2023
- **Location:** 85 Great Portland Street, First Floor, London, England, W1W 7LT

- Visa
- Mastercard
- UPI
- USDT
- ETH
- Bitcoin
- AdvCash
- Payeer
- PayPal
- Alipay

## Appendix 1: Complete List of Countries

| Country Code (ID) | Country Name | Available Mobile Operators |
|-------------------|--------------|---------------------------|
| 0 | Russia | any, aiva, beeline, center2m, danycom, ezmobile, gazprombank_mobile, lycamobile, matrix, mcn, megafon, motiv, mts, mtt, mtt_virtual, patriot, rostelecom, sber, simsim, tele2, tinkoff, ttk, vector, vtb_mobile, winmobile, yota, aquafon, mir_telecom |
| 1 | Ukraine | any, 3mob, intertelecom, kyivstar, life, lycamobile, mts, utel, vodafone |
| 2 | Kazakhstan | any, activ, altel, beeline, forte mobile, kcell, tele2 |
| 3 | China | any, china_unicom, chinamobile, unicom |
| 4 | Philippines | any, globe telecom, smart, sun cellular, tm |
| 5 | Myanmar | any, mpt, mytel, ooredoo, telenor |
| 6 | Indonesia | any, axis, byu, indosat, smartfren, telkomsel, three |
| 7 | Malaysia | any, celcom, digi, electcoms, hotlink, indosat, maxis, telekom, tune_talk, u_mobile, unifi, xox, yes, yoodo |
| 8 | Kenya | any, airtel, econet, orange, safaricom, telkom |
| 9 | Tanzania | any, airtel, halotel, tigo, ttcl, vodacom |
| 10 | Vietnam | any, itelecom, mobifone, vietnamobile, viettel, vinaphone, wintel |
| 11 | Kyrgyzstan | any, beeline, megacom, nurtel, o! |
| 12 | USA (Virtual) | any, tmobile |
| 13 | Israel | any, 018 xphone, 019mobile, azi, cellcom, golan telecom, home_cellular, hot_mobile, jawwal, ooredoo, orange, pali, partner, pelephone, rami_levy |
| 14 | Hong Kong (China) | any, chinamobile, csl_mobile, imc, lucky_sim, pccw, smartone, three, unicom |
| 15 | Poland | any, a2_mobile, aero2, e_telko, heyah, klucz, lycamobile, netia, nju, orange, play, plus, plush, red_bull_mobile, tmobile, virgin |
| 16 | England (UK) | any, airtel, cmlink, ee, ezmobile, giffgaff, lebara, lycamobile, o2, orange, talk_telecom, tata_communications, teleena, three, tmobile, vectone, vodafone |
| 17 | Madagascar | any, orange |
| 18 | Congo | any, africel, airtel, orange, vodacom |
| 19 | Nigeria | any, airtel, etisalat, glomobile, mtn |
| 20 | Macau | any, 3macao |
| 21 | Egypt | any, etisalat, orange, vodafone, we |
| 22 | India | any, airtel |
| 23 | Ireland | any, 48mobile, cablenet, eir, lycamobile, tesco, vodafone |
| 24 | Cambodia | any, cellcard, metfone, smart |
| 25 | Laos | any, beeline, etl, laotel, telekom, tplus, unitel |
| 26 | Haiti | any, natcom |
| 27 | Côte d'Ivoire | any, moov, mtn, orange |
| 28 | Gambia | any, africel, comium, gamcel, qcell |
| 29 | Serbia | any, a1, globaltel, mobtel, mts, vip |
| 30 | Yemen | any, mtn, sabafon, yemen_mobile |
| 31 | South Africa | any, cell c, lycamobile, mtn, neotel, telkom, vodacom |
| 32 | Romania | any, benefito_mobile, digi, lycamobile, my_avon, orange, runex_telecom, telekom, vodafone |
| 33 | Colombia | any, claro, etb, exito, links_field, movistar, tigo, virgin, wom |
| 34 | Estonia | any, elisa, goodline, super, tele2, telia, topconnect |
| 35 | Azerbaijan | any, azercell, azerfon, bakcell, humans, nar mobile, naxtel |
| 36 | Canada (virtual) | any, cellular, chatrmobile, fido, lucky, rogers, telus |
| 37 | Morocco | any, iam, inwi, itissalat, maroc telecom, orange |
| 38 | Ghana | any, airtel, glomobile, millicom, mtn, vodafone |
| 39 | Argentina | any, claro, movistar, nextel, personal, tuenti |
| 40 | Uzbekistan | any, beeline, humans, mobiuz, mts, perfectum, ucell, ums, uzmobile |
| 41 | Cameroon | any, mtn, nexttel, orange |
| 42 | Chad | any, airtel, salam, tigo |
| 43 | Germany | any, fonic, lebara, lycamobile, o2, ortel_mobile, telekom, vodafone |
| 44 | Lithuania | any, bite, labas, pylduk, tele2, telia |
| 45 | Croatia | any, a1, bonbon, hrvatski telekom, tele2, telemach, tmobile, tomato |
| 46 | Sweden | any, comviq, lycamobile, netmore, tele2, telenor, telia, three, vectone, vodafone |
| 47 | Iraq | any, asiacell, korek, zain |
| 48 | Netherlands | any, kpn, l_mobi, lebara, lmobiel, lycamobile, tmobile, vodafone |
| 49 | Latvia | any, bite, lmt, pylduk, tele2, xomobile, zelta zivtina |
| 50 | Austria | any, a1, eety, georg, hot_mobile, lidl, lycamobile, magenta, orange, telering, three, tmobile, wowww, yesss |
| 51 | Belarus | any, best, life, mdc, mts |
| 52 | Thailand | any, ais, cat_mobile, dtac, my, truemove |
| 53 | Saudi Arabia | any, digitel |
| 54 | Mexico | any, movistar, telcel, bait |
| 55 | Taiwan | any, chunghwa, fareast |
| 56 | Spain | any, altecom, cube_movil, euskaltel, finetwork, lebara, llamaya, lycamobile, masmovil, movistar, orange, tmobile, vodafone, yoigo, you_mobile |
| 57 | Iran | any, aptel, azartel, hamrah_e_aval, irancell, mtn, rightel, samantel, shatel, taliya, tci |
| 58 | Algeria | any, djezzy, mobilis, ooredoo |
| 59 | Slovenia | any, a1, t-2, telekom, telemach |
| 60 | Bangladesh | any, airtel, banglalink, banglalion, grameenphone, ollo, robi, teletalk |
| 61 | Senegal | any, expresso, free, orange |
| 62 | Turkey | any, turk_telekom, turkcell, vodafone |
| 63 | Czech Republic | any, CzechRepublic_Virtual, kaktus, nordic telecom, o2, szdc, tmobile, vodafone |
| 64 | Sri Lanka | any, airtel, dialog, etisalat, hutch, lanka bell, mobitel, slt, sltmobitel |
| 65 | Peru | any, bitel, claro, entel, movistar |
| 66 | Pakistan | any, charji, jazz, ptcl, sco, sco mobile, telenor, ufone, zong |
| 67 | New Zealand | any, 2degree, one_nz, skinny, spark, vodafone, warehouse |
| 68 | Guinea | any, cellcom, mtn, orange, sotelgui, telecel |
| 69 | Mali | any, malitel, orange, telecel |
| 70 | Venezuela | any |
| 71 | Ethiopia | any, mtn, safaricom |
| 72 | Mongolia | any, beeline |
| 73 | Brazil | any, algartelecom, arqia, cellular, claro, correios_celular, links_field, nlt, oi, tim, vivo |
| 74 | Afghanistan | any, salaam |
| 75 | Uganda | any, airtel, k2_telecom, lycamobile, mtn, orange, smart, smile, uganda_telecom |
| 76 | Angola | any, africel, movicel, unitel |
| 77 | Cyprus | any, cablenet, cyta, epic, lemontel, primetel, vectone, vodafone |
| 78 | France | any, bouygues, free, kena_mobile, lebara, lycamobile, orange, sfr, syma_mobile, vectone |
| 79 | Guinea | any |
| 80 | Mozambique | any, mcell, movitel, tmcel, vodacom |
| 81 | Nepal | any |
| 82 | Belgium | any, bandwidth, base, infrabel, lycamobile, mobile vikings, nethys, orange, proximus, telenet, vectone |
| 83 | Bulgaria | any, a1, bulsatcom, max telecom, telenor, vivacom, yettel |
| 84 | Hungary | any, tmobile, vodafone, yettel |
| 85 | Moldova | any, idc, moldcell, Moldovia_Virtual, orange, unite |
| 86 | Italy | any, digi, ho, iliad, kena_mobile, lycamobile, nt_mobile, optima, syma_mobile, tim, vodafone, wind |
| 87 | Paraguay | any, claro, personal |
| 88 | Honduras | any, claro |
| 89 | Tunisia | any, ooredoo, orange, tunicell |
| 90 | Nicaragua | any, movistar |
| 91 | Timor-Leste | any, telemor, telkomcel, timor_telecom |
| 92 | Bolivia | any, tigo, viva |
| 93 | Costa Rica | any |
| 94 | Guatemala | any, claro, movistar, tigo |
| 95 | UNITED ARAB EMIRATES | any, du |
| 96 | Zimbabwe | any, econet, netone, telecel |
| 97 | Puerto Rico | any |
| 98 | Sudan | any, mtn, sudani_one, zain |
| 99 | Togo | any, moov |
| 100 | Kuwait | any |
| 101 | El Salvador | any, claro, digi, movistar, red, tigo |
| 102 | Libya | any |
| 103 | Jamaica | any, digi |
| 104 | Trinidad and Tobago | any, bmobile, digicel, total |
| 105 | Ecuador | any, claro, cnt_mobile, movistar, tuenti |
| 106 | Swaziland | any |
| 107 | Oman | any, omantel, ooredoo |
| 108 | Bosnia and Herzegovina | any, a1, bh_telecom, hej |
| 109 | Dominican Republic | any, altice, claro, viva |
| 111 | Qatar | any |
| 112 | Panama | any, masmovil |
| 113 | Cuba | any, cubacel |
| 114 | Mauritania | any, chinguitel, mattel, mauritel |
| 115 | Sierra Leone | any, africel, airtel, orange, qcell, sierratel |
| 116 | Jordan | any, orange, umniah, xpress, zain |
| 117 | Portugal | any, lebara, lycamobile, nos, vodafone |
| 118 | Barbados | any |
| 119 | Burundi | any, africel, econet, lacell, telecel, viettel |
| 120 | Benin | any, airtel, mtn |
| 121 | Brunei | any |
| 122 | Bahamas | any |
| 123 | Botswana | any, be_mobile, mascom, orange |
| 124 | Belize | any |
| 125 | CAR | any |
| 126 | Dominica | any |
| 127 | Grenada | any |
| 128 | Georgia | any, beeline, geocell, hamrah_e_aval, magticom, silknet |
| 129 | Greece | any, cosmote, cyta, ose, q_telecom, vodafone, wind |
| 130 | Guinea-Bissau | any |
| 131 | Guyana | any |
| 132 | Iceland | any |
| 133 | Comoros | any, telma |
| 134 | St. Kitts and Nevis | any |
| 135 | Liberia | any, cellcom, comium, libercell, libtelco, lonestar |
| 136 | Lesotho | any |
| 137 | Malawi | any, access, airtel, tnm |
| 138 | Namibia | any |
| 139 | Niger | any |
| 140 | Rwanda | any, airtel, mtn |
| 141 | Slovakia | any, 4ka, o2, orange, telekom |
| 142 | Suriname | any |
| 143 | Tajikistan | any, babilon mobile, beeline, indigo, megafon, tcell |
| 144 | Monaco | any |
| 145 | Bahrain | any |
| 146 | Reunion | any |
| 147 | Zambia | any, airtel, mtn, zamtel |
| 148 | Armenia | any, team, viva, vivo, ucom |
| 149 | Somalia | any |
| 150 | Congo | any, airtel |
| 151 | Chile | any, claro, entel, movistar, vodafone, wom |
| 152 | Burkina Faso | any, airtel, onatel, telecel |
| 153 | Lebanon | any, alfa, ogero, touch |
| 154 | Gabon | any |
| 155 | Albania | any, telekom, vodafone |
| 156 | Uruguay | any, antel, claro |
| 157 | Mauritius | any |
| 158 | Bhutan | any |
| 159 | Maldives | any |
| 160 | Guadeloupe | any |
| 161 | Turkmenistan | any |
| 162 | French Guiana | any |
| 163 | Finland | any, dna, elisa, telia |
| 164 | St. Lucia | any |
| 165 | Luxembourg | any, tango, tiptop |
| 166 | Saint Pierre and Miquelon | any |
| 167 | Equatorial Guinea | any |
| 168 | Djibouti | any |
| 169 | Saint Kitts and Nevis | any |
| 170 | Cayman Islands | any |
| 171 | Montenegro | any |
| 172 | Denmark | any, lebara, lycamobile, tdc, telenor, telia, three |
| 173 | Switzerland | any, lebara |
| 174 | Norway | any, lycamobile, my_call, telia |
| 175 | Australia | any, lebara, optus, pivotel, telstra, travelsim, vodafone |
| 176 | Eritrea | any |
| 177 | South Sudan | any, digitel, mtn, zain |
| 178 | Sao Tome and Principe | any |
| 179 | Aruba | any |
| 180 | Montserrat | any |
| 181 | Anguilla | any |
| 183 | Northern Macedonia | any, a1, lycamobile, telekom, vip |
| 184 | Republic of Seychelles | any |
| 185 | New Caledonia | any |
| 186 | Cape Verde | any |
| 187 | USA (Real) | any, at_t, boost_mobile, cricket_wireless, h2o_wireless, hello_mobile, joltmobile, lycamobile, mint_mobile, moabits, physic, textnow, tmobile, ultra_mobile, us_mobile |
| 188 | Palestine | any, jawwal, wataniya |
| 189 | Fiji | any, vodafone |
| 190 | South Korea | any |
| 192 | Western Sahara | any |
| 193 | Solomon Islands | any |
| 196 | Singapore | any, m1, maxx, simba, singtel, starhub |
| 197 | Tonga | any |
| 198 | American Samoa | any |
| 199 | Malta | any, epic, go, melita |
| 666 | Gibraltar | any |
| 668 | Bermuda | any |
| 670 | Japan | any |
| 672 | Syria | any |
| 673 | Faroe Islands | any |
| 674 | Martinique | any |
| 675 | Turks and Caicos Islands | any |
| 676 | St. Barthélemy | any |
| 678 | Nauru | any |
| 680 | Curaçao | any |
| 681 | Samoa | any |
| 682 | Vanuatu | any |
| 683 | Greenland | any |
| 684 | Kosovo | any, ipko, mtc, vala |
| 685 | Liechtenstein | any |
| 686 | Sint Maarten | any |
| 687 | Niue | any, telecom |

## Appendix 2: Complete List of Services

The service list contains over 1,500 services including popular platforms like:

**Social Media & Communication:**
- Facebook (fb)
- Instagram+Threads (ig)
- WhatsApp (wa)
- Telegram (tg)
- TikTok/Douyin (lf)
- Snapchat (fu)
- Discord (ds)
- WeChat (wb)
- Line msg (me)
- Viber (vi)
- Signal (bw)

**E-commerce & Shopping:**
- Amazon (am)
- Alibaba (ab)
- AliExpress (hx)
- eBay (dh)
- Shopee (ka)
- Lazada (dl)
- Mercari (dg)
- OLX (sn)
- Avito (av)
- Wildberries (uu)

**Financial Services:**
- PayPal (ts)
- Stripe (nu)
- Coinbase (re)
- Binance (aon)
- Wise (bo)
- Revolut (ij)
- CashApp (it)
- Venmo (yy)
- Paytm (ge)
- GCash (bc)

**Gaming & Entertainment:**
- Steam (mt)
- Epic Games (blm)
- PlayStation (aml)
- Xbox (aml)
- Twitch (hb)
- YouTube (go)
- Netflix (nf)
- Spotify (alj)
- Apple (wx)
- Google (go)

**Business & Productivity:**
- Microsoft (mm)
- Google (go)
- LinkedIn (tn)
- Zoom (anf)
- Slack (bw)
- Trello (ali)
- Notion (aiv)
- GitHub (abq)
- GitLab (aiv)
- Bitbucket (aiv)

**Dating & Social:**
- Tinder (oi)
- Bumble (mo)
- Badoo (qv)
- Grindr (yw)
- Hinge (vz)
- OkCupid (vm)
- Match (axr)
- Pof.com (pf)
- Lovoo (oj)
- Bumble (mo)

**And many more services...**

*Note: This is a comprehensive list of over 1,500 services supported by the SMS verification platform. The complete list includes services from various categories including social media, e-commerce, financial services, gaming, business tools, and more.*

---

*This documentation covers the SMS Verification Number API for temporary phone number services and SMS activations.*
