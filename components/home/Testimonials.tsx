"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import Image from "next/image";

const testimonials = [
  {
    rating: 5,
    quote:
      "This app saved my GPA during finals week. The AI flashcards are literally magic. I generated a whole deck from my lecture notes in seconds.",
    author: "Alex Chen",
    role: "Computer Science Major",
    avatar: "/avatars/alex.jpg", // Placeholder or use UI avatar
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

export function Testimonials() {
  return (
    <section className="py-24 bg-black/50 relative">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              What Students Are Saying
            </h2>
            <p className="text-lg text-muted-foreground">
              Join thousands of students who have transformed their grades.
            </p>
          </div>
          <div className="flex gap-4">
            <button className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-white/5 border border-white/10 p-8 rounded-3xl"
            >
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, starIndex) => (
                  <Star
                    key={starIndex}
                    className="h-4 w-4 fill-cyan-400 text-cyan-400"
                  />
                ))}
              </div>
              <p className="text-gray-300 italic mb-8 h-24">{t.quote}</p>
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-500" />
                <div>
                  <h4 className="font-bold text-white">{t.author}</h4>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
