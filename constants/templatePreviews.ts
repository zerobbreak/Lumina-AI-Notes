export const templatePreviews = {
  cornell: {
    description: "Best for: lectures, structured content",
    preview: [
      "Cue: What is photosynthesis?",
      "Notes: Process where plants convert light into energy.",
      "Summary: Converts light energy to chemical energy.",
    ],
    exampleTopics: ["Biology 101", "Chemistry"],
  },
  outline: {
    description: "Best for: step-by-step reasoning and algorithms",
    preview: [
      "1. Definition",
      "2. Key steps",
      "3. Examples",
    ],
    exampleTopics: ["CS Algorithms", "Engineering"],
  },
  mindmap: {
    description: "Best for: brainstorming and connected ideas",
    preview: [
      "Main Topic",
      "- Subtopic A",
      "- Subtopic B",
      "- Subtopic C",
    ],
    exampleTopics: ["Philosophy", "Humanities"],
  },
} as const;
