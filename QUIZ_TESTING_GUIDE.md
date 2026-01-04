# Quiz Feature Testing Guide

## Quick Start Testing

### Prerequisites
- Application running (`npm run dev` and `npx convex dev`)
- User account created and onboarding completed
- At least one note with sufficient content (50+ characters)

## Test Scenarios

### 1. Generate a Quiz ✅

**Steps:**
1. Navigate to dashboard
2. Click "Quizzes" in the sidebar (purple icon)
3. Click "Generate from Notes" button
4. Select a note from the dropdown
5. Enter a quiz title (optional - auto-fills)
6. Select number of questions (5, 10, 15, or 20)
7. Click "Generate"

**Expected Results:**
- Loading state shows "Generating..."
- On success: Redirects to quiz-taking interface
- On error: Shows error message (e.g., "Note doesn't have enough content")

**Edge Cases to Test:**
- Empty note → Should show error
- Note with < 50 characters → Should show error
- Valid note → Should generate successfully

### 2. Take a Quiz ✅

**Steps:**
1. After generation, quiz-taking interface loads
2. Read the question
3. Select an answer (radio button)
4. Click "Next" to move to next question
5. Use question navigator to jump between questions
6. Answer all questions
7. Click "Submit Quiz" on last question

**Expected Results:**
- Progress bar updates as you move through questions
- Selected answers are highlighted in purple
- "Next" button disabled until answer selected
- Question navigator shows answered questions in green
- "Submit Quiz" disabled until all questions answered

**Navigation Tests:**
- Click "Previous" → Should go back
- Click question number → Should jump to that question
- Click "Back" arrow → Should return to quiz list

### 3. View Results ✅

**Steps:**
1. After submitting quiz, results page loads
2. Review score and percentage
3. Scroll through question review
4. Check correct/incorrect answers
5. Read explanations

**Expected Results:**
- Score card shows: "X / Y - Z%"
- Progress bar colored based on performance:
  - Green (80%+): "Excellent work!"
  - Yellow (60-79%): "Good effort!"
  - Orange (<60%): "Keep studying!"
- Each question shows:
  - ✓ Green for correct answers
  - ✗ Red for incorrect answers
  - User's answer highlighted
  - Correct answer highlighted
  - Explanation displayed

**Actions to Test:**
- Click "Retake Quiz" → Should reset and start over
- Click "Back to Quizzes" → Should return to quiz list

### 4. Quiz Management ✅

**Steps:**
1. Return to Quizzes view
2. Hover over a quiz card
3. Click delete button (trash icon)
4. Confirm deletion

**Expected Results:**
- Quiz card shows:
  - Title
  - Question count
  - Last taken date (if taken)
- Delete button appears on hover
- Confirmation dialog shows
- Quiz removed from list after deletion

### 5. Empty States ✅

**Test:**
1. Delete all quizzes
2. View Quizzes page

**Expected Results:**
- Empty state displays:
  - Icon
  - "No quizzes yet" message
  - Description text
  - "Create Your First Quiz" button

### 6. Error Handling ✅

**Scenarios to Test:**

**Insufficient Content:**
1. Try to generate quiz from empty note
2. Expected: "This note doesn't have enough content yet..."

**No Note Selected:**
1. Open generate dialog
2. Don't select a note
3. Click Generate
4. Expected: "Please select a note"

**API Errors:**
- If Gemini API fails, should show: "Failed to generate quiz"

## Visual Verification

### Color Scheme
- **Purple theme** throughout (distinct from flashcards' indigo)
- Sidebar icon: Purple
- Generate button: Purple to pink gradient
- Quiz cards: Purple accents on hover
- Selected answers: Purple background

### Responsive Design
- Grid layout adapts to screen size:
  - Mobile: 1 column
  - Tablet: 2 columns
  - Desktop: 3 columns

### Animations
- Smooth transitions on hover
- Progress bar animates
- Loading spinners during generation

## Performance Checks

### Load Times
- Quiz list: Should load instantly (Convex query)
- Quiz generation: 5-15 seconds (AI processing)
- Quiz taking: Instant navigation between questions
- Results: Instant calculation and display

### Data Persistence
1. Take a quiz
2. Refresh the page
3. Check quiz list
4. Expected: "Last taken" date updated

## Integration Checks

### Navigation
- Sidebar "Quizzes" button works
- URL routing works: `/dashboard?view=quizzes`
- URL with deckId works: `/dashboard?view=quizzes&deckId=X`

### Database
- Check Convex dashboard for:
  - quizDecks table populated
  - quizQuestions table populated
  - quizResults table populated after taking quiz

## Comparison with Flashcards

Both features should have similar:
- Generation flow
- UI patterns
- Error handling
- Empty states
- Navigation structure

Key differences:
- Quizzes: Purple theme, multiple-choice, scoring
- Flashcards: Indigo theme, front/back, spaced repetition

## Known Limitations

1. **Question Types**: Currently only multiple-choice (as designed)
2. **AI Quota**: Gemini API has rate limits (20 requests/day on free tier)
3. **Content Length**: Limited to 8000 characters for generation
4. **Retake History**: Each retake creates new result entry

## Success Criteria

✅ All test scenarios pass
✅ No console errors
✅ No TypeScript errors
✅ Smooth user experience
✅ Consistent with app design
✅ Feature matches pricing page claim

## Troubleshooting

### Quiz Generation Fails
- Check note has enough content
- Check Gemini API quota (terminal logs)
- Verify Convex functions are running

### Quiz Not Appearing in List
- Check Convex dashboard for data
- Verify user authentication
- Check browser console for errors

### Routing Issues
- Verify imports in `app/dashboard/page.tsx`
- Check URL parameters
- Clear browser cache

## Next Steps After Testing

If all tests pass:
1. ✅ Feature is production-ready
2. ✅ Pricing page claim is accurate
3. ✅ Users can generate and take quizzes
4. ✅ Results are tracked properly

## Feedback Collection

When testing, note:
- User experience pain points
- Performance bottlenecks
- UI/UX improvements
- Feature requests
- Bug reports

---

**Testing Status**: Ready for user testing
**Last Updated**: Implementation complete
**Version**: 1.0.0

