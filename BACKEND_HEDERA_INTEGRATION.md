# 🔧 BACKEND HEDERA INTEGRATION GUIDE

This guide details the backend changes needed to support Veilo's Hedera blockchain features.

---

## 📋 STEP 1: INSTALL HEDERA SDK IN BACKEND

```bash
cd backend  # Navigate to your backend directory
npm install @hashgraph/sdk dotenv
```

---

## 📋 STEP 2: CONFIGURE BACKEND ENVIRONMENT VARIABLES

Create/update `backend/.env`:

```bash
# Hedera Network Configuration
HEDERA_ACCOUNT_ID=0.0.7098369
HEDERA_PRIVATE_KEY=302e020100300506032b65700422042075942eec1fef3f02b4cdafd6554d7789a4be45bbeed42d8001f74dc85c356a4f
HEDERA_NETWORK=testnet

# Hedera Mirror Node (for queries)
HEDERA_MIRROR_NODE=https://testnet.mirrornode.hedera.com

# VEILO Token ID (will be generated after token creation)
VEILO_TOKEN_ID=
```

---

## 📋 STEP 3: UPDATE EXPERT MODEL SCHEMA

Add Hedera fields to your Expert model (MongoDB/Mongoose example):

```javascript
// backend/models/Expert.js

const expertSchema = new mongoose.Schema({
  // ... existing fields ...
  
  // Hedera Blockchain Fields
  hederaTopicId: {
    type: String,
    default: null,
    index: true,
  },
  isHederaVerified: {
    type: Boolean,
    default: false,
  },
  hederaVerifiedAt: {
    type: Date,
    default: null,
  },
  hederaTransactionId: {
    type: String,
    default: null,
  },
  hederaCredentialHash: {
    type: String,
    default: null,
  },
  
  // VEILO Token Account (for receiving payments)
  hederaAccountId: {
    type: String,
    default: null,
  },
});
```

---

## 📋 STEP 4: CREATE HEDERA SERVICE IN BACKEND

Create `backend/services/hederaService.js`:

```javascript
const {
  Client,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TransferTransaction,
  PrivateKey,
  AccountId,
} = require('@hashgraph/sdk');

class HederaService {
  constructor() {
    // Initialize Hedera client
    this.client = Client.forTestnet();
    this.client.setOperator(
      process.env.HEDERA_ACCOUNT_ID,
      process.env.HEDERA_PRIVATE_KEY
    );
    
    this.operatorAccountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    this.operatorPrivateKey = PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY);
  }

  /**
   * Create HCS Topic for Expert Verification
   */
  async createExpertVerificationTopic(expertData) {
    try {
      const transaction = await new TopicCreateTransaction()
        .setTopicMemo(`Veilo Expert: ${expertData.name}`)
        .setSubmitKey(this.operatorPrivateKey)
        .execute(this.client);

      const receipt = await transaction.getReceipt(this.client);
      const topicId = receipt.topicId.toString();

      console.log(`✅ Created HCS Topic: ${topicId}`);

      // Submit initial verification message
      const credentialData = {
        expertId: expertData._id.toString(),
        name: expertData.name,
        specialization: expertData.specialization,
        licenseNumber: expertData.licenseNumber || 'N/A',
        institution: expertData.institution || 'N/A',
        verifiedAt: new Date().toISOString(),
        verifier: 'Veilo Platform',
      };

      const messageTransaction = await new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(JSON.stringify(credentialData))
        .execute(this.client);

      const messageReceipt = await messageTransaction.getReceipt(this.client);

      console.log(`✅ Submitted credential to topic: ${topicId}`);

      return {
        success: true,
        topicId,
        transactionId: messageTransaction.transactionId.toString(),
        credentialHash: Buffer.from(JSON.stringify(credentialData)).toString('base64'),
      };
    } catch (error) {
      console.error('❌ Failed to create HCS topic:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create VEILO Token (one-time setup)
   */
  async createVeiloToken() {
    try {
      const transaction = await new TokenCreateTransaction()
        .setTokenName('Veilo Credit')
        .setTokenSymbol('VLO')
        .setDecimals(2)
        .setInitialSupply(1000000) // 1 million tokens
        .setTreasuryAccountId(this.operatorAccountId)
        .setAdminKey(this.operatorPrivateKey)
        .setSupplyKey(this.operatorPrivateKey)
        .setTokenType(TokenType.FungibleCommon)
        .setSupplyType(TokenSupplyType.Infinite)
        .execute(this.client);

      const receipt = await transaction.getReceipt(this.client);
      const tokenId = receipt.tokenId.toString();

      console.log(`✅ Created VEILO Token: ${tokenId}`);

      return { success: true, tokenId };
    } catch (error) {
      console.error('❌ Failed to create token:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Transfer VEILO tokens (for session payments)
   */
  async transferVeiloTokens(fromAccountId, toAccountId, amount) {
    try {
      const tokenId = process.env.VEILO_TOKEN_ID;
      
      if (!tokenId) {
        throw new Error('VEILO_TOKEN_ID not configured');
      }

      const transaction = await new TransferTransaction()
        .addTokenTransfer(tokenId, fromAccountId, -amount)
        .addTokenTransfer(tokenId, toAccountId, amount)
        .execute(this.client);

      const receipt = await transaction.getReceipt(this.client);

      console.log(`✅ Transferred ${amount} VLO from ${fromAccountId} to ${toAccountId}`);

      return {
        success: true,
        transactionId: transaction.transactionId.toString(),
        status: receipt.status.toString(),
      };
    } catch (error) {
      console.error('❌ Token transfer failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new HederaService();
```

