const express = require('express');
const cors = require('cors');
const path = require('path');

let sqlite3;
try {
  sqlite3 = require('sqlite3').verbose();
} catch (e) {
  console.warn("sqlite3 module not available, using in-memory database fallback:", e.message);
}

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewareter
app.use(cors());
app.use(express.json());

// Simple in-memory fallback database
const memoryDb = {
  records: [],
  nextId: 1,
  run(query, params, callback) {
    setTimeout(() => {
      try {
        if (query.includes('INSERT INTO')) {
          const [location, resolved_location, latitude, longitude, start_date, end_date, weather_data, notes] = params;
          const newRecord = {
            id: this.nextId++,
            location,
            resolved_location,
            latitude,
            longitude,
            start_date,
            end_date,
            weather_data,
            notes,
            created_at: new Date().toISOString()
          };
          this.records.push(newRecord);
          if (callback) callback.call({ lastID: newRecord.id, changes: 1 }, null);
        } else if (query.includes('UPDATE')) {
          const [location, resolved_location, latitude, longitude, start_date, end_date, weather_data, notes, id] = params;
          const idx = this.records.findIndex(r => r.id === parseInt(id));
          if (idx !== -1) {
            this.records[idx] = {
              ...this.records[idx],
              location,
              resolved_location,
              latitude,
              longitude,
              start_date,
              end_date,
              weather_data,
              notes
            };
            if (callback) callback.call({ changes: 1 }, null);
          } else {
            if (callback) callback.call({ changes: 0 }, null);
          }
        } else if (query.includes('DELETE FROM')) {
          const [id] = params;
          const lenBefore = this.records.length;
          this.records = this.records.filter(r => r.id !== parseInt(id));
          const changes = lenBefore - this.records.length;
          if (callback) callback.call({ changes }, null);
        } else {
          if (callback) callback(null);
        }
      } catch (err) {
        if (callback) callback(err);
      }
    }, 0);
  },
  get(query, params, callback) {
    setTimeout(() => {
      try {
        const [resolved_location, start_date, end_date] = params;
        const found = this.records.find(r => 
          r.resolved_location === resolved_location && 
          r.start_date === start_date && 
          r.end_date === end_date
        );
        callback(null, found ? found : null);
      } catch (err) {
        callback(err, null);
      }
    }, 0);
  },
  all(query, params, callback) {
    setTimeout(() => {
      // Sort by created_at DESC
      const sorted = [...this.records].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      callback(null, sorted);
    }, 0);
  }
};

let db;
if (sqlite3) {
  // Use /tmp in production (writable), otherwise local path
  const dbPath = process.env.NODE_ENV === 'production' 
    ? '/tmp/weather_history.db'
    : path.join(__dirname, 'weather_history.db');

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database, falling back to in-memory:', err.message);
      db = memoryDb;
    } else {
      console.log('Connected to SQLite database at:', dbPath);
      createTable();
    }
  });
} else {
  db = memoryDb;
}

function createTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS weather_queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location TEXT NOT NULL,
      resolved_location TEXT,
      latitude REAL,
      longitude REAL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      weather_data TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  db.run(query, (err) => {
    if (err) {
      console.error('Error creating weather_queries table:', err.message);
    } else {
      console.log('weather_queries table ready.');
    }
  });
}

