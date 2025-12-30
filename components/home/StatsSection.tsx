"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "500k+", label: "NOTES CREATED" },
  { value: "150+", label: "UNIVERSITIES" },
  { value: "4.9/5", label: "STUDENT RATING" },
  { value: "24/7", label: "AVAILABILITY" },
];

export function StatsSection() {
  return (
    <section className="py-10 border-y border-white/5 bg-white/0">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
              className="flex flex-col items-center justify-center text-center"
            >
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {stat.value}
              </h3>
              <p className="text-xs uppercase tracking-widest text-gray-400 font-medium">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
