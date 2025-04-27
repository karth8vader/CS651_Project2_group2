# PicPlate 🍽️ | AI-Powered Mood-Based Food & Restaurant Recommender

PicPlate is an AI-powered web application that suggests personalized **recipes** and **restaurant recommendations** based on **your mood** detected from your Google Photos.

This project has two parts:

- **Frontend:** React app (`picplate-frontend` folder)
- **Backend:** Node.js + Express app (entry point: `bin/www`)

---

## Quick Setup

```bash
# Clone the repository
# Install frontend and backend dependencies
# Run both servers
```

---

## Available Scripts

### 1. Frontend (React App)

Navigate to the frontend directory:

```bash
cd picplate-frontend
```

Install frontend dependencies:

```bash
npm install
```

Start the frontend server:

```bash
npm start
```

Frontend runs at: [http://localhost:3000](http://localhost:3000)

---

### 2. Backend (Node.js Express API)

At the backend directory or root (where your `bin/www` entry point exists), install backend dependencies:

```bash
npm install
```

Start the backend server:

```bash
npm run dev
```

Backend runs at: [http://localhost:3001](http://localhost:3001)

The backend handles:

- Google Vision API integration for image analysis
- Google Gemini API for recipe and restaurant suggestions
- Firestore database to save user history

---

## Project Structure

```plaintext
picplate-frontend/  # React frontend app
backend/            # Node.js Express backend (bin/www entry point)
```

---

## Deployment Notes

- Environment variables (e.g., API URLs, Firestore credentials) must be set properly for production.
- Handle **CORS** correctly between frontend and backend (different ports).
- To build the frontend for production:

```bash
cd picplate-frontend
npm run build
```

This generates an optimized `build/` folder ready for deployment.

---

## Learn More

- [React Documentation](https://react.dev/)
- [Node.js Documentation](https://nodejs.org/en/docs/)
- [Express Documentation](https://expressjs.com/)
- [Google Cloud Vision API](https://cloud.google.com/vision)
- [Google Gemini API (Vertex AI)](https://cloud.google.com/vertex-ai/docs/generative-ai/learn/overview)

---

## Useful Commands

| Command                    | Purpose                                |
| -------------------------- | -------------------------------------- |
| `npm start` (frontend)     | Start React development server         |
| `npm run dev` (backend)    | Start backend server using nodemon     |
| `npm run build` (frontend) | Create production-ready frontend build |
| `npm install`              | Install project dependencies           |

---

## Contact

If you encounter any issues or have feedback, feel free to contact:

**Email:** [abhate@horizon.csueastbay.edu](mailto\:abhate@horizon.csueastbay.edu)

---

# 🚀 Happy Cooking with PicPlate!

