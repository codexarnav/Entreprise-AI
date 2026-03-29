# ProcureAI: Enterprise RFP Management Pipeline 🚀

An end-to-end, AI-powered platform for processing, analyzing, and managing Requests for Proposals (RFPs) to assist in bid decision-making and automated negotiations for OEMs and Enterprise clients.

## 🌟 Overview

ProcureAI implements a comprehensive RFP management system that automates the analysis of complex RFP documents through a team of specialized AI agents. Unlike traditional manual processes, this pipeline ingests documents natively, evaluates risks, formulates technical requirements, predicts win probabilities, and seamlessly generates coherent proposal documents.

### The Agentic Workflow
Our core orchestration layer relies on a multi-agent system:
1. **RFP Aggregator**: Extracts structured key information and constraints from raw proposals.
2. **Risk and Compliance Agent**: Highlights legal vulnerabilities and compliance gaps.
3. **PWin Agent**: Evaluates the probability of winning (pWin) and recommends strategic positioning.
4. **Technical Agent**: Matches technical requirements against an internal product catalog.
5. **Dynamic Pricing Agent**: Calculates optimal pricing and margins based on technical mappings.
6. **Proposal Weaver Agent**: Stitches together the intelligence into a finalized proposal draft.

## ✨ Key Features
- **Multi-tenant Portals**: Distinct Next.js experiences for Enterprise Clients and OEMs.
- **Autonomous Negotiations**: AI agents that can negotiate on your behalf.
- **Document Intelligence**: Built-in support for PDF and text document text-extraction.
- **Human-in-the-Loop (HIL)**: Safely pause workflows for manual review when critical data or risk thresholds require human approval before resuming.
- **Stateful Workflows**: Asynchronous MongoDB-backed execution engine capable of parallelizing and saving workflow states securely.

## 🛠️ Technology Stack
This repository is structured as a monorepo, housing both the Next.js frontend and the FastAPI Python backend.

**Frontend:**
- [Next.js](https://nextjs.org/) (React Framework)
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide Icons & Radix UI

**Backend:**
- [FastAPI](https://fastapi.tiangolo.com/) (Python Web Framework)
- Pydantic & Uvicorn
- MongoDB & Motor (Async DB Driver)
- JWT Authentication (`python-jose`)
- LLM Execution Engine (Powered by Gemini / Custom orchestrations)

## 📂 Repository Structure

```text
economic-times/
├── frontend/             # Next.js web application
│   ├── app/              # App router, pages, and API routes
│   ├── components/       # Reusable React components (UI library)
│   ├── lib/              # Frontend utilities and hooks
│   └── public/           # Static assets
│
└── backend/              # FastAPI Python backend
    ├── src/              # Core application logic
    │   ├── app.py        # FastAPI application entry point
    │   ├── auth.py       # JWT Authentication logic
    │   ├── database.py   # MongoDB connections
    │   └── executive_layer.py # State management and agent orchestration
    ├── workflow/         # AI Multi-Agent Implementations
    │   └── rfp_agents/   # RFP specialized agents
    └── requirements.txt  # Python dependencies
```

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB instance (Local or Atlas)

### 2. Backend Setup
Navigate into the backend directory and set up your Python environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows

pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```bash
# backend/.env
MONGODB_URI=mongodb://localhost:27017
SECRET_KEY=your_super_secret_jwt_key
GEMINI_API_KEY=your_gemini_api_key
```

Run the backend development server:
```bash
uvicorn src.app:app --reload --port 8000
```

### 3. Frontend Setup
Navigate into the frontend directory and install the Node modules:
```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend/` directory (if needed):
```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Run the frontend development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to access the main portal.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Support

For any questions, issues, or contributions, please open an issue on the repository.