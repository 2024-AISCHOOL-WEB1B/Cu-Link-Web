const express = require("express");
const mainRouter = require("./routes/mainRouter");
const loginRouter = require("./routes/loginRouter");
const newsRouter = require("./routes/newsRouter");
const reportRouter = require("./routes/reportRouter");
const sumRouter = require("./routes/sumRouter");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const path = require("path");
const db = require('./config/db'); // db.js 연결

const app = express();
const PORT = process.env.PORT || 3000;

// MySQL 연결 확인
db.connect((err) => {
    if (err) {
        console.error('DB 연결 실패:', err.code, err.message);
    } else {
        console.log('DB 연결 성공');
    }
});

// MySQL 세션 저장소 옵션 설정
const options = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

// MySQL 세션 옵션 확인
console.log('MySQL 세션 옵션 확인:', options);

// MySQL 세션 저장소 생성
const sessionStore = new MySQLStore(options);

app.use(
  session({
    key: "session_cookie_name",
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { secure: false },
  })
);

// 세션 체크 미들웨어
function checkSession(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.redirect("/login");
  }
}

// /news 라우트에 세션 체크 적용
app.get("/news", checkSession, (req, res) => {
  res.send("이 페이지는 로그인된 사용자만 볼 수 있는 뉴스 페이지입니다.");
});

// CORS 설정
app.use(cors({
  origin: "http://localhost:3001",
  credentials: true,
}));

// React 정적 파일 서빙 설정
const buildPath = path.join(__dirname, "..", "frontend", "build");
app.use(express.static(buildPath));

// 정적 파일 경로 확인 로그 (디버깅용)
console.log('React Build Path:', buildPath);

// 미들웨어 설정
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(bodyParser.json());

// 라우터 설정
app.use("/", mainRouter);
app.use("/news", newsRouter);
app.use("/auth", loginRouter);
app.use("/report", reportRouter);
app.use("/api/sum", sumRouter);

// React 정적 파일 서빙을 위한 catch-all 라우터
app.get("*", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"), (err) => {
    if (err) {
      res.status(500).send(err);
    }
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
