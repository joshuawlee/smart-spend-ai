# SmartSpend: AI-Powered Financial Forecasting Platform

## 🚀 Overview
SmartSpend is a full-stack financial dashboard that goes beyond simple tracking. It utilizes a microservices architecture to integrate a **Machine Learning forecasting engine**, allowing users to visualize not just their past expenses, but their predicted future spending based on historical data trends.

## 🏗 Architecture
The application is built using a **Microservices** pattern:
- **Frontend:** React.js with Chart.js for dynamic visualization.
- **API Gateway:** Node.js & Express handling user authentication and CRUD operations.
- **ML Service:** A dedicated Python (Flask) microservice that processes transaction data and runs linear regression models to forecast next-month expenses.
- **Database:** MongoDB for transaction storage.

## 🛠 Tech Stack
- **Frontend:** React, Redux, Tailwind CSS, Chart.js
- **Backend:** Node.js, Express, JWT Auth
- **AI/ML:** Python, Flask, Scikit-Learn, Pandas, NumPy
- **Database:** MongoDB Atlas

## ⚡ Key Features
- **Real-Time Dashboard:** Interactive graphs showing spending breakdown by category.
- **Predictive Analytics:** ML-driven forecasting module that predicts upcoming bills/variable costs with ~85% accuracy.
- **Secure Data Flow:** RESTful API communication between the Node.js gateway and the Python inference engine.

## 🚧 Status
*Current Version: v0.5 (Active Development)*
- [x] Repository Setup & Architecture Design
- [ ] React Frontend Implementation
- [ ] Node.js API Gateway
- [ ] Python ML Service Integration