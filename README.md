# Fluxboard 

**Nền tảng Quản lý Dự án Thông minh tích hợp AI**

Fluxboard tự động hóa việc khởi tạo không gian làm việc bằng cách phân tích Prompt của người dùng thông qua Google Gemini API để tạo ra các bảng Kanban (Lists & Cards) hoàn chỉnh, đi kèm tính năng kéo thả mượt mà.

## Tech Stack

- **Frontend:** React JS (Vite), TypeScript, Tailwind CSS, Zustand
- **Backend:** Java Spring Boot 3.x
- **Database:** MongoDB Atlas (NoSQL)
- **AI Integration:** Google Gemini API

## Cấu trúc 

```text

fluxboard/
├── frontend/                  # FRONTEND
│   ├── public/                # Tài nguyên tĩnh (favicon, images)
│   ├── src/
│   │   ├── assets/            # CSS, icon dùng chung
│   │   ├── components/        # Các UI component dùng lại (Button, Modal, Card...)
│   │   ├── pages/             # Các trang chính (Dashboard, BoardView...)
│   │   ├── services/          # Chứa logic gọi API (Axios)
│   │   ├── store/             # Quản lý State toàn cục (Zustand)
│   │   ├── types/             # Định nghĩa các Interface/Type của TypeScript
│   │   ├── App.tsx            # Component gốc chứa Routing
│   │   └── main.tsx           # Entry point của React
│   ├── package.json           # Khai báo thư viện Node.js
│   └── tailwind.config.js     # Cấu hình UI Tailwind
│
└── backend/                   # BACKEND/SERVER
    ├── src/main/java/com/fluxboard/
    │   ├── config/            # Cấu hình hệ thống (CORS, RestTemplate/WebClient)
    │   ├── controller/        # Xử lý HTTP Request & Response (REST API)
    │   ├── service/           # Xử lý Logic nghiệp vụ (kể cả gọi Gemini API)
    │   ├── repository/        # Giao tiếp với MongoDB Atlas
    │   ├── entity/            # Các class ánh xạ với DB (Board, Card, User)
    │   ├── dto/               # Các Object trung chuyển dữ liệu (Request/Response)
    │   └── FluxboardApplication.java # File chạy chính của Spring Boot
    ├── src/main/resources/
    │   └── application.yml    # Cấu hình port, MongoDB URI, Gemini Key
    └── pom.xml                # Khai báo thư viện Maven (Lombok, Spring Data...)

```
## Cài đặt & Chạy Local
Yêu cầu môi trường: Node.js (18+), JDK 17+, MongoDB URI, Gemini API Key.

Mở 2 terminal riêng biệt để khởi tạo hệ thống:

1. Backend:
```
cd backend
# Đảm bảo đã cấu hình MongoDB URI và Gemini API Key 
# trong src/main/resources/application.yml hoặc file .env
./mvnw spring-boot:run
```
2. Frontend:

```
cd frontend
npm install
npm run dev
