import os
import cv2
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt

BASE_DIR = os.path.dirname(__file__)
IMG_DIR = os.path.join(BASE_DIR, 'digits')
MODEL_PATH = os.path.join(BASE_DIR, 'handwritten.keras')

model = tf.keras.models.load_model(MODEL_PATH)


def prepare_digit(img):
    h, w = img.shape
    size = max(h, w) + 20
    square = np.zeros((size, size), dtype=np.uint8)
    y_off = (size - h) // 2
    x_off = (size - w) // 2
    square[y_off:y_off+h, x_off:x_off+w] = img
    square = cv2.resize(square, (28, 28))
    square = square / 255.0
    return square


files = [f for f in os.listdir(IMG_DIR) if f.lower().endswith('.png')]
files.sort()

trained = 0

for file in files:
    path = os.path.join(IMG_DIR, file)
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        continue

    plt.imshow(img, cmap='gray')
    plt.title(file)
    plt.axis('off')
    plt.show()

        # try auto label from filename like 67_12.png or 5_test.png
    auto_label = file.split('_')[0]
    if auto_label.isdigit():
        use_auto = input(f"Use filename label '{auto_label}' for {file}? (y/n): ").strip().lower()
        if use_auto == 'y':
            label = auto_label
        else:
            label = input(f'Enter true number for {file}: ').strip()
    else:
        pred_hint = ''
        label = input(f'Enter true number for {file}: ').strip()
        if not label.isdigit():
            print('Skipped.')
        continue

    _, thresh = cv2.threshold(img, 20, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes = [cv2.boundingRect(c) for c in contours]
    boxes = sorted(boxes, key=lambda b: b[0])

    if len(boxes) != len(label):
        print('Split count mismatch. Skipped:', file)
        continue

    X = []
    y = []

    for i, (x, y1, w, h) in enumerate(boxes):
        roi = thresh[y1:y1+h, x:x+w]
        digit_img = prepare_digit(roi)
        X.append(digit_img)
        y.append(int(label[i]))

    X = np.array(X)
    y = np.array(y)

    model.fit(X, y, epochs=3, verbose=0)
    trained += len(y)
    print('Trained on', file)

model.save(MODEL_PATH)
print('Done. Total digits trained:', trained)
print('Tip: rename future files like 67_1.png or 5_2.png to skip manual typing.')
