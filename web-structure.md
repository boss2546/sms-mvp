# Web Structure for SMS Verification MVP

## 1. Overview
This document outlines the structure and key features of the web application. It provides a detailed breakdown of all components, behaviors, and APIs integrated into the system.

The website is designed as a single-page application (SPA), with the **Catalog** section at the top and the **Activation** section at the bottom. Users can view and select services, sign in, and verify their identity through SMS without navigating away from the page.

---

## 2. Key Pages & Components

### 2.1 **Catalog Page**
This page is the first thing a user sees. It allows them to choose their **country**, **operator**, and the **SMS service** they want to purchase. The **Catalog Page** is central to the user experience.

#### **Elements of the Catalog Page:**

- **Country & Operator Picker** (Top-left)
  - Dropdown to select country (default: Thailand)
  - Searchable dropdown for the operator (default: Random, but can choose AIS, True, DTAC, etc.)
  - **Note:** Upon changing the country, the list of available operators and services may change dynamically.
  
- **Service List** (Right side of the screen)
  - A list of available services such as **Social**, **Finance**, etc.
  - **Recommended Services** appear first and are marked with a **star icon**.
  - Each service shows:
    - Name (e.g., SMS 20-minute)
    - Price (dynamically updated based on stock and demand)
    - **Buy Button** for purchasing the service.
  
- **Service Filtering**
  - Users can filter services by categories (e.g., Social, Finance) or search by keyword.
  - If the user clicks on a service, a short description appears, and the **Buy** button becomes active.

- **Price and Availability**  
  - Service price is dynamic, calculated based on demand, quantity, and service type.
  - Stock is shown (e.g., 20/100 available).

#### **Behavior:**
- Users can select a country and operator without needing to log in.
- Clicking **Buy** prompts the user to log in (if not already logged in) or open the **Top-up Modal** if the user has insufficient credits.
- After successful login and purchase, users are redirected to the **Activation Section**.

---

### 2.2 **Activation Page**
The **Activation Page** is a dynamic section that shows users the status of their purchased services. It includes details like the **SMS code** and a countdown for when the service will expire.

#### **Elements of the Activation Page:**

- **Activation Information (Cards)**  
  Each active purchase is shown as a card with the following details:
  - **Service**: The type of service the user bought.
  - **Number**: Display the user's phone number for SMS verification (masked for privacy).
  - **Status**: Shows the status of the SMS:
    - Waiting for SMS (default)
    - SMS Received (Once SMS is received)
    - Expired / Cancelled / Replaced
  - **Time Remaining**: Countdown timer (20 minutes) showing when the service will expire.

- **Actions on the Activation Card**
  - **Cancel** (If within 2 minutes and no SMS received)
  - **Replace** (If within 2 minutes, allows user to replace the number with another one for the same service)

- **Receive another SMS**: A button for users to re-trigger the SMS for 90% off the original price (if the service is eligible).

#### **Behavior:**
- After the purchase is confirmed, the page will automatically scroll down to the **Activation Section**.
- If the **SMS Code** is not received within the expected time, users can click **Resend SMS** or **Replace**.
- After 20 minutes, the status will change to **Expired**, and no further actions are allowed.
  
---

### 2.3 **Auth Modal**
This modal pops up when the user tries to make a purchase but isn't logged in yet. The **Auth Modal** provides options to sign in or sign up.

#### **Elements of the Auth Modal:**
- **Sign Up**:
  - Fields: Email, Password, Confirm Password
  - Checkbox for agreeing to **Terms & Conditions** and **Privacy Policy**
  - **Captcha** verification to prevent bots.
  
- **Sign In**:
  - Fields: Email, Password
  - **Forgot Password** link to reset credentials.
  
- **Behavior**:
  - If the user is not logged in, they will be prompted to log in before purchasing.
  - After successful authentication, the user is redirected back to the service purchase page or **Top-up Modal** if they need to add credits.

---

### 2.4 **Top-up Modal**
The **Top-up Modal** is shown when a user doesn't have enough credits to purchase a service.

#### **Elements of the Top-up Modal:**
- **Enter Amount**: Users can choose from a predefined set of amounts or enter a custom value.
- **Bank Account Information**: Display the bank account details or PromptPay number to send the payment.
- **Upload Slip**: Users can upload an image of the payment slip for verification.
- **Status**: Status of the top-up process:
  - **Pending** (default)
  - **Verified**: Payment successful and credits have been added to the user account.
  - **Failed**: If there was an issue with the payment, display an error message.

#### **Behavior:**
- Users can upload a **payment slip**, which is then verified using **Thunder API**.
- If the payment is verified, credits are added to the user's account and they can continue purchasing services.
- If payment fails, an error message is shown with instructions on how to resolve the issue.

---

### 2.5 **Footer**
The footer will contain links to essential legal and support pages.

#### **Footer Elements:**
- **Links to**:
  - Terms & Conditions
  - Privacy Policy
  - FAQ
  - Support (Contact form)
  - Status (Server health monitoring)
- **Social Media Icons**: Links to Facebook, Twitter, etc.
- **Language/Region Settings**: Option to change the website's language and currency.

---

## 3. API Integration

### 3.1 **SMS Verification API**
- **POST /api/verify/**  
  Used to send an SMS verification code to the selected number. The response includes the verification code for user input.

### 3.2 **Thunder API (for Slip Verification)**
- **POST /api/verify-slip/**  
  Used to verify the payment slip uploaded by the user. If the verification is successful, credits are added to the user's account.

---

## 4. Workflow Overview

### 4.1 Purchase Flow
1. **Select Service**: User chooses a country, operator, and service.
2. **Login**: User is prompted to log in if not already authenticated.
3. **Top-up**: If the user has insufficient credits, they are prompted to top-up via the **Top-up Modal**.
4. **Purchase Confirmation**: After adding credits (if needed), the user confirms the purchase, and an **Activation** is created.

### 4.2 Activation Flow
1. **Activate Service**: User receives SMS and enters the code.
2. **Status Change**: If the SMS code is successfully entered, the service is marked as "Activated".
3. **Expired/Cancelled**: After 20 minutes, the service expires, and no further actions can be taken.

---

## 5. UI/UX Guidelines

### 5.1 Responsiveness
- The website must be fully responsive, with mobile-first design.
- All modals, buttons, and forms should be easily accessible and usable on mobile devices.

### 5.2 Accessibility
- Ensure that all interactive elements are accessible by keyboard (focus states).
- Use appropriate ARIA roles for accessibility.

---

## 6. Legal Compliance

### 6.1 Data Privacy
- The website must comply with **PDPA (Personal Data Protection Act)** regulations.
- Ensure that all user data (such as phone numbers and payment information) is handled securely and not shared without user consent.

---

### 7. Future Improvements
- **Add multi-language support** to allow users to interact with the website in different languages.
- **Improve SMS delivery** by integrating with multiple SMS providers.
- **Optimize server performance** for higher traffic and faster response times.

