"""
AI-Powered Energy Consumption Optimizer
----------------------------------------
Trains a classifier that predicts whether an appliance should:
  - No_Action    : keep running as-is
  - Suggest_OFF  : turn off (temperature/comfort based)
  - Delay_Load   : delay/avoid usage (overload/load based)

Input dataset: merged_energy_optimization_dataset_Jan2025_Jul2026.csv
"""

import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib

# Get directory of the script to resolve paths relatively
script_dir = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# STEP 1: Load the dataset
# ---------------------------------------------------------------------------
DATA_DIR = os.path.join(script_dir, "dataset")
default_name = "merged_energy_optimization_dataset_Jan2025_Jul2026.csv"
fallback_name = "energy_optimization_dataset_Jan2025_Jul2026 (1).csv"

if os.path.exists(os.path.join(DATA_DIR, default_name)):
    DATA_PATH = os.path.join(DATA_DIR, default_name)
elif os.path.exists(os.path.join(DATA_DIR, fallback_name)):
    DATA_PATH = os.path.join(DATA_DIR, fallback_name)
else:
    # If not found inside dataset/, search in the script's directory itself
    if os.path.exists(os.path.join(script_dir, default_name)):
        DATA_PATH = os.path.join(script_dir, default_name)
    else:
        DATA_PATH = os.path.join(DATA_DIR, default_name)

df = pd.read_csv(DATA_PATH)

print("Dataset shape:", df.shape)
print("Target class distribution:")
print(df["target"].value_counts())
print((df["target"].value_counts(normalize=True) * 100).round(2))
print()

# ---------------------------------------------------------------------------
# STEP 2: Feature engineering
# ---------------------------------------------------------------------------
# load_ratio = how close the current combined appliance load is to the
# house's sanctioned (maximum safe) load. This is more meaningful than raw
# wattage alone, since a 2kW draw means something different for a 2kW house
# vs a 4kW house.
df["load_ratio"] = (df["simultaneous_load_kw"] * 1000) / df["sanctioned_load_watts"]

# Numeric features: fed into the model directly
numeric_features = [
    "temperature_c",        # live ambient temperature (from OpenWeatherMap in the real app)
    "humidity_pct",
    "simultaneous_load_kw",  # total load currently active in the house
    "sanctioned_load_watts", # max safe load for that house's connection
    "load_ratio",            # engineered feature (see above)
    "usage_hours",
]

# Categorical features: converted to one-hot columns (e.g. appliance_name_AC = 1/0)
categorical_features = [
    "appliance_name",
    "priority",     # Essential / Non-essential / Medium
    "time_slot",    # Morning / Afternoon / Evening / Night
    "season",
]

X = pd.get_dummies(df[numeric_features + categorical_features], columns=categorical_features)
y = df["target"]

print("Total input features after one-hot encoding:", X.shape[1])
print()

# ---------------------------------------------------------------------------
# STEP 3: Train / test split
# ---------------------------------------------------------------------------
# 80% of rows used for training, 20% held out to test on data the model has
# NEVER seen. stratify=y ensures all 3 classes are represented proportionally
# in both the train and test sets (important since No_Action is the majority
# class - without stratification the test set could end up unbalanced).
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"Train rows: {len(X_train)}  |  Test rows: {len(X_test)}")
print()

# ---------------------------------------------------------------------------
# STEP 4: Train a Decision Tree Classifier
# ---------------------------------------------------------------------------
# Why Decision Tree:
#   - Naturally handles a mix of numeric (temperature, load) and categorical
#     (appliance, priority) features without heavy preprocessing.
#   - Produces human-readable if-else rules, which matches how this project's
#     recommendations were designed (threshold based), and makes the model's
#     decisions explainable to end users and reviewers.
#
# Why limit max_depth and min_samples_leaf:
#   - An unrestricted tree can memorize the training data perfectly (leading
#     to artificially inflated ~100% accuracy) but generalizes poorly to new,
#     unseen data. Limiting depth forces the model to learn general patterns
#     instead of memorizing individual rows (this prevents overfitting).
dt_model = DecisionTreeClassifier(
    max_depth=8,
    min_samples_leaf=10,
    random_state=42
)
dt_model.fit(X_train, y_train)

dt_train_acc = accuracy_score(y_train, dt_model.predict(X_train))
dt_test_acc = accuracy_score(y_test, dt_model.predict(X_test))

print("=== DECISION TREE ===")
print(f"Train Accuracy: {dt_train_acc*100:.2f}%")
print(f"Test Accuracy:  {dt_test_acc*100:.2f}%")
print(classification_report(y_test, dt_model.predict(X_test)))
print("Confusion Matrix:")
print(confusion_matrix(y_test, dt_model.predict(X_test)))
print()

# ---------------------------------------------------------------------------
# STEP 5: Train a Random Forest Classifier (for comparison)
# ---------------------------------------------------------------------------
# Random Forest trains many small decision trees on random subsets of data/
# features and lets them vote on the final prediction. It's usually more
# robust to noise than a single tree, so it's included here as a benchmark
# to compare against the single Decision Tree above.
rf_model = RandomForestClassifier(
    n_estimators=150,
    max_depth=10,
    min_samples_leaf=5,
    random_state=42
)
rf_model.fit(X_train, y_train)

rf_train_acc = accuracy_score(y_train, rf_model.predict(X_train))
rf_test_acc = accuracy_score(y_test, rf_model.predict(X_test))

print("=== RANDOM FOREST ===")
print(f"Train Accuracy: {rf_train_acc*100:.2f}%")
print(f"Test Accuracy:  {rf_test_acc*100:.2f}%")
print(classification_report(y_test, rf_model.predict(X_test)))
print()

# ---------------------------------------------------------------------------
# STEP 6: Feature importance
# ---------------------------------------------------------------------------
# Shows which inputs the model relied on most to make its decisions -
# useful evidence that the model learned genuine load/temperature/priority
# patterns rather than something arbitrary.
importances = pd.Series(rf_model.feature_importances_, index=X.columns).sort_values(ascending=False)
print("Top 10 most important features:")
print(importances.head(10))
print()

# ---------------------------------------------------------------------------
# STEP 7: Save the trained models for use in the Flask backend
# ---------------------------------------------------------------------------
MODELS_DIR = os.path.join(script_dir, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

dt_model_path = os.path.join(MODELS_DIR, "decision_tree_model.pkl")
rf_model_path = os.path.join(MODELS_DIR, "random_forest_model.pkl")
columns_path = os.path.join(MODELS_DIR, "model_feature_columns.pkl")

joblib.dump(dt_model, dt_model_path)
joblib.dump(rf_model, rf_model_path)
joblib.dump(list(X.columns), columns_path)  # needed to correctly
                                             # encode new live
                                             # inputs at inference time

print(f"Models saved inside: {MODELS_DIR}")
print("Files created: decision_tree_model.pkl, random_forest_model.pkl, model_feature_columns.pkl")