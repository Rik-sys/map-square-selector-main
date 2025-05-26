
import { useEffect, useState, useCallback, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Rectangle, useMap, Marker, Popup, Circle } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Square, Move, Send, Loader2, Shield, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import 'leaflet/dist/leaflet.css';

// תיקון אייקונים בליףלט
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// יצירת אייקון מותאם לשוטרים (בצבע כחול)
const policeIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'police-marker' // ניתן להוסיף סגנון CSS מותאם
});

const DrawRectangle = ({ isDrawing, onRectangleComplete }) => {
  const map = useMap();
  const [startPoint, setStartPoint] = useState(null);
  const [currentRect, setCurrentRect] = useState(null);

  const handleMapClick = useCallback((e) => {
    if (!isDrawing) return;
    if (!startPoint) {
      setStartPoint(e.latlng);
      const initialBounds = L.latLngBounds(e.latlng, e.latlng);
      setCurrentRect(initialBounds);
    } else {
      const finalBounds = L.latLngBounds(startPoint, e.latlng);
      setCurrentRect(null);
      setStartPoint(null);
      onRectangleComplete(finalBounds);
    }
  }, [isDrawing, startPoint, onRectangleComplete]);

  const handleMouseMove = useCallback((e) => {
    if (!isDrawing || !startPoint) return;
    const bounds = L.latLngBounds(startPoint, e.latlng);
    setCurrentRect(bounds);
  }, [isDrawing, startPoint]);

  useEffect(() => {
    if (isDrawing) {
      map.on('click', handleMapClick);
      map.on('mousemove', handleMouseMove);
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.off('click', handleMapClick);
      map.off('mousemove', handleMouseMove);
      map.getContainer().style.cursor = '';
      setCurrentRect(null);
      setStartPoint(null);
    }
    return () => {
      map.off('click', handleMapClick);
      map.off('mousemove', handleMouseMove);
    };
  }, [map, isDrawing, handleMapClick, handleMouseMove]);

  return currentRect ? (
    <Rectangle bounds={currentRect} pathOptions={{ color: '#3388ff', weight: 3, fillOpacity: 0.2, dashArray: '5, 5' }} />
  ) : null;
};

