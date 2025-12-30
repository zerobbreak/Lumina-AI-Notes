export interface Testimonial {
  rating: number;
  quote: string;
  author: string;
  role: string;
  avatar: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    rating: 5,
    quote:
      "This app saved my GPA during finals week. The AI flashcards are literally magic. I generated a whole deck from my lecture notes in seconds.",
    author: "Alex Chen",
    role: "Computer Science Major",
    avatar: "/avatars/alex.jpg",
  },
  {
    rating: 5,
    quote:
      "I used to get lost in my own notes. The smart syllabus feature organizes everything for me automatically. It feels like having a personal assistant.",
    author: "Sarah Miller",
    role: "Biology Student",
    avatar: "/avatars/sarah.jpg",
  },
  {
    rating: 5,
    quote:
      "The real-time collaboration is a game changer for group projects. No more sending docs back and forth, we just hop on the canvas and work.",
    author: "Marcus Johnson",
    role: "Pre-Law",
    avatar: "/avatars/marcus.jpg",
  },
];
