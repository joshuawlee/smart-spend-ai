# 💳 SmartSpend AI

**SmartSpend AI** is a full-stack financial forecasting dashboard that uses Machine Learning to predict future spending habits based on transaction history.

## 🚀 Tech Stack (Microservices Architecture)

* **Frontend:** React.js, Chart.js (Data Visualization)
* **API Gateway:** Node.js, Express (Rest API)
* **AI Engine:** Python, Flask, Scikit-Learn (Linear Regression)
* **Data:** JSON Store (Persistence)

## 🏗️ System Architecture

The application follows a decoupled microservices pattern to separate the User Interface, Business Logic, and Computation Engine.

```mermaid
graph TD;
    User[👤 User] -->|Interacts| Client[⚛️ React Frontend];
    Client -->|HTTP GET/POST| Gateway[🟢 Node.js API Gateway];
    Gateway -->|Read/Write| DB[(📂 JSON Database)];
    Gateway -->|Forward Data| AI[🐍 Python AI Service];
    AI -->|Return Prediction| Gateway;
    Gateway -->|Return JSON| Client;