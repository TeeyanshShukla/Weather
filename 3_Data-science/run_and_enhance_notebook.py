import json
import os
import sys

# Change directory to script folder to maintain path consistency
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Create directories for saving visualizations
os.makedirs('visualizations', exist_ok=True)
os.makedirs('../4_Report/visualizations', exist_ok=True)

notebook_path = 'weather_analysis.ipynb'
print(f"Loading notebook {notebook_path}...")

with open(notebook_path, 'r', encoding='utf-8') as f:
    nb = json.load(f)

cells = nb.get('cells', [])
print(f"Original cell count: {len(cells)}")

# 1. Correct Cell 18 (NameError bug) by initializing rf_model
# Original cell 18 code:
# # Train Random Forest
# rf_model.fit(X, y)
# ...
cell_18_source = [
    "# Train Random Forest\n",
    "from sklearn.ensemble import RandomForestRegressor\n",
    "rf_model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=1)\n",
    "rf_model.fit(X, y)\n",
    "\n",
    "# Get feature importance\n",
    "importance = rf_model.feature_importances_\n",
    "feature_importance_df = pd.DataFrame({\n",
    "    'Feature': features,\n",
    "    'Importance': importance\n",
    "})\n",
    "feature_importance_df = feature_importance_df.sort_values(\n",
    "    by='Importance',\n",
    "    ascending=False\n",
    ")\n",
    "print(feature_importance_df)\n"
]

cells[18]['source'] = cell_18_source
print("Modified Cell 18 to fix NameError (defined and trained rf_model).")

# 2. Append Advanced Assessment cells
# Cell 19: Markdown Header for Advanced Section
cell_19 = {
    "cell_type": "markdown",
    "metadata": {},
    "source": [
        "# Advanced Assessment: Anomaly Detection, Spatial Analysis, and Model Ensembling\n",
        "\n",
        "Below we implement the requested advanced sections: outlier analysis, global geographical trends, and a weighted ensemble model."
    ]
}

# Cell 20: Anomaly Detection
cell_20 = {
    "cell_type": "code",
    "execution_count": None,
    "metadata": {},
    "outputs": [],
    "source": [
        "# -----------------------------\n",
        "# Anomaly Detection (Outliers)\n",
        "# -----------------------------\n",
        "# Identify extreme temperature anomalies using Z-score (> 3 standard deviations)\n",
        "import numpy as np\n",
        "import matplotlib.pyplot as plt\n",
        "\n",
        "temp_mean = df['temperature_celsius'].mean()\n",
        "temp_std = df['temperature_celsius'].std()\n",
        "\n",
        "df['temp_z'] = (df['temperature_celsius'] - temp_mean) / temp_std\n",
        "temp_anomalies = df[np.abs(df['temp_z']) > 3]\n",
        "\n",
        "print(f\"Total temperature records: {len(df)}\")\n",
        "print(f\"Average Global Temp: {temp_mean:.2f}°C, Std Dev: {temp_std:.2f}\")\n",
        "print(f\"Total temperature anomalies detected (Z-score > 3): {len(temp_anomalies)}\")\n",
        "print(\"Sample Anomalies (Extremes):\")\n",
        "print(temp_anomalies[['location_name', 'country', 'temperature_celsius', 'last_updated']].head(10))\n",
        "\n",
        "plt.figure(figsize=(12, 6))\n",
        "plt.scatter(df['last_updated'], df['temperature_celsius'], alpha=0.2, label='Normal Conditions', color='#3498db')\n",
        "plt.scatter(temp_anomalies['last_updated'], temp_anomalies['temperature_celsius'], color='#e74c3c', label='Extreme Anomalies', alpha=0.8, s=25)\n",
        "plt.xlabel('Date')\n",
        "plt.ylabel('Temperature (°C)')\n",
        "plt.title('Global Temperature Profile and Anomalies (Z-Score > 3)')\n",
        "plt.legend()\n",
        "plt.xticks(rotation=45)\n",
        "plt.grid(True, linestyle='--', alpha=0.3)\n",
        "plt.tight_layout()\n",
        "plt.savefig('visualizations/anomaly_detection_temp.png')\n",
        "plt.savefig('../4_Report/visualizations/anomaly_detection_temp.png')\n",
        "plt.show()\n"
    ]
}

