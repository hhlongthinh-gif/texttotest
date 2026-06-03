import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell,
} from "recharts";
import { ExamAttempt, CategoryMetric } from "../types";
import { Award, Target, TrendingUp, CheckCircle, HelpCircle } from "lucide-react";

interface ChemistryChartsProps {
  attempts: ExamAttempt[];
}

export default function ChemistryCharts({ attempts }: ChemistryChartsProps) {
  // 1. Process score trend data
  const trendData = React.useMemo(() => {
    if (attempts.length === 0) return [];
    
    // Sort attempts chronologically
    const sorted = [...attempts].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    return sorted.map((attempt, index) => {
      const dateObj = new Date(attempt.date);
      const formattedDate = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
      return {
        name: `Lần ${index + 1}`,
        date: formattedDate,
        score: parseFloat(attempt.score.toFixed(1)),
        title: attempt.examTitle,
        correct: attempt.correctCount,
        total: attempt.totalCount,
      };
    });
  }, [attempts]);

  // 2. Process category breakdown
  const categoryData = React.useMemo((): CategoryMetric[] => {
    if (attempts.length === 0) return [];
    
    const categories: Record<string, { correct: number; total: number }> = {};
    
    attempts.forEach((attempt) => {
      const analysis = attempt.categoryAnalysis || {};
      Object.entries(analysis).forEach(([cat, data]) => {
        if (!categories[cat]) {
          categories[cat] = { correct: 0, total: 0 };
        }
        categories[cat].correct += data.correct;
        categories[cat].total += data.total;
      });
    });

    return Object.entries(categories).map(([name, data]) => ({
      name,
      correct: data.correct,
      total: data.total,
      rate: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    }));
  }, [attempts]);

  // Combined stats
  const totalSolvedCount = attempts.reduce((acc, curr) => acc + curr.totalCount, 0);
  const totalCorrectCount = attempts.reduce((acc, curr) => acc + curr.correctCount, 0);
  const overallAccuracy = totalSolvedCount > 0 ? Math.round((totalCorrectCount / totalSolvedCount) * 100) : 0;
  
  const averageScore = React.useMemo(() => {
    if (attempts.length === 0) return 0;
    const sum = attempts.reduce((acc, curr) => acc + curr.score, 0);
    return parseFloat((sum / attempts.length).toFixed(1));
  }, [attempts]);

  // Empty state fallback visual prompts
  if (attempts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center max-w-4xl mx-auto shadow-sm">
        <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-stone-800 mb-2 font-sans">
          Biểu Đồ Tiến Độ Học Tập
        </h3>
        <p className="text-stone-500 font-sans text-sm max-w-md mx-auto mb-6">
          Bạn chưa làm bài tập tự luyện nào. Hãy làm thử đề mẫu bên dưới hoặc dán đề thi của riêng bạn để mở khóa bảng thống kê năng lực tự động!
        </p>

        {/* Beautiful Mock Ghost Charts with explanation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-30 select-none">
          <div className="bg-stone-50 rounded-xl p-4 border border-dashed border-stone-300 pointer-events-none">
            <h4 className="text-xs font-semibold text-stone-600 text-left mb-2">ĐIỂM SỐ GẦN ĐÂY (MẪU)</h4>
            <div className="h-40 w-full bg-stone-200 rounded flex items-end justify-between p-2">
              <div className="w-1/6 h-1/4 bg-teal-300 rounded-t"></div>
              <div className="w-1/6 h-2/4 bg-teal-300 rounded-t"></div>
              <div className="w-1/6 h-3/4 bg-teal-300 rounded-t"></div>
              <div className="w-1/6 h-5/6 bg-teal-300 rounded-t"></div>
            </div>
          </div>
          <div className="bg-stone-50 rounded-xl p-4 border border-dashed border-stone-300 pointer-events-none">
            <h4 className="text-xs font-semibold text-stone-600 text-left mb-2">TỶ LỆ ĐÚNG THEO CHỦ ĐỀ % (MẪU)</h4>
            <div className="h-40 w-full bg-stone-200 rounded flex items-center justify-around p-2">
              <div className="rounded-full w-24 h-24 border-4 border-teal-500 flex items-center justify-center font-bold text-stone-600">85%</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-in">
      {/* Mini Info Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-stone-400 font-sans uppercase">Đã luyện tập</div>
            <div className="text-xl font-bold text-stone-800">{attempts.length} <span className="text-xs font-normal text-stone-500">đề thi</span></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-stone-400 font-sans uppercase">Điểm trung bình</div>
            <div className="text-xl font-bold text-stone-800">{averageScore}/10</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-stone-400 font-sans uppercase">Tỷ lệ chính xác</div>
            <div className="text-xl font-bold text-stone-800">{overallAccuracy}%</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-stone-400 font-sans uppercase">Tổng số câu Hỏi</div>
            <div className="text-xl font-bold text-stone-800">
              {totalCorrectCount}/{totalSolvedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Chart 1: Overtime Score Trend */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-stone-800 font-sans uppercase tracking-wider">
              Biểu đồ điểm số qua các lần thi
            </h4>
            <p className="text-xs text-stone-400 mt-0.5">
              Theo dõi biến động điểm số của bạn qua mỗi đề đã làm.
            </p>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendData}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#a8a29e" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 10]} stroke="#a8a29e" fontSize={11} tickLine={false} ticks={[0, 2, 4, 6, 8, 10]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                  }}
                  formatter={(value: any, name: any, props: any) => [
                    `${value}/10 - ${props.payload.correct}/${props.payload.total} câu`,
                    "Điểm số",
                  ]}
                  labelFormatter={(label) => `Lượt kiểm tra`}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorScore)"
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Category strengths */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-stone-800 font-sans uppercase tracking-wider">
              Tỷ lệ đúng theo chủ đề môn học (%)
            </h4>
            <p className="text-xs text-stone-400 mt-0.5">
              Phát hiện mảng kiến thức thế mạnh hoặc điểm yếu để cải thiện.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryData}
                margin={{ top: 15, right: 5, left: -25, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#a8a29e" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#a8a29e" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                  formatter={(value: any) => [`${value}% chính xác`, "Hiệu suất"]}
                />
                <Bar dataKey="rate" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={45}>
                  {categoryData.map((entry, index) => {
                    // alternate colors for beautiful visual layout
                    const color = entry.rate >= 70 ? "#10b981" : entry.rate >= 40 ? "#f59e0b" : "#ef4444";
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Focus Breakdown Bullet list */}
      <div className="bg-stone-50 rounded-xl p-5 border border-stone-200">
        <h5 className="text-xs font-bold text-stone-600 mb-3 uppercase tracking-wider font-sans">
          🔥 Đánh giá năng lực & Lời khuyên ôn luyện
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-xs text-stone-500">Chủ đề cần cải thiện thêm:</div>
            <div className="flex flex-wrap gap-2">
              {categoryData.filter(c => c.rate < 60).length === 0 ? (
                <span className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 font-medium">
                  🎉 Tuyệt vời! Bạn đang học đều tất cả các chủ đề đã làm!
                </span>
              ) : (
                categoryData.filter(c => c.rate < 60).map((c, i) => (
                  <span key={i} className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 font-semibold">
                    {c.name} ({c.rate}%)
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs text-stone-500">Điểm mạnh nổi bật nhất:</div>
            <div className="flex flex-wrap gap-2">
              {categoryData.filter(c => c.rate >= 75).length === 0 ? (
                <span className="text-xs text-stone-500 italic">
                  Chưa có chủ đề nào đạt tỷ lệ đúng &gt; 75%. Hãy tiếp tục cố gắng!
                </span>
              ) : (
                categoryData.filter(c => c.rate >= 75).map((c, i) => (
                  <span key={i} className="text-xs text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-200 font-semibold">
                    ⭐ {c.name} ({c.rate}%)
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