---

## 📋 STEP 5: CREATE API ENDPOINTS

Create `backend/routes/hedera.js`:

```javascript
const express = require('express');
const router = express.Router();
const hederaService = require('../services/hederaService');
const Expert = require('../models/Expert');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/hedera/verify-expert
 * Create blockchain verification for expert
 */
router.post('/verify-expert/:expertId', authenticateToken, async (req, res) => {
  try {
    const expert = await Expert.findById(req.params.expertId);
    
    if (!expert) {
      return res.status(404).json({ error: 'Expert not found' });
    }

    // Create HCS topic for this expert
    const result = await hederaService.createExpertVerificationTopic({
      _id: expert._id,
      name: expert.name,
      specialization: expert.specialization,
      licenseNumber: expert.licenseNumber,
      institution: expert.institution,
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Update expert with Hedera data
    expert.hederaTopicId = result.topicId;
    expert.isHederaVerified = true;
    expert.hederaVerifiedAt = new Date();
    expert.hederaTransactionId = result.transactionId;
    expert.hederaCredentialHash = result.credentialHash;
    
    await expert.save();

    res.json({
      success: true,
      expert: {
        id: expert._id,
        hederaTopicId: expert.hederaTopicId,
        isHederaVerified: expert.isHederaVerified,
        hederaTransactionId: expert.hederaTransactionId,
      },
    });
  } catch (error) {
    console.error('Expert verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * POST /api/hedera/create-token
 * Create VEILO token (admin only, one-time)
 */
router.post('/create-token', authenticateToken, async (req, res) => {
  try {
    // Add admin check here
    const result = await hederaService.createVeiloToken();
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      tokenId: result.tokenId,
      message: 'VEILO token created! Update .env with this token ID',
    });
  } catch (error) {
    console.error('Token creation error:', error);
    res.status(500).json({ error: 'Token creation failed' });
  }
});

/**
 * POST /api/hedera/transfer-tokens
 * Transfer VEILO tokens between accounts
 */
router.post('/transfer-tokens', authenticateToken, async (req, res) => {
  try {
    const { fromAccountId, toAccountId, amount } = req.body;

    const result = await hederaService.transferVeiloTokens(
      fromAccountId,
      toAccountId,
      amount
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      transactionId: result.transactionId,
      status: result.status,
    });
  } catch (error) {
    console.error('Token transfer error:', error);
    res.status(500).json({ error: 'Transfer failed' });
  }
});

module.exports = router;
```

---

## 📋 STEP 6: REGISTER ROUTES IN MAIN APP

In `backend/server.js` or `backend/app.js`:

```javascript
const hederaRoutes = require('./routes/hedera');

// ... other routes ...

app.use('/api/hedera', hederaRoutes);
```

---

## 📋 STEP 7: TEST BACKEND INTEGRATION

### Test 1: Create VEILO Token (One-Time)

```bash
curl -X POST http://localhost:3000/api/hedera/create-token \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "tokenId": "0.0.XXXXXXX",
  "message": "VEILO token created! Update .env with this token ID"
}
```

**Action Required**: Copy the `tokenId` and add to `backend/.env`:
```bash
VEILO_TOKEN_ID=0.0.XXXXXXX
```

### Test 2: Verify Expert on Blockchain

```bash
curl -X POST http://localhost:3000/api/hedera/verify-expert/EXPERT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "expert": {
    "id": "...",
    "hederaTopicId": "0.0.YYYYYYY",
    "isHederaVerified": true,
    "hederaTransactionId": "0.0.XXXXX@1234567890.123456789"
  }
}
```

### Test 3: Verify on HashScan

Open: `https://hashscan.io/testnet/topic/0.0.YYYYYYY`

You should see the expert's credential message!

---

## 📋 STEP 8: UPDATE EXPERT API RESPONSES

Ensure expert endpoints return Hedera fields:

```javascript
// backend/routes/experts.js

router.get('/experts/:id', async (req, res) => {
  const expert = await Expert.findById(req.params.id);
  
  res.json({
    ...expert.toObject(),
    hederaTopicId: expert.hederaTopicId,
    isHederaVerified: expert.isHederaVerified,
    hederaVerifiedAt: expert.hederaVerifiedAt,
  });
});
```

---

## ✅ COMPLETION CHECKLIST

- [ ] Hedera SDK installed in backend
- [ ] Environment variables configured
- [ ] Expert model updated with Hedera fields
- [ ] hederaService.js created
- [ ] API routes created and registered
- [ ] VEILO token created (test endpoint)
- [ ] First expert verified on blockchain
- [ ] Expert API returns Hedera fields
- [ ] Frontend displays verification badge

---

## 🚀 NEXT STEPS

Once backend is complete:
1. Verify first expert via API
2. Check HashScan for topic messages
3. Frontend will automatically show verification badge
4. Move to Phase 2: Token payments & NFTs

---

**Estimated Time**: 2-3 hours for backend setup  
**Priority**: HIGH - Needed for Phase 1 completion

---

**Note**: Keep your private key secure! Never commit to Git. The backend `.env` should be in `.gitignore`.
