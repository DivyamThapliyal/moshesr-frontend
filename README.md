# MOHESR Document Forgery Detection

MOHESR is a React and FastAPI document-verification prototype. The implemented backend focuses only on the single-document forgery detection flow. Other frontend features remain fixture-driven.

## What is implemented

- React 18 and Vite frontend.
- FastAPI backend in one application file.
- LangChain and LangGraph analysis workflow.
- OpenAI document and image reasoning through `backend/.env`.
- Server-Sent Events for live scan, reading, tampering, evidence, and verdict stages.
- Session-scoped document facts, verdicts, confidence, and findings.
- No application-side document upload or persistent document copy.

Supported files are PDF, JPG, JPEG, PNG, TIF, and TIFF, with a maximum size of 10 MB.

## Project structure

```text
moshesr-frontend/
|-- backend/
|   |-- .env
|   |-- main.py
|   |-- requirement.txt
|   `-- test_main.py
|-- docs/
|   `-- FORGERY_DETECTION.md
|-- frontend/
|   |-- src/
|   |-- package.json
|   `-- vite.config.js
`-- README.md
```

## Backend setup

From the repository root:

```powershell
python -m venv backend\.venv
backend\.venv\Scripts\Activate.ps1
pip install -r backend\requirement.txt
```

Configure `backend/.env`:

```dotenv
OPENAI_API_KEY=your-key
OPENAI_MODEL=your-document-capable-model
```

Start FastAPI:

```powershell
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Keep the backend bound to `127.0.0.1`. The API accepts any absolute file path readable by the backend process.

## Frontend setup

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` requests to FastAPI on port 8000.

## Using forgery detection

1. Open **New verification**.
2. Enter the absolute path of one document on the backend machine, such as `C:\Documents\certificate.pdf`.
3. Create the task.
4. Select **Start verification**.
5. Watch the streamed analysis stages.
6. Review the verdict, confidence, extracted facts, findings, and limitations.

The browser sends only the path reference to FastAPI. FastAPI reads the file for the active request and does not save a copy. The document content is sent inline to the configured OpenAI model, so it leaves the local machine during analysis.

## Agent workflow

The LangGraph workflow in `backend/main.py` runs:

1. Absolute-path, extension, size, and readability validation.
2. PDF or image metadata inspection.
3. Document structure validation.
4. Multimodal tampering assessment.
5. Evidence normalization.
6. Final structured verdict generation.

Verdicts are `genuine`, `minor`, `suspicious`, `forged`, or `unverifiable`.

No institution registry, serial-number registry, signature library, seal library, or known-forgery collection is connected. A clean result is not proof of authenticity, and every result requires appropriate human review.

## API

### Health

```http
GET /api/health
```

### Stream analysis

```http
POST /api/analyze/stream
Content-Type: application/json

{
  "path": "C:\\Documents\\certificate.pdf"
}
```

The response uses `text/event-stream` and emits `stage`, `result`, and `error` events.

## Verification commands

Backend tests:

```powershell
cd backend
python -m pytest -q -p no:cacheprovider
```

Frontend checks:

```powershell
cd frontend
npx eslint src\pages\NewVerification.jsx src\pages\Task.jsx src\pages\Review.jsx src\services\index.js src\utils\storage.js --report-unused-disable-directives
npm run build
```

See [docs/FORGERY_DETECTION.md](docs/FORGERY_DETECTION.md) for the detailed API, privacy, validation, and limitation notes.
