import React, { useState, useEffect, useRef } from 'react';
import { 
  IoSearchOutline, 
  IoLocationOutline, 
  IoCalendarOutline, 
  IoTrashOutline, 
  IoCreateOutline, 
  IoDownloadOutline, 
  IoLogoYoutube, 
  IoInformationCircleOutline,
  IoPlayOutline,
  IoCloseOutline,
  IoEyeOutline
} from 'react-icons/io5';
import { 
  WiHumidity, 
  WiStrongWind, 
  WiBarometer, 
  WiCloudy, 
  WiDaySunny, 
  WiRain, 
  WiSnow, 
  WiThunderstorm,
  WiHorizon,
  WiDust
} from 'react-icons/wi';
import './App.css';

// Base API URL pointing to Node.js backend
const BACKEND_URL = 'http://localhost:5001/api';

// Map WMO Weather Codes to human readable descriptions, themes, and icons
const getWeatherDetails = (code) => {
  if (code === 0) {
    return { label: 'Clear Sky', theme: 'clear', icon: <WiDaySunny className="weather-icon-large" /> };
  }
  if ([1, 2, 3].includes(code)) {
    return { label: 'Partly Cloudy', theme: 'cloudy', icon: <WiCloudy className="weather-icon-large" /> };
  }
  if ([45, 48].includes(code)) {
    return { label: 'Foggy', theme: 'cloudy', icon: <WiDust className="weather-icon-large" /> };
  }
  if ([51, 53, 55, 56, 57].includes(code)) {
    return { label: 'Drizzle', theme: 'rain', icon: <WiRain className="weather-icon-large" /> };
  }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { label: 'Rainy', theme: 'rain', icon: <WiRain className="weather-icon-large" /> };
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { label: 'Snowy', theme: 'snow', icon: <WiSnow className="weather-icon-large" /> };
  }
  if ([95, 96, 99].includes(code)) {
    return { label: 'Thunderstorm', theme: 'storm', icon: <WiThunderstorm className="weather-icon-large" /> };
  }
  return { label: 'Cloudy', theme: 'cloudy', icon: <WiCloudy className="weather-icon-large" /> };
};

const getForecastIcon = (code) => {
  if (code === 0) return <WiDaySunny className="forecast-icon" />;
  if ([1, 2, 3].includes(code)) return <WiCloudy className="forecast-icon" />;
  if ([45, 48].includes(code)) return <WiDust className="forecast-icon" />;
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return <WiRain className="forecast-icon" />;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return <WiSnow className="forecast-icon" />;
  if ([95, 96, 99].includes(code)) return <WiThunderstorm className="forecast-icon" />;
  return <WiCloudy className="forecast-icon" />;
};

