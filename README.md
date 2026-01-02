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

       # API Keys
      HUGGINGFACE_API_KEY=your_huggingface_api_key_here
      A4F_API_KEY=your_a4f_api_key_here
      
      # Database URLs
      QDRANT_URL=your_qdrant_url_here
      MONGODB_URI=your_mongodb_uri_here
      
      # Secrets
      JWT_SECRET=your_jwt_secret_here
      ADMIN_JWT_SECRET=your_admin_jwt_secret_here
      
      # Redis Configuration
      REDIS_HOST=your_redis_host_here
      REDIS_PORT=your_redis_port_here
      
      # Admin Credentials
      ADMIN_USERNAME=your_admin_email_here
      ADMIN_PASSWORD=your_admin_password_here

# Server Configuration
PORT=8000

- **Frontend (.env)**
  
         VITE_API_URL=http://localhost:8000
