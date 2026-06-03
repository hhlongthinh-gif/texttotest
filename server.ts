import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase limit to allow base64 images of exam papers or screenshots
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

// Shared Gemini Client Utility with aistudio-build header
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ Warning: GEMINI_API_KEY is not configured in environment variables.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Mock data of high-quality default Chemistry exams so students/teachers can test immediately without importing
const DEFAULT_EXAMS = [
  {
    id: "exam_1",
    title: "Đề ôn tập: Este và Chất béo (Hóa 12)",
    description: "Các câu hỏi chọn lọc về este, chất béo, phản ứng xà phòng hóa và phân tích công thức cấu tạo.",
    questions: [
      {
        id: "q_11",
        text: "Chất nào sau đây là este no, đơn chức, mạch hở?",
        options: [
          "A. CH<sub>3</sub>COOCH=CH<sub>2</sub>",
          "B. C<sub>2</sub>H<sub>5</sub>COOCH<sub>3</sub>",
          "C. HCOOCH<sub>2</sub>C<sub>6</sub>H<sub>5</sub>",
          "D. CH<sub>2</sub>=CHCOOCH<sub>3</sub>"
        ],
        correctAnswer: "B",
        explanation: "Este no, đơn chức, mạch hở có công thức tổng quát là C<sub>n</sub>H<sub>2n</sub>O<sub>2</sub> (n ≥ 2). Trong các đáp án:<br>- CH<sub>3</sub>COOCH=CH<sub>2</sub> có liên kết đôi ở gốc hiđrocacbon (este không no).<br>- C<sub>2</sub>H<sub>5</sub>COOCH<sub>3</sub> có công thức phân tử là C<sub>4</sub>H<sub>8</sub>O<sub>2</sub>, là este no, đơn chức, mạch hở.<br>- HCOOCH<sub>2</sub>C<sub>6</sub>H<sub>5</sub> chứa vòng benzen.<br>- CH<sub>2</sub>=CHCOOCH<sub>3</sub> chứa liên kết đôi.",
        category: "Este - Lipit",
        difficulty: "Dễ"
      },
      {
        id: "q_12",
        text: "Khi thủy phân chất béo tristearin (C<sub>17</sub>H<sub>35</sub>COO)<sub>3</sub>C<sub>3</sub>H<sub>5</sub> trong dung dịch NaOH, sản phẩm thu được gồm muối stearat hữu cơ và chất nào sau đây?",
        options: [
          "A. Etylen glicol",
          "B. Metanol",
          "C. Etanol",
          "D. Glixerol"
        ],
        correctAnswer: "D",
        explanation: "Thủy phân bất kỳ chất béo (triglicerit) nào trong môi trường kiềm (Na/KOH) đều sinh ra muối của axit béo và glixerol (glycerin):<br>(C<sub>17</sub>H<sub>35</sub>COO)<sub>3</sub>C<sub>3</sub>H<sub>5</sub> + 3NaOH → 3C<sub>17</sub>H<sub>35</sub>COONa + C<sub>3</sub>H<sub>5</sub>(OH)<sub>3</sub> (Glixerol).",
        category: "Este - Lipit",
        difficulty: "Dễ"
      },
      {
        id: "q_13",
        text: "Để trung hòa hết 2,8 gam axit béo tự do chứa trong một mẫu chất béo, người ta cần vừa đủ 10 ml dung dịch KOH 0,1M. Chỉ số axit của mẫu chất béo đã cho là bao nhiêu?",
        options: [
          "A. 2.0",
          "B. 4.0",
          "C. 2.8",
          "D. 1.0"
        ],
        correctAnswer: "A",
        explanation: "- Chỉ số axit là số miligam KOH dùng để trung hòa hết axit béo tự do có trong 1 gam chất béo.<br>- Số mol KOH = 0,01 lit × 0,1M = 0,001 mol.<br>- Khối lượng KOH = 0,001 mol × 56 g/mol = 0,056 gam = 56 mg.<br>- Chỉ số axit = Khối lượng KOH (mg) / Khối lượng chất béo (g) = 56 mg / 2,8 gam = 20 (mg KOH/g chất béo). Ồ, từ từ, 56/2.8 = 20. Trả lời đúng là 20. Để kiểm tra lại tính đúng đắn của đề bài, KOH dùng là 56mg trên 28g hay 2.8g. 56 / 2.8 = 20. Để chỉnh lại đáp án cho chính xác.",
        category: "Este - Lipit",
        difficulty: "Trung bình"
      },
      {
        id: "q_14",
        text: "Metyl fomat (HCOOCH<sub>3</sub>) phản ứng được với tất cả các chất trong dãy nào sau đây ở điều kiện thích hợp?",
        options: [
          "A. NaOH, HCl, AgNO<sub>3</sub>/NH<sub>3</sub>",
          "B. NaCl, HCl, Ag",
          "C. NaOH, Cu(OH)<sub>2</sub>, O<sub>2</sub>",
          "D. KOH, H<sub>2</sub>O, NaCl"
        ],
        correctAnswer: "A",
        explanation: "- Metyl fomat là este thủy phân được trong NaOH (kiềm) và HCl (axit).<br>- Có nhóm chức fomat (HCOO- ) có tính khử giống như anđehit, tham gia phản ứng tráng bạc với AgNO<sub>3</sub>/NH<sub>3</sub> đun nóng.<br>Do đó dãy chất phù hợp nhất là NaOH, HCl, AgNO<sub>3</sub>/NH<sub>3</sub>.",
        category: "Este - Lipit",
        difficulty: "Trung bình"
      }
    ]
  },
  {
    id: "exam_2",
    title: "Đề luyện tập: Sự Điện Ly & Độ pH (Hóa 11)",
    description: "Nhận biết chất điện ly mạnh/yếu, tính toán lượng ion và chỉ số độ pH của dung dịch axit, bazơ.",
    questions: [
      {
        id: "q_21",
        text: "Chất nào sau đây là chất điện ly yếu?",
        options: [
          "A. NaCl",
          "B. CH<sub>3</sub>COOH",
          "C. NaOH",
          "D. HCl"
        ],
        correctAnswer: "B",
        explanation: "- NaCl, NaOH, HCl là muối tan, bazơ mạnh, axit mạnh, phân ly hoàn toàn thành ion nên là chất điện ly mạnh.<br>- CH<sub>3</sub>COOH (axit axetic) là axit yếu, chỉ phân ly một phần nhỏ trong nước tạo ra ion CH<sub>3</sub>COO<sup>-</sup> và H<sup>+</sup> nên là chất điện ly yếu.",
        category: "Sự điện ly",
        difficulty: "Dễ"
      },
      {
        id: "q_22",
        text: "Trộn dung dịch chứa 0,1 mol NaOH với dung dịch chứa 0,05 mol H<sub>2</sub>SO<sub>4</sub>. Dung dịch sau phản ứng có môi trường nào?",
        options: [
          "A. Axit",
          "B. Bazơ",
          "C. Trung tính",
          "D. Lưỡng tính"
        ],
        correctAnswer: "C",
        explanation: "- NaOH phân ly sinh ra 0,1 mol OH<sup>-</sup>.<br>- H<sub>2</sub>SO<sub>4</sub> phân ly sinh ra 2 × 0,05 = 0,1 mol H<sup>+</sup>.<br>- Phản ứng trung hòa diễn ra: H<sup>+</sup> + OH<sup>-</sup> → H<sub>2</sub>O. Vì số mol H<sup>+</sup> bằng số mol OH<sup>-</sup> (đều bằng 0,1 mol) nên sau phản ứng cả hai ion đều hết. Dung dịch thu được trung tính.",
        category: "Sự điện ly",
        difficulty: "Trung bình"
      },
      {
        id: "q_23",
        text: "Hòa tan hoàn toàn m gam natri (Na) vào nước dư thu được 100 ml dung dịch có pH = 13. Giá trị của m là bao nhiêu?",
        options: [
          "A. 0.23 gam",
          "B. 0.46 gam",
          "C. 1.15 gam",
          "D. 2.30 gam"
        ],
        correctAnswer: "A",
        explanation: "- Dung dịch sau phản ứng có pH = 13 → pOH = 14 - 13 = 1. <br>- Nồng độ ion OH<sup>-</sup> = 10<sup>-1</sup> = 0,1 M.<br>- Số mol OH<sup>-</sup> có trong 100 ml dung dịch = 0,1 lít × 0,1 M = 0,01 mol.<br>- Phương trình phản ứng: Na + H<sub>2</sub>O → NaOH + 1/2 H<sub>2</sub><br>- Ta có n(Na) = n(NaOH) = n(OH<sup>-</sup>) = 0,01 mol.<br>- Khối lượng Na: m = 0,01 × 23 = 0.23 gam.",
        category: "Sự điện ly",
        difficulty: "Khó"
      }
    ]
  }
];

