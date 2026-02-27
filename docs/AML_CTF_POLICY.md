# ANTI-MONEY LAUNDERING & COUNTER-TERRORISM FINANCING POLICY
# Kairos 777 Inc.

---

**Document:** AML/CTF Compliance Policy  
**Version:** 1.0  
**Effective Date:** February 27, 2026  
**Last Reviewed:** February 27, 2026  
**Approved By:** Mario Isaac, Founder & Director  
**Entity:** Kairos 777 Inc.  

---

## 1. Purpose & Scope

### 1.1 Purpose

This Anti-Money Laundering and Counter-Terrorism Financing (AML/CTF) Policy establishes the framework by which Kairos 777 Inc. ("the Company") identifies, assesses, mitigates, and reports risks related to money laundering (ML), terrorism financing (TF), and other financial crimes in connection with the operation of the Kairos ecosystem, including:

- **Kairos Coin (KAIROS)** — USD-pegged stablecoin
- **Kairos Trade** — Automated trading platform
- **Kairos Wallet** — Multi-chain digital wallet

### 1.2 Scope

This policy applies to:

- All officers, directors, employees, and contractors of Kairos 777 Inc.
- All blockchain transactions involving KAIROS tokens across all deployed chains (BNB Smart Chain, Base, Arbitrum, Polygon)
- All fiat-to-crypto on-ramp transactions facilitated through third-party partners (e.g., Transak)
- All redemption processes (KAIROS to stablecoin conversions)
- All minting and burning operations

### 1.3 Regulatory Framework

This policy is designed with reference to:

- **U.S. Bank Secrecy Act (BSA)** and its implementing regulations
- **FinCEN guidance** on virtual currency (FIN-2019-G001)
- **OFAC sanctions** compliance requirements
- **FATF Recommendations** on virtual assets and virtual asset service providers (VASPs)
- **EU Anti-Money Laundering Directives** (5AMLD/6AMLD) for international compliance

---

## 2. Risk Assessment

### 2.1 ML/TF Risk Factors

| Risk Category | Risk Level | Mitigation |
|---------------|:----------:|------------|
| Product: Stablecoin (fixed value) | Medium | On-chain transparency, blacklisting capability |
| Geography: Global user base | High | KYC via licensed on-ramp partners, OFAC screening |
| Transaction: Large value transfers | Medium | Threshold monitoring ($10K+), automated alerts |
| Customer: Anonymous wallet users | Medium | KYC delegation to Transak for fiat purchases |
| Channel: Decentralized (blockchain) | Medium | On-chain monitoring, event tracking |
| Minting: Centralized authority | Low | Single authorized owner, on-chain audit trail |

### 2.2 Inherent Risk Mitigations

The Kairos ecosystem has several structural features that inherently reduce ML/TF risk:

1. **Public blockchain transparency:** All KAIROS transactions are permanently recorded on public blockchains and can be audited by anyone.
2. **Stablecoin nature:** The fixed 1:1 USD peg removes speculative value fluctuation, providing no incentive for price manipulation schemes.
3. **On-chain compliance tools:** Blacklisting, pause mechanism, and event logging are built directly into the smart contract.
4. **KYC-gated fiat on-ramp:** All fiat-to-KAIROS purchases go through licensed KYC providers (Transak), ensuring identity verification before fiat conversion.

---

## 3. Customer Due Diligence (CDD)

### 3.1 Fiat On-Ramp Purchases (via Transak)

For all purchases where users convert fiat currency to KAIROS through our integrated on-ramp partner:

- **KYC is performed by Transak** in accordance with their licensed compliance program
- Transak verifies customer identity, performs sanctions screening, and maintains KYC records
- Kairos 777 Inc. receives confirmation of successful KYC verification before token transfer
- Records of all Transak-facilitated transactions are maintained by both parties

### 3.2 Direct Crypto Purchases (On-Chain)

For users who acquire KAIROS through decentralized exchanges (e.g., PancakeSwap) or direct peer-to-peer transfers:

- These transactions occur on public blockchains without direct intermediation by Kairos 777 Inc.
- The Company monitors on-chain activity for suspicious patterns through blockchain analytics
- The blacklisting mechanism allows the Company to freeze addresses associated with illicit activity

