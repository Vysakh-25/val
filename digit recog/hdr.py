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

# ---------------- TKINTER WINDOW ----------------
WIDTH = 280
HEIGHT = 280
BG_COLOR = "black"
DRAW_COLOR = "white"

root = tk.Tk()
root.title("Draw Digit")

canvas = tk.Canvas(root, width=WIDTH, height=HEIGHT, bg=BG_COLOR)
canvas.pack()

# image used for saving
image = Image.new("L", (WIDTH, HEIGHT), color=0)
draw = ImageDraw.Draw(image)

last_x, last_y = None, None


# ---------------- DRAW FUNCTIONS ----------------
def start_draw(event):
    global last_x, last_y
    last_x, last_y = event.x, event.y


def draw_digit(event):
    global last_x, last_y

    x, y = event.x, event.y

    canvas.create_line(last_x, last_y, x, y,
                       fill=DRAW_COLOR, width=18,
                       capstyle=tk.ROUND, smooth=True)

    draw.line([last_x, last_y, x, y], fill=255, width=18)

    last_x, last_y = x, y


def clear_canvas():
    global image, draw
    canvas.delete("all")
    image = Image.new("L", (WIDTH, HEIGHT), color=0)
    draw = ImageDraw.Draw(image)


# ---------------- MAIN LOGIC ----------------
def predict_digit():
    global image

    # preprocess
    img = image.resize((28, 28))
    img_array = np.array(img) / 255.0
    img_array = img_array.reshape(1, 28, 28)

    prediction = model.predict(img_array, verbose=0)
    predicted_digit = int(np.argmax(prediction))

    print(f"\nPredicted digit: {predicted_digit}")
    correct = input("Is this correct? (y/n): ").strip().lower()

    if correct == "y":
        print("Good.")

    elif correct == "n":
        true_label = int(input("Enter correct digit (0-9): "))

        # save image
        count = len([f for f in os.listdir(IMG_DIR) if f.endswith(".png")]) + 1
        save_path = os.path.join(IMG_DIR, f"digit{count}.png")
        image.save(save_path)
        print("Saved:", save_path)

        # train model
        model.fit(img_array, np.array([true_label]), epochs=1, verbose=0)
        model.save("handwritten.keras")
        print("Model updated and saved.")

    else:
        print("Invalid input.")

    clear_canvas()


# ---------------- BUTTONS ----------------
btn_predict = tk.Button(root, text="Predict", command=predict_digit)
btn_predict.pack(fill="x")

btn_clear = tk.Button(root, text="Clear", command=clear_canvas)
btn_clear.pack(fill="x")

# mouse binding
canvas.bind("<Button-1>", start_draw)
canvas.bind("<B1-Motion>", draw_digit)

root.mainloop()