function App() {
  // Weather states
  const [searchQuery, setSearchQuery] = useState('New York');
  const [resolvedLocation, setResolvedLocation] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  // Video state
  const [activeVideoId, setActiveVideoId] = useState(null);

  // CRUD History states
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // Log Form states
  const [logLocation, setLogLocation] = useState('');
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [logLoading, setLogLoading] = useState(false);
  const [logSuccessMessage, setLogSuccessMessage] = useState('');

  // Update Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editLocation, setEditLocation] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);

  // Current Date/Time
  const [currentDateTime, setCurrentDateTime] = useState('');

  // Map refs
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!window.L || !resolvedLocation || loadingWeather) return;

    const lat = resolvedLocation.latitude;
    const lon = resolvedLocation.longitude;

    const mapElement = document.getElementById('leaflet-map');
    if (!mapElement) return;

    try {
      if (!mapRef.current) {
        mapRef.current = window.L.map('leaflet-map').setView([lat, lon], 10);

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapRef.current);

        // Add public radar tile overlay
        window.L.tileLayer('https://tilecache.rainviewer.com/v2/radar/1691234567/256/{z}/{x}/{y}/2/1_1.png', {
          opacity: 0.5,
          attribution: 'Radar by RainViewer'
        }).addTo(mapRef.current);

        markerRef.current = window.L.marker([lat, lon]).addTo(mapRef.current)
          .bindPopup(`<b>${resolvedLocation.name}</b>`)
          .openPopup();

        // Invalidate size to ensure it renders correctly
        setTimeout(() => {
          if (mapRef.current) mapRef.current.invalidateSize();
        }, 100);
      } else {
        mapRef.current.setView([lat, lon], 10);
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lon]);
          markerRef.current.setPopupContent(`<b>${resolvedLocation.name}</b>`).openPopup();
        }
        // Invalidate size to ensure it renders correctly after view update
        setTimeout(() => {
          if (mapRef.current) mapRef.current.invalidateSize();
        }, 100);
      }
    } catch (e) {
      console.error('Error rendering Leaflet Map:', e);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [resolvedLocation, loadingWeather]);

  // Initial load
  useEffect(() => {
    // Set current date string
    const now = new Date();
    setCurrentDateTime(now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }));

    // Fetch initial weather for New York
    handleWeatherSearch('New York');
    // Fetch History list
    fetchHistory();
  }, []);

  // Fetch full dashboard data
  const handleWeatherSearch = async (queryStr) => {
    if (!queryStr.trim()) return;
    setLoadingWeather(true);
    setWeatherError(null);
    setActiveVideoId(null);

    try {
      // Step 1: Geocode
      const searchRes = await fetch(`${BACKEND_URL}/weather/search?q=${encodeURIComponent(queryStr)}`);
      if (!searchRes.ok) {
        const errData = await searchRes.json();
        throw new Error(errData.error || 'Failed to resolve location');
      }
      const resolved = await searchRes.json();
      setResolvedLocation(resolved);

      // Step 2: Forecast, YouTube, Maps
      const forecastRes = await fetch(
        `${BACKEND_URL}/weather/forecast?lat=${resolved.latitude}&lon=${resolved.longitude}&name=${encodeURIComponent(resolved.name)}`
      );
      if (!forecastRes.ok) {
        throw new Error('Failed to retrieve weather details');
      }
      const details = await forecastRes.json();
      setWeatherData(details);
    } catch (err) {
      console.error(err);
      setWeatherError(err.message);
    } finally {
      setLoadingWeather(false);
    }
  };

  // Browser Geolocation
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setWeatherError('Geolocation is not supported by your browser');
      return;
    }

    setLoadingWeather(true);
    setWeatherError(null);
    setActiveVideoId(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const locName = `GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
          setResolvedLocation({
            name: locName,
            latitude,
            longitude,
            country: 'Your Location'
          });

          const res = await fetch(
            `${BACKEND_URL}/weather/forecast?lat=${latitude}&lon=${longitude}&name=${encodeURIComponent(locName)}`
          );
          if (!res.ok) {
            throw new Error('Failed to retrieve weather forecast for your coordinates');
          }
          const details = await res.json();
          setWeatherData(details);
        } catch (err) {
          setWeatherError(err.message);
        } finally {
          setLoadingWeather(false);
        }
      },
      (err) => {
        console.error(err);
        setWeatherError('Failed to access location: ' + err.message);
        setLoadingWeather(false);
      }
    );
  };

  // CREATE - Log a historical weather search
  const handleLogSubmit = async (e) => {
    e.preventDefault();
    if (!logLocation || !logStartDate || !logEndDate) {
      setHistoryError('Please fill in all required fields');
      return;
    }

    setLogLoading(true);
    setHistoryError(null);
    setLogSuccessMessage('');

    try {
      const res = await fetch(`${BACKEND_URL}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: logLocation,
          start_date: logStartDate,
          end_date: logEndDate,
          notes: logNotes
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to log search');
      }

      setLogSuccessMessage('Weather query logged to SQLite database!');
      setLogLocation('');
      setLogStartDate('');
      setLogEndDate('');
      setLogNotes('');
      fetchHistory(); // Refresh history log table
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setLogLoading(false);
    }
  };

  // READ - Fetch SQLite history records
  const fetchHistory = async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/history`);
      if (!res.ok) throw new Error('Failed to retrieve history');
      const data = await res.json();
      setHistoryList(data);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  // DELETE - Delete a record
  const handleDeleteHistory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this weather record?')) return;
    try {
      const res = await fetch(`${BACKEND_URL}/history/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete history record');
      fetchHistory();
    } catch (err) {
      setHistoryError(err.message);
    }
  };

  // Open Edit Dialog
  const openEditDialog = (record) => {
    setEditId(record.id);
    setEditLocation(record.location);
    setEditStartDate(record.start_date);
    setEditEndDate(record.end_date);
    setEditNotes(record.notes || '');
    setEditError(null);
    setIsEditModalOpen(true);
  };

  // UPDATE - Update a database record
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);

    try {
      const res = await fetch(`${BACKEND_URL}/history/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: editLocation,
          start_date: editStartDate,
          end_date: editEndDate,
          notes: editNotes
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update record');
      }

      setIsEditModalOpen(false);
      fetchHistory();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // EXPORT - Fetch format trigger download
  const handleExport = (format) => {
    const downloadUrl = `${BACKEND_URL}/history/export?format=${format}`;
    window.open(downloadUrl, '_blank');
  };

  // Determine weather theme class for dynamic background
  const weatherCode = weatherData?.weather?.current?.weather_code ?? 0;
  const { label: conditionLabel, theme: weatherTheme, icon: weatherIcon } = getWeatherDetails(weatherCode);

  // Format forecast days
  const formatForecastDays = (forecast) => {
    if (!forecast || !forecast.time) return [];
    return forecast.time.map((timeStr, idx) => {
      const d = new Date(timeStr);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        day: dayName,
        date: dateFormatted,
        code: forecast.weather_code[idx],
        max: forecast.temperature_2m_max[idx],
        min: forecast.temperature_2m_min[idx]
      };
    }).slice(0, 5); // 5-Day Forecast
  };

  const forecastDays = formatForecastDays(weatherData?.weather?.daily);

  return (
    <div 
      className="app-container"
      style={{ backgroundImage: `var(--bg-gradient-${weatherTheme})` }}
    >
      <div className="app-wrap">
        
        {/* ================= HEADER ================= */}
        <header className="app-header glass-panel">
          <div className="logo-section">
            <h1>AeroWeather</h1>
            <p>Modern Full-Stack Weather & Travel Planning Hub</p>
          </div>
          <div className="header-meta">
            <div>{currentDateTime}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '0.2rem' }}>
              Candidate: <strong>Teeyansh Shukla</strong> (AI Engineer Intern Assessment)
            </div>
          </div>
        </header>

        {/* ================= SEARCH ROW ================= */}
        <div className="glass-panel search-bar-row">
          <div className="search-input-wrap">
            <IoSearchOutline className="search-icon" />
            <input 
              type="text" 
              className="search-input"
              placeholder="Search by city name, postal code, GPS coordinates (e.g. 40.71,-74.00), landmark..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleWeatherSearch(searchQuery)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => handleWeatherSearch(searchQuery)}
              disabled={loadingWeather}
            >
              Search
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={handleUseMyLocation}
              title="Detect current GPS location"
              disabled={loadingWeather}
            >
              <IoLocationOutline style={{ fontSize: '1.2rem' }} /> My Location
            </button>
          </div>
        </div>

        {/* ================= ERROR HANDLING ================= */}
        {weatherError && (
          <div className="alert alert-error">
            <IoInformationCircleOutline style={{ fontSize: '1.4rem' }} />
            <span><strong>Search Error:</strong> {weatherError}</span>
          </div>
        )}

        {/* ================= DASHBOARD MAIN ================= */}
        {loadingWeather ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ fontSize: '1.2rem', color: 'var(--accent-cyan)' }}>
              Fetching real-time weather analytics, maps, and media recommendations...
            </div>
          </div>
        ) : (
          weatherData && resolvedLocation && (
            <div className="dashboard-grid">
              
              {/* LEFT COLUMN: Current Conditions & Forecast */}
              <div className="left-panel">
                
                {/* Current Conditions Card */}
                <div className="glass-panel weather-hero">
                  <div className="weather-hero-main">
                    <span className="weather-location">{resolvedLocation.name}</span>
                    <span className="weather-country">{resolvedLocation.country}</span>
                    
                    <div className="weather-temp-wrap">
                      <span className="weather-temp">
                        {Math.round(weatherData.weather.current.temperature_2m)}
                      </span>
                      <span className="weather-unit">°C</span>
                    </div>
                    
                    <span className="weather-condition-desc">{conditionLabel}</span>
                  </div>

                  <div>
                    {weatherIcon}
                  </div>
                </div>

                {/* Weather Metrics Grid */}
                <div className="weather-stats-grid">
                  <div className="stat-card glass-panel">
                    <WiHumidity className="stat-icon" />
                    <span className="stat-value">{weatherData.weather.current.relative_humidity_2m}%</span>
                    <span className="stat-label">Humidity</span>
                  </div>
                  <div className="stat-card glass-panel">
                    <WiStrongWind className="stat-icon" />
                    <span className="stat-value">{weatherData.weather.current.wind_speed_10m} km/h</span>
                    <span className="stat-label">Wind</span>
                  </div>
                  <div className="stat-card glass-panel">
                    <WiBarometer className="stat-icon" />
                    <span className="stat-value">{weatherData.weather.current.pressure_msl} hPa</span>
                    <span className="stat-label">Pressure</span>
                  </div>
                  <div className="stat-card glass-panel">
                    <IoEyeOutline className="stat-icon" />
                    <span className="stat-value">{(weatherData.weather.current.visibility / 1000).toFixed(1)} km</span>
                    <span className="stat-label">Visibility</span>
                  </div>
                  <div className="stat-card glass-panel">
                    <WiCloudy className="stat-icon" />
                    <span className="stat-value">{weatherData.weather.current.cloud_cover}%</span>
                    <span className="stat-label">Cloud Cover</span>
                  </div>
                  <div className="stat-card glass-panel">
                    <WiDaySunny className="stat-icon" style={{ color: 'var(--accent-orange)' }} />
                    <span className="stat-value">{weatherData.weather.current.uv_index.toFixed(1)}</span>
                    <span className="stat-label">UV Index</span>
                  </div>
                </div>

                {/* 5-Day Forecast Grid */}
                <div className="glass-panel forecast-section">
                  <h2>5-Day Forecast</h2>
                  <div className="forecast-grid">
                    {forecastDays.map((f, i) => (
                      <div key={i} className="forecast-card">
                        <span className="forecast-day">{f.day}</span>
                        <span className="forecast-date">{f.date}</span>
                        {getForecastIcon(f.code)}
                        <div className="forecast-temp">
                          <span className="forecast-temp-max">{Math.round(f.max)}°</span>
                          <span className="forecast-temp-min">{Math.round(f.min)}°</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: Map & YouTube Media */}
              <div className="right-panel">
                
                {/* Geographic Map Card */}
                <div className="glass-panel integration-section">
                  <h2>Interactive GIS Map</h2>
                  <div className="map-container">
                    <div 
                      id="leaflet-map" 
                      style={{ width: '100%', height: '100%', border: 'none' }}
                    ></div>
                  </div>
                  <div style={{ marginTop: '0.8rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Lat: {resolvedLocation.latitude.toFixed(4)}</span>
                    <span>Lon: {resolvedLocation.longitude.toFixed(4)}</span>
                  </div>
                </div>

                {/* Destination Media Recommendations */}
                <div className="glass-panel youtube-section">
                  <h2>Destination Visual Guides</h2>
                  
                  {activeVideoId ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      <div className="video-player-wrap">
                        <iframe
                          className="video-player-iframe"
                          title="YouTube player"
                          src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setActiveVideoId(null)}>
                        <IoCloseOutline /> Close Video Player
                      </button>
                    </div>
                  ) : (
                    <div>
                      {weatherData.youtube && weatherData.youtube.length > 0 ? (
                        <div className="video-grid">
                          {weatherData.youtube.map((vid, i) => (
                            <div key={i} className="video-card" onClick={() => setActiveVideoId(vid.videoId)}>
                              <div className="video-thumbnail-wrap">
                                <img src={vid.thumbnail} alt={vid.title} className="video-thumbnail" />
                                <IoPlayOutline className="video-play-btn" />
                              </div>
                              <div className="video-title" title={vid.title}>
                                {vid.title}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          No relevant video guides found for this location.
                        </p>
                      )}
                    </div>
                  )}
                </div>

              </div>

            </div>
          )
        )}

        {/* ================= PERSISTENCE (CRUD) DATABASE SECTION ================= */}
        <div className="glass-panel history-section">
          
          <div className="history-section-header">
            <div>
              <h2>Weather Logger Registry (SQLite CRUD)</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Store location ranges, query historical temperatures, update logs, or export databases.
              </p>
            </div>
            
            <div className="history-tools">
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                <IoDownloadOutline style={{ marginRight: '0.2rem' }} /> Export database:
              </span>
              <button className="btn btn-secondary export-btn" onClick={() => handleExport('json')}>JSON</button>
              <button className="btn btn-secondary export-btn" onClick={() => handleExport('csv')}>CSV</button>
              <button className="btn btn-secondary export-btn" onClick={() => handleExport('xml')}>XML</button>
              <button className="btn btn-secondary export-btn" onClick={() => handleExport('markdown')}>Markdown (MD)</button>
            </div>
          </div>

          {historyError && (
            <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
              <IoInformationCircleOutline style={{ fontSize: '1.4rem' }} />
              <span>{historyError}</span>
            </div>
          )}

          {logSuccessMessage && (
            <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
              <IoInformationCircleOutline style={{ fontSize: '1.4rem' }} />
              <span>{logSuccessMessage}</span>
            </div>
          )}

          <div className="history-layout">
            
            {/* CREATE: Log Form */}
            <div className="glass-panel" style={{ background: 'rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                Log New Record
              </h3>
              <form onSubmit={handleLogSubmit} className="log-form">
                
                <div className="form-group">
                  <label>Location Target</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="e.g. London, 90210, Paris"
                    value={logLocation}
                    onChange={(e) => setLogLocation(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input 
                      type="date" 
                      className="form-control"
                      value={logStartDate}
                      onChange={(e) => setLogStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input 
                      type="date" 
                      className="form-control"
                      value={logEndDate}
                      onChange={(e) => setLogEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Journal Notes</label>
                  <textarea 
                    className="form-control"
                    rows="3"
                    placeholder="e.g., Vacation planning, tracking storms..."
                    value={logNotes}
                    onChange={(e) => setLogNotes(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '0.5rem' }}
                  disabled={logLoading}
                >
                  {logLoading ? 'Processing...' : 'Log Weather Search'}
                </button>
              </form>
            </div>

            {/* READ, UPDATE, DELETE: List */}
            <div className="glass-panel" style={{ background: 'rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                Database Records ({historyList.length})
              </h3>
              
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading database log entries...</div>
              ) : historyList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  No logged queries found. Use the form to submit weather logs to the SQLite registry.
                </div>
              ) : (
                <div className="history-table-container">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Location</th>
                        <th>Date Range</th>
                        <th>Weather Records</th>
                        <th>Notes</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyList.map((row) => {
                        const tempRecords = row.weather_data || [];
                        const avgMax = tempRecords.length > 0 
                          ? (tempRecords.reduce((sum, r) => sum + r.temp_max, 0) / tempRecords.length).toFixed(1)
                          : 'N/A';
                        const avgMin = tempRecords.length > 0 
                          ? (tempRecords.reduce((sum, r) => sum + r.temp_min, 0) / tempRecords.length).toFixed(1)
                          : 'N/A';

                        return (
                          <tr key={row.id}>
                            <td>
                              <div className="history-item-location">{row.location}</div>
                              <div className="history-item-resolved">{row.resolved_location}</div>
                            </td>
                            <td>
                              <div className="history-item-dates">
                                <strong>Start:</strong> {row.start_date}<br/>
                                <strong>End:</strong> {row.end_date}
                              </div>
                            </td>
                            <td>
                              <div className="history-item-stats">
                                <span>Days: {tempRecords.length}</span><br/>
                                <span>Max Avg: {avgMax}°C</span><br/>
                                <span>Min Avg: {avgMin}°C</span>
                              </div>
                            </td>
                            <td>
                              <div className="history-item-notes">{row.notes || '_No notes_'}</div>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button 
                                  className="btn-action btn-action-edit"
                                  onClick={() => openEditDialog(row)}
                                  title="Edit entry (triggers validation & API fetch)"
                                >
                                  <IoCreateOutline />
                                </button>
                                <button 
                                  className="btn-action btn-action-delete"
                                  onClick={() => handleDeleteHistory(row.id)}
                                  title="Delete record from SQLite"
                                >
                                  <IoTrashOutline />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* ================= INFO & SPONSOR PANEL ================= */}
        <div className="glass-panel info-section">
          
          <div className="info-card">
            <h3>Product Manager Accelerator (PMA)</h3>
            <p>
              The <strong>Product Manager Accelerator</strong> program is designed to support Product Manager and Product Engineering job seekers in transitioning into PM or technical leadership roles and landing their dream jobs. The program provides training, structured interview frameworks, mentorship, and hands-on, real-world portfolio-building experience.
            </p>
            <p style={{ fontStyle: 'italic', borderLeft: '2px solid var(--accent-orange)', paddingLeft: '0.5rem' }}>
              "Break down financial barriers, achieve educational fairness, launch 1,000+ AI products, and empower professionals to become the next generation of AI product leaders."
            </p>
          </div>

          <div className="info-card">
            <h3>Technical Assessment Overview</h3>
            <p>
              This full-stack application integrates weather geocoding, real-time forecast data, historical data retrieval, contextual media recommendations, Google Maps location tracking, and SQLite persistent CRUD logging. It solves the requirements of both Frontend Engineers (Assessment 1) and Backend Engineers (Assessment 2).
            </p>
            
            <div className="candidate-grid">
              <div className="candidate-detail">
                <div className="candidate-label">Applicant Name</div>
                <div className="candidate-val" style={{ color: 'var(--accent-cyan)' }}>Teeyansh Shukla</div>
              </div>
              <div className="candidate-detail">
                <div className="candidate-label">Target Role</div>
                <div className="candidate-val">AI Engineer Intern</div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ================= UPDATE MODAL DIALOG ================= */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            
            <div className="modal-header">
              <h3>Edit SQLite Log Entry (ID: {editId})</h3>
              <button className="modal-close" onClick={() => setIsEditModalOpen(false)}>
                <IoCloseOutline />
              </button>
            </div>

            {editError && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                <IoInformationCircleOutline />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateSubmit} className="log-form">
              
              <div className="form-group">
                <label>Location Target</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input 
                    type="date" 
                    className="form-control"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input 
                    type="date" 
                    className="form-control"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Journal Notes</label>
                <textarea 
                  className="form-control"
                  rows="3"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  disabled={editLoading}
                >
                  {editLoading ? 'Saving...' : 'Update Record'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default App;
