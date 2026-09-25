import pandas as pd

def build_features(temperature_c, humidity_pct, simultaneous_load_kw,
                   sanctioned_load_watts, usage_hours, appliance_name,
                   priority, time_slot, season, feature_columns):
    load_ratio = (simultaneous_load_kw * 1000) / sanctioned_load_watts
    row = {
        "temperature_c":        temperature_c,
        "humidity_pct":         humidity_pct,
        "simultaneous_load_kw": simultaneous_load_kw,
        "sanctioned_load_watts":sanctioned_load_watts,
        "load_ratio":           load_ratio,
        "usage_hours":          usage_hours,
    }
    for col in feature_columns:
        if col not in row:
            row[col] = 0
    for col, val in [
        (f"appliance_name_{appliance_name}", 1),
        (f"priority_{priority}", 1),
        (f"time_slot_{time_slot}", 1),
        (f"season_{season}", 1),
    ]:
        if col in row:
            row[col] = val
    return pd.DataFrame([row])[feature_columns]
