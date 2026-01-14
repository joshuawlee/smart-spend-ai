from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from sklearn.linear_model import LinearRegression

app = Flask(__name__)
# CORS allows your React frontend (on port 3000) to talk to this Python script (on port 5001)
CORS(app)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # 1. Get the data sent from the Frontend
        data = request.json
        spending_history = data.get('history', [])
        
        # Validation: We need at least 2 months of data to make a line
        if not spending_history or len(spending_history) < 2:
            return jsonify({"error": "Not enough data points"}), 400

        # 2. Prepare Data for AI (Supervised Learning)
        # X = The month number (0, 1, 2...) [Must be 2D array for Scikit-Learn]
        # y = The spending amount ($)
        X = np.array(range(len(spending_history))).reshape(-1, 1)
        y = np.array(spending_history)

        # 3. Train the Model
        # We use Linear Regression to find the trend line
        model = LinearRegression()
        model.fit(X, y)

        # 4. Predict the Future
        # We ask the model: "What is the value for the NEXT month index?"
        next_month_index = np.array([[len(spending_history)]])
        prediction = model.predict(next_month_index)[0]

        return jsonify({
            "predicted_next_month": round(prediction, 2),
            "status": "success"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Run on port 5001 so it doesn't clash with the other backend
    print("🧠 AI Service is starting on Port 5001...")
    app.run(port=5001, debug=True)