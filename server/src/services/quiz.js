/** Pure scoring so it is unit-testable. Score is always computed on the server. */
export function scoreQuiz(questions, answers) {
  let score = 0;
  const review = questions.map((q, i) => {
    const correct = answers[i] === q.correct_index;
    if (correct) score += 1;
    return { questionId: q.id, correct, correctIndex: q.correct_index, explanation: q.explanation };
  });
  return { score, total: questions.length, review };
}
/** Anti-farming: XP only for improvement over your best score, plus a one-time perfect bonus. */
export function quizXp({ score, total, previousBest }) {
  const gain = Math.max(0, score - previousBest) * 10;
  const bonus = score === total && previousBest < total ? 20 : 0;
  return gain + bonus;
}
