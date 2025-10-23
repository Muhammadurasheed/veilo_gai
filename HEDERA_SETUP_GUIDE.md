# 🌐 HEDERA INTEGRATION SETUP GUIDE

## Phase 1 Complete: Foundation & Expert Verification

### ✅ What's Been Implemented

1. **Hedera SDK Integration**
   - Installed `@hashgraph/sdk` for blockchain operations
   - Created Hedera configuration system
   - Set up Mirror Node integration for querying blockchain data

2. **Expert Verification System**
   - Blockchain verification badge component
   - Real-time credential verification from Hedera Consensus Service
   - HashScan explorer integration for transparency

3. **Services Created**
   - `hederaService.ts` - Core blockchain interaction service
   - Credential verification logic
   - Transaction and token balance queries

---

## 🔧 MANUAL SETUP REQUIRED

### Step 1: Create Hedera Testnet Account (5 minutes)

1. **Go to Hedera Portal**
   - Visit: https://portal.hedera.com/register
   - Sign up for a free testnet account

2. **Get Your Credentials**
   After registration, you'll receive:
   - Account ID (format: `0.0.XXXXX`)
   - Private Key (starts with `302e...`)
   - Public Key

3. **Fund Your Account**
   - Hedera testnet provides **10,000 HBAR** for free
   - Go to: https://portal.hedera.com/
   - Click "Testnet" → "Request Testnet HBAR"

---

### Step 2: Configure Environment Variables

Create/update your `.env` file with:

```bash
# Hedera Network Configuration
VITE_HEDERA_NETWORK=testnet
VITE_HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
VITE_HEDERA_PRIVATE_KEY=YOUR_PRIVATE_KEY

# Hedera Mirror Node (already configured, but you can override)
VITE_HEDERA_MIRROR_NODE=https://testnet.mirrornode.hedera.com
VITE_HEDERA_EXPLORER=https://hashscan.io/testnet
```

**IMPORTANT**: Never commit your private key to Git!

---

### Step 3: Backend Setup (Required for Token & NFT Creation)

You need to add Hedera SDK to your backend:

1. **In your backend directory**, run:
```bash
npm install @hashgraph/sdk dotenv
```

2. **Create backend/.env**:
```bash
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_PRIVATE_KEY=YOUR_PRIVATE_KEY
HEDERA_NETWORK=testnet
```

3. **Test Hedera Connection**:
```bash
node -e "const { Client } = require('@hashgraph/sdk'); const client = Client.forTestnet().setOperator('YOUR_ACCOUNT_ID', 'YOUR_PRIVATE_KEY'); console.log('✅ Hedera connected!');"
```

---

### Step 4: Add Verification Badge to Expert Profiles

I've created the `HederaVerificationBadge` component. To use it:

1. **Import in your expert profile component**:
```tsx
import { HederaVerificationBadge } from '@/components/expert/HederaVerificationBadge';
```

2. **Add to expert card/profile**:
```tsx
<HederaVerificationBadge
  expertId={expert.id}
  hederaTopicId={expert.hederaTopicId} // You'll add this field to expert schema
  isVerified={expert.isHederaVerified}
/>
```

3. **Update Expert Schema** (in your backend):
Add these fields to your Expert model:
```javascript
{
  hederaTopicId: { type: String }, // HCS topic ID for credentials
  isHederaVerified: { type: Boolean, default: false },
  hederaVerifiedAt: { type: Date },
  hederaTransactionId: { type: String }, // For audit trail
}
```

---

## 🧪 TESTING PHASE 1

### Test Expert Verification

1. **Quick Test with Mock Topic**:
   - Open browser console on any expert profile
   - Run:
   ```javascript
   // Test Mirror Node connection
   fetch('https://testnet.mirrornode.hedera.com/api/v1/network/supply')
     .then(r => r.json())
     .then(d => console.log('✅ Hedera Mirror Node connected', d));
   ```

2. **Create a Test Topic** (once backend is set up):
   ```javascript
   // You'll run this from your backend to create a test expert verification
   const { TopicCreateTransaction } = require('@hashgraph/sdk');
   
   const transaction = await new TopicCreateTransaction()
     .setSubmitKey(client.operatorPublicKey)
     .execute(client);
   
   const receipt = await transaction.getReceipt(client);
   const topicId = receipt.topicId;
   
   console.log('✅ Topic created:', topicId.toString());
   // Save this topicId to your expert's hederaTopicId field
   ```

---

## 📊 NEXT STEPS (Day 1 Completion)

Once you've completed the manual setup above:

✅ **Verify Hedera Connection** → Run test scripts  
✅ **Update Expert Schema** → Add Hedera fields  
✅ **Create First Topic** → Test expert verification  
✅ **Deploy Badge Component** → Show on profiles  

---

## 🚀 READY FOR PHASE 2?

After completing Phase 1 setup, we'll implement:
- ✨ VEILO Token (VLO) creation
- 💰 Session payment with tokens
- 🎫 Session completion NFTs
- 📊 Token balance dashboard

**Estimated Time**: 2-3 hours for manual setup + testing

---

## 🆘 TROUBLESHOOTING

**Issue**: "Invalid account ID"
- **Fix**: Make sure format is `0.0.XXXXX` (with periods, not dashes)

**Issue**: "Mirror node not responding"
- **Fix**: Check internet connection, try: `curl https://testnet.mirrornode.hedera.com/api/v1/network/supply`

**Issue**: "Private key invalid"
- **Fix**: Ensure no extra spaces, should be one long hex string starting with `302e`

---

## 📞 NEED HELP?

- **Hedera Docs**: https://docs.hedera.com/hedera/
- **Discord**: https://hedera.com/discord
- **SDK Examples**: https://github.com/hashgraph/hedera-sdk-js/tree/main/examples

---

**NEXT**: Once you confirm Phase 1 manual setup is complete, I'll execute **Phase 2: Token & NFT System** 🚀
