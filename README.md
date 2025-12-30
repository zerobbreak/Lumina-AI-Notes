# Lumina Notes AI 🧠✨

**Lumina Notes AI** is an intelligent study assistant designed to supercharge your learning process. Built with **Next.js 16** and **Convex**, it leverages **Google Gemini 2.5 Flash** to transform how you capture, organize, and review information.

## 🚀 Key Features

### 📝 AI-Powered Note Taking

- **Structured Notes**: Convert messy transcripts into organized Cornell notes with summaries, action items, and review questions.
- **Smart Editing**: Refine text style (academic, casual), fix grammar, simplify complex topics, or expand on brief points.
- **Auto-Complete**: Let AI help you finish your sentences based on context.
- **Rich Text Editor**: Powered by **Tiptap**, supporting code blocks, math (LaTeX), and diagrams (Mermaid.js).

### 🎙️ Audio Transcription & Analysis

- **High-Fidelity Transcription**: Upload or record lectures and get accurate transcripts with speaker detection.
- **Real-time Analysis**: Detect key concepts and "exam-worthy" points as you record.

### 📚 Document Intelligence

- **PDF Processing**: Upload course materials to extract text, generate summaries, and identify key topics.
- **Chat with Context**: Ask questions about specific notes, transcripts, or documents.

### 🧠 Smart Study Tools

- **Instant Flashcards**: Generate flashcard decks from any note or document tailored to your needs.
- **Semantic Search**: Find exactly what you're looking for using vector embeddings—search by meaning, not just keywords.
- **Spaced Repetition**: Track your review progress with built-in study modes.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Backend & Database**: [Convex](https://convex.dev/)
- **AI Model**: Google Gemini 2.5 Flash & `text-embedding-004`
- **Authentication**: [Clerk](https://clerk.com/)
- **Styling**: Tailwind CSS v4, Framer Motion, Lucide React
- **Editor**: Tiptap

## 🏁 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm, pnpm, or bun

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/lumina-notes-ai.git
   cd lumina-notes-ai
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up Environment Variables**
   Create a `.env.local` file in the root directory and add the following:

   ```env
   # Convex
   CONVEX_DEPLOYMENT=...
   NEXT_PUBLIC_CONVEX_URL=...

   # Clerk Auth
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
   CLERK_SECRET_KEY=...

   # Google Gemini AI
   GEMINI_API_KEY=...
   ```

4. **Run the Development Server**
   Start the Next.js app and the Convex backend:

   ```bash
   npm run dev
   ```

   Run Convex in a separate terminal if needed (usually handled by `npm run dev` if configured, otherwise `npx convex dev`):

   ```bash
   npx convex dev
   ```

5. **Open the App**
   Visit [http://localhost:3000](http://localhost:3000) to see the application in action.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
