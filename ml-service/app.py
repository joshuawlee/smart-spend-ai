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
    
    # TRANSPORTATION
    ("shell", "Transportation"), ("exxon", "Transportation"), ("chevron", "Transportation"),
    ("uber", "Transportation"), ("lyft", "Transportation"), ("texaco", "Transportation"),
    ("bp", "Transportation"), ("united airlines", "Transportation"), ("delta", "Transportation"),
    ("gas", "Transportation"), ("flight", "Transportation"), ("hotel", "Transportation"),
    ("fuel", "Transportation"), ("pilot", "Transportation"), ("american airlines", "Transportation"),
    ("wawa", "Transportation"), ("buc-ee's", "Transportation"), ("love's", "Transportation"),
    
    # ENTERTAINMENT & SHOPPING
    ("spotify", "Entertainment"), ("netflix", "Entertainment"), ("apple", "Shopping"),
    ("best buy", "Shopping"), ("amazon", "Shopping"), ("google", "Entertainment"),
    ("aws", "Entertainment"), ("hulu", "Entertainment"), ("adobe", "Entertainment"),
    ("playstation", "Entertainment"), ("xbox", "Entertainment"), ("nintendo", "Entertainment"),
    ("steam", "Entertainment"), ("chatgpt", "Entertainment"), ("cursor", "Entertainment"),
    
    # HOUSING & UTILITIES
    ("leasing office", "Housing"), ("apartments", "Housing"), ("rent", "Housing"),
    ("electric", "Utilities"), ("water", "Utilities"), ("utilities", "Utilities"),
    ("wifi", "Utilities"), ("internet", "Utilities"), ("verizon", "Utilities"), ("att", "Utilities"),
    
    # HEALTH
    ("cvs", "Health"), ("walgreens", "Health"), ("pharmacy", "Health"),
    ("hospital", "Health"), ("doctor", "Health"), ("dentist", "Health")
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

@app.route('/generate_summary', methods=['POST'])
def generate_summary():
    try:
        data = request.json
        history = data.get('history', [])
        
        if not history or len(history) == 0:
            return jsonify({
                "summary": "You have no recorded transactions yet. Start adding some to get AI insights!",
                "trend": "Stable",
                "count": 0
            })

        df = pd.DataFrame(history)
        
        # Calculate some basic facts
        total_spend = df['amount'].sum()
        tx_count = len(df)
        
        # Find top category
        if 'category' in df.columns:
            top_cat = df.groupby('category')['amount'].sum().idxmax()
            top_cat_amt = df.groupby('category')['amount'].sum().max()
        else:
            top_cat = "Unknown"
            top_cat_amt = 0
            
        # VERY basic heuristics for summary generation (Mock LLM)
        if total_spend > 5000:
            summary = f"Your financial activity this period is unusually high. The majority of your spending went towards {top_cat} (${top_cat_amt:,.0f}). Consider reviewing these expenses."
            trend = "High"
        elif tx_count > 20:
            summary = f"You've had a high volume of transactions ({tx_count}) recently, primarily driven by {top_cat}. Revenue shows expected seasonal variation."
            trend = "Active"
        else:
            summary = f"Your financial activity remains stable with {tx_count} recent transactions. Spending is balanced, with {top_cat} being your top category. No unusual patterns detected."
            trend = "Stable"
            
        return jsonify({
            "summary": summary,
            "trend": trend,
            "count": tx_count
        })

    except Exception as e:
        print("Summary Gen Error:", e)
        return jsonify({
            "summary": "Error analyzing your spending data.",
            "trend": "Unknown",
            "count": 0
        })

if __name__ == '__main__':
    app.run(port=5001)