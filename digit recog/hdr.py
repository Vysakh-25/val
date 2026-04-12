import os
import cv2
import numpy as np
import tensorflow as tf
import tkinter as tk
from PIL import Image, ImageDraw

# ---------------- LOAD MODEL ----------------
model = tf.keras.models.load_model("handwritten.keras")

BASE_DIR = os.path.dirname(__file__)
IMG_DIR = os.path.join(BASE_DIR, "digits")
os.makedirs(IMG_DIR, exist_ok=True)

# ---------------- WINDOW ----------------
WIDTH = 500
HEIGHT = 220

root = tk.Tk()
root.title("Whole Number Recognizer")

canvas = tk.Canvas(root, width=WIDTH, height=HEIGHT, bg="black")
canvas.pack()

image = Image.new("L", (WIDTH, HEIGHT), 0)
draw = ImageDraw.Draw(image)

last_x, last_y = None, None

# ---------------- DRAW ----------------
def start_draw(event):
    global last_x, last_y
    last_x, last_y = event.x, event.y

def draw_line(event):
    global last_x, last_y
    x, y = event.x, event.y

    canvas.create_line(last_x, last_y, x, y,
                       fill="white", width=18,
                       capstyle=tk.ROUND, smooth=True)

    draw.line((last_x, last_y, x, y), fill=255, width=18)
    last_x, last_y = x, y

def clear_canvas():
    global image, draw
    canvas.delete("all")
    image = Image.new("L", (WIDTH, HEIGHT), 0)
    draw = ImageDraw.Draw(image)

# ---------------- PROCESS SINGLE DIGIT ----------------
def prepare_digit(digit_img):
    h, w = digit_img.shape

    size = max(h, w) + 20
    square = np.zeros((size, size), dtype=np.uint8)

    y_off = (size - h) // 2
    x_off = (size - w) // 2
    square[y_off:y_off+h, x_off:x_off+w] = digit_img

    square = cv2.resize(square, (28, 28))
    square = square / 255.0
    square = square.reshape(1, 28, 28)
    return square

# ---------------- PREDICT WHOLE NUMBER ----------------
def predict_number():
    global image

    img = np.array(image)

    _, thresh = cv2.threshold(img, 20, 255, cv2.THRESH_BINARY)

    contours, _ = cv2.findContours(
        thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    if not contours:
        print("Nothing drawn.")
        return

    boxes = [cv2.boundingRect(c) for c in contours]
    boxes = sorted(boxes, key=lambda b: b[0])  # left to right

    digits = []

    for (x, y, w, h) in boxes:
        roi = thresh[y:y+h, x:x+w]
        processed = prepare_digit(roi)

        pred = model.predict(processed, verbose=0)
        digit = str(np.argmax(pred))
        digits.append(digit)

    number = "".join(digits)

    print(f"\nPredicted number: {number}")
    correct = input("Is this correct? (y/n): ").strip().lower()

    if correct == "y":
        print("Nice.")

    elif correct == "n":
        true_value = input("Enter correct whole number: ").strip()

        # save image
        count = len([f for f in os.listdir(IMG_DIR) if f.endswith(".png")]) + 1
        save_path = os.path.join(IMG_DIR, f"{true_value}_{count}.png")
        image.save(save_path)
        print("Saved:", save_path)

        print("Stored for future dataset building.")

    else:
        print("Invalid input.")

    clear_canvas()

# ---------------- BUTTONS ----------------
tk.Button(root, text="Predict", command=predict_number).pack(fill="x")
tk.Button(root, text="Clear", command=clear_canvas).pack(fill="x")

canvas.bind("<Button-1>", start_draw)
canvas.bind("<B1-Motion>", draw_line)

root.mainloop()