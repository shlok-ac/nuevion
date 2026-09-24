# NirikshanAi– ATM Risk Prediction & Money Trail Intelligence

## Overview

SentinCash is a prototype cyber-fraud intelligence system designed to help identify potentially high-risk cash-out locations after a cybercrime complaint.

The system combines:

1. Machine Learning for ATM risk prediction
2. Money trail analysis using Neo4j
3. Cash-out account identification
4. Predicted ATM mapping
5. Graph-based visualization of financial transaction paths

The prototype follows the flow:

Victim Account
↓
Mule Account 1
↓
Mule Account 2
↓
Cash-out Account
↓
Likely Cash-out ATM

---

## System Architecture

```text
Cybercrime Complaint
        │
        ▼
   Complaint Data
        │
        ├──────────────────────┐
        ▼                      ▼
ATM Risk Prediction       Money Trail Generation
(Random Forest)           (Mule Hops)
        │                      │
        ▼                      ▼
ATM Risk Score           Neo4j Graph
        │                      │
        └──────────┬───────────┘
                   ▼
          Cash-out Account
                   │
                   ▼
        Likely Cash-out ATM
                   │
                   ▼
       Risk & Location Information
1. ATM Risk Prediction
Objective

The ML component predicts the risk level of an ATM using available ATM-related features.

Input Features

The Random Forest model uses the following features:

highway_distance
lighting_score
cctv_coverage
historical_fraud_count
withdrawal_limit
Target

The target variable is:

risk_level

Possible classes:

HIGH
MEDIUM
LOW
Machine Learning Model

The prototype uses:

Random Forest Classifier
Dataset

Input dataset:

atms.csv

The dataset contains 500 ATM records.

Train/Test Split
Training data: 80%
Testing data: 20%
Random state: 42
Stratified split
Model Performance

The model achieved approximately:

Accuracy: 89%

Classification performance:

Risk Level	Precision	Recall	F1-Score
HIGH	1.00	0.81	0.90
LOW	0.95	0.78	0.86
MEDIUM	0.83	0.98	0.90

Overall:

Accuracy = 0.89
Feature Importance

The Random Forest model produced the following feature importance values:

Feature	Importance
historical_fraud_count	0.6339
lighting_score	0.1247
cctv_coverage	0.1139
highway_distance	0.0977
withdrawal_limit	0.0299

These values describe the relative contribution of each feature within this trained prototype model. They should not be interpreted as proof of causal real-world fraud behavior.

2. ATM Prediction Output

The ML pipeline generates:

atm_predictions.csv

This file contains the original ATM information along with ML predictions.

Important Output Columns
atm_id
city
latitude
longitude
risk_level
predicted_risk_level
prediction_confidence
date
time
time_of_day
crime_type
Prediction Confidence

The model uses the highest class probability from:

model.predict_proba()

as the prediction confidence.

3. Money Trail Generation

The money trail component represents the movement of fraudulent funds through multiple accounts.

Input:

complaints.csv

Output:

mule_hops.csv

The prototype generates three transaction hops for each complaint.

Money Trail Structure
Victim Account
      │
      ▼
Mule Account 1
      │
      ▼
Mule Account 2
      │
      ▼
Cash-out Account

For each complaint:

Hop 1 → Victim → Mule 1
Hop 2 → Mule 1 → Mule 2
Hop 3 → Mule 2 → Cash-out Account
mule_hops.csv

The file contains 1,500 transaction records.

This is generated from:

500 complaints × 3 hops = 1,500 hops

Columns:

hop_id
complaint_id
hop_level
from_account
to_account
amount_transferred_inr
time_delay_minutes
timestamp
4. Neo4j Graph Database

Neo4j is used to represent the financial transaction network as a graph.

Nodes
Account

Each account is represented as:

(:Account)

Property:

account_id
ATM

Each ATM is represented as:

(:ATM)

Properties include:

atm_id
bank_name
latitude
longitude
predicted_risk_level
prediction_confidence
Relationships
TRANSFER

Represents movement of money between accounts.

(:Account)-[:TRANSFER]->(:Account)

Properties:

amount_transferred_inr
complaint_id
time_delay_minutes
hop_level
timestamp
LIKELY_CASHOUT_AT

Connects the final cash-out account to the predicted ATM.

(:Account)-[:LIKELY_CASHOUT_AT]->(:ATM)
5. ATM Cash-out Mapping

The ML and money-trail components are connected through:

atm_cashout_mapping.csv

This file maps each complaint's cash-out account to a likely ATM.

Columns:

complaint_number
location
cashout_account
atm_id
bank_name_y
latitude
longitude
predicted_risk_level
prediction_confidence

The prototype currently uses complaint location/city and available ATM information to create the likely ATM association.

This represents a prototype association and does not prove that an actual withdrawal occurred at that ATM.

6. End-to-End Flow

The complete prototype works as follows:

Complaint
   │
   ├─────────────────────────────┐
   │                             │
   ▼                             ▼
ATM Dataset                 Complaint Data
   │                             │
   ▼                             ▼
Random Forest              Mule Hop Generation
   │                             │
   ▼                             ▼
ATM Risk Prediction          Neo4j Graph
   │                             │
   └──────────────┬──────────────┘
                  ▼
           Cash-out Account
                  │
                  ▼
          Likely ATM Mapping
                  │
                  ▼
          Predicted Risk Level
7. Example

For complaint:

CMP100001

the prototype produces the following money trail:

ACC0001V
    ↓
ACC0001M1
    ↓
ACC0001M2
    ↓
ACC0001M3

The cash-out account:

ACC0001M3

is connected to:

ATM100459

ATM information:

Bank: HDFC Bank
City: Ahmedabad
Risk Level: HIGH
Prediction Confidence: 100%
Latitude: 23.016729
Longitude: 72.646921

Therefore, the complete graph path is:

ACC0001V
   ↓ TRANSFER
ACC0001M1
   ↓ TRANSFER
ACC0001M2
   ↓ TRANSFER
ACC0001M3
   ↓ LIKELY_CASHOUT_AT
ATM100459
8. Technologies Used
Machine Learning
Python
Pandas
NumPy
Scikit-learn
Random Forest
Graph Database
Neo4j
Cypher
Data Processing
CSV
Pandas
Development Environment
Google Colab
Neo4j Desktop
9. Project Files
member3-ml-graph/
│
├── README.md
├── requirements.txt
│
├── data/
│   ├── atm_predictions.csv
│   ├── mule_hops.csv
│   └── atm_cashout_mapping.csv
│
├── ml/
│   └── atm_risk_prediction.ipynb
│
└── neo4j/
    └── neo4j_queries.cypher
10. How the Components Connect
atms.csv
   │
   ▼
ATM Risk Prediction
   │
   ▼
atm_predictions.csv
   │
   ▼
atm_cashout_mapping.csv
   │
   ▼
Neo4j ATM Nodes

And:

complaints.csv
      │
      ▼
mule_hops.csv
      │
      ▼
Neo4j Account Nodes
      │
      ▼
TRANSFER Relationships
      │
      ▼
Cash-out Account

Finally:

Cash-out Account
      │
      ▼
LIKELY_CASHOUT_AT
      │
      ▼
Predicted ATM
11. Prototype Limitations

This is a prototype system using synthetic/generated transaction data and available dataset fields.

Important limitations:

The money trail data is generated for prototype demonstration.
The ATM-to-cash-out association is a prototype mapping based on complaint location and available ATM information.
A predicted ATM does not prove that a withdrawal actually occurred there.
Real deployment would require secure access to banking transaction data, ATM transaction records, real-time complaint information, and authorized law-enforcement/banking systems.
Model performance on this dataset should not be treated as real-world fraud prediction performance.
12. Future Scope

Possible future improvements include:

Real-time transaction streaming
Integration with cybercrime complaint systems
Real ATM withdrawal data
Real-time bank transaction monitoring
Advanced graph-based fraud detection
Graph Neural Networks
Geospatial reachability analysis
ATM-level anomaly detection
Real-time alerts to banks and law-enforcement agencies
Continuous model retraining
Explainable AI for risk predictions
13. Member 3 Contribution
Machine Learning
Prepared ATM prediction dataset
Selected ML features
Encoded risk levels
Trained Random Forest classifier
Evaluated model performance
Generated prediction confidence
Generated predictions for all ATMs
Money Trail
Generated mule transaction hops
Created victim-to-mule-to-cash-out transaction structure
Prepared mule_hops.csv
Neo4j
Designed Account graph structure
Created TRANSFER relationships
Created ATM nodes
Connected cash-out accounts to predicted ATMs
Verified complete money trail using Cypher
Integration

Connected:

ML ATM Risk Prediction
        +
Money Trail Graph
        +
Likely Cash-out ATM

into a single prototype workflow.

14. Conclusion

SentinCash demonstrates a prototype approach for combining machine learning and graph-based financial intelligence.

The ML component identifies ATM risk levels, while the Neo4j graph represents the movement of funds through multiple accounts. The final integration connects the cash-out account with a likely ATM and its predicted risk information.

The prototype demonstrates how financial transaction relationships and ATM risk intelligence can be combined to support faster investigation and intervention workflows.