# Cell 21: Spatial Analysis
cell_21 = {
    "cell_type": "code",
    "execution_count": None,
    "metadata": {},
    "outputs": [],
    "source": [
        "# -----------------------------\n",
        "# Spatial Analysis (Geographical Patterns)\n",
        "# -----------------------------\n",
        "# Visualizing global average temperature distributions across latitudes and longitudes\n",
        "plt.figure(figsize=(14, 7))\n",
        "sc = plt.scatter(df['longitude'], df['latitude'], c=df['temperature_celsius'], cmap='coolwarm', alpha=0.5, s=10)\n",
        "plt.colorbar(sc, label='Temperature (°C)')\n",
        "plt.xlabel('Longitude')\n",
        "plt.ylabel('Latitude')\n",
        "plt.title('Global Spatial Temperature Distribution Map')\n",
        "plt.grid(True, linestyle='--', alpha=0.3)\n",
        "plt.tight_layout()\n",
        "plt.savefig('visualizations/spatial_temperature_map.png')\n",
        "plt.savefig('../4_Report/visualizations/spatial_temperature_map.png')\n",
        "plt.show()\n"
    ]
}

# Cell 22: Model Ensembling
cell_22 = {
    "cell_type": "code",
    "execution_count": None,
    "metadata": {},
    "outputs": [],
    "source": [
        "# -----------------------------\n",
        "# Model Ensembling (Weighted Average)\n",
        "# -----------------------------\n",
        "from sklearn.ensemble import RandomForestRegressor\n",
        "from xgboost import XGBRegressor\n",
        "from sklearn.linear_model import LinearRegression\n",
        "from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score\n",
        "\n",
        "# Train individual estimators on train partition\n",
        "lr = LinearRegression()\n",
        "rf = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=1)\n",
        "xgb = XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=42, n_jobs=1)\n",
        "\n",
        "print(\"Training base estimators...\")\n",
        "lr.fit(X_train, y_train)\n",
        "rf.fit(X_train, y_train)\n",
        "xgb.fit(X_train, y_train)\n",
        "\n",
        "lr_test_preds = lr.predict(X_test)\n",
        "rf_test_preds = rf.predict(X_test)\n",
        "xgb_test_preds = xgb.predict(X_test)\n",
        "\n",
        "# Create weighted average ensemble prediction\n",
        "# (40% RF, 40% XGBoost, 20% Linear Regression)\n",
        "ensemble_preds = 0.4 * rf_test_preds + 0.4 * xgb_test_preds + 0.2 * lr_test_preds\n",
        "\n",
        "# Collect metrics\n",
        "models_comp = {\n",
        "    \"Linear Regression\": lr_test_preds,\n",
        "    \"Random Forest\": rf_test_preds,\n",
        "    \"XGBoost\": xgb_test_preds,\n",
        "    \"Weighted Ensemble\": ensemble_preds\n",
        "}\n",
        "\n",
        "comp_data = []\n",
        "for name, preds in models_comp.items():\n",
        "    comp_data.append({\n",
        "        \"Model\": name,\n",
        "        \"MAE\": mean_absolute_error(y_test, preds),\n",
        "        \"RMSE\": np.sqrt(mean_squared_error(y_test, preds)),\n",
        "        \"R2 Score\": r2_score(y_test, preds)\n",
        "    })\n",
        "\n",
        "comp_df = pd.DataFrame(comp_data)\n",
        "print(\"\\nFinal Model Comparison Table (Test Partition):\")\n",
        "print(comp_df.to_string(index=False))\n",
        "\n",
        "# Plot comparison bar chart\n",
        "plt.figure(figsize=(10, 5))\n",
        "x = np.arange(len(comp_df))\n",
        "plt.bar(x - 0.2, comp_df['MAE'], width=0.4, label='MAE', color='#34495e')\n",
        "plt.bar(x + 0.2, comp_df['RMSE'], width=0.4, label='RMSE', color='#e67e22')\n",
        "plt.xticks(x, comp_df['Model'])\n",
        "plt.ylabel('Error Value (Lower is Better)')\n",
        "plt.title('Regression Models Error Metrics Comparison')\n",
        "plt.legend()\n",
        "plt.grid(True, linestyle='--', alpha=0.3)\n",
        "plt.tight_layout()\n",
        "plt.savefig('visualizations/model_comparison.png')\n",
        "plt.savefig('../4_Report/visualizations/model_comparison.png')\n",
        "plt.show()\n"
    ]
}

