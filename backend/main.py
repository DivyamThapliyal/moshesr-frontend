"""Local-path document forgery analysis API.

The service reads a document from the local machine for one request, sends it
inline to the configured OpenAI model, and never creates a document copy.
"""

from __future__ import annotations

import base64
import hashlib
import json
import mimetypes
import os
from pathlib import Path
from typing import Any, Literal, TypedDict

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from PIL import Image
from pydantic import BaseModel, Field
from pypdf import PdfReader


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

SUPPORTED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".tif", ".tiff"}
MAX_DOCUMENT_BYTES = 10 * 1024 * 1024


class AnalysisRequest(BaseModel):
    path: str = Field(min_length=1, description="Absolute path on the FastAPI host")


class Finding(BaseModel):
    stage: Literal["scan", "read", "tamper", "cross", "answer"]
    region: str = "fullpage"
    page: int = Field(default=1, ge=1)
    evidence: str
    summary: str
    detail: str | None = None


class DocumentFacts(BaseModel):
    filename: str
    document_type: str = "unknown"
    institution: str | None = None
    holder_name: str | None = None
    award: str | None = None
    issue_date: str | None = None
    pages: int = 1
    size_bytes: int
    mime_type: str
    metadata: dict[str, str] = Field(default_factory=dict)
    cross_check: str = "Not performed because no registry is configured."


class AnalysisResult(BaseModel):
    document_id: str
    verdict: Literal["genuine", "minor", "suspicious", "forged", "unverifiable"]
    confidence: int = Field(ge=0, le=100)
    summary: str
    facts: DocumentFacts
    findings: list[Finding] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


class ModelFinding(BaseModel):
    stage: Literal["scan", "read", "tamper"]
    region: str = "fullpage"
    page: int = Field(default=1, ge=1)
    evidence: str
    summary: str
    detail: str | None = None


class ModelAssessment(BaseModel):
    document_type: str = "unknown"
    institution: str | None = None
    holder_name: str | None = None
    award: str | None = None
    issue_date: str | None = None
    legibility: Literal["good", "poor", "unreadable"]
    verdict: Literal["genuine", "minor", "suspicious", "forged", "unverifiable"]
    confidence: int = Field(ge=0, le=100)
    summary: str
    findings: list[ModelFinding] = Field(default_factory=list)


class AnalysisState(TypedDict, total=False):
    requested_path: str
    resolved_path: str
    extension: str
    mime_type: str
    size_bytes: int
    pages: int
    local_metadata: dict[str, str]
    assessment: ModelAssessment
    findings: list[Finding]
    result: AnalysisResult


def validate_local_path(raw_path: str) -> Path:
    candidate = Path(raw_path.strip().strip('"'))
    if not candidate.is_absolute():
        raise ValueError("Document path must be absolute.")
    try:
        path = candidate.resolve(strict=True)
    except (FileNotFoundError, OSError) as exc:
        raise ValueError("Document path does not exist or cannot be accessed.") from exc
    if not path.is_file():
        raise ValueError("Document path must point to a file.")
    if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ValueError("Unsupported document type. Use PDF, JPG, JPEG, PNG, TIF, or TIFF.")
    try:
        size = path.stat().st_size
    except OSError as exc:
        raise ValueError("Document metadata cannot be read.") from exc
    if size <= 0:
        raise ValueError("Document is empty.")
    if size > MAX_DOCUMENT_BYTES:
        raise ValueError("Document exceeds the 10 MB limit.")
    try:
        with path.open("rb") as handle:
            handle.read(1)
    except OSError as exc:
        raise ValueError("Document cannot be read by the backend process.") from exc
    return path


async def validate_document(state: AnalysisState) -> AnalysisState:
    path = validate_local_path(state["requested_path"])
    mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return {
        "resolved_path": str(path),
        "extension": path.suffix.lower(),
        "mime_type": mime_type,
        "size_bytes": path.stat().st_size,
    }


def _safe_metadata(value: Any) -> str:
    return str(value).strip()[:500]


async def inspect_metadata(state: AnalysisState) -> AnalysisState:
    path = Path(state["resolved_path"])
    metadata: dict[str, str] = {}
    pages = 1
    try:
        if state["extension"] == ".pdf":
            reader = PdfReader(str(path))
            pages = max(1, len(reader.pages))
            if reader.metadata:
                metadata = {
                    str(key).lstrip("/"): _safe_metadata(value)
                    for key, value in reader.metadata.items()
                    if value is not None
                }
        else:
            with Image.open(path) as image:
                pages = max(1, getattr(image, "n_frames", 1))
                metadata = {
                    "dimensions": f"{image.width}x{image.height}",
                    "mode": image.mode,
                    "format": image.format or state["extension"].lstrip(".").upper(),
                }
                exif = image.getexif()
                software = exif.get(305) if exif else None
                if software:
                    metadata["software"] = _safe_metadata(software)
    except Exception as exc:
        raise ValueError(f"Document structure could not be read: {exc}") from exc
    return {"pages": pages, "local_metadata": metadata}


async def read_document(state: AnalysisState) -> AnalysisState:
    path = Path(state["resolved_path"])
    try:
        with path.open("rb") as handle:
            header = handle.read(8)
    except OSError as exc:
        raise ValueError("Document became unavailable during analysis.") from exc
    if state["extension"] == ".pdf" and not header.startswith(b"%PDF"):
        raise ValueError("The file extension is PDF but its content is not a PDF.")
    return {}


def _model() -> ChatOpenAI:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    model_name = os.getenv("OPENAI_MODEL", "").strip()
    if not api_key:
        raise ValueError("OPENAI_API_KEY is missing from backend/.env.")
    if not model_name:
        raise ValueError("OPENAI_MODEL is missing from backend/.env.")
    return ChatOpenAI(model=model_name, api_key=api_key, timeout=120, max_retries=1)


