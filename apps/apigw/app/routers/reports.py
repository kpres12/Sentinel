"""
Situation report endpoints (stub) with PDF rendering.
"""
from datetime import datetime, timezone
from io import BytesIO
from fastapi import APIRouter
from fastapi.responses import Response

from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib import colors

router = APIRouter()


def _build_stub_report(payload: dict | None = None) -> dict:
    now = datetime.now(tz=timezone.utc).isoformat()
    report = {
        "generated_at": now,
        "title": "Wildfire Situation Report",
        "summary": {
            "active_missions": 1,
            "recent_triangulations": 1,
            "predicted_spread_hours": 3,
        },
        "details": {
            "triangulation": {
                "lat": 40.006,
                "lon": -119.997,
                "confidence": 0.86,
                "uncertainty_radius_m": 300,
            },
            "prediction": {
                "area_hectares": [5.2, 12.7, 20.1],
                "hours": [1, 2, 3],
                "confidence_overall": 0.78,
            },
        },
        "notes": [
            "This is a stubbed report for demo purposes.",
            "Replace with real engines and templates later.",
        ],
    }
    return report


@router.post("/situation")
async def generate_situation_report(payload: dict | None = None):
    return {"report": _build_stub_report(payload)}


@router.get("/situation.pdf")
async def generate_situation_report_pdf():
    data = _build_stub_report(None)

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=LETTER)
    width, height = LETTER

    # Header
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(1 * inch, height - 1 * inch, data["title"]) 

    c.setFont("Helvetica", 10)
    c.setFillColor(colors.gray)
    c.drawString(1 * inch, height - 1.25 * inch, f"Generated at: {data['generated_at']}")

    # Summary box
    y = height - 1.75 * inch
    c.setFillColor(colors.whitesmoke)
    c.rect(0.75 * inch, y - 0.2 * inch, 7.0 * inch, 0.9 * inch, fill=1, stroke=0)
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(0.9 * inch, y + 0.5 * inch, "Summary")
    c.setFont("Helvetica", 11)
    c.drawString(0.9 * inch, y + 0.2 * inch, f"Active missions: {data['summary']['active_missions']}")
    c.drawString(3.0 * inch, y + 0.2 * inch, f"Triangulations: {data['summary']['recent_triangulations']}")
    c.drawString(5.0 * inch, y + 0.2 * inch, f"Spread (hrs): {data['summary']['predicted_spread_hours']}")

    # Triangulation section
    y -= 1.0 * inch
    tri = data["details"]["triangulation"]
    c.setFont("Helvetica-Bold", 12)
    c.drawString(0.9 * inch, y + 0.4 * inch, "Triangulation")
    c.setFont("Helvetica", 11)
    c.drawString(0.9 * inch, y + 0.15 * inch, f"Lat: {tri['lat']:.6f}  Lon: {tri['lon']:.6f}")
    c.drawString(3.8 * inch, y + 0.15 * inch, f"Conf: {int(tri['confidence']*100)}%  R±: {tri['uncertainty_radius_m']}m")

    # Prediction section
    y -= 0.8 * inch
    pred = data["details"]["prediction"]
    c.setFont("Helvetica-Bold", 12)
    c.drawString(0.9 * inch, y + 0.4 * inch, "Prediction")
    c.setFont("Helvetica", 11)
    c.drawString(0.9 * inch, y + 0.15 * inch, f"Isochrones (hrs→ha): {list(zip(pred['hours'], pred['area_hectares']))}")
    c.drawString(0.9 * inch, y - 0.1 * inch, f"Confidence (overall): {int(pred['confidence_overall']*100)}%")

    # Notes
    y -= 0.8 * inch
    c.setFont("Helvetica-Bold", 12)
    c.drawString(0.9 * inch, y + 0.4 * inch, "Notes")
    c.setFont("Helvetica", 11)
    for i, note in enumerate(data["notes"]):
        c.drawString(0.9 * inch, y + 0.15 * inch - i * 0.2 * inch, f"• {note}")

    c.showPage()
    c.save()

    pdf_bytes = buffer.getvalue()
    buffer.close()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=situation-report.pdf"},
    )