# Cell 23: Company Info Branding
cell_23 = {
    "cell_type": "code",
    "execution_count": None,
    "metadata": {},
    "outputs": [],
    "source": [
        "print(\"====================================================\")\n",
        "print(\"Product Manager Accelerator (PMA) AI Research Hub\")\n",
        "print(\"Mission: break down financial barriers and achieve educational fairness,\")\n",
        "print(\"empowering professionals to become AI product leaders.\")\n",
        "print(\"Data Science Weather Forecasting Report successfully compiled.\")\n",
        "print(\"====================================================\")\n"
    ]
}

# Cell 22_lstm: LSTM Deep Learning Time Series Forecasting model
cell_22_lstm = {
    "cell_type": "code",
    "execution_count": None,
    "metadata": {},
    "outputs": [],
    "source": [
        "# -----------------------------\n",
        "# Deep Time-Series Forecasting (PyTorch LSTM)\n",
        "# -----------------------------\n",
        "import torch\n",
        "import torch.nn as nn\n",
        "import torch.optim as optim\n",
        "from sklearn.preprocessing import StandardScaler\n",
        "import numpy as np\n",
        "import matplotlib.pyplot as plt\n",
        "\n",
        "# Aggregate daily global average temperature\n",
        "daily_temp = df.groupby('last_updated')['temperature_celsius'].mean().reset_index()\n",
        "daily_temp = daily_temp.sort_values(by='last_updated').reset_index(drop=True)\n",
        "temps = daily_temp['temperature_celsius'].values.reshape(-1, 1)\n",
        "\n",
        "# Scale the features\n",
        "scaler = StandardScaler()\n",
        "scaled_temps = scaler.fit_transform(temps)\n",
        "\n",
        "# Create sliding sequence windows of past 7 days to predict next day\n",
        "def create_windows(input_data, tw):\n",
        "    inout_seq = []\n",
        "    L = len(input_data)\n",
        "    for i in range(L-tw):\n",
        "        train_seq = input_data[i:i+tw]\n",
        "        train_label = input_data[i+tw:i+tw+1]\n",
        "        inout_seq.append((train_seq, train_label))\n",
        "    return inout_seq\n",
        "\n",
        "window_size = 7\n",
        "sequences = create_windows(scaled_temps, window_size)\n",
        "\n",
        "# Train/Test Split (80% train, 20% test)\n",
        "train_size = int(len(sequences) * 0.8)\n",
        "train_seqs = sequences[:train_size]\n",
        "test_seqs = sequences[train_size:]\n",
        "\n",
        "def to_tensors(seqs):\n",
        "    x = torch.stack([torch.FloatTensor(item[0]) for item in seqs])\n",
        "    y = torch.stack([torch.FloatTensor(item[1]) for item in seqs]).view(-1, 1)\n",
        "    return x, y\n",
        "\n",
        "x_train, y_train = to_tensors(train_seqs)\n",
        "x_test, y_test = to_tensors(test_seqs)\n",
        "\n",
        "# LSTM Network Architecture\n",
        "class TemperatureLSTM(nn.Module):\n",
        "    def __init__(self, input_size=1, hidden_size=64, num_layers=1, output_size=1):\n",
        "        super().__init__()\n",
        "        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)\n",
        "        self.linear = nn.Linear(hidden_size, output_size)\n",
        "\n",
        "    def forward(self, x):\n",
        "        out, _ = self.lstm(x)\n",
        "        out = self.linear(out[:, -1, :])\n",
        "        return out\n",
        "\n",
        "lstm_model = TemperatureLSTM()\n",
        "loss_fn = nn.MSELoss()\n",
        "opt = optim.Adam(lstm_model.parameters(), lr=0.01)\n",
        "\n",
        "# Training Loop\n",
        "epochs = 30\n",
        "print(\"Training Deep Learning LSTM model for Time-Series forecasting...\")\n",
        "lstm_model.train()\n",
        "for epoch in range(epochs):\n",
        "    opt.zero_grad()\n",
        "    preds = lstm_model(x_train)\n",
        "    loss = loss_fn(preds, y_train)\n",
        "    loss.backward()\n",
        "    opt.step()\n",
        "\n",
        "# Evaluation\n",
        "lstm_model.eval()\n",
        "with torch.no_grad():\n",
        "    test_preds_scaled = lstm_model(x_test).numpy()\n",
        "\n",
        "# Inverse scale back to actual temperature values\n",
        "y_test_actual = scaler.inverse_transform(y_test.numpy())\n",
        "y_test_pred = scaler.inverse_transform(test_preds_scaled)\n",
        "\n",
        "# Calculate regression performance metrics\n",
        "lstm_mae = np.mean(np.abs(y_test_actual - y_test_pred))\n",
        "lstm_rmse = np.sqrt(np.mean((y_test_actual - y_test_pred)**2))\n",
        "print(f\"LSTM Test MAE: {lstm_mae:.2f}°C, RMSE: {lstm_rmse:.2f}°C\")\n",
        "\n",
        "# Plot Forecast vs Actual\n",
        "plt.figure(figsize=(12, 6))\n",
        "dates_test = daily_temp['last_updated'][train_size+window_size:]\n",
        "plt.plot(dates_test, y_test_actual, label='Actual Temperatures', color='#2ecc71', linewidth=2)\n",
        "plt.plot(dates_test, y_test_pred, label='LSTM 7-Day Window Forecast', color='#e74c3c', linestyle='--', linewidth=2)\n",
        "plt.xlabel('Date')\n",
        "plt.ylabel('Temperature (°C)')\n",
        "plt.title('Global Temperature Time-Series Forecast (PyTorch LSTM Network)')\n",
        "plt.legend()\n",
        "plt.grid(True, linestyle='--', alpha=0.3)\n",
        "plt.xticks(rotation=45)\n",
        "plt.tight_layout()\n",
        "plt.savefig('visualizations/lstm_timeseries_forecast.png')\n",
        "plt.savefig('../4_Report/visualizations/lstm_timeseries_forecast.png')\n",
        "plt.show()\n"
    ]
}

