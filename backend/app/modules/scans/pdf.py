from io import BytesIO
from textwrap import wrap
from unicodedata import normalize

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen.canvas import Canvas


def report_pdf(report: dict) -> bytes:
    output = BytesIO()
    canvas = Canvas(output, pagesize=A4)
    canvas.setTitle("GlowGuide skin report")
    width, height = A4

    def line(text: str, y: float, size: int = 11, color: str = "#17262A"):
        canvas.setFillColor(HexColor(color))
        canvas.setFont("Helvetica", size)
        text = normalize("NFKD", text).encode("ascii", "replace").decode()
        canvas.drawString(48, y, text)

    line("GlowGuide", height - 60, 24, "#24695C")
    line("Your skin report", height - 92, 18)
    line(f"{report['date']} {report['time']} | {report['city']}", height - 116, color="#6A7A7D")
    line(f"Overall score: {report['overall']}/100 | Skin type: {report['skinType']}", height - 158, 13)
    line("Measurements (higher scores indicate better condition)", height - 193, 10, "#6A7A7D")
    y = height - 224
    for metric in report["metrics"]:
        line(f"{metric['name']}: {metric['value']}/100", y)
        canvas.setFillColor(HexColor("#E1E7E5"))
        canvas.rect(260, y - 2, width - 320, 8, fill=1, stroke=0)
        canvas.setFillColor(
            HexColor("#24695C" if metric["value"] >= 70 else "#D9822F" if metric["value"] >= 50 else "#C4504B")
        )
        canvas.rect(260, y - 2, (width - 320) * metric["value"] / 100, 8, fill=1, stroke=0)
        y -= 32
    line("Priorities", y - 12, 13, "#24695C")
    y -= 38
    for priority in report["priorities"][:3]:
        for text in wrap(priority, width=80)[:2]:
            line(f"- {text}", y)
            y -= 17
    for i, text in enumerate(
        wrap(
            "Cosmetic estimates from a photo, not a medical diagnosis. "
            "See a dermatologist for persistent or painful conditions.",
            width=95,
        )
    ):
        line(text, 70 - i * 14, 9, "#6A7A7D")
    canvas.showPage()
    canvas.save()
    return output.getvalue()
