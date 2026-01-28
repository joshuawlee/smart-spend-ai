from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import make_pipeline
import pandas as pd
import numpy as np

app = Flask(__name__)
CORS(app)

# ==========================================
# 🧠 MODEL 1: AUTO-CATEGORIZATION (NLP)
# ==========================================

training_data = [
    # FOOD
    ("starbucks", "Food"), ("mcdonalds", "Food"), ("burger king", "Food"),
    ("taco bell", "Food"), ("whole foods", "Food"), ("heb", "Food"),
    ("kroger", "Food"), ("restaurant", "Food"), ("coffee", "Food"),
    ("chipotle", "Food"), ("pizza", "Food"), ("diner", "Food"),
    ("sushi", "Food"), ("tacos", "Food"), ("cafe", "Food"),
    ("donuts", "Food"), ("dunkin", "Food"), ("cane's", "Food"),
    ("chick-fil-a", "Food"), ("whataburger", "Food"), ("wingstop", "Food"),
    ("grocery", "Food"), ("market", "Food"), ("lunch", "Food"), ("dinner", "Food"),
    
    # TRAVEL (Gas / Uber)
    ("shell", "Travel"), ("exxon", "Travel"), ("chevron", "Travel"),
    ("uber", "Travel"), ("lyft", "Travel"), ("texaco", "Travel"),
    ("bp", "Travel"), ("united airlines", "Travel"), ("delta", "Travel"),
    ("gas", "Travel"), ("flight", "Travel"), ("hotel", "Travel"),
    ("fuel", "Travel"), ("pilot", "Travel"), ("american airlines", "Travel"),
    ("wawa", "Travel"), ("buc-ee's", "Travel"), ("love's", "Travel"),
    
    # TECH
    ("spotify", "Tech"), ("netflix", "Tech"), ("apple", "Tech"),
    ("best buy", "Tech"), ("amazon", "Tech"), ("google", "Tech"),
    ("aws", "Tech"), ("hulu", "Tech"), ("adobe", "Tech"),
    ("playstation", "Tech"), ("xbox", "Tech"), ("nintendo", "Tech"),
    ("steam", "Tech"), ("chatgpt", "Tech"), ("cursor", "Tech"),
    
    # RENT / BILLS
    ("leasing office", "Rent"), ("apartments", "Rent"), ("rent", "Rent"),
    ("electric", "Rent"), ("water", "Rent"), ("utilities", "Rent"),
    ("wifi", "Rent"), ("internet", "Rent"), ("verizon", "Rent"), ("att", "Rent")
]

# Build Model
df = pd.DataFrame(training_data, columns=['text', 'category'])
classifier = make_pipeline(CountVectorizer(), MultinomialNB())
classifier.fit(df['text'], df['category'])
print("✅ NLP Classifier Trained & Ready")

# ==========================================
# 🛣️ ROUTES
# ==========================================

@app.route('/predict_category', methods=['POST'])
def predict_category():
    try:
        data = request.json
        # Clean the input (lowercase, remove extra spaces)
        text = data.get('text', '').lower().strip()
        
        print(f"🔮 Received text: '{text}'") # DEBUG LOG

        if not text:
            return jsonify({'category': 'Other'})
            
        # 1. Predict
        prediction = classifier.predict([text])[0]
        
        # 2. Get Confidence (Just for your info)
        probs = classifier.predict_proba([text])[0]
        confidence = np.max(probs)
        
        print(f"✅ Prediction: {prediction} (Confidence: {confidence:.2f})") # DEBUG LOG
        
        # FIX: Removed the "0.6" threshold. It now ALWAYS returns the best guess.
        return jsonify({
            'category': prediction, 
            'confidence': float(confidence)
        })
        
    except Exception as e:
        print("NLP Error:", e)
        return jsonify({'error': str(e), 'category': 'Other'})


@app.route('/predict', methods=['POST'])
def predict_spending():
    try:
        data = request.json
        history = data.get('history', [])
        if not history or len(history) < 2:
            return jsonify({'predicted_next_month': 0})
        X = np.array(range(len(history))).reshape(-1, 1)
        y = np.array(history)
        regressor = LinearRegression()
        regressor.fit(X, y)
        prediction = regressor.predict(np.array([[len(history)]]))[0]
        return jsonify({'predicted_next_month': round(float(prediction), 2)})
    except Exception as e:
        print("Forecast Error:", e)
        return jsonify({'error': str(e), 'predicted_next_month': 0})

if __name__ == '__main__':
    app.run(port=5001)