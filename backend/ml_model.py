"""
ml_model.py - Pure-Python linear regression predictor for grid load.

No numpy required — uses simple least-squares via Python math only.
Predicts the next load value based on a rolling window of recent readings.
"""

import math


def predict_load(readings: list) -> float:
    """
    Given a list of recent load readings, predict the next load value.
    Uses ordinary least-squares linear regression over the time indices.
    Falls back to the last reading (or 0) if the window is too small.

    Args:
        readings: List of numeric load values (most recent last).

    Returns:
        Predicted next load as a float, rounded to 2 decimal places.
    """
    if not readings:
        return 0.0

    # Use up to the last 20 readings
    window = readings[-20:]
    n = len(window)

    if n < 2:
        return round(float(window[-1]), 2)

    # Ordinary least-squares: y = slope * x + intercept
    # x values: 0, 1, 2, …, n-1
    sum_x  = n * (n - 1) / 2          # sum of 0..n-1
    sum_x2 = n * (n - 1) * (2*n - 1) / 6
    sum_y  = sum(window)
    sum_xy = sum(i * y for i, y in enumerate(window))

    denom = n * sum_x2 - sum_x ** 2
    if denom == 0:
        return round(float(window[-1]), 2)

    slope     = (n * sum_xy - sum_x * sum_y) / denom
    intercept = (sum_y - slope * sum_x) / n

    # Predict the next time step (index = n)
    predicted = slope * n + intercept

    # Clamp to a sensible range [0, 300]
    predicted = max(0.0, min(300.0, predicted))
    return round(predicted, 2)