### 3.3 Enhanced Due Diligence (EDD)

Enhanced due diligence procedures are applied in the following circumstances:

- Transactions or patterns exceeding **$10,000 USD equivalent** in a single transaction
- Cumulative activity exceeding **$50,000 USD equivalent** within a 30-day period from a single address
- Addresses flagged by blockchain analytics tools as associated with:
  - Sanctioned entities or jurisdictions
  - Known mixing/tumbling services
  - Darknet marketplaces
  - Ransomware or fraud operations
- Transactions involving jurisdictions identified as high-risk by FATF

---

## 4. Transaction Monitoring

### 4.1 On-Chain Monitoring

The Company monitors all KAIROS blockchain activity through:

| Monitor | Method | Frequency |
|---------|--------|-----------|
| Minting events | Smart contract `Mint` event listener | Real-time |
| Burning events | Smart contract `Burn` event listener | Real-time |
| Large transfers | Backend API transaction monitoring | Real-time |
| Fee collection | `FeeCollected` event tracking | Real-time |
| Blacklist actions | `Blacklisted`/`UnBlacklisted` event tracking | Real-time |
| Total supply changes | `totalMinted` and `totalBurned` tracking | Daily reconciliation |

### 4.2 Alert Thresholds

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Single transaction | > $10,000 USD equivalent | Automated alert + manual review |
| Cumulative (30-day/address) | > $50,000 USD equivalent | Enhanced review + possible EDD |
| Rapid successive transactions | > 10 transfers in 1 hour from single address | Pattern analysis review |
| Interaction with flagged address | Any amount | Immediate review + potential blacklisting |
| Minting event | Any amount | Logged + Director notification |
| Redemption (KAIROS → stablecoin) | > $10,000 USD equivalent | Manual verification before processing |

### 4.3 Monitoring Tools

- **Backend API:** Real-time monitoring of all KAIROS events across all 4 deployed chains
- **BscScan/Block Explorer Alerts:** Configured for key wallet addresses
- **Transaction Log Database:** All transactions recorded in secure Turso database with 5-year retention
- **Manual Review:** Periodic manual review of large transactions and unusual patterns

---

## 5. Sanctions Screening

### 5.1 OFAC Compliance

The Company screens against the following sanctions lists:

- **OFAC SDN (Specially Designated Nationals) List**
- **OFAC Consolidated Sanctions List**
- **EU Consolidated List of Sanctions**
- **UN Security Council Sanctions List**

### 5.2 Screening Process

- All addresses interacting with minting, burning, or redemption functions are screened against known sanctioned addresses
- Blockchain analytics are used to identify indirect connections to sanctioned entities
- Any address identified as belonging to or associated with a sanctioned entity is immediately blacklisted via the smart contract `blacklist()` function
- Blacklisting is permanent until explicitly removed by the contract owner

### 5.3 High-Risk Jurisdictions

The Company does not knowingly facilitate services to users in the following jurisdictions:

- North Korea (DPRK)
- Iran
- Syria
- Cuba
- Crimea, Donetsk, and Luhansk regions
- Any other jurisdiction subject to comprehensive OFAC sanctions

---

## 6. Suspicious Activity Reporting

### 6.1 SAR Filing

When suspicious activity is identified, the Company will:

1. **Document** the suspicious activity with all relevant transaction details
2. **Review** internally within 24 hours of detection
3. **File a Suspicious Activity Report (SAR)** with FinCEN within 30 calendar days of detection (or 60 days if no suspect is identified), as applicable
4. **Retain** all supporting documentation for a minimum of 5 years
5. **Blacklist** the associated address(es) on-chain if appropriate

### 6.2 Red Flags

The following indicators trigger enhanced review:

- Structuring: Multiple transactions just below reporting thresholds
- Rapid movement: Tokens received and immediately transferred to different addresses
- Mixing patterns: Tokens routed through multiple wallets in quick succession
- Geographic risk: Activity from or to high-risk jurisdictions
- Unusual redemptions: Large redemptions without corresponding legitimate activity history
- Address clustering: Multiple wallets controlled by same entity with patterns suggesting obfuscation
- Known bad actors: Interaction with addresses flagged by blockchain analytics providers

---

## 7. Record Keeping

### 7.1 Retention Requirements