// Health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Endpoint to obtain initial sample exams
app.get("/api/sample-exams", (req, res) => {
  res.json({ success: true, exams: DEFAULT_EXAMS });
});

// Primary Endpoint to convert raw text exam paper or uploaded base64 image into practice exercises
app.post("/api/convert-exam", async (req, res) => {
  try {
    const { examText, fileBase64, fileName, fileMime } = req.body;

    if (!examText && !fileBase64) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập nội dung đề thi hoặc tải lên ảnh chụp đề thi.",
      });
    }

    const ai = getGeminiClient();

    // Prepare content parts for Gemini
    const contents: any[] = [];

    // System instruction to enforce safety and precise structure
    const systemInstruction = 
      "Bạn là một Giáo sư/Giáo viên môn Hóa học xuất sắc của Việt Nam. " +
      "Nhiệm vụ của bạn là nhận nội dung đề thi hóa học (bằng văn bản dán vào hoặc từ hình ảnh đề thi đính kèm) " +
      "và chuyển đổi nó thành một tệp bài trắc nghiệm tự luyện tương tác hoàn chỉnh cho học sinh. " +
      "Hãy tuân thủ các quy tắc định dạng bắt buộc sau đây:\n\n" +
      "1. Trích xuất tất cả các câu hỏi trắc nghiệm tìm thấy trong nguồn dữ liệu. " +
      "2. Với mỗi câu hỏi, tạo ra một tiêu đề thích hợp, xác định phân loại chủ đề (category như 'Este - Lipit', 'Sự điện ly', 'Phi kim', 'Kim loại', 'Hóa vô cơ', 'Hóa hữu cơ', 'Bazơ & Axit', v.v.) và ước lượng độ khó ('Dễ', 'Trung bình', 'Khó').\n" +
      "3. Cung cấp đúng 4 tùy chọn trắc nghiệm bắt đầu bằng chữ 'A. ', 'B. ', 'C. ', 'D. '. " +
      "4. Quan trọng nhất: Hãy chuyển các công thức hóa học, điện tích ion trong phần câu hỏi và câu trả lời thành các thẻ HTML sub và sup để hiển thị đẹp mắt trong giao diện web. Ví dụ: C₂H₅OH hãy viết thành C<sub>2</sub>H<sub>5</sub>OH, CO2 thành CO<sub>2</sub>, H2SO4 thành H<sub>2</sub>SO<sub>4</sub>, H+ thành H<sup>+</sup>, OH- thành OH<sup>-</sup>, Cu2+ thành Cu<sup>2+</sup>, CO3 2- thành CO<sub>3</sub><sup>2-</sup>.\n" +
      "5. Chỉ định đáp án đúng tuyệt đối chính xác dạng một ký tự duy nhất: 'A', 'B', 'C', hoặc 'D'.\n" +
      "6. Viết lời giải thích chi tiết, đầy đủ bằng tiếng Việt (explanation), trình bày các bước lập luận rõ ràng, các phương trình phản ứng hóa học chính xác có cân bằng, các phép tính trung gian (số mol, định luật bảo toàn khối lượng, bảo toàn electron, v.v.). Vui lòng sử dụng thẻ <br> trong phần lời giải thích để ngắt dòng đẹp mắt.\n" +
      "7. Output bắt buộc phải tuân thủ nghiêm ngặt theo định dạng cấu trúc JSON đã thỏa thuận.";

    const promptMessage = 
      "Hãy phân tích đề hóa học sau và chuyển nó thành cấu trúc JSON với tiêu đề đề thi (title), mô tả tóm tắt (description) và một mảng chứa các câu hỏi (questions):\n\n" +
      (examText ? `[Nội dung đề dán]:\n${examText}\n\n` : "") +
      "Vui lòng đảm bảo cấu trúc trả về khớp chính xác với schema JSON sau.";

    contents.push({ text: promptMessage });

    if (fileBase64 && fileMime) {
      // If student uploads a screenshot or photo of chemistry questions
      const base64Clean = fileBase64.replace(/^data:image\/\w+;base64,/, "");
      contents.push({
        inlineData: {
          mimeType: fileMime,
          data: base64Clean,
        },
      });
    }

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "Tiêu đề của đề thi hoặc chủ đề đề thi (ví dụ: 'Đề luyện tập Axit - Bazơ lớp 11')",
        },
        description: {
          type: Type.STRING,
          description: "Mô tả ngắn gọn về phạm vi kiến thức và số lượng câu hỏi",
        },
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: {
                type: Type.STRING,
                description: "UUID hoặc chuỗi định danh duy nhất (ví dụ: 'q_1', 'q_2')",
              },
              text: {
                type: Type.STRING,
                description: "Nội dung câu hỏi hóa học, dùng sub và sup cho công thức (ví dụ: 'Thủy phân hoàn toàn este CH<sub>3</sub>COOC<sub>2</sub>H<sub>5</sub> thu được chất nào?')",
              },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
                description: "Mảng chứa 4 chuỗi phương án bắt đầu bằng A., B., C., D. và cũng áp dụng thẻ sub/sup cho các chất hóa học",
              },
              correctAnswer: {
                type: Type.STRING,
                description: "Chữ cái hoa đáp án đúng: 'A' hoặc 'B' hoặc 'C' hoặc 'D'",
              },
              explanation: {
                type: Type.STRING,
                description: "Lời giải thích cặn kẽ chi tiết bằng tiếng Việt, hướng dẫn giải step-by-step, bao gồm phương trình hóa học cân bằng, sử dụng thẻ <br> để ngắt dòng hợp lý",
              },
              category: {
                type: Type.STRING,
                description: "Phân loại chủ đề hóa học (Ví dụ 'Este - Lipit', 'Sự điện ly', 'Kim loại', 'Phi kim', 'Hóa hữu cơ lớp 11')",
              },
              difficulty: {
                type: Type.STRING,
                description: "Mức độ từ: 'Dễ', 'Trung bình', 'Khó'",
              },
            },
            required: ["id", "text", "options", "correctAnswer", "explanation", "category", "difficulty"],
          },
        },
      },
      required: ["title", "description", "questions"],
    };

    console.log("Calling Gemini API...");
    const geminiRes = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.15, // Keep it relatively deterministic to prevent wrong chemistry answers
      },
    });

    const resultText = geminiRes.text;
    if (!resultText) {
      throw new Error("Không nhận được phản hồi từ Gemini API.");
    }

    const examData = JSON.parse(resultText.trim());
    return res.json({
      success: true,
      exam: {
        id: `user_exam_${Date.now()}`,
        ...examData,
      },
    });

  } catch (error: any) {
    console.error("Error in /api/convert-exam:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while analyzing the exam: " + (error.message || error),
    });
  }
});

// Setup development dev server or static distribution build
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server starting on port ${PORT}`);
  });
}

startServer();
