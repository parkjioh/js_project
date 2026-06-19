const express = require("express");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(function (request, response, next) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json());

app.use(function (error, request, response, next) {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    response.status(400).json({
      message: "JSON 형식이 올바르지 않습니다.",
    });
    return;
  }

  next(error);
});

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

function isIntegerId(value) {
  const id = Number(value);
  return Number.isInteger(id) ? id : null;
}

function readStudentBody(body) {
  const source = body || {};
  const name = typeof source.name === "string" ? source.name.trim() : "";
  const score = source.score;

  if (
    name.length < 1 ||
    name.length > 50 ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > 100
  ) {
    return null;
  }

  return {
    name: name,
    score: score,
  };
}

async function findStudentById(id) {
  const [rows] = await pool.query(
    "SELECT id, name, score FROM students WHERE id = ?",
    [id]
  );

  return rows[0];
}

function sendTodo(response, apiName) {
  response.status(501).json({
    message: `${apiName} API를 구현해야 합니다.`,
  });
}

app.get("/health", function (request, response) {
  response.json({
    status: "ok",
  });
});

app.get("/students/search", async function (request, response, next) {
  try {

    const minScoreQuery = request.query.minScore;

    if ( typeof minScoreQuery !== "string" || minScoreQuery.trim() === "") {
      response.status(400).json({
        message: "minScore는 숫자여야 합니다."
      })
      return;
    }

    const minScore = Number(minScoreQuery);

    if (!Number.isFinite(minScore)) {
      response.status(400).json({
        message: "minScore는 숫자여야 합니다.",
      });
      return;
    }

    const maxScoreQuery = request.query.maxScore;

    if (typeof maxScoreQuery !== "string" || maxScoreQuery.trim() === ""){
      response.status(400).json({
        message: "maxScore는 숫자여야 합니다."
      })
      return;
    }

    const maxScore = Number(maxScoreQuery);

    if (!Number.isFinite(maxScore)) {
      response.status(400).json({
        message: "maxScore는 숫자여야 합니다.",
      });
      return;
    }
    if( maxScore < minScore) {
      response.status(400).json({
        message: "minScore는 maxScore보다 크면 안됩니다. "
      })
      return;
    }
    
    const [rows] = await pool.query(
      "SELECT id, name, score FROM students WHERE score >= ? and score <= ?",[minScore, maxScore]
    );



    response.json(rows);


    // TODO:
    // 1. request.query.minScore, request.query.maxScore를 읽습니다.
    // 2. 숫자인지 검사합니다.
    // 3. minScore가 maxScore보다 크면 400으로 응답합니다.
    // 4. 조건에 맞는 학생을 SELECT로 조회합니다.
    // 5. rows를 response.json(rows)로 응답합니다.
    sendTodo(response, "GET /students/search");
  } catch (error) {
    next(error);
  }
});

app.get("/students", async function (request, response, next) {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, score FROM students ORDER by id"
    );

    response.json(rows);

    // TODO:
    // 1. students table에서 id, name, score를 조회합니다.
    // 2. id 오름차순으로 정렬합니다.
    // 3. rows를 response.json(rows)로 응답합니다.
    sendTodo(response, "GET /students");
  } catch (error) {
    next(error);
  }
});

app.post("/students", async function (request, response, next) {
  try {
    const body = request.body || {};
    const name = body.name;
    const score = body.score;

    if(typeof name !== "string" || name.trim() === "" || name.trim().length > 50 || !Number.isInteger(score) || score < 0 || score > 100) {
      response.status(400).json({
        message: "name은 1자 이상 50자 이하이고, score는 0부터 100 사이의 정수여야 합니다."
      });
      return;
    }

    const [result] = await pool.query(
      "insert into students (name, score) values (?,?)",[name.trim(),score]
    );

    const newStudent = await findStudentById(result.insertId);

    

    response.status(201).json(newStudent);
    // TODO:
    // 1. readStudentBody(request.body)로 body를 검사합니다.
    // 2. 올바르지 않으면 400으로 응답합니다.
    // 3. INSERT로 학생을 추가합니다.
    // 4. result.insertId로 새 학생 id를 확인합니다.
    // 5. findStudentById(id)로 새 학생을 다시 조회합니다.
    // 6. status 201과 함께 새 학생 객체를 응답합니다.
    sendTodo(response, "POST /students");
  } catch (error) {
    next(error);
  }
});

