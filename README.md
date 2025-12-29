🌾 **KisanAI** — Agriculture Intelligence Platform (RAG)

**KisanAI** is an open-source AI-powered agriculture assistance platform built using Retrieval-Augmented Generation (RAG).
It provides accurate, document-grounded answers for questions related to soil, crops, irrigation, pests, and farming practices, based strictly on uploaded agricultural documents.

The platform supports text and voice-based queries, context-aware multi-turn conversations, and robust conversation management with persistent storage.

✨ **Key Features**

- Agriculture-focused conversational assistant

- PDF-based document ingestion and knowledge grounding

- Retrieval-Augmented Generation (RAG) architecture

- Semantic search using vector embeddings

- Context-aware multi-turn conversations

- Voice-based query input (speech-to-text)

- Automatic conversation titles derived from the first user query

- Persistent chat history with conversation listing

- Reliable chat deletion with consistent backend state

- Responsive, mobile-friendly user interface

- Secure authentication and protected APIs

🏗️ **Tech Stack**

**Frontend**

- React

- Tailwind CSS

- Web Speech API (Voice Input)

**Backend**

- Node.js

- Express.js

- MongoDB (Mongoose)

- LangChain

- BullMQ + Redis

**AI & Search**

- HuggingFace all-MiniLM-L6-v2 embeddings

- Gemini 2.0 Flash (OpenAI-compatible API via A4F)

- Qdrant Vector Database

🐳**Running the Project (Recommended Setup)**

- **Start Infrastructure Services**

  Starts Qdrant and Redis:

        docker-compose up -d

- **Backend Setup**

        cd server
        pnpm install

   Start background worker

      pnpm dev:worker

   Start API server

       pnpm dev


    Backend runs at:
👉 http://localhost:8000

- **Frontend Setup**

      cd client
      npm install
      npm run dev


    Frontend runs at:
👉 http://localhost:5173

⚙️ **Environment Variables**

- **Backend (.env)**

        MONGODB_URI=mongodb://localhost:27017/kisanai
        QDRANT_URL=http://localhost:6333
        REDIS_HOST=localhost
        REDIS_PORT=6379
        HUGGINGFACE_API_KEY=your_key
        A4F_API_KEY=your_key
        JWT_SECRET=your_secret

- **Frontend (.env)**
  
         VITE_API_URL=http://localhost:8000