// -------------------------------------------------------------
// YouTube Video Recommendations Scraper
// -------------------------------------------------------------
async function getYouTubeVideos(query) {
  try {
    const searchQuery = encodeURIComponent(query + " travel guide");
    const url = `https://www.youtube.com/results?search_query=${searchQuery}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      }
    });
    const html = await response.text();

    const videos = [];
    const jsonStart = html.indexOf('var ytInitialData = {');
    if (jsonStart !== -1) {
      const start = jsonStart + 'var ytInitialData = '.length - 1;
      const end = html.indexOf('};', start) + 1;
      const jsonStr = html.substring(start, end);
      try {
        const data = JSON.parse(jsonStr);

        const findVideos = (obj) => {
          let results = [];
          const traverse = (o) => {
            if (!o || typeof o !== 'object') return;
            if (o.videoRenderer) {
              const vr = o.videoRenderer;
              const videoId = vr.videoId;
              const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || 'Travel Video';
              const thumbnail = vr.thumbnail?.thumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
              const duration = vr.lengthText?.simpleText || '';
              if (videoId) {
                results.push({ videoId, title, thumbnail, duration });
              }
            } else {
              for (const key in o) {
                traverse(o[key]);
              }
            }
          };
          traverse(obj);
          return results;
        };

        const list = findVideos(data);
        if (list.length > 0) {
          return list.slice(0, 4);
        }
      } catch (e) {
        console.error('JSON parsing of ytInitialData failed, using regex fallback.');
      }
    }

    // Regex Fallback
    const videoIdRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
    const matches = [...html.matchAll(videoIdRegex)];
    const uniqueIds = Array.from(new Set(matches.map(m => m[1]))).slice(0, 4);
    return uniqueIds.map(id => ({
      videoId: id,
      title: `${query} Travel Video`,
      thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      duration: ""
    }));
  } catch (err) {
    console.error("YouTube search error:", err);
    return [];
  }
}

// -------------------------------------------------------------
// Helper: Resolve Geolocation from Input (Fuzzy / Coordinates / Zip)
// -------------------------------------------------------------
async function resolveLocation(locationInput) {
  if (!locationInput || typeof locationInput !== 'string') {
    throw new Error('Location input must be a valid string');
  }

  const query = locationInput.trim();

  // 1. Check if input matches GPS Coordinates: e.g. "40.7128, -74.0060" or "40.7128 -74.0060"
  const coordsRegex = /^([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)$/;
  const match = query.match(coordsRegex);
  if (match) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return {
        name: `GPS Coordinates (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
        latitude: lat,
        longitude: lon,
        country: 'Coordinates'
      };
    } else {
      throw new Error('Invalid GPS coordinates range. Latitude: [-90, 90], Longitude: [-180, 180]');
    }
  }

  // 2. Query Open-Meteo Geocoding API
  const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
  const response = await fetch(geocodeUrl);
  if (!response.ok) {
    throw new Error('Geocoding service unavailable');
  }

  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`Location "${query}" could not be resolved.`);
  }

  // Return the best match
  const bestMatch = data.results[0];
  const displayName = [
    bestMatch.name,
    bestMatch.admin1,
    bestMatch.country
  ].filter(Boolean).join(', ');

  return {
    name: displayName,
    latitude: bestMatch.latitude,
    longitude: bestMatch.longitude,
    country: bestMatch.country || ''
  };
}

// -------------------------------------------------------------
// Helper: Fetch weather data for a location and date range
// -------------------------------------------------------------
async function fetchHistoricalWeatherData(lat, lon, startDateStr, endDateStr) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const reqStart = new Date(startDateStr);
  const reqEnd = new Date(endDateStr);

  let weatherUrl = '';

  // Determine if historical archive is needed (pre-yesterday) or if forecast can cover it
  if (startDateStr <= yesterdayStr) {
    // If range spills into future, cap the archive at yesterday, and fetch the rest from forecast (or just query archive for the historical chunk)
    // For simplicity, if the start date is in the past, use the archive API. If end date is in the future, we cap it at yesterday.
    const finalEndStr = endDateStr > yesterdayStr ? yesterdayStr : endDateStr;
    weatherUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDateStr}&end_date=${finalEndStr}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
  } else {
    // Dates are entirely in the future/present, use forecast API (max 16 days)
    // Let's check if the end date is within 16 days
    const maxForecastDate = new Date();
    maxForecastDate.setDate(today.getDate() + 15);
    const maxForecastStr = maxForecastDate.toISOString().split('T')[0];

    if (endDateStr > maxForecastStr) {
      throw new Error(`Future forecast dates are limited to 15 days ahead (until ${maxForecastStr}).`);
    }

    weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${startDateStr}&end_date=${endDateStr}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
  }

  const response = await fetch(weatherUrl);
  if (!response.ok) {
    throw new Error('Weather API request failed');
  }

  const data = await response.json();
  if (!data.daily || !data.daily.time || data.daily.time.length === 0) {
    throw new Error('No weather records found for this date range');
  }

  // Structure output
  const records = [];
  for (let i = 0; i < data.daily.time.length; i++) {
    records.push({
      date: data.daily.time[i],
      temp_max: data.daily.temperature_2m_max[i],
      temp_min: data.daily.temperature_2m_min[i],
      precipitation: data.daily.precipitation_sum[i] || 0
    });
  }

  return records;
}