| Record Type | Retention Period | Storage |
|-------------|:----------------:|---------|
| Transaction logs (on-chain) | Permanent | Blockchain (immutable) |
| Transaction logs (backend) | 5 years minimum | Turso cloud database (encrypted) |
| Minting/burning records | 5 years minimum | Turso database + blockchain |
| KYC records (via Transak) | Per Transak's retention policy | Maintained by Transak |
| SAR filings and documentation | 5 years from filing date | Secure encrypted storage |
| Compliance review records | 5 years | Secure encrypted storage |
| Blacklist action records | Permanent | Blockchain (events) + database |

### 7.2 Data Security

All compliance records are maintained with:

- Encryption at rest and in transit (TLS/HTTPS)
- Access restricted to authorized compliance personnel
- Regular backup procedures
- Secure cloud infrastructure (Render, Turso)

---

## 8. On-Chain Compliance Mechanisms

The KAIROS smart contract includes the following compliance tools, enforced at the blockchain protocol level:

### 8.1 Address Blacklisting

```
Function: blacklist(address account)
Effect: Permanently prevents the address from sending or receiving KAIROS
Event: Blacklisted(address indexed account)
Authority: Contract owner only
```

### 8.2 Emergency Pause

```
Function: pause()
Effect: Halts ALL token transfers, minting, and burning system-wide
Event: Paused(address account)
Authority: Contract owner only
Use Case: Discovered exploit, regulatory order, or emergency situation
```

### 8.3 Audit Trail

Every administrative action emits a publicly visible, immutable event on the blockchain:

| Action | Event Emitted |
|--------|---------------|
| Token minting | `Mint(address indexed to, uint256 amount)` |
| Token burning | `Burn(address indexed from, uint256 amount)` |
| Address blacklisted | `Blacklisted(address indexed account)` |
| Address unblacklisted | `UnBlacklisted(address indexed account)` |
| Fee rate changed | `FeeUpdated(uint256 oldFeeBps, uint256 newFeeBps)` |
| Fee collected | `FeeCollected(address indexed from, address indexed to, uint256 feeAmount, address indexed reserveWallet)` |
| Reserve wallet changed | `ReserveWalletUpdated(address indexed oldWallet, address indexed newWallet)` |
| Contract paused | `Paused(address account)` |
| Contract unpaused | `Unpaused(address account)` |

---

## 9. Compliance Officer

### 9.1 Designated Compliance Officer

| Field | Value |
|-------|-------|
| Name | Mario Isaac |
| Title | Founder, Director & Compliance Officer |
| Entity | Kairos 777 Inc. |
| Email | info@kairos-777.com |

### 9.2 Responsibilities

The Compliance Officer is responsible for:

- Overall implementation and enforcement of this AML/CTF policy
- Reviewing and approving all blacklist actions
- Filing SARs when required
- Conducting periodic risk assessments (at minimum quarterly)
- Ensuring all monitoring systems are operational
- Staying current with regulatory developments
- Training any new personnel on AML/CTF procedures
- Maintaining relationships with legal counsel for regulatory guidance

---

## 10. Training & Awareness

### 10.1 Training Program

All individuals with access to wallet controls, backend systems, or compliance functions receive:

- **Initial training** upon assuming their role, covering this AML/CTF policy, red flags, reporting obligations, and sanctions compliance
- **Annual refresher training** on updated regulations and emerging risks
- **Ad-hoc training** when significant regulatory changes occur

### 10.2 Documentation

Training records are maintained including:

- Date of training
- Topics covered
- Attendee names
- Training materials used

---

## 11. Policy Review & Updates

This policy is reviewed and updated:

- **Annually** at minimum
- **Upon significant regulatory changes** affecting virtual assets or stablecoins
- **Upon material changes** to the Company's operations or product offerings
- **After any compliance incident** requiring policy adjustment

All updates are documented with version history and approved by the Compliance Officer.

---

## 12. Version History

| Version | Date | Author | Changes |
|:-------:|------|--------|---------|
| 1.0 | February 27, 2026 | Mario Isaac | Initial policy creation |

---

**Approved by:**

**Mario Isaac**  
Founder, Director & Compliance Officer  
Kairos 777 Inc.  
February 27, 2026

*"In God We Trust"*