# Always reset to the original 19 cells and append/overwrite with the updated advanced cells
cells = cells[:19]
cells.extend([cell_19, cell_20, cell_21, cell_22, cell_22_lstm, cell_23])
print("Reset and updated advanced cells in notebook layout.")

nb['cells'] = cells

# Save intermediate notebook with structure changes
with open(notebook_path, 'w', encoding='utf-8') as f:
    json.dump(nb, f, indent=2)

print("Saved updated notebook layout. Now executing all cells programmatically...")

# 3. Headless programmatic execution of code cells
import matplotlib
matplotlib.use('Agg')  # Disable GUI display rendering to prevent freezing

exec_globals = {}
exec_globals['__name__'] = '__main__'

cell_idx = 0
for cell in cells:
    if cell['cell_type'] == 'code':
        source_code = "".join(cell['source'])
        print(f"\n--- Running Code Cell {cell_idx} ---")
        try:
            # We execute the cell's code within a shared global dictionary
            # so variable definitions persist between cells
            exec(source_code, exec_globals)
        except Exception as e:
            print(f"CRITICAL ERROR running Cell {cell_idx}: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)
    cell_idx += 1

print("\nAll notebook code cells executed successfully!")
print("Visualizations generated and saved to '3_Data-science/visualizations/' and '4_Report/visualizations/'.")