app.get("/students/:id", async function (request, response, next) {
  try {
    const id = Number(request.params.id);
    
    if(!Number.isInteger(id)) {
      response.status(400).json({
        message: "id는 숫자여야 합니다.",
      });
      return; 
    }

    const student = await findStudentById(id);

    if (student === undefined) {
      response.status(404).json({
        message: "학생을 찾을 수 없습니다.",
      });
      return;
    }
    
    response.json(student)

    // TODO:
    // 1. request.params.id를 정수로 바꿉니다.
    // 2. 정수가 아니면 400으로 응답합니다.
    // 3. findStudentById(id)로 학생을 조회합니다.
    // 4. 학생이 없으면 404로 응답합니다.
    // 5. 학생 객체를 응답합니다.
    sendTodo(response, "GET /students/:id");
  } catch (error) {
    next(error);
  }
});

app.patch("/students/:id", async function (request, response, next) {
  try {

    const id = Number(request.params.id);

    if(!Number.isInteger(id)){
      response.status(400).json({
        message: "id는 숫자여야합니다.",
      })
    }

    const [currentRows] = await pool.query(
      "select id, name, score from students where id = ?", [id]
    );

    if (currentRows[0] === undefined) {
      response.status(404).json({
        message: "학생을 찾을 수 없습니다.",
      });
      return;
    }

    const body = request.body || {};
    const name = body.name;
    const score = body.score;
    const hasName = name !== undefined;
    const hasScore = score !== undefined;

   if (!hasName && !hasScore) {
    response.status(400).json({
      message: "수정할 name이나 score를 입력해야 합니다.",
    });
    return;
  }

  if (
    hasName &&
    (typeof name !== "string" ||
      name.trim() === "" ||
      name.trim().length > 50)
  ) {
    response.status(400).json({
      message: "name은 1자 이상 50자 이하의 문자열이어야 합니다.",
    });
    return;
  }

  if (
    hasScore &&
    (!Number.isInteger(score) || score < 0 || score > 100)
  ) {
    response.status(400).json({
      message: "score는 0부터 100 사이의 정수여야 합니다.",
    });
    return;
  }

  const currentStudent = currentRows[0];
  const updatedName = hasName ? name.trim() : currentStudent.name;
  const updatedScore = hasScore ? score : currentStudent.score;

  await pool.query(
    "UPDATE students SET name = ?, score = ? WHERE id = ?",
    [updatedName, updatedScore, id]
  );

  const [updatedRows] = await pool.query(
    "SELECT id, name, score FROM students WHERE id = ?",
    [id]
  );

  response.json(updatedRows[0]);

    // TODO:
    // 1. id를 검사합니다.
    // 2. 수정할 학생이 있는지 조회합니다.
    // 3. readStudentBody(request.body)로 body를 검사합니다.
    // 4. UPDATE로 name, score를 수정합니다.
    // 5. 수정된 학생을 다시 조회해서 응답합니다.
    sendTodo(response, "PATCH /students/:id");
  } catch (error) {
    next(error);
  }
});

app.delete("/students/:id", async function (request, response, next) {
  try {
    const id = Number(request.params.id);

    if(!Number.isInteger(id)) {
      response.status(400).json({
        message: "id는 숫자여야 합니다.",
      });
      return;
    }

    const [rows] = await pool.query(
      "select id, name, score from students where id =?", [id]
    );

    if (rows[0] === undefined) {
      response.status(404).json({
        message: "학생을 찾을 수 없습니다.",
      });
      return;
    }

    await pool.query("delete from students where id = ?",[id]);

    response.json({
      message: "학생이 삭제되었습니다.",
      student: rows[0],
    });

    // TODO:
    // 1. id를 검사합니다.
    // 2. 삭제할 학생이 있는지 먼저 조회합니다.
    // 3. 학생이 없으면 404로 응답합니다.
    // 4. DELETE로 삭제합니다.
    // 5. 삭제 메시지와 삭제된 학생 객체를 응답합니다.
    sendTodo(response, "DELETE /students/:id");
  } catch (error) {
    next(error);
  }
});

app.get ("/classrooms", async function (request, response, next) {
  try{
    const [rows] = await pool.query(
      "select name from classrooms order by id "
    );
    response.json(rows);

    sendTodo(response, "GET /classrooms");
  } catch (error) {
    next(error);
  }
});



app.use(function (request, response) {
  response.status(404).json({
    message: "요청한 API를 찾을 수 없습니다.",
  });
});

app.use(function (error, request, response, next) {
  console.error(error);
  response.status(500).json({
    message: "서버 오류가 발생했습니다.",
  });
});

app.listen(port, function () {
  console.log(`API 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});