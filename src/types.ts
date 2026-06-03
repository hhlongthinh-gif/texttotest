export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  category: string;
  difficulty: string;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

export interface ExamAttempt {
  id: string; // attempt id
  examId: string;
  examTitle: string;
  score: number; // e.g. 8.5
  correctCount: number;
  totalCount: number;
  date: string; // ISO string
  answersSubmitted: Record<string, string>; // questionId -> letter choice
  categoryAnalysis: Record<string, { total: number; correct: number }>;
}

export interface ScoreTrendPoint {
  dateLabel: string;
  score: number;
  title: string;
}

export interface CategoryMetric {
  name: string;
  correct: number;
  total: number;
  rate: number; // percentage
}