// רכיב חדש להצגת מיקומי השוטרים
const PoliceMarkers = ({ policeData, maxResponseTime }) => {
  const map = useMap();
  
  useEffect(() => {
    // התמקדות במרקרים של השוטרים אם יש לפחות אחד
    if (policeData && policeData.length > 0) {
      const bounds = L.latLngBounds(policeData.map(officer => [officer.lat, officer.lon]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [policeData, map]);

  if (!policeData || policeData.length === 0) return null;

  return (
    <>
      {policeData.map((officer, index) => (
        <div key={`officer-${index}`}>
          <Marker 
            position={[officer.lat, officer.lon]} 
            icon={policeIcon}
          >
            <Popup>
              <div>
                <strong>שוטר {index + 1}</strong>
                <p>מיקום: {officer.lat.toFixed(5)}, {officer.lon.toFixed(5)}</p>
                <p>מזהה צומת: {officer.nodeId}</p>
                {officer.responseTime && (
                  <p>זמן תגובה: {officer.responseTime.toFixed(2)} שניות</p>
                )}
              </div>
            </Popup>
          </Marker>
          
          {/* הוספת מעגל לייצוג טווח תגובה */}
          {maxResponseTime && (
            <Circle 
              center={[officer.lat, officer.lon]} 
              radius={maxResponseTime * 13.89} // 13.89 מטר לשנייה - מהירות ממוצעת של רכב (כ-50 קמ"ש)
              pathOptions={{
                color: '#0062ff',
                fillColor: '#0062ff',
                fillOpacity: 0.1,
                weight: 1
              }}
            />
          )}
        </div>
      ))}
    </>
  );
};

const MapComponent = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedBounds, setSelectedBounds] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFirstUploadDone, setIsFirstUploadDone] = useState(false);
  const [lastUploadWasRepair, setLastUploadWasRepair] = useState(false);
  const [officerCount, setOfficerCount] = useState(5); // מספר השוטרים לחישוב
  const [policeLocations, setPoliceLocations] = useState([]); // מיקומי השוטרים
  const [maxResponseTime, setMaxResponseTime] = useState(null); // זמן תגובה מקסימלי
  const [isLoadingOfficers, setIsLoadingOfficers] = useState(false);
  const [maxNodes, setMaxNodes] = useState(null);
  const defaultCenter: [number, number] = [31.7683, 35.2137];
  const defaultZoom = 8;

  const handleRectangleComplete = (bounds) => {
    setSelectedBounds(bounds);
    setIsDrawing(false);
  };

  const clearSelection = () => {
    setSelectedBounds(null);
    setIsFirstUploadDone(false);
    setLastUploadWasRepair(false);
    setPoliceLocations([]); // ניקוי מיקומי השוטרים
    setMaxResponseTime(null);
  };

  // פונקציה להורדת קובץ OSM מ-Overpass API
  const downloadOsmData = async (bounds) => {
    setIsDownloading(true);
    try {
      const south = bounds.getSouth();
      const north = bounds.getNorth();
      const west = bounds.getWest();
      const east = bounds.getEast();
      
      // Overpass QL query - מוגבל רק לכבישים (highway) לקבלת קובץ קטן יותר
      const query = `
        [out:xml][timeout:180];
        (
          way["highway"]
            (${south},${west},${north},${east});
          relation["highway"]
            (${south},${west},${north},${east});
        );
        (._;>;);
        out meta;
      `;

      // שימוש ב-Overpass API דרך CORS Proxy
      // לשימוש מקומי - אפשר להשתמש בכתובת המקורית אם CORS מוגדר כראוי בשרת
      const overpassUrl = 'https://overpass-api.de/api/interpreter';
      // אם יש בעיות CORS, נסי להשתמש בפרוקסי כמו:
      // const overpassUrl = 'https://corsproxy.io/?https://overpass-api.de/api/interpreter';
      
      console.log("מוריד נתוני OSM מהגבולות:", { south, west, north, east });
      
      const response = await fetch(overpassUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`
      });

      if (!response.ok) {
        console.error("שגיאה בתגובת Overpass API:", response.status, response.statusText);
        throw new Error(`Overpass API שגיאה: ${response.status}`);
      }

      // קבלת הנתונים כטקסט
      const osmData = await response.text();
      console.log("התקבלו נתוני OSM בגודל:", osmData.length, "תווים");
      return osmData;
    } catch (error) {
      console.error('שגיאה בהורדת נתוני OSM:', error);
      toast.error(`שגיאה בהורדת נתוני OSM: ${error.message}`);
      throw error;
    } finally {
      setIsDownloading(false);
    }
  };

  // פונקציה ליצירת קובץ מהנתונים והעלאתו לשרת

  const sendOsmFileToServer = async (osmData, endpoint) => {
    try {
      console.log("מכין את הקובץ לשליחה...");
      
      // יצירת קובץ מהנתונים שהתקבלו
      const blob = new Blob([osmData], { type: 'application/xml' });
      const file = new File([blob], 'map_data.osm', { type: 'application/xml' });
      
      console.log("נוצר קובץ בגודל:", file.size, "בייטים");

      // יצירת FormData ושליחה לשרת
      const formData = new FormData();
      formData.append('file', file);

      console.log("שולח בקשה לשרת בכתובת:", endpoint);
      
      // בדיקה אם הבקשה היא HTTPS לשרת HTTP
      if (window.location.protocol === 'https:' && endpoint.startsWith('http:')) {
        console.warn("זהירות: שליחת בקשה HTTPS לשרת HTTP עלולה להיחסם");
      }
      
      // נסה לשלוח את הבקשה עם חריגות מפורטות יותר
      const response = await fetch(endpoint, {
        method: 'POST',
        // אם נדרש, הוסף כותרות CORS מותאמות:
        // headers: {
        //   'Access-Control-Allow-Origin': '*',
        // },
        body: formData
      });

      console.log("התקבלה תשובה מהשרת:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("תוכן השגיאה:", errorText);
        throw new Error(`שגיאה מהשרת (${response.status}): ${errorText}`);
      }

      const resultData = await response.json();
      console.log("תשובה מעובדת מהשרת:", resultData);
      return resultData;
    } catch (error) {
      console.error("שגיאה בעת שליחת הקובץ:", error);
      
      // בדיקה אם זו שגיאת CORS
      if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
        throw new Error(`שגיאת CORS: אין גישה לשרת. ייתכן שצריך להפעיל את שרת הפיתוח עם אפשרויות CORS או לעבוד באותו דומיין`);
      }
      
      // בדיקה אם זו שגיאת חיבור לשרת
      if (error.message.includes('Failed to fetch')) {
        throw new Error(`לא ניתן להתחבר לשרת בכתובת ${endpoint}. בדוק שהשרת פועל ונגיש`);
      }
      
      throw error;
    }
  };
const exportAreaToPBF = async () => {
  if (!selectedBounds) {
    toast.error('אנא בחר אזור במפה לפני שליחה');
    return;
  }
  try {
    setIsLoading(true);
    const serverBaseUrl = 'https://localhost:7163';
    const osmData = await downloadOsmData(selectedBounds);
    
    // יצירת FormData שכולל גם את הקובץ וגם את גבולות המפה
    const formData = new FormData();
    const osmBlob = new Blob([osmData], { type: 'application/xml' });
    formData.append('file', osmBlob, 'area.osm');
    
    // הוספת גבולות המפה כשדות נפרדים
    formData.append('minLat', selectedBounds.getSouth().toString());
    formData.append('maxLat', selectedBounds.getNorth().toString());
    formData.append('minLon', selectedBounds.getWest().toString());
    formData.append('maxLon', selectedBounds.getEast().toString());
    
    const endpoint = !isFirstUploadDone 
      ? `${serverBaseUrl}/api/Graph/upload-osm` 
      : `${serverBaseUrl}/api/Graph/repair-osm`;
      
    // שליחת הקובץ והגבולות לשרת
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`שגיאה בשליחת קובץ: ${errorText}`);
    }
    
    const result = await response.json();
    const isConnected = result.IsConnected || result.isConnected || false;
    const message = result.Message || result.message || 'אין הודעה מהשרת';
    setMaxNodes(result.NodeCount || result.nodeCount || 100);
if ((result.NodeCount || result.nodeCount) && officerCount > (result.NodeCount || result.nodeCount)) {
  setOfficerCount(result.NodeCount || result.nodeCount);
  toast.warning(`המספר המקסימלי של שוטרים הוא ${result.NodeCount || result.nodeCount}, המספר תוקן בהתאם`);
}

    if (!isFirstUploadDone) {
      setIsFirstUploadDone(true);
      isConnected ? toast.success(message) : toast.warning(message);
    } else if (!lastUploadWasRepair) {
      setLastUploadWasRepair(true);
      isConnected ? toast.success(message) : toast.error(message);
    }
    
    if (isConnected) {
      setPoliceLocations([]);
      setMaxResponseTime(null);
    }
  } catch (error) {
    console.error('שגיאה:', error);
    toast.error(`שגיאה כללית: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
};

  // פונקציה לקבלת קואורדינטות צומת לפי מזהה
  const getNodeCoordinates = async (nodeId) => {
    try {
      const serverBaseUrl = 'https://localhost:7163';
      const endpoint = `${serverBaseUrl}/api/Graph/get-node-location?nodeId=${nodeId}`;
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`שגיאה בקבלת מיקום צומת (${response.status})`);
      }
      
      const locationData = await response.json();
      console.log(`מיקום צומת ${nodeId}:`, locationData);
      return locationData;
    } catch (error) {
      console.error(`שגיאה בקבלת מיקום צומת ${nodeId}:`, error);
      return null;
    }
  };

  // פונקציה חדשה לחישוב ובקשת מיקומי השוטרים מהשרת
  const calculateOfficerLocations = async () => {
  if (!isFirstUploadDone) {
    toast.warning('יש להעלות קובץ OSM ולוודא שהגרף קשיר לפני חישוב מיקומי השוטרים');
    return;
  }

  try {
    setIsLoadingOfficers(true);
    const serverBaseUrl = 'https://localhost:7163';
    const kCenterEndpoint = `${serverBaseUrl}/api/KCenter/distribute?k=${officerCount}`;
    console.log("שולח בקשה לחישוב פיזור השוטרים:", kCenterEndpoint);

    const response = await fetch(kCenterEndpoint, {
      method: 'POST'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`שגיאה בחישוב מיקומי השוטרים (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log("תוצאות מיקומי השוטרים:", result);

    const centers = result.policePositions || result.centers || result.Centers || [];

    if (centers.length > 0) {
      toast.info(`מקבל מיקומי קואורדינטות עבור ${centers.length} שוטרים...`);
      let policeData = [];

      if (typeof centers[0] === 'number') {
        const nodeLocationsPromises = centers.map(async (nodeId) => {
          try {
            const locationEndpoint = `${serverBaseUrl}/api/Graph/get-node-location?nodeId=${nodeId}`;
            const locationResponse = await fetch(locationEndpoint);

            if (!locationResponse.ok) {
              console.error(`שגיאה בקבלת מיקום צומת ${nodeId}:`, locationResponse.status);
              return null;
            }

            const locationData = await locationResponse.json();
            console.log(`מיקום צומת ${nodeId}:`, locationData);

            return {
              nodeId: nodeId,
              lat: locationData.Lat || locationData.lat,
              lon: locationData.Lon || locationData.lon
            };
          } catch (error) {
            console.error(`שגיאה בקבלת מיקום צומת ${nodeId}:`, error);
            return null;
          }
        });

        const results = await Promise.all(nodeLocationsPromises);
        policeData = results.filter(data => data !== null);
      } else if (typeof centers[0] === 'object') {
        policeData = centers.map(center => ({
          nodeId: center.nodeId || center.NodeId,
          lat: center.latitude || center.lat || center.Lat,
          lon: center.longitude || center.lon || center.Lon
        }));
      }

      if (policeData.length > 0) {
        setPoliceLocations(policeData);
        setMaxResponseTime(result.MaxResponseTimeInSeconds || result.maxResponseTimeInSeconds || null);
        toast.success(`הוצגו ${policeData.length} מיקומים אופטימליים לשוטרים`);

        if (result.MaxResponseTimeInSeconds || result.maxResponseTimeInSeconds) {
          const responseTime = result.maxResponseTimeInSeconds || result.MaxResponseTimeInSeconds;
          toast.info(`זמן תגובה מקסימלי: ${responseTime.toFixed(2)} שניות`);
        }
      } else {
        toast.error('לא התקבלו מיקומים תקינים מהשרת');
      }
    } else {
      toast.warning('לא התקבלו מיקומי שוטרים מהשרת');
    }

  } catch (error) {
    console.error("שגיאה בחישוב מיקומי השוטרים:", error);
    toast.error(`שגיאה בחישוב מיקומי השוטרים: ${error.message}`);
  } finally {
    setIsLoadingOfficers(false);
  }
};


  return (
    <div className="relative h-screen w-full">
      <MapContainer center={defaultCenter} zoom={defaultZoom} className="h-full w-full z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <DrawRectangle isDrawing={isDrawing} onRectangleComplete={handleRectangleComplete} />

        {selectedBounds && (
          <Rectangle
            bounds={selectedBounds}
            pathOptions={{ color: '#3388ff', weight: 3, fillOpacity: 0.3 }}
          />
        )}

        {/* הוספת רכיב למיקומי השוטרים */}
        <PoliceMarkers policeData={policeLocations} maxResponseTime={maxResponseTime} />
      </MapContainer>

      <Card className="absolute top-4 right-4 p-4 z-10 bg-opacity-90 bg-white shadow-lg">
        <div className="space-y-4">
          <Button 
            onClick={() => setIsDrawing(!isDrawing)}
            className={`flex items-center gap-2 ${isDrawing ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
            disabled={isDrawing || isLoading || isDownloading}
          >
            <Square className="h-5 w-5" />
            בחירת אזור
          </Button>

          {selectedBounds && (
            <div className="space-y-2">
              <div className="text-sm text-right">
                <div>צפון-מערב: {selectedBounds.getNorthWest().lat.toFixed(4)}, {selectedBounds.getNorthWest().lng.toFixed(4)}</div>
                <div>דרום-מזרח: {selectedBounds.getSouthEast().lat.toFixed(4)}, {selectedBounds.getSouthEast().lng.toFixed(4)}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={clearSelection} 
                  variant="destructive" 
                  size="sm"
                  disabled={isLoading || isDownloading || isLoadingOfficers}
                >
                  נקה בחירה
                </Button>
              </div>
              <Button 
                onClick={exportAreaToPBF}
                variant="default"
                className="w-full mt-2 flex items-center justify-center gap-2"
                disabled={isLoading || isDownloading || isLoadingOfficers}
              >
                {isLoading || isDownloading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {isDownloading ? 'מוריד נתוני מפה...' : 'שולח לשרת...'}
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    {!isFirstUploadDone 
                      ? 'סיום ושליחה לשרת' 
                      : !lastUploadWasRepair 
                        ? 'תיקון הגרף עם אזור נוסף' 
                        : 'ניסיון תיקון נוסף'}
                  </>
                )}
              </Button>
              
              {/* הוספת חלק פיזור השוטרים */}
              {isFirstUploadDone && (
                <div className="border-t pt-3 mt-3">
                  <h3 className="text-lg font-medium mb-2">פיזור שוטרים</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="officers" className="text-sm">מספר שוטרים:</Label>
                    <Input 
  id="officers" 
  type="number" 
  min="1" 
  max={maxNodes} 
  value={officerCount} 
  onChange={e => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      if (value > maxNodes) {
        setOfficerCount(maxNodes);
        toast.warning(`הוזנו יותר שוטרים ממספר הצמתים. עודכן ל-${maxNodes}`);
      } else {
        setOfficerCount(value);
      }
    } else {
      setOfficerCount(1);
    }
  }}
  className="w-20 text-left"
/>

                  </div>
                  <Button 
                    onClick={calculateOfficerLocations}
                    variant="secondary"
                    className="w-full flex items-center justify-center gap-2"
                    disabled={isLoading || isDownloading || isLoadingOfficers}
                  >
                    {isLoadingOfficers ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        מחשב מיקומים...
                      </>
                    ) : (
                      <>
                        <Shield className="h-5 w-5" />
                        פזר שוטרים על המפה
                      </>
                    )}
                  </Button>
                  
                  {maxResponseTime && (
                    <div className="mt-2 text-sm text-center p-2 bg-blue-50 rounded-md">
                      זמן תגובה מקסימלי: <span className="font-bold">{maxResponseTime.toFixed(2)}</span> שניות
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default MapComponent;