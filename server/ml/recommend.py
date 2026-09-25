import os
import sys
import json
import joblib
import pandas as pd
import numpy as np

def main():
    try:
        # Read JSON input from stdin
        input_data = json.loads(sys.stdin.read())
        
        # Load models and features
        script_dir = os.path.dirname(os.path.abspath(__file__))
        models_dir = os.path.join(script_dir, "models")
        
        dt_model_path = os.path.join(models_dir, "decision_tree_model.pkl")
        rf_model_path = os.path.join(models_dir, "random_forest_model.pkl")
        columns_path = os.path.join(models_dir, "model_feature_columns.pkl")
        
        # Verify model files exist
        if not os.path.exists(columns_path):
            print(json.dumps({"error": "Feature columns file not found. Please train models first."}))
            return
            
        feature_columns = joblib.load(columns_path)
        
        # Select model (prefer Random Forest, fallback to Decision Tree)
        if os.path.exists(rf_model_path):
            model = joblib.load(rf_model_path)
        elif os.path.exists(dt_model_path):
            model = joblib.load(dt_model_path)
        else:
            print(json.dumps({"error": "No trained models found. Please run predict.py first."}))
            return

        # Extract parameters
        weather = input_data.get("weather", {})
        temp = float(weather.get("temp", 25))
        humidity = float(weather.get("humidity", 60))
        
        season = input_data.get("season", "Summer")
        time_slot = input_data.get("time_slot", "Afternoon")
        sanctioned_load = float(input_data.get("sanctioned_load_watts", 4000))
        simultaneous_load = float(input_data.get("simultaneous_load_kw", 1.5))
        
        # Calculate load ratio
        load_ratio = (simultaneous_load * 1000.0) / sanctioned_load
        
        appliances = input_data.get("appliances", [])
        
        # Mapping frontend names to dataset names
        name_mapping = {
            "wifi router": "WiFi",
            "wifi": "WiFi",
            "iron box": "Iron Box",
            "washing machine": "Washing Machine",
            "water purifier": "Water Purifier",
            "room heater": "Room Heater",
            "ac": "AC",
            "fridge": "Fridge",
            "geyser": "Geyser",
            "cooler": "Cooler",
            "mixer": "Mixer",
            "lights": "Lights",
            "tv": "TV",
            "fans": "Fans",
            "oven": "Oven"
        }
        
        results = []
        
        for app in appliances:
            app_name = app.get("name", "Other")
            mapped_name = name_mapping.get(app_name.lower(), app_name)
            priority = app.get("priority", "Medium")
            usage_hours = float(app.get("usage_hours", 1.0))
            
            # Build input dictionary
            row = {
                "temperature_c": temp,
                "humidity_pct": humidity,
                "simultaneous_load_kw": simultaneous_load,
                "sanctioned_load_watts": sanctioned_load,
                "load_ratio": load_ratio,
                "usage_hours": usage_hours
            }
            
            # Initialize all feature columns to 0
            for col in feature_columns:
                if col not in row:
                    row[col] = 0
            
            # One-hot encoding fields
            app_col = f"appliance_name_{mapped_name}"
            priority_col = f"priority_{priority}"
            slot_col = f"time_slot_{time_slot}"
            season_col = f"season_{season}"
            
            if app_col in row:
                row[app_col] = 1
            if priority_col in row:
                row[priority_col] = 1
            if slot_col in row:
                row[slot_col] = 1
            if season_col in row:
                row[season_col] = 1
                
            # Create DataFrame with exact column order
            df_input = pd.DataFrame([row])[feature_columns]
            
            # Make prediction
            prediction = model.predict(df_input)[0]
            
            # Generate custom reasons based on conditions to explain AI behavior
            reason = "Optimal usage conditions."
            if prediction == "Suggest_OFF":
                if mapped_name == "AC" and temp < 24:
                    reason = f"Ambient temp is cool ({temp}°C). Running AC is less efficient."
                elif priority == "Non-essential":
                    reason = f"Non-essential appliance running during peak slots/load."
                else:
                    reason = "Turn off to conserve power under high peak load."
            elif prediction == "Delay_Load":
                if load_ratio > 0.8:
                    reason = f"System load is at {(load_ratio*100):.1f}% of sanctioned limit. Avoid heavy appliances."
                else:
                    reason = f"Postpone this heavy appliance during high peak tariff slots."
                    
            results.append({
                "id": app.get("id"),
                "name": app_name,
                "action": prediction,
                "reason": reason
            })
            
        print(json.dumps({"status": "success", "recommendations": results}))
        
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))

if __name__ == "__main__":
    main()
