#!/usr/bin/env python3
"""Generate BLE mesh note relay diagram for README."""

from PIL import Image, ImageDraw, ImageFont

WIDTH = 1200
HEIGHT = 400

BG = "#0E1117"
DEVICE_FILL = "#161B22"
DEVICE_STROKE = "#2A3245"
SIGNAL = "#4FACDE"
TEXT_PRIMARY = "#E6EDF3"
TEXT_SECONDARY = "#7D8590"
DISCONNECT = "#7D8590"

DEVICES = [
    {"id": "A", "x": 140, "role": "ORIGIN", "hop": "hop 0", "disconnect": True},
    {"id": "B", "x": 380, "role": "RELAY", "hop": "hop 1", "disconnect": False},
    {"id": "C", "x": 700, "role": "RELAY", "hop": "hop 2", "disconnect": False},
    {"id": "D", "x": 1060, "role": "RECEIVER", "hop": "hop 3", "disconnect": False},
]

CY = 190
R = 28
NOTE_SIZE = 14
NOTE_Y = 108


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/SFNSMono.ttf",
        "/System/Library/Fonts/Menlo.ttc",
        "/Library/Fonts/Courier New.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def hex_color(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def draw_dashed_circle(
    draw: ImageDraw.ImageDraw,
    center: tuple[int, int],
    radius: int,
    color: str,
    width: int = 2,
    dash: int = 6,
    gap: int = 5,
) -> None:
    import math

    circumference = 2 * math.pi * radius
    segments = int(circumference / (dash + gap))
    for i in range(segments):
        start_angle = (i * (dash + gap) / circumference) * 360
        end_angle = ((i * (dash + gap) + dash) / circumference) * 360
        draw.arc(
            [center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius],
            start=start_angle,
            end=end_angle,
            fill=color,
            width=width,
        )


def draw_arrow(
    draw: ImageDraw.ImageDraw,
    start: tuple[int, int],
    end: tuple[int, int],
    color: str,
    width: int = 2,
) -> None:
    draw.line([start, end], fill=color, width=width)
    import math

    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    head_len = 10
    head_angle = math.pi / 7
    x, y = end
    left = (
        x - head_len * math.cos(angle - head_angle),
        y - head_len * math.sin(angle - head_angle),
    )
    right = (
        x - head_len * math.cos(angle + head_angle),
        y - head_len * math.sin(angle + head_angle),
    )
    draw.polygon([end, left, right], fill=color)


def centered_text(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    font: ImageFont.ImageFont,
    fill: str,
) -> None:
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((xy[0] - tw / 2, xy[1] - th / 2), text, font=font, fill=fill)


def main() -> None:
    img = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(img)

    font_label = load_font(18)
    font_small = load_font(13)
    font_hop = load_font(12)
    font_id = load_font(16)

    for i in range(len(DEVICES) - 1):
        a = DEVICES[i]
        b = DEVICES[i + 1]
        start = (a["x"] + R + 8, CY)
        end = (b["x"] - R - 8, CY)
        draw_arrow(draw, start, end, SIGNAL)

    for device in DEVICES:
        x = device["x"]

        note_x = x - NOTE_SIZE / 2
        draw.rectangle(
            [note_x, NOTE_Y, note_x + NOTE_SIZE, NOTE_Y + NOTE_SIZE],
            fill=SIGNAL,
            outline=SIGNAL,
        )
        centered_text(draw, (x, NOTE_Y - 18), device["hop"], font_hop, TEXT_SECONDARY)

        draw.ellipse(
            [x - R, CY - R, x + R, CY + R],
            fill=DEVICE_FILL,
            outline=DEVICE_STROKE,
            width=2,
        )
        centered_text(draw, (x, CY), device["id"], font_id, TEXT_PRIMARY)

        centered_text(draw, (x, CY + R + 22), device["role"], font_label, TEXT_PRIMARY)

        if device["disconnect"]:
            draw_dashed_circle(draw, (x, CY), R + 18, DISCONNECT, width=2)
            centered_text(
                draw,
                (x, CY + R + 52),
                "author leaves mesh",
                font_small,
                TEXT_SECONDARY,
            )

    output = "assets/note-relay-diagram.png"
    img.save(output, "PNG")
    print(f"Wrote {output}")


if __name__ == "__main__":
    main()
