import React from "react";
import {
  Beaker,
  Sparkles,
  Trophy,
  Activity,
  Upload,
  BookOpen,
  ArrowRight,
  Check,
  X,
  PlusCircle,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  FileText,
  Trash2,
  Image as ImageIcon,
  AlertCircle
} from "lucide-react";
import { Exam, Question, ExamAttempt } from "./types";
import ChemistryCharts from "./components/ChemistryCharts";

export default function App() {
  // Navigation tabs: 'practice' | 'convert' | 'progress'
  const [activeTab, setActiveTab] = React.useState<"practice" | "convert" | "progress">("practice");

  // State for all exams (default + custom)
  const [exams, setExams] = React.useState<Exam[]>([]);
  // Previous student test attempts
  const [attempts, setAttempts] = React.useState<ExamAttempt[]>([]);
  
  // Custom converter inputs
  const [examTextInput, setExamTextInput] = React.useState<string>("");
  const [uploadedFile, setUploadedFile] = React.useState<{
    name: string;
    mime: string;
    base64: string;
  } | null>(null);
  
  // OCR/Parsing progress statuses
  const [conversionStatus, setConversionStatus] = React.useState<"idle" | "converting" | "success" | "failed">("idle");
  const [conversionError, setConversionError] = React.useState<string>("");
  const [loadingMessageIndex, setLoadingMessageIndex] = React.useState<number>(0);

  // Active practicing exam state indicators
  const [selectedExam, setSelectedExam] = React.useState<Exam | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState<number>(0);
  const [studentAnswers, setStudentAnswers] = React.useState<Record<string, string>>({});
  const [isExamCompleted, setIsExamCompleted] = React.useState<boolean>(false);
  const [latestAttemptResult, setLatestAttemptResult] = React.useState<ExamAttempt | null>(null);

  // Review mode state (reviewing previous attempt details)
  const [reviewingAttempt, setReviewingAttempt] = React.useState<ExamAttempt | null>(null);

  // Load default exams and localStorage data on mount
  React.useEffect(() => {
    // 1. Fetch default samples from our server API, fallback to localStorage if any
    const fetchSampleExams = async () => {
      try {
        const res = await fetch("/api/sample-exams");
        const data = await res.json();
        if (data.success && data.exams) {
          const localCustomStr = localStorage.getItem("custom_chemistry_exams");
          const customExams: Exam[] = localCustomStr ? JSON.parse(localCustomStr) : [];
          
          // Merge defaults with user generated custom exams
          setExams([...data.exams, ...customExams]);
        }
      } catch (err) {
        console.error("Failed to load sample chemistry exams:", err);
      }
    };
    
    fetchSampleExams();

    // 2. Load attempts history
    const savedAttempts = localStorage.getItem("chemistry_exam_attempts");
    if (savedAttempts) {
      setAttempts(JSON.parse(savedAttempts));
    }
  }, []);

  // Delightful chemistry loading loop message effect
  const loadingMessages = [
    "Đang phân tích đề bài & nhận diện ký tự...",
    "Đang giải các phương trình hóa học hóa đại cương...",
    "Đang cân bằng phản ứng oxi-hóa khử...",
    "Đang tính toán lại hằng số điện ly & trị số pH...",
    "Đang mô hình hóa cấu trúc mạch Cacbon hữu cơ...",
    "Đang chuyển đổi hóa chất thành định dạng hiển thị subscript đẹp mắt...",
    "Đang trích xuất hệ thống câu hỏi, đáp án và lời luận giải chi tiết..."
  ];

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (conversionStatus === "converting") {
      timer = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 3000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [conversionStatus]);

  // Handle file select action
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedFile({
          name: file.name,
          mime: file.type,
          base64: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    } else if (file.type === "text/plain") {
      // Direct text files are read and pasted automatically in text area
      const reader = new FileReader();
      reader.onload = () => {
        setExamTextInput(reader.result as string);
      };
      reader.readAsText(file);
    } else {
      alert("Chỉ hỗ trợ tải lên tệp ảnh đề thi (PNG, JPEG, WEBP) hoặc tệp văn bản thô (.txt)");
    }
  };

  // Convert raw chemistry content using server API
  const convertExamPaper = async () => {
    if (!examTextInput.trim() && !uploadedFile) {
      setConversionError("Vui lòng nhập nội dung đề bài hoặc đính kèm ảnh chụp đề.");
      return;
    }

    setConversionStatus("converting");
    setConversionError("");
    setLoadingMessageIndex(0);

    try {
      const response = await fetch("/api/convert-exam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          examText: examTextInput,
          fileBase64: uploadedFile?.base64 || null,
          fileName: uploadedFile?.name || null,
          fileMime: uploadedFile?.mime || null,
        }),
      });

      const data = await response.json();

      if (data.success && data.exam) {
        // Save to local custom exams
        const localCustomStr = localStorage.getItem("custom_chemistry_exams");
        const customExams: Exam[] = localCustomStr ? JSON.parse(localCustomStr) : [];
        const updatedCustomExams = [data.exam, ...customExams];
        localStorage.setItem("custom_chemistry_exams", JSON.stringify(updatedCustomExams));

        // Update overall state
        setExams((prev) => {
          // Exclude template duplicates
          const withoutCustom = prev.filter(e => !e.id.startsWith("user_exam_"));
          return [...withoutCustom, ...updatedCustomExams];
        });

        setConversionStatus("success");
        setExamTextInput("");
        setUploadedFile(null);
        
        // Auto select and jump to practice
        setSelectedExam(data.exam);
        setCurrentQuestionIndex(0);
        setStudentAnswers({});
        setIsExamCompleted(false);
        setLatestAttemptResult(null);
        setActiveTab("practice");
      } else {
        setConversionStatus("failed");
        setConversionError(data.message || "Không thể phân tích đề thi. Hãy thử định dạng văn bản rõ nét hơn.");
      }
    } catch (err: any) {
      console.error(err);
      setConversionStatus("failed");
      setConversionError("Kết nối tới máy chủ bị gián đoạn. Vui lòng kiểm tra và thử lại.");
    }
  };

  // Quiz submission processing
  const submitExamAnswers = () => {
    if (!selectedExam) return;

    let correctCount = 0;
    const totalCount = selectedExam.questions.length;
    
    // Track category analysis breakdown for specific metrics
    const categoryAnalysis: Record<string, { total: number; correct: number }> = {};

    selectedExam.questions.forEach((q) => {
      const studentAnswer = studentAnswers[q.id]?.trim().toUpperCase();
      const isCorrect = studentAnswer === q.correctAnswer.trim().toUpperCase();
      
      if (isCorrect) correctCount++;

      if (!categoryAnalysis[q.category]) {
        categoryAnalysis[q.category] = { total: 0, correct: 0 };
      }
      categoryAnalysis[q.category].total += 1;
      if (isCorrect) {
        categoryAnalysis[q.category].correct += 1;
      }
    });

    const finalScore = parseFloat(((correctCount / totalCount) * 10).toFixed(1));

    const attempt: ExamAttempt = {
      id: `attempt_${Date.now()}`,
      examId: selectedExam.id,
      examTitle: selectedExam.title,
      score: finalScore,
      correctCount,
      totalCount,
      date: new Date().toISOString(),
      answersSubmitted: studentAnswers,
      categoryAnalysis,
    };

    // Save attempt globally and persist
    const updatedAttempts = [attempt, ...attempts];
    setAttempts(updatedAttempts);
    localStorage.setItem("chemistry_exam_attempts", JSON.stringify(updatedAttempts));

    setLatestAttemptResult(attempt);
    setIsExamCompleted(true);
  };

  // Reset current session quiz state
  const retakeExamSession = () => {
    setStudentAnswers({});
    setCurrentQuestionIndex(0);
    setIsExamCompleted(false);
    setLatestAttemptResult(null);
  };

  // Clean / Delete custom added exam
  const deleteCustomExam = (examId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm("Bạn có chắc chắn muốn xóa đề thi tự luyện tùy chỉnh này?")) return;

    const localCustomStr = localStorage.getItem("custom_chemistry_exams");
    if (localCustomStr) {
      const customExams: Exam[] = JSON.parse(localCustomStr);
      const filtered = customExams.filter((e) => e.id !== examId);
      localStorage.setItem("custom_chemistry_exams", JSON.stringify(filtered));
      
      // Reload on-screen exams list by pulling sample exams again
      fetch("/api/sample-exams")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.exams) {
            setExams([...data.exams, ...filtered]);
          }
        });
    }

    if (selectedExam?.id === examId) {
      setSelectedExam(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbfc] text-stone-800 flex flex-col font-sans">
      
      {/* Dynamic Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10 transition-shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo area */}
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => { setSelectedExam(null); setReviewingAttempt(null); setActiveTab("practice"); }}>
              <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm ring-4 ring-teal-50">
                <Beaker className="w-5.5 h-5.5" />
              </div>
              <div>
                <span className="font-bold text-lg text-stone-900 tracking-tight font-sans">Luyện Đề Hóa Học</span>
                <span className="hidden sm:inline bg-teal-50 text-teal-700 text-[10px] font-semibold tracking-wide ml-2 px-2 py-0.5 rounded-full border border-teal-100 uppercase">AI Powered</span>
              </div>
            </div>

            {/* Main Tabs Navigation */}
            <nav className="flex space-x-1">
              <button
                id="tab-practice"
                onClick={() => { setActiveTab("practice"); setReviewingAttempt(null); }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === "practice"
                    ? "bg-stone-100 text-stone-900 font-semibold"
                    : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  <span>Kho Đề Thi</span>
                </div>
              </button>

              <button
                id="tab-convert"
                onClick={() => { setActiveTab("convert"); setReviewingAttempt(null); }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all relative ${
                  activeTab === "convert"
                    ? "bg-teal-50 text-teal-800 font-semibold"
                    : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-500" />
                  <span>Chuyển Đề Bằng AI</span>
                </div>
              </button>

              <button
                id="tab-progress"
                onClick={() => { setActiveTab("progress"); setReviewingAttempt(null); }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === "progress"
                    ? "bg-stone-100 text-stone-900 font-semibold"
                    : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4" />
                  <span>Tiến Độ Học Tập</span>
                </div>
              </button>
            </nav>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* VIEW 1: PREVIOUS SELF ATTEMPT REVIEW DETAIL (IF SELECTED FROM PROGRESS LIST) */}
        {reviewingAttempt && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in mb-8">
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-100 pb-5 mb-6">
                <div>
                  <button
                    onClick={() => setReviewingAttempt(null)}
                    className="text-xs font-semibold text-stone-500 hover:text-stone-800 mb-2 inline-flex items-center gap-1"
                  >
                    ← Quay lại phân tích tiến độ
                  </button>
                  <h2 className="text-xl font-bold text-stone-800">{reviewingAttempt.examTitle}</h2>
                  <p className="text-xs text-stone-400 mt-1">
                    Ngày nộp bài: {new Date(reviewingAttempt.date).toLocaleString("vi-VN")}
                  </p>
                </div>
                
                <div className="text-right shrink-0">
                  <div className="text-4xl font-extrabold text-teal-600">{reviewingAttempt.score} <span className="text-sm font-normal text-stone-400">/ 10đ</span></div>
                  <div className="text-xs text-stone-500 font-medium mt-1">Đúng {reviewingAttempt.correctCount}/{reviewingAttempt.totalCount} câu</div>
                </div>
              </div>

              {/* Loop and show answers breakdown */}
              {(() => {
                const targetExam = exams.find(e => e.id === reviewingAttempt.examId);
                if (!targetExam) {
                  return (
                    <div className="text-center py-6 text-stone-500">
                      <p className="text-sm">Đề thi gốc của lượt thi này đã được chỉnh sửa hoặc xóa bỏ ngoài kho dữ liệu.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-8">
                    <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest">ĐÁP ÁN CHI TIẾT ĐÃ SUBMIT</h3>
                    {targetExam.questions.map((q, qIndex) => {
                      const ans = reviewingAttempt.answersSubmitted[q.id];
                      const isCorrect = ans && ans.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase();

                      return (
                        <div key={q.id} className={`p-5 rounded-xl border ${isCorrect ? 'border-emerald-150 bg-emerald-50/20' : 'border-rose-150 bg-rose-50/10'} space-y-4`}>
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <span className="text-xs uppercase px-2 py-0.5 rounded font-mono font-bold bg-white border border-stone-200 shadow-3sm mr-2.5">
                                Câu {qIndex + 1}
                              </span>
                              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">
                                {q.category}
                              </span>
                              <span className={`text-xs ml-2 px-2 py-0.5 rounded font-medium ${q.difficulty === "Dễ" ? "bg-green-50 text-green-700" : q.difficulty === "Khó" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                                {q.difficulty}
                              </span>
                            </div>
                            <div className="shrink-0">
                              {isCorrect ? (
                                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                                  <Check className="w-3.5 h-3.5" /> Chính xác
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs text-red-700 font-semibold bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                                  <X className="w-3.5 h-3.5" /> Sai cấu trúc
                                </span>
                              )}
                            </div>
                          </div>

                          <h4 
                            className="font-medium text-stone-900 text-base"
                            dangerouslySetInnerHTML={{ __html: q.text }} 
                          />

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {q.options.map((opt) => {
                              const choiceLetter = opt.trim().slice(0, 1).toUpperCase();
                              const isSelected = ans === choiceLetter;
                              const isCorrectAnswer = q.correctAnswer === choiceLetter;
                              
                              let optionClass = "bg-white border-stone-200 text-stone-700";
                              if (isCorrectAnswer) {
                                optionClass = "bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold";
                              } else if (isSelected) {
                                optionClass = "bg-red-50 border-red-300 text-red-900";
                              }

                              return (
                                <div 
                                  key={opt} 
                                  className={`p-3 rounded-lg border text-sm flex items-center justify-between ${optionClass}`}
                                >
                                  <span dangerouslySetInnerHTML={{ __html: opt }} />
                                  <div className="shrink-0 flex items-center gap-1">
                                    {isCorrectAnswer && <Check className="w-4 h-4 text-emerald-600" />}
                                    {!isCorrectAnswer && isSelected && <X className="w-4 h-4 text-red-500" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Explanation Card */}
                          <div className="mt-4 pt-4 border-t border-stone-200/50 bg-stone-50/80 rounded-lg p-4">
                            <h5 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1 mb-2">
                              🔑 LỜI GIẢI CHI TIẾT CỦA AI:
                            </h5>
                            <p 
                              className="text-stone-600 text-sm leading-relaxed whitespace-pre-line"
                              dangerouslySetInnerHTML={{ __html: q.explanation }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* VIEW 2: ACTIVE QUIZ PRACTICE SESSION */}
        {selectedExam && !reviewingAttempt && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            
            {/* Exam metadata and progression tracking status */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedExam(null)}
                  className="text-xs font-bold text-teal-600 hover:text-teal-800 uppercase tracking-wide inline-flex items-center gap-1"
                >
                  ← Thoát & Về kho đề
                </button>
                <h2 className="text-xl font-bold text-stone-800">{selectedExam.title}</h2>
                <p className="text-stone-500 text-sm">{selectedExam.description}</p>
              </div>

              {!isExamCompleted && (
                <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-center sm:text-right shrink-0">
                  <span className="text-xs text-stone-400 font-sans uppercase">Tiến trình làm bài</span>
                  <div className="text-lg font-bold text-stone-800">
                    {Object.keys(studentAnswers).length} / {selectedExam.questions.length} <span className="text-xs text-stone-500 font-normal">câu đã chọn</span>
                  </div>
                </div>
              )}
            </div>

            {/* Question numbers block picker */}
            <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
              <div className="flex flex-wrap gap-2.5 items-center">
                <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider mr-2">Câu hỏi:</span>
                {selectedExam.questions.map((q, idx) => {
                  const isCurrent = idx === currentQuestionIndex;
                  const isChosen = studentAnswers[q.id] !== undefined;
                  
                  let dotColorClass = "bg-stone-50 border-stone-200 text-stone-500";
                  if (isCurrent) {
                    dotColorClass = "bg-teal-600 text-white border-teal-600 ring-2 ring-teal-100 font-bold";
                  } else if (isExamCompleted) {
                    const ans = studentAnswers[q.id];
                    const isCorrect = ans && ans.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase();
                    dotColorClass = isCorrect 
                      ? "bg-emerald-500 text-white border-emerald-500 font-bold" 
                      : "bg-red-500 text-white border-red-500 font-bold";
                  } else if (isChosen) {
                    dotColorClass = "bg-teal-100 text-teal-800 border-teal-200 font-semibold";
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`w-9 h-9 rounded-lg border text-xs flex items-center justify-center transition-all ${dotColorClass}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main practicing active interface */}
            {(() => {
              const currentQuestion: Question = selectedExam.questions[currentQuestionIndex];
              const selectedChoice = studentAnswers[currentQuestion.id];

              return (
                <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
                  
                  {/* Category, Difficulty labels */}
                  <div className="flex justify-between items-center border-b border-stone-100 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold uppercase text-stone-400 bg-stone-100 px-2.5 py-1 rounded">
                        Câu hỏi {currentQuestionIndex + 1}
                      </span>
                      <span className="text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded font-semibold border border-indigo-100">
                        {currentQuestion.category}
                      </span>
                    </div>

                    <span className={`text-xs px-2.5 py-1 rounded font-semibold border ${
                      currentQuestion.difficulty === "Dễ" 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                        : currentQuestion.difficulty === "Khó" 
                          ? "bg-red-50 text-red-700 border-red-100" 
                          : "bg-amber-50 text-amber-700 border-amber-100"
                    }`}>
                      Mức độ: {currentQuestion.difficulty}
                    </span>
                  </div>

                  {/* Question description */}
                  <div className="py-2.5">
                    <h3 
                      className="text-stone-950 font-medium text-lg sm:text-xl leading-relaxed font-sans"
                      dangerouslySetInnerHTML={{ __html: currentQuestion.text }}
                    />
                  </div>

                  {/* MCQ Options Choices Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {currentQuestion.options.map((optionText) => {
                      const letter = optionText.trim().slice(0, 1).toUpperCase();
                      const isSelected = selectedChoice === letter;
                      
                      let choiceStyle = "bg-white border-stone-200 text-stone-700 hover:border-stone-400 hover:bg-stone-50";
                      
                      if (isExamCompleted) {
                        const isCorrectAnswer = currentQuestion.correctAnswer === letter;
                        if (isCorrectAnswer) {
                          choiceStyle = "bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold";
                        } else if (isSelected) {
                          choiceStyle = "bg-red-50 border-red-400 text-red-950 font-medium";
                        } else {
                          choiceStyle = "bg-stone-50 border-stone-100 text-stone-400 opacity-60";
                        }
                      } else if (isSelected) {
                        choiceStyle = "bg-teal-52 text-teal-950 border-teal-500 ring-4 ring-teal-50/60 font-semibold";
                      }

                      return (
                        <button
                          key={optionText}
                          disabled={isExamCompleted}
                          onClick={() => {
                            setStudentAnswers({
                              ...studentAnswers,
                              [currentQuestion.id]: letter,
                            });
                          }}
                          className={`p-4 rounded-xl border text-left text-sm sm:text-base transition-all flex justify-between items-center ${choiceStyle}`}
                        >
                          <span dangerouslySetInnerHTML={{ __html: optionText }} />
                          <div className="shrink-0 ml-3">
                            {isExamCompleted && currentQuestion.correctAnswer === letter && (
                              <Check className="w-5 h-5 text-emerald-600" />
                            )}
                            {isExamCompleted && isSelected && currentQuestion.correctAnswer !== letter && (
                              <X className="w-5 h-5 text-red-500" />
                            )}
                            {!isExamCompleted && (
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                isSelected ? "border-teal-600 bg-teal-600 text-white" : "border-stone-300"
                              }`}>
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Navigation Footer for quiz layout */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-stone-100">
                    <div className="flex space-x-2 w-full sm:w-auto">
                      <button
                        onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-stone-200 text-stone-600 text-sm font-semibold hover:bg-stone-50 disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        <ChevronLeft className="w-4 h-4" /> TRƯỚC
                      </button>

                      <button
                        onClick={() => setCurrentQuestionIndex((prev) => Math.min(selectedExam.questions.length - 1, prev + 1))}
                        disabled={currentQuestionIndex === selectedExam.questions.length - 1}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-stone-200 text-stone-600 text-sm font-semibold hover:bg-stone-50 disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        TIẾP <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {!isExamCompleted ? (
                      <button
                        onClick={submitExamAnswers}
                        className="w-full sm:w-auto bg-teal-600 text-white hover:bg-teal-700 text-sm font-semibold px-6 py-2.5 rounded-lg shadow-sm font-sans"
                      >
                        NỘP BÀI THI & XEM GIẢI
                      </button>
                    ) : (
                      <button
                        onClick={retakeExamSession}
                        className="w-full sm:w-auto border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 text-sm font-bold px-6 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw className="w-4 h-4" /> THỬ SỨC LẠI
                      </button>
                    )}
                  </div>

                  {/* Visual Solution feedback pane only when exam is submitted */}
                  {isExamCompleted && (
                    <div className="mt-8 border-t border-dashed border-stone-200 pt-6 animate-fade-in">
                      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mt-0.5">
                            <Sparkles className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-stone-800 uppercase tracking-widest leading-none">Lời giải khoa học từ AI</h4>
                            <span className="text-[11px] text-stone-400">Tự động đối chiếu chất xúc tác, cân bằng phân tử</span>
                          </div>
                        </div>

                        <div className="p-4 bg-white rounded-xl border border-stone-200">
                          <p 
                            className="text-stone-600 text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: currentQuestion.explanation }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              );
            })()}

            {/* Instant grade results dashboard (Only visible after submission) */}
            {isExamCompleted && latestAttemptResult && (
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm align-center text-center space-y-4 animate-fade-in">
                <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto">
                  <Trophy className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-stone-800">Hoạt động Hoàn Thành!</h3>
                  <div className="text-4xl font-black text-teal-600 mt-2">{latestAttemptResult.score} <span className="text-lg font-normal text-stone-400">/ 10đ</span></div>
                </div>
                <p className="text-sm text-stone-500 max-w-sm mx-auto">
                  Tuyệt vời! Bạn vừa nộp thành công bài trắc nghiệm tự luyện hóa học. Điểm số của bạn đã được ghi nhận vào hệ thống phân tích năng lực.
                </p>
                <div className="flex justify-center gap-2.5 pt-2">
                  <button
                    onClick={() => { setSelectedExam(null); setActiveTab("progress"); }}
                    className="bg-indigo-600 text-white hover:bg-indigo-700 font-semibold px-5 py-2 rounded-lg text-sm shadow-sm"
                  >
                    Xem biểu đồ tổng quan
                  </button>
                  <button
                    onClick={() => setSelectedExam(null)}
                    className="border border-stone-200 text-stone-600 hover:bg-stone-50 font-semibold px-5 py-2 rounded-lg text-sm"
                  >
                    Trở về kho đề
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* VIEW 3: PRACTICE HOMEPAGE (LISTING POPULAR TEMPLATES + CONVERSIONS) */}
        {activeTab === "practice" && !selectedExam && !reviewingAttempt && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Hero promo splash banner */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-10 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="space-y-4 max-w-xl text-center md:text-left z-10">
                <div className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1 rounded-full border border-teal-100">
                  <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                  <span>Chuyển đổi đề bất kỳ trong 10 giây</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 leading-tight tracking-tight">
                  Tự Học & Luyện Thi Hóa Học Trực Quan
                </h1>
                <p className="text-stone-500 text-sm sm:text-base leading-relaxed">
                  Hệ thống số hóa đề thi thông minh của bạn. Chỉ cần chụp hình hoặc dán tài liệu chữ, AI sẽ tự động tách thành bài tập trắc nghiệm số tương tác kèm biểu đồ theo dõi lực học.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center md:justify-start">
                  <button
                    onClick={() => setActiveTab("convert")}
                    className="bg-teal-600 text-white hover:bg-teal-700 font-bold text-sm px-6 py-3 rounded-xl shadow-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Gửi đề bài ngay</span> <ArrowRight className="w-4 h-4" />
                  </button>
                  <a
                    href="#templates"
                    className="border border-stone-200 hover:bg-stone-50 text-stone-600 font-semibold text-xs py-3.5 px-6 rounded-xl inline-flex items-center justify-center"
                  >
                    Xem các đề mẫu sẵn có
                  </a>
                </div>
              </div>

              {/* Minimal chemistry graphic element floating background */}
              <div className="w-56 h-56 bg-gradient-to-tr from-teal-50 to-indigo-50/60 rounded-full flex items-center justify-center relative shadow-inner select-none shrink-0 border border-stone-100">
                <Beaker className="w-24 h-24 text-teal-600/80 filter drop-shadow animate-pulse" />
              </div>
            </div>

            {/* Template lists container */}
            <div id="templates" className="space-y-5">
              <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-stone-900">Danh Sách Đề Ôn Luyện</h3>
                  <p className="text-stone-400 text-xs mt-0.5">Chọn một đề thi biên soạn sẵn hoặc từ AI của bạn để bắt đầu làm bài</p>
                </div>
                <button
                  onClick={() => setActiveTab("convert")}
                  className="text-xs font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1"
                >
                  <PlusCircle className="w-4 h-4" /> Tạo đề mới
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {exams.map((exam) => {
                  const isCustom = exam.id.startsWith("user_exam_");
                  return (
                    <div
                      key={exam.id}
                      onClick={() => {
                        setSelectedExam(exam);
                        setStudentAnswers({});
                        setCurrentQuestionIndex(0);
                        setIsExamCompleted(false);
                        setLatestAttemptResult(null);
                      }}
                      className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-teal-500 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between gap-4 group"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-4">
                          <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full tracking-wider ${
                            isCustom 
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-100" 
                              : "bg-teal-50 text-teal-700 border border-teal-100"
                          }`}>
                            {isCustom ? "Đề tự upload" : "Đề mẫu mặc định"}
                          </span>
                          
                          {isCustom && (
                            <button
                              onClick={(e) => deleteCustomExam(exam.id, e)}
                              className="text-stone-300 hover:text-red-500 hover:bg-stone-50 p-1.5 rounded-lg transition-colors"
                              title="Xóa đề tùy chỉnh này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <h4 className="font-bold text-stone-900 group-hover:text-teal-700 transition-colors font-sans text-base">
                          {exam.title}
                        </h4>
                        <p className="text-stone-500 text-sm line-clamp-2 leading-relaxed">
                          {exam.description}
                        </p>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-stone-100 text-xs">
                        <span className="text-stone-400 font-mono font-bold">
                          {exam.questions.length} CÂU TRẮC NGHIỆM
                        </span>
                        
                        <span className="text-teal-600 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          <span>Bắt đầu ôn tập</span> <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* VIEW 4: AUTOMATIC CONVERTER UPLOAD TERMINAL */}
        {activeTab === "convert" && !selectedExam && !reviewingAttempt && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            
            {/* Introductory panel */}
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <h2 className="text-2xl font-black text-stone-900 tracking-tight sm:text-3xl">
                Chuyển Đề Tự Động Sang Trắc Nghiệm Tự Luyện
              </h2>
              <p className="text-stone-500 text-sm sm:text-base leading-relaxed">
                Tải lên một file ảnh chụp đề hóa học hoặc dán văn bản thô đề học kỳ, đề kiểm tra. Trí tuệ nhân tạo Gemini sẽ số hóa, trích xuất cấu trúc câu hỏi, đáp án, lời giải từng bước cho học sinh luyện tập.
              </p>
            </div>

            {/* Error state callout */}
            {conversionError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-800 text-sm max-w-2xl mx-auto">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Thao tác không thành công</p>
                  <p className="text-rose-500">{conversionError}</p>
                </div>
              </div>
            )}

            {/* Dual upload dashboard content */}
            {conversionStatus === "converting" ? (
              // Chemistry Loader interface
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-sm max-w-xl mx-auto space-y-6">
                <div className="relative w-24 h-24 mx-auto select-none">
                  {/* CSS animation chemistry bubble loader */}
                  <div className="absolute inset-0 rounded-full border-4 border-teal-100 border-t-teal-600 animate-spin" />
                  <div className="absolute inset-4 rounded-full bg-teal-50 flex items-center justify-center">
                    <Beaker className="w-8 h-8 text-teal-600 animate-bounce" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-md font-bold text-stone-800">Đang số hóa đề thi môn hóa...</h3>
                  <div className="text-teal-700 bg-teal-50 px-4 py-2 rounded-lg text-sm inline-block font-medium animate-pulse">
                    {loadingMessages[loadingMessageIndex]}
                  </div>
                  <p className="text-xs text-stone-400 max-w-xs mx-auto pt-2">
                    Quá trình phân tích chuyên sâu có thể mất tới 10-15 giây do mô hình cần cân bằng chính xác phương trình hóa học.
                  </p>
                </div>
              </div>
            ) : (
              // Active form controls
              <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
                
                {/* Method A: Image Screenshot drag & drop upload */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest font-sans">
                    Cách 1: Tải ảnh chụp đề bài / Bài tập về nhà
                  </label>
                  
                  {uploadedFile ? (
                    <div className="bg-stone-50 border border-stone-300 rounded-xl p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-white border border-stone-200 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                          <img src={uploadedFile.base64} alt="Screenshot attachment" className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-stone-800 line-clamp-1">{uploadedFile.name}</p>
                          <p className="text-xs text-stone-400">Đã lưu ảnh để phân tích hóa</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setUploadedFile(null)}
                        className="text-stone-400 hover:text-red-500 p-1 rounded-lg hover:bg-white transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-stone-200 rounded-xl p-6 text-center hover:border-teal-500 transition-colors relative cursor-pointer group bg-stone-50/50">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="space-y-4">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-stone-400 mx-auto group-hover:text-teal-600 shadow-3sm border border-stone-200">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold text-stone-700">Kéo thả hoặc click để tải lên ảnh chụp đề</p>
                          <p className="text-xs text-stone-400">Chấp nhận PNG, JPEG, WEBP tối đa 15MB</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative text-center py-1">
                  <span className="absolute inset-y-1/2 left-0 right-0 border-t border-stone-200" />
                  <span className="relative bg-white px-3.5 text-xs text-stone-400 font-bold uppercase tracking-wider font-sans">HOẶC DÙNG</span>
                </div>

                {/* Method B: Raw text copy matching */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest font-sans">
                      Cách 2: Dán văn bản thô đề kiểm tra vào đây
                    </label>
                    <button
                      onClick={() => setExamTextInput(`Câu 1. Chất nào sau đây là oxit axit?
A. CaO
B. P2O5
C. Na2O
D. MgO

Câu 2. Để hòa tan hết 5,6 gam sắt (Fe), thể tích khí hiđro thu được (đktc) là bao nhiêu lít?
A. 2.24 lít
B. 1.12 lít
C. 3.36 lít
D. 4.48 lít`)}
                      className="text-xs font-bold text-teal-600 hover:text-teal-800"
                    >
                      Dùng ví dụ gợi ý
                    </button>
                  </div>

                  <textarea
                    rows={8}
                    className="w-full bg-stone-50 rounded-xl border border-stone-200 p-4 text-sm font-sans focus:bg-white focus:border-teal-500 focus:outline-none leading-relaxed transition-all text-stone-800 placeholder-stone-400"
                    placeholder="Dán các câu hỏi tự luận, trắc nghiệm hóa học của bạn tại đây... Không cần căn lề, định dạng tinh gọn."
                    value={examTextInput}
                    onChange={(e) => setExamTextInput(e.target.value)}
                  />
                  <div className="flex justify-between items-center text-[11px] text-stone-400">
                    <span>*Mẹo: Nhập đầy đủ 4 sự lựa chọn A B C D để kết quả đạt độ chuẩn xác tối ưu</span>
                    <span className="font-mono font-medium">{examTextInput.length} ký tự</span>
                  </div>
                </div>

                {/* Finalizing Conversion action Button */}
                <div className="pt-4 border-t border-stone-100 flex justify-end">
                  <button
                    onClick={convertExamPaper}
                    className="bg-teal-600 text-white hover:bg-teal-700 font-bold text-sm px-8 py-3.5 rounded-xl shadow-sm inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Bắt đầu chuyển đề & tạo bài tập</span>
                  </button>
                </div>

              </div>
            )}

          </div>
        )}

        {/* VIEW 5: LEARNING PROGRESS INTERACTIVE METRICS AND ATTEMPTS ARCHIVE */}
        {activeTab === "progress" && !selectedExam && !reviewingAttempt && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Embedded Visual Analytics Graphs */}
            <ChemistryCharts attempts={attempts} />

            {/* Completed historic lists section */}
            <div className="space-y-4">
              <h3 className="text-md font-bold text-stone-900 border-b border-stone-100 pb-3 font-sans uppercase tracking-wider">
                Lịch sử Giải Đề & Làm Bài Tập
              </h3>

              {attempts.length === 0 ? (
                <div className="text-center bg-white border border-stone-100 rounded-2xl py-8 text-stone-400 font-medium">
                  Chưa có lịch sử làm bài được ghi nhận. Hãy hoàn thành tối thiểu một đề thi để xem.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 overflow-hidden shadow-sm">
                  {attempts.map((att) => (
                    <div
                      key={att.id}
                      onClick={() => setReviewingAttempt(att)}
                      className="p-4 sm:p-5 hover:bg-stone-50 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-stone-400 font-medium">
                            {new Date(att.date).toLocaleDateString("vi-VN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <h4 className="font-bold text-stone-800 group-hover:text-teal-700 transition-colors text-sm sm:text-base leading-snug">
                          {att.examTitle}
                        </h4>
                        <div className="text-xs text-stone-400">
                          Chính xác: <span className="text-stone-600 font-semibold">{att.correctCount}/{att.totalCount} câu</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0自 mt-1">
                        <div className="text-right">
                          <span className="text-xl font-extrabold text-teal-600">{att.score}</span>
                          <span className="text-xs text-stone-400 font-semibold ml-0.5">/10đ</span>
                        </div>
                        <span className="border border-stone-200 text-stone-500 hover:text-stone-800 text-xs px-3 py-1.5 rounded-lg group-hover:border-teal-500 group-hover:text-teal-700 transition-colors font-semibold">
                          Chi tiết giải →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* Humble Footer */}
      <footer className="bg-white border-t border-stone-200 mt-12 py-6 text-center select-none">
        <div className="max-w-7xl mx-auto px-4 text-xs text-stone-400 font-mono space-y-1.5">
          <p>© 2026 Luyện Đề Hóa Học AI. Giúp giáo viên & học sinh chuyển đổi đề thi dễ dàng.</p>
          <p className="text-[10px] text-stone-400">Vận hành bằng công nghệ Gemini 3.5 Flash tối tân từ Google.</p>
        </div>
      </footer>

    </div>
  );
}
