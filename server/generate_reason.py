"""
generate_reason.py
------------------
Generates a clear, human-readable explanation for each model prediction.
Explains WHY the AI made its decision based on the live context values.
"""


def generate_reason(
    prediction,
    appliance_name,
    temperature_c,
    simultaneous_load_kw,
    sanctioned_load_watts,
    priority,
):
    """
    Returns a human-readable string explaining the model's recommendation.

    Parameters
    ----------
    prediction              : str   — "No_Action" | "Suggest_OFF" | "Delay_Load"
    appliance_name          : str   — e.g. "AC", "Fridge"
    temperature_c           : float — live ambient temperature (°C)
    simultaneous_load_kw    : float — total active house load (kW)
    sanctioned_load_watts   : float — max safe load for this connection (W)
    priority                : str   — "Essential" | "Medium" | "Non-essential"

    Returns
    -------
    str — plain-English explanation
    """

    load_ratio_pct = round((simultaneous_load_kw * 1000 / sanctioned_load_watts) * 100, 1)

    if prediction == "No_Action":
        if priority == "Essential":
            return (
                f"{appliance_name} is an essential appliance and is running efficiently. "
                f"Current load is {load_ratio_pct}% of your sanctioned limit — no action needed."
            )
        return (
            f"{appliance_name} is running within safe limits. "
            f"Live temperature is {temperature_c}°C and system load is at {load_ratio_pct}% — "
            f"no action needed."
        )

    if prediction == "Suggest_OFF":
        if appliance_name.lower() == "ac" and temperature_c < 24:
            return (
                f"Live temperature is {temperature_c}°C which is already cool. "
                f"Running the AC is not necessary — consider turning it off to save energy."
            )
        if priority == "Non-essential":
            return (
                f"{appliance_name} is a non-essential appliance. "
                f"With the current system load at {load_ratio_pct}%, "
                f"turning it off is recommended to reduce your electricity bill."
            )
        return (
            f"Turning off {appliance_name} is suggested to reduce the current load "
            f"({load_ratio_pct}% of your {sanctioned_load_watts}W limit) "
            f"and avoid excess billing."
        )

    if prediction == "Delay_Load":
        if load_ratio_pct >= 80:
            return (
                f"Your system is currently at {load_ratio_pct}% of its sanctioned load "
                f"({sanctioned_load_watts}W). Running {appliance_name} now could overload "
                f"your connection — delay its use until other appliances are turned off."
            )
        return (
            f"It is better to delay {appliance_name} during this time slot to reduce peak-hour "
            f"load. Current load is {load_ratio_pct}% of your {sanctioned_load_watts}W limit."
        )

    # Fallback for unknown predictions
    return f"Recommendation: {prediction}."