FORENSIC_INSTRUCTIONS = """You are a cautious document-forensics assistant.
Assess only visible content and supplied file metadata. Look for inconsistent
fonts, alignment, spacing, seals, signatures, dates, compression, editing
metadata, copy-paste boundaries, and scan anomalies. Do not claim that an
institution, serial number, seal, signature, or record was externally verified.
No registry or known-forgery collection is available. A clean-looking document
is not proof of authenticity. Use forged only when several strong, observable
tampering indicators support it. Use unverifiable when the content cannot be
judged. Give concise evidence summaries, never hidden chain-of-thought.
"""


async def assess_tampering(state: AnalysisState) -> AnalysisState:
    path = Path(state["resolved_path"])
    with path.open("rb") as handle:
        document_bytes = handle.read()
    encoded = base64.b64encode(document_bytes).decode("ascii")
    del document_bytes
    metadata_text = json.dumps(state.get("local_metadata", {}), ensure_ascii=False)
    prompt = (
        f"Analyze {path.name}. Local metadata: {metadata_text}. "
        "Return the requested structured assessment based only on this document."
    )
    if state["extension"] == ".pdf":
        document_part: dict[str, Any] = {
            "type": "file",
            "file": {
                "filename": path.name,
                "file_data": f"data:{state['mime_type']};base64,{encoded}",
            },
        }
    else:
        document_part = {
            "type": "image_url",
            "image_url": {"url": f"data:{state['mime_type']};base64,{encoded}", "detail": "high"},
        }
    structured_model = _model().with_structured_output(ModelAssessment)
    try:
        assessment = await structured_model.ainvoke(
            [
                SystemMessage(content=FORENSIC_INSTRUCTIONS),
                HumanMessage(content=[{"type": "text", "text": prompt}, document_part]),
            ]
        )
    finally:
        del encoded
    return {"assessment": assessment}


async def review_evidence(state: AnalysisState) -> AnalysisState:
    assessment = state["assessment"]
    findings = [Finding(**item.model_dump()) for item in assessment.findings]
    if assessment.legibility == "unreadable" and not findings:
        findings.append(
            Finding(
                stage="scan",
                evidence="Legibility",
                summary="The document cannot be judged reliably.",
                detail="Provide a clearer scan before making an authenticity decision.",
            )
        )
    return {"findings": findings}


async def synthesize_verdict(state: AnalysisState) -> AnalysisState:
    path = Path(state["resolved_path"])
    assessment = state["assessment"]
    verdict = assessment.verdict
    confidence = assessment.confidence
    if assessment.legibility == "unreadable":
        verdict = "unverifiable"
        confidence = min(confidence, 30)
    facts = DocumentFacts(
        filename=path.name,
        document_type=assessment.document_type or "unknown",
        institution=assessment.institution,
        holder_name=assessment.holder_name,
        award=assessment.award,
        issue_date=assessment.issue_date,
        pages=state.get("pages", 1),
        size_bytes=state["size_bytes"],
        mime_type=state["mime_type"],
        metadata=state.get("local_metadata", {}),
    )
    result = AnalysisResult(
        document_id=hashlib.sha256(str(path).encode("utf-8")).hexdigest()[:12],
        verdict=verdict,
        confidence=confidence,
        summary=assessment.summary,
        facts=facts,
        findings=state.get("findings", []),
        limitations=[
            "No institution registry or known-forgery collection was queried.",
            "The verdict is decision support and requires human review.",
        ],
    )
    return {"result": result}


def build_graph():
    graph = StateGraph(AnalysisState)
    graph.add_node("validation", validate_document)
    graph.add_node("metadata", inspect_metadata)
    graph.add_node("reading", read_document)
    graph.add_node("tampering", assess_tampering)
    graph.add_node("evidence", review_evidence)
    graph.add_node("verdict", synthesize_verdict)
    graph.set_entry_point("validation")
    graph.add_edge("validation", "metadata")
    graph.add_edge("metadata", "reading")
    graph.add_edge("reading", "tampering")
    graph.add_edge("tampering", "evidence")
    graph.add_edge("evidence", "verdict")
    graph.add_edge("verdict", END)
    return graph.compile()


GRAPH = build_graph()

STAGE_EVENTS = {
    "validation": ("scan", "Validated the local document path and size."),
    "metadata": ("scan", "Inspected file structure and local metadata."),
    "reading": ("read", "Confirmed the document can be read."),
    "tampering": ("tamper", "Examined visible tampering indicators."),
    "evidence": ("cross", "Reviewed evidence; external registry checks are unavailable."),
    "verdict": ("answer", "Prepared the final assessment."),
}


def sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def stream_analysis(path: str, graph=GRAPH):
    try:
        yield sse("stage", {"id": "scan", "status": "active", "message": "Starting local validation."})
        async for update in graph.astream({"requested_path": path}, stream_mode="updates"):
            for node, values in update.items():
                stage_id, message = STAGE_EVENTS[node]
                yield sse("stage", {"id": stage_id, "status": "completed", "message": message})
                if node == "verdict":
                    result = values["result"]
                    if isinstance(result, BaseModel):
                        result = result.model_dump(mode="json")
                    yield sse("result", result)
    except Exception as exc:
        yield sse("error", {"message": str(exc) or "Document analysis failed."})


app = FastAPI(title="MOHESR Document Forgery Detection", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model_configured": bool(os.getenv("OPENAI_MODEL", "").strip()),
        "api_key_configured": bool(os.getenv("OPENAI_API_KEY", "").strip()),
    }


@app.post("/api/analyze/stream")
async def analyze_stream(request: AnalysisRequest) -> StreamingResponse:
    return StreamingResponse(
        stream_analysis(request.path),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
