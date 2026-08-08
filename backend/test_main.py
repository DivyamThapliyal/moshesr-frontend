import asyncio
import json

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from main import (
    AnalysisResult,
    DocumentFacts,
    app,
    inspect_metadata,
    stream_analysis,
    validate_local_path,
)


def test_health_does_not_expose_configuration_values():
    response = TestClient(app).get("/api/health")
    assert response.status_code == 200
    assert set(response.json()) == {"status", "model_configured", "api_key_configured"}


def test_stream_rejects_relative_path_before_model_access():
    response = TestClient(app).post("/api/analyze/stream", json={"path": "certificate.pdf"})
    assert response.status_code == 200
    assert "event: error" in response.text
    assert "must be absolute" in response.text


def test_validate_local_path_rejects_relative_path():
    with pytest.raises(ValueError, match="absolute"):
        validate_local_path("certificate.pdf")


def test_validate_local_path_rejects_unsupported_file(tmp_path):
    source = tmp_path / "certificate.txt"
    source.write_text("not a supported document", encoding="utf-8")
    with pytest.raises(ValueError, match="Unsupported"):
        validate_local_path(str(source))


def test_real_image_metadata_is_read_without_creating_a_copy(tmp_path):
    source = tmp_path / "certificate.png"
    Image.new("RGB", (640, 480), "white").save(source)
    validated = validate_local_path(str(source))

    result = asyncio.run(
        inspect_metadata(
            {
                "resolved_path": str(validated),
                "extension": ".png",
                "mime_type": "image/png",
            }
        )
    )

    assert result["pages"] == 1
    assert result["local_metadata"]["dimensions"] == "640x480"
    assert list(tmp_path.iterdir()) == [source]


class FakeGraph:
    async def astream(self, state, stream_mode):
        assert state["requested_path"] == "C:\\docs\\certificate.pdf"
        assert stream_mode == "updates"
        for node in ("validation", "metadata", "reading", "tampering", "evidence"):
            yield {node: {}}
        result = AnalysisResult(
            document_id="doc123",
            verdict="suspicious",
            confidence=72,
            summary="The name uses inconsistent typography.",
            facts=DocumentFacts(
                filename="certificate.pdf",
                size_bytes=100,
                mime_type="application/pdf",
            ),
            findings=[],
        )
        yield {"verdict": {"result": result}}


def test_stream_emits_ordered_stages_and_result():
    async def collect():
        return [event async for event in stream_analysis("C:\\docs\\certificate.pdf", FakeGraph())]

    events = asyncio.run(collect())
    names = [event.splitlines()[0] for event in events]
    assert names == ["event: stage"] * 7 + ["event: result"]
    payload = json.loads(events[-1].split("data: ", 1)[1])
    assert payload["verdict"] == "suspicious"
