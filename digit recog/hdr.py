import os
import cv2  # to open cv python
import numpy as np
import matplotlib.pyplot as plt
import tensorflow as tf


mnist = tf.keras.datasets.mnist
(x_train,y_train),(x_test,y_test) = mnist.load_data()

x_train = tf.keras.utils.normalize(x_train,axis = 1)
x_test = tf.keras.utils.normalize(x_test,axis = 1)

"""
model = tf.keras.models.Sequential()
model.add(tf.keras.layers.Flatten(input_shape = (28,28)))
model.add(tf.keras.layers.Dense(128,activation = 'relu'))
model.add(tf.keras.layers.Dense(128,activation = 'relu'))
model.add(tf.keras.layers.Dense(10,activation = 'softmax'))

model.compile(optimizer = 'adam',loss = 'sparse_categorical_crossentropy',metrics = ['accuracy'])
"""

#model.fit(x_train,y_train,epochs = 3)

model = tf.keras.models.load_model("handwritten.keras")


model.save("handwritten.keras")


image_number = 1
image_number = 1
BASE_DIR = os.path.dirname(__file__)
IMG_DIR = os.path.join(BASE_DIR, "digits")

while True:
    path = os.path.join(IMG_DIR, f"digit{image_number}.png")
    if not os.path.isfile(path):
        break

    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    img = cv2.resize(img, (28, 28))
    img = img / 255.0
    img = 1.0 - img
    img = img.reshape(1, 28, 28)

    prediction = model.predict(img)
    predicted_digit = int(np.argmax(prediction))

    plt.imshow(img[0], cmap="gray")
    plt.show()

    print(f"Predicted digit: {predicted_digit}")
    correct = input("Is this correct? (y/n): ").strip().lower()

    if correct == "n":
        true_label = int(input("Enter correct digit (0-9): "))
        
        # train on this single image
        model.fit(img, np.array([true_label]), epochs=1, verbose=0)
        
        # save updated model
        model.save("digit recog/handwritten.keras")
        print("Model updated and saved.")

    elif correct == "y":
        print("Good. Moving on.")

    else:
        print("Invalid input. Skipping.")


    image_number += 1
