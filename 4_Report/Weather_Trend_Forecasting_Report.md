# Technical Assessment: Weather Trend Forecasting Analysis & Modeling
**Product Manager Accelerator (PMA) AI Research Hub**

---

## Executive Summary & Mission
> **PM Accelerator Mission:**  
> *"To break down financial barriers and achieve educational fairness, empowering professionals to become the next generation of AI product leaders through hands-on, real-world product and technical innovations."*

This data science report presents an in-depth analysis of the **Global Weather Repository** dataset. By utilizing advanced analytics, anomaly detection, spatial visualization, and a machine learning model ensemble, we seek to forecast weather trends and identify patterns across countries and continents.

---

## 1. Data Cleaning & Preprocessing

The raw dataset contains **145,017 rows** and **41 columns**, reflecting daily weather measurements globally. To prepare this data for modeling:

1. **Handling Missing Values:**
   - Missing fields were identified across variables such as `pressure_mb`, `air_quality_PM10`, `wind_kph`, and carbon monoxide levels.
   - All missing numeric features were imputed using column-wise **medians** to ensure outliers do not skew the baseline.
2. **Outlier Filtering & Sanity Audits:**
   - Placeholder values (e.g., `-9999`) were replaced with `NaN` and imputed.
   - Impossible wind speeds (e.g., `wind_kph > 300` and `wind_mph > 200`) were filtered.
   - Barometric pressure readouts outside the physically realistic range of `850 mb` to `1100 mb` were removed.
3. **Temporal Processing:**
   - The `last_updated` attribute was converted to a datetime datatype to enable time-series plotting and sorting.

---

## 2. Exploratory Data Analysis (EDA)

Key trends and correlations identified during EDA include:

* **Temperature Distribution:** The global temperature is centered around **21.26°C** with a standard deviation of **9.60°C**, showing a slight negative skew (longer tail towards colder temperatures).
* **Feature Correlations:** 
  - Humidity shares a strong negative correlation with daily temperature.
  - Air Quality indicators (like `PM2.5` and `PM10`) show notable local correlations with temperature profiles, suggesting that warmer, stagnant atmospheric conditions correlate with higher particulate matter concentrations.
* **Hottest Regions:** Analysis of country-level averages highlights regions in Africa and the Middle East (e.g., Mali, Niger, Sudan) as having the highest average temperatures during the observation periods.

---

## 3. Advanced Analyses

### 3.1 Anomaly Detection (Outliers)
We implemented a Z-score thresholding approach to flag extreme temperature anomalies. An anomaly is defined as any daily reading that deviates from the global mean by more than **3 standard deviations**:
$$\text{Z-score} = \frac{T - \mu}{\sigma} > 3$$

* **Total Anomalies Detected:** **976 records** out of 145,017.
* **Findings:** These represent extreme heatwaves or intense localized cold snaps. Plotting these records highlights seasonal extremes and spikes.
* **Visualization:** Saved to `4_Report/visualizations/anomaly_detection_temp.png`.

### 3.2 Spatial Analysis (Geographical Patterns)
By mapping average temperature readouts directly onto their physical `latitude` and `longitude` coordinates:
* We observe clear horizontal banding matching the Earth's climate zones.
* The Equatorial band displays consistent high temperatures (red/orange spectrum), transitioning smoothly into cooler temperate zones in the Northern and Southern hemispheres.
* **Visualization:** Saved to `4_Report/visualizations/spatial_temperature_map.png`.

---

## 4. Predictive Modeling & Evaluation

We split the preprocessed dataset into an **80% training set** and a **20% test set** to evaluate three regression models and a custom ensemble.

### 4.1 Model Metrics (5-Fold Cross Validation)

The models were evaluated using 5-Fold Cross Validation. Average scores across folds:

| Model | Avg R² (Variance Explained) | Avg RMSE (Error °C) | Avg MAE (Absolute Error °C) |
| :--- | :---: | :---: | :---: |
| **Linear Regression** | 0.401 | 7.425 | 5.721 |
| **XGBoost Regressor** | 0.722 | 5.060 | 3.581 |
| **Random Forest Regressor** | **0.765** | **4.650** | **3.085** |

### 4.2 Weighted Ensemble Model
To evaluate ensembling benefits, we constructed a **Weighted Average Ensemble** combining predictions from the three base estimators:
$$\hat{y}_{\text{ensemble}} = 0.40 \cdot \hat{y}_{\text{RF}} + 0.40 \cdot \hat{y}_{\text{XGB}} + 0.20 \cdot \hat{y}_{\text{LR}}$$

This ensembling strategy combines predictions from the base models to assess if variance could be reduced.

#### Test Set Performance:
* **Weighted Ensemble R² Score:** **0.733**
* **Weighted Ensemble RMSE:** **4.97°C**
* **Weighted Ensemble MAE:** **3.56°C**

#### Model Performance Analysis:
The Random Forest model achieved the strongest predictive performance across evaluation metrics, outperforming both Linear Regression and XGBoost. Although the weighted ensemble demonstrated stable predictive behavior and competitive generalization, it did not surpass the standalone Random Forest model on this dataset. This suggests that tree-based bagging methods captured the nonlinear weather relationships more effectively for global temperature forecasting.

* **Comparison Plot:** Saved to `4_Report/visualizations/model_comparison.png`.

### 4.3 Deep Time-Series Forecasting (LSTM)
To capture sequential temporal dependencies in weather variations, we developed a deep learning **Long Short-Term Memory (LSTM)** network in PyTorch:
* **Preprocessing:** Aggregated dataset into chronological daily global average temperatures. We used a sliding window sequence generator with a 7-day lookback window to predict the next day's temperature.
* **Architecture:** Formulated with a single LSTM layer (64 hidden units) followed by a fully connected linear layer. Optimization was performed via the Adam optimizer under a Mean Squared Error (MSE) loss function.
* **Results:** The model shows stable sequential forecasting on the test partition:
  * **LSTM Test MAE:** ~1.20°C (evaluating next-day temperature forecast from past 7 days)
  * **LSTM Test RMSE:** ~1.55°C
  * **Generalization:** Captures global weather seasonality shifts effectively without overfitting.

---

## 5. Feature Importance Analysis
Using the trained Random Forest model, we extracted Gini feature importance:

1. **UV Index (32.9%):** Strongest predictor of temperature, acting as a proxy for direct solar radiation.
2. **Atmospheric Pressure (25.1%):** High and low-pressure systems heavily govern localized thermal drafts.
3. **Humidity (13.5%):** Moisture content directly controls heat retention and feels-like indexes.
4. **Air Quality - PM2.5 (5.6%) / PM10 (5.4%):** Particulate suspensions correspond to specific boundary layer heights and thermal conditions.
5. **Cloud Cover (5.5%) & Wind Speed (3.7%):** Governs convective cooling and surface shading.

---

## 6. Project Artifacts & Visualizations
All charts are programmatically generated and exported to the project folders:
* Anomaly Chart: [anomaly_detection_temp.png](visualizations/anomaly_detection_temp.png)
* Spatial Heatmap: [spatial_temperature_map.png](visualizations/spatial_temperature_map.png)
* Model Comparison: [model_comparison.png](visualizations/model_comparison.png)
* LSTM Time-Series Forecast: [lstm_timeseries_forecast.png](visualizations/lstm_timeseries_forecast.png)

The fully executed code can be reviewed in the Jupyter Notebook:
* [weather_analysis.ipynb](file:///Users/teeyanshshukla/Documents/Code/Weather/3_Data-science/weather_analysis.ipynb)
