# Local Document Forgery Detection

## Purpose

This feature analyzes one document referenced by an absolute path on the machine running FastAPI. The React app sends the path as JSON. FastAPI reads the document for the active request and does not copy it into the repository, an uploads directory, or a database.

The document content is sent inline to the configured OpenAI model. It therefore leaves the local machine during model analysis even though the application does not create a persistent OpenAI File object.

## Setup

From the repository root:

```powershell
python -m venv backend\.venv
backend\.venv\Scripts\Activate.ps1
pip install -r backend\requirement.txt
```

Keep these values in `backend/.env`:

```dotenv
OPENAI_API_KEY=your-key
OPENAI_MODEL=your-document-capable-model
```

Start the backend:

```powershell
cd backend
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Start the frontend in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

The Vite development server proxies `/api` to `http://localhost:8000`.

## API

### Health

`GET /api/health`

The response confirms whether the API key and model name are configured without returning either secret.

### Stream analysis

`POST /api/analyze/stream`

```json
{
  "path": "C:\\Documents\\certificate.pdf"
}
```

The response is `text/event-stream` and emits:

- `stage`: progress for scan, reading, tampering, evidence review, and answer.
- `result`: the final verdict, confidence, summary, facts, findings, and limitations.
- `error`: a safe message for invalid input, unreadable content, or model failure.

Example:

```powershell
curl.exe -N -X POST http://127.0.0.1:8000/api/analyze/stream `
  -H "Content-Type: application/json" `
  -d '{"path":"C:\\Documents\\certificate.pdf"}'
```

## Agent Flow

The LangGraph workflow runs these nodes in order:

1. Validate the absolute path, extension, file size, and readability.
2. Read PDF or image structure and safe local metadata.
3. Confirm that the file content matches the expected document structure.
4. Ask the configured multimodal model for a structured tampering assessment.
5. Normalize evidence and handle unreadable documents conservatively.
6. Produce the final structured verdict.

Supported verdicts are `genuine`, `minor`, `suspicious`, `forged`, and `unverifiable`.

## Validation and Privacy

- Supported files: PDF, JPG, JPEG, PNG, TIF, and TIFF.
- Maximum size: 10 MB.
- Only one document is accepted per task.
- ZIP and folder analysis are not supported.
- The API accepts any absolute file path readable by the backend account. Keep the service bound to `127.0.0.1`; exposing it to a network would allow callers to probe readable local files.
- Raw document bytes are held only while preparing the model request. No application document copy is written.
- The response and local UI session store contain findings and extracted facts, not raw document bytes.

## Limitations

- No institution registry, serial-number registry, seal library, signature library, or known-forgery collection is connected.
- The system must not describe any external cross-check as completed.
- A `genuine` verdict means no convincing visible tampering was found. It is not proof that the document was issued by the named institution.
- Model findings are decision support. A trained reviewer should confirm them before rejection or enforcement.
- A normal browser cannot preview an arbitrary absolute local path. The review screen therefore shows the path reference, extracted facts, and findings rather than a stored document preview.

## Tests

```powershell
cd backend
pytest -q
```

The tests cover local path rejection and ordered SSE output with a fake graph, so they do not require an OpenAI request.
