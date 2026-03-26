# 🚀 Fluxboard 

**AI-Powered Smart Project Management Platform**

Fluxboard is an intelligent project management platform that automates workspace creation by analyzing user prompts using the Google Gemini API. It dynamically generates fully structured Kanban boards (Lists & Cards) with a smooth drag-and-drop experience, helping teams kickstart projects instantly.

## ✨ Key Features
- **AI-Generated Workspaces**: Automatically creates Kanban boards based on natural language prompts
- **Kanban Board System**: Organized Lists & Cards for intuitive task management
- **Drag-and-Drop Interaction**: Seamless UI for managing tasks efficiently.
-  **Modern Tech Stack**: High-performance frontend and scalable backend architecture.
- **Cloud Database Integration**: Uses MongoDB Atlas for flexible and scalable data storage.

## 🗂️ Tech Stack

- **Frontend:** React JS (Vite), TypeScript, Tailwind CSS, Zustand
- **Backend:** Java Spring Boot 3.x
- **Database:** MongoDB Atlas (NoSQL)
- **AI Integration:** Google Gemini API

## 📂 Project Structure

```text

fluxboard/
├── frontend/                  # FRONTEND
│   ├── public/                # Static assets (favicon, images)
│   ├── src/
│   │   ├── assets/            # Shared styles, icons
│   │   ├── components/        # Reusable UI components (Button, Modal, Card...)
│   │   ├── pages/             # Reusable UI components (Button, Modal, Card...)
│   │   ├── services/          # API communication logic (Axios)
│   │   ├── store/             # Global state management (Zustand)
│   │   ├── types/             # TypeScript interfaces/types
│   │   ├── App.tsx            # Root component with routing
│   │   └── main.tsx           # Entry point
│   ├── package.json           
│   └── tailwind.config.js     
│
└── backend/                   # BACKEND/SERVER
    ├── src/main/java/com/fluxboard/
    │   ├── config/            # System configuration (CORS, WebClient...)
    │   ├── controller/        # REST API controllers
    │   ├── service/           # Business logic (including Gemini API calls)
    │   ├── repository/        # MongoDB data access layer
    │   ├── entity/            # Database entities (Board, Card, User)
    │   ├── dto/               # Data Transfer Objects (Request/Response)
    │   └── FluxboardApplication.java # File chạy chính của Spring Boot
    ├── src/main/resources/
    │   └── application.yml    # App configuration (port, DB URI, API keys)
    └── pom.xml                

```
## ⚙️ Getting Started 
**🔧 Prerequisites**

Make sure you have installed:
- Node.js (v18 or higher)
- JDK 17+
- MongoDB Atlas URI
- Google Gemini API Key

### Backend
```
cd backend
```
Configure your environment variables in:

application.yml or .env
- MongoDB URI
- Gemini API Key

Then run:
```
./mvnw spring-boot:run
```
### Frontend

```
cd frontend
npm install
npm run dev
