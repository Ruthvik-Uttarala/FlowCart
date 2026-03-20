# 🚀 FlowCart — AI-Powered Autonomous Product Launch Engine

> Upload once. Launch everywhere.

FlowCart is a multi-agent AI system that transforms raw product inputs into fully launched e-commerce listings and marketing content — automatically.

---

## 🧠 Problem

E-commerce product onboarding is:
- Manual and repetitive
- Time-consuming (10–20 min per product)
- Fragmented across tools (Shopify, Instagram, internal systems)

SMBs waste hours turning supplier data into sellable listings.

---

## ⚡ Solution

FlowCart uses AI agents to automate the entire pipeline:

1. ✨ Enhance product title and description
2. 🛒 Create a live Shopify product
3. 📸 Publish an Instagram post with caption + product link
4. 📊 Return structured results and status

All triggered with a single click.

---

## 🏗️ Architecture

FlowCart is built as a full-stack, production-style system:

### Frontend (Next.js + Vercel)
- Bucket-based product input system
- Magic wand AI enhancement
- Real-time status tracking (Draft → Processing → Done)

### Backend (Next.js API Routes)
- REST API for bucket orchestration
- Airia agent integration
- Status + result persistence

### AI Agent Layer (Airia)
- Multi-step agent workflow:
  - Validate inputs
  - Enhance content (LLM)
  - Create Shopify product
  - Publish Instagram post
- Structured JSON outputs (no parsing ambiguity)

### Integrations
- Shopify Admin API (product creation)
- Instagram Graph API (post publishing)

---

## 🔄 Execution Flow

1. User creates a product bucket
2. Clicks **"Go"**
3. Backend sends payload to Airia agent
4. Agent:
   - Enhances content
   - Creates product
   - Publishes post
5. Results returned → UI updated

---

## ⚙️ Tech Stack

- Next.js (Frontend + Backend)
- Vercel (Deployment)
- Airia (Agent orchestration)
- Shopify Admin API
- Instagram Graph API
- Supabase (Auth layer)

---

## 🔥 Key Features

- 🧠 Multi-agent orchestration
- ⚡ One-click product launch
- 🧩 Structured AI outputs (production-safe)
- 🔄 Batch processing (Go All)
- 🎯 Real API integrations (no mocks)

---

## 📈 Impact

FlowCart reduces product launch time from:

> **20 minutes → seconds**

Enabling SMBs to:
- Launch faster
- Scale listings
- Improve content quality
- Reduce operational overhead

---

## 🚧 Challenges

- Handling real API inconsistencies (Shopify, Instagram)
- Enforcing structured outputs from AI
- Designing reliable multi-step workflows
- Ensuring clear UX for complex automation

---

## 🧠 What We Learned

- AI agents require strong system design, not just prompts
- Structured outputs are critical for reliability
- Real-world integrations introduce significant complexity
- UX clarity is key for AI-driven systems

---

## 🔮 Future Work

- Google Drive → auto ingestion pipeline
- Multi-store SaaS deployment
- Human-in-the-loop approvals
- Advanced content generation (SEO, reels, etc.)

---

## 🏆 Hackathon Track

**Active Agents**

FlowCart demonstrates true multi-system orchestration with autonomous execution across APIs.

---

## 🌐 Demo

👉 [Live Demo](https://merchflow-ai.vercel.app)  


---

## 💡 Final Thought

FlowCart isn’t just automation.

It’s the foundation for **autonomous commerce systems**.