// -------------------------------------------------------------
// REST API Endpoints
// -------------------------------------------------------------

// 1. Search coordinates and current weather
app.get('/api/weather/search', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Search query parameter "q" is required' });
  }

  try {
    const resolved = await resolveLocation(q);
    res.json(resolved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. Fetch full dashboard data (Current + Forecast + Map + YouTube)
app.get('/api/weather/forecast', async (req, res) => {
  const { lat, lon, name } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude and longitude parameters are required' });
  }

  try {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const searchName = name || `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;

    // Fetch Weather Forecast
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,pressure_msl,visibility,uv_index,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max&timezone=auto`;
    const weatherResponse = await fetch(forecastUrl);
    if (!weatherResponse.ok) {
      throw new Error('Failed to retrieve forecast data');
    }
    const weatherData = await weatherResponse.json();

    // Get YouTube Videos
    const youtubeVideos = await getYouTubeVideos(searchName);

    // Get Google Map Embed URL
    const mapEmbedUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&t=&z=12&ie=UTF8&iwloc=&output=embed`;

    res.json({
      weather: weatherData,
      youtube: youtubeVideos,
      mapUrl: mapEmbedUrl
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. CREATE - Log a weather search with date range
app.post('/api/history', async (req, res) => {
  const { location, start_date, end_date, notes } = req.body;

  if (!location || !start_date || !end_date) {
    return res.status(400).json({ error: 'location, start_date, and end_date are required fields' });
  }

  // Validations
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
    return res.status(400).json({ error: 'Dates must be in YYYY-MM-DD format' });
  }

  if (start_date > end_date) {
    return res.status(400).json({ error: 'start_date cannot be after end_date' });
  }

  try {
    // 1. Resolve Location Coordinates
    const resolved = await resolveLocation(location);

    // Check if we have cached weather data for the resolved location and date range
    const cacheQuery = `
      SELECT weather_data FROM weather_queries 
      WHERE resolved_location = ? AND start_date = ? AND end_date = ? 
      LIMIT 1
    `;

    db.get(cacheQuery, [resolved.name, start_date, end_date], async (err, cachedRow) => {
      if (err) {
        return res.status(500).json({ error: 'Database query failed' });
      }
      try {
        let weatherData;
        if (cachedRow && cachedRow.weather_data) {
          console.log(`Serving cached weather data for: ${resolved.name} (${start_date} to ${end_date})`);
          try {
            weatherData = JSON.parse(cachedRow.weather_data);
          } catch (parseErr) {
            weatherData = await fetchHistoricalWeatherData(
              resolved.latitude,
              resolved.longitude,
              start_date,
              end_date
            );
          }
        } else {
          weatherData = await fetchHistoricalWeatherData(
            resolved.latitude,
            resolved.longitude,
            start_date,
            end_date
          );
        }

        // 3. Save into SQLite
        const insertQuery = `
          INSERT INTO weather_queries (location, resolved_location, latitude, longitude, start_date, end_date, weather_data, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(
          insertQuery,
          [
            location,
            resolved.name,
            resolved.latitude,
            resolved.longitude,
            start_date,
            end_date,
            JSON.stringify(weatherData),
            notes || ''
          ],
          function (err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to write record to database' });
            }
            res.status(201).json({
              message: 'Weather query logged successfully',
              recordId: this.lastID,
              resolved_location: resolved.name,
              latitude: resolved.latitude,
              longitude: resolved.longitude,
              weather_data: weatherData
            });
          }
        );
      } catch (innerErr) {
        console.error('Error in post history database callback:', innerErr);
        res.status(400).json({ error: innerErr.message });
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. READ - List history of weather queries
app.get('/api/history', (req, res) => {
  const query = `SELECT * FROM weather_queries ORDER BY created_at DESC`;
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database read failed' });
    }

    // Parse weather_data JSON strings safely
    try {
      const formatted = rows.map(row => {
        let parsedData = [];
        try {
          parsedData = JSON.parse(row.weather_data || '[]');
        } catch (e) {
          console.error('Failed to parse weather_data inside history get:', e);
        }
        return {
          ...row,
          weather_data: parsedData
        };
      });
      res.json(formatted);
    } catch (parseErr) {
      res.status(500).json({ error: 'Failed to format history records' });
    }
  });
});

// 5. UPDATE - Update weather history item (Validates new fields & re-fetches API)
app.put('/api/history/:id', async (req, res) => {
  const { id } = req.params;
  const { location, start_date, end_date, notes } = req.body;

  if (!location || !start_date || !end_date) {
    return res.status(400).json({ error: 'location, start_date, and end_date are required' });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
    return res.status(400).json({ error: 'Dates must be in YYYY-MM-DD format' });
  }

  if (start_date > end_date) {
    return res.status(400).json({ error: 'start_date cannot be after end_date' });
  }

  try {
    // 1. Re-validate and geocode the updated location
    const resolved = await resolveLocation(location);

    // Check if we have cached weather data for the resolved location and date range
    const cacheQuery = `
      SELECT weather_data FROM weather_queries 
      WHERE resolved_location = ? AND start_date = ? AND end_date = ? 
      LIMIT 1
    `;

    db.get(cacheQuery, [resolved.name, start_date, end_date], async (err, cachedRow) => {
      if (err) {
        return res.status(500).json({ error: 'Database query failed' });
      }
      try {
        let weatherData;
        if (cachedRow && cachedRow.weather_data) {
          console.log(`Serving cached weather data (update) for: ${resolved.name} (${start_date} to ${end_date})`);
          try {
            weatherData = JSON.parse(cachedRow.weather_data);
          } catch (parseErr) {
            weatherData = await fetchHistoricalWeatherData(
              resolved.latitude,
              resolved.longitude,
              start_date,
              end_date
            );
          }
        } else {
          weatherData = await fetchHistoricalWeatherData(
            resolved.latitude,
            resolved.longitude,
            start_date,
            end_date
          );
        }

        // 3. Update in Database
        const updateQuery = `
          UPDATE weather_queries
          SET location = ?, resolved_location = ?, latitude = ?, longitude = ?, start_date = ?, end_date = ?, weather_data = ?, notes = ?
          WHERE id = ?
        `;

        db.run(
          updateQuery,
          [
            location,
            resolved.name,
            resolved.latitude,
            resolved.longitude,
            start_date,
            end_date,
            JSON.stringify(weatherData),
            notes || '',
            id
          ],
          function (err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to update record in database' });
            }
            if (this.changes === 0) {
              return res.status(404).json({ error: 'Record not found' });
            }
            res.json({
              message: 'Record updated successfully',
              resolved_location: resolved.name,
              latitude: resolved.latitude,
              longitude: resolved.longitude,
              weather_data: weatherData
            });
          }
        );
      } catch (innerErr) {
        console.error('Error in put history database callback:', innerErr);
        res.status(400).json({ error: innerErr.message });
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 6. DELETE - Remove historical log record
app.delete('/api/history/:id', (req, res) => {
  const { id } = req.params;
  const deleteQuery = `DELETE FROM weather_queries WHERE id = ?`;

  db.run(deleteQuery, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete record' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json({ message: 'Record deleted successfully' });
  });
});

// 7. EXPORT - Download data in selected formats
app.get('/api/history/export', (req, res) => {
  const { format } = req.query;
  if (!format || !['json', 'csv', 'xml', 'markdown'].includes(format.toLowerCase())) {
    return res.status(400).json({ error: 'Invalid or missing format. Supported formats: json, csv, xml, markdown' });
  }

  const query = `SELECT * FROM weather_queries ORDER BY created_at DESC`;
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database read failed' });
    }

    let cleanedRows = [];
    try {
      cleanedRows = rows.map(row => {
        let parsedData = [];
        try {
          parsedData = JSON.parse(row.weather_data || '[]');
        } catch (e) {
          console.error('Failed to parse weather_data in export:', e);
        }
        return {
          ...row,
          weather_data: parsedData
        };
      });
    } catch (parseErr) {
      return res.status(500).json({ error: 'Error formatting database rows for export' });
    }

    const fileFormat = format.toLowerCase();

    if (fileFormat === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.attachment('weather_history.json');
      return res.send(JSON.stringify(cleanedRows, null, 2));
    }

    if (fileFormat === 'csv') {
      const csvLines = ['id,location,resolved_location,latitude,longitude,start_date,end_date,notes,created_at'];
      for (const row of cleanedRows) {
        csvLines.push([
          row.id,
          `"${row.location.replace(/"/g, '""')}"`,
          `"${row.resolved_location.replace(/"/g, '""')}"`,
          row.latitude,
          row.longitude,
          row.start_date,
          row.end_date,
          `"${(row.notes || '').replace(/"/g, '""')}"`,
          row.created_at
        ].join(','));
      }
      res.setHeader('Content-Type', 'text/csv');
      res.attachment('weather_history.csv');
      return res.send(csvLines.join('\n'));
    }

    if (fileFormat === 'xml') {
      const escapeXml = (unsafe) => {
        if (!unsafe) return '';
        return unsafe.toString().replace(/[<>&'"]/g, (c) => {
          switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
          }
        });
      };

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<weather_history>\n';
      for (const row of cleanedRows) {
        xml += `  <record>\n`;
        xml += `    <id>${row.id}</id>\n`;
        xml += `    <location>${escapeXml(row.location)}</location>\n`;
        xml += `    <resolved_location>${escapeXml(row.resolved_location)}</resolved_location>\n`;
        xml += `    <latitude>${row.latitude}</latitude>\n`;
        xml += `    <longitude>${row.longitude}</longitude>\n`;
        xml += `    <start_date>${row.start_date}</start_date>\n`;
        xml += `    <end_date>${row.end_date}</end_date>\n`;
        xml += `    <notes>${escapeXml(row.notes)}</notes>\n`;
        xml += `    <created_at>${row.created_at}</created_at>\n`;
        xml += `  </record>\n`;
      }
      xml += '</weather_history>';

      res.setHeader('Content-Type', 'application/xml');
      res.attachment('weather_history.xml');
      return res.send(xml);
    }

    if (fileFormat === 'markdown') {
      let md = '# Weather Query Search History\n\n';
      md += '| ID | Search Query | Resolved Location | Coordinates | Date Range | Notes | Date Logged |\n';
      md += '|---|---|---|---|---|---|---|\n';
      for (const row of cleanedRows) {
        md += `| ${row.id} | ${row.location} | ${row.resolved_location} | ${row.latitude.toFixed(4)}, ${row.longitude.toFixed(4)} | ${row.start_date} to ${row.end_date} | ${row.notes || '_None_'} | ${row.created_at} |\n`;
      }
      res.setHeader('Content-Type', 'text/markdown');
      res.attachment('weather_history.md');
      return res.send(md);
    }
  });
});

// Start server only when running directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Weather app backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;
