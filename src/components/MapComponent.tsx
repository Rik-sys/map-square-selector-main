
// import { useEffect, useState, useCallback, useRef } from 'react';
// import L from 'leaflet';
// import { MapContainer, TileLayer, useMap, Rectangle, Polygon } from 'react-leaflet';
// import { Button } from '@/components/ui/button';
// import { Square, Move } from 'lucide-react';
// import { Card } from '@/components/ui/card';
// import 'leaflet/dist/leaflet.css';

// // Fix the Leaflet icon issue
// delete (L.Icon.Default.prototype as any)._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
//   iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
//   shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
// });

// // Component to handle rectangle drawing
// const DrawRectangle = ({ isDrawing, onRectangleComplete }: { 
//   isDrawing: boolean; 
//   onRectangleComplete: (bounds: L.LatLngBounds) => void;
// }) => {
//   const map = useMap();
//   const [startPoint, setStartPoint] = useState<L.LatLng | null>(null);
//   const [currentRect, setCurrentRect] = useState<L.LatLngBounds | null>(null);
//   const rectRef = useRef<L.Rectangle | null>(null);
//   const isDraggingRef = useRef(false);

//   // Handle map click events for rectangle drawing
//   const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
//     if (!isDrawing) return;
    
//     if (!startPoint) {
//       setStartPoint(e.latlng);
//       const initialBounds = L.latLngBounds(e.latlng, e.latlng);
//       setCurrentRect(initialBounds);
//     } else {
//       const finalBounds = L.latLngBounds(startPoint, e.latlng);
//       setCurrentRect(null);
//       setStartPoint(null);
//       onRectangleComplete(finalBounds);
//     }
//   }, [isDrawing, map, startPoint, onRectangleComplete]);

//   const handleMouseMove = useCallback((e: L.LeafletMouseEvent) => {
//     if (!isDrawing || !startPoint) return;
    
//     // Update rectangle as mouse moves
//     const bounds = L.latLngBounds(startPoint, e.latlng);
//     setCurrentRect(bounds);
//   }, [isDrawing, startPoint]);

//   // Setup and cleanup map event listeners
//   useEffect(() => {
//     if (isDrawing) {
//       map.on('click', handleMapClick);
//       map.on('mousemove', handleMouseMove);
//       map.getContainer().style.cursor = 'crosshair';
//     } else {
//       map.off('click', handleMapClick);
//       map.off('mousemove', handleMouseMove);
//       map.getContainer().style.cursor = '';
      
//       // Clean up any incomplete rectangle
//       setCurrentRect(null);
//       setStartPoint(null);
//     }

//     return () => {
//       map.off('click', handleMapClick);
//       map.off('mousemove', handleMouseMove);
//     };
//   }, [map, isDrawing, handleMapClick, handleMouseMove]);

//   return currentRect ? (
//     <Rectangle 
//       bounds={currentRect}
//       pathOptions={{ color: '#3388ff', weight: 3, fillOpacity: 0.2, dashArray: '5, 5' }}
//     />
//   ) : null;
// };

// // Component to display and make the selected area draggable
// const DraggableRectangle = ({ bounds, onBoundsChange }: { 
//   bounds: L.LatLngBounds | null;
//   onBoundsChange: (newBounds: L.LatLngBounds) => void;
// }) => {
//   const map = useMap();
//   const [isDragging, setIsDragging] = useState(false);
//   const [dragStart, setDragStart] = useState<L.LatLng | null>(null);
//   const [currentBounds, setCurrentBounds] = useState<L.LatLngBounds | null>(bounds);
//   const cornerRefs = useRef<{[key: string]: L.Marker | null}>({
//     nw: null, ne: null, sw: null, se: null
//   });
  
//   // Update current bounds when props change
//   useEffect(() => {
//     setCurrentBounds(bounds);
//   }, [bounds]);
  
//   useEffect(() => {
//     if (!currentBounds) return;
    
//     // Clear existing markers
//     Object.values(cornerRefs.current).forEach(marker => {
//       if (marker) map.removeLayer(marker);
//     });
    
//     if (currentBounds) {
//       // Create draggable corner markers
//       const nw = currentBounds.getNorthWest();
//       const ne = currentBounds.getNorthEast();
//       const sw = currentBounds.getSouthWest();
//       const se = currentBounds.getSouthEast();
      
//       const createCornerMarker = (position: L.LatLng, corner: string) => {
//         const marker = L.marker(position, {
//           draggable: true,
//           icon: L.divIcon({
//             className: 'rectangle-corner-marker',
//             html: '<div style="width: 10px; height: 10px; background-color: #3388ff; border-radius: 50%; border: 2px solid white;"></div>',
//             iconSize: [10, 10],
//             iconAnchor: [5, 5]
//           })
//         }).addTo(map);
        
//         marker.on('drag', (e) => {
//           const newPosition = (e.target as L.Marker).getLatLng();
//           const newBounds = L.latLngBounds(currentBounds!.getSouthWest(), currentBounds!.getNorthEast());
          
//           if (corner === 'nw') {
//             newBounds.extend(L.latLng(newPosition.lat, newPosition.lng));
//             newBounds.extend(L.latLng(currentBounds!.getSouthEast().lat, currentBounds!.getSouthEast().lng));
//           } else if (corner === 'ne') {
//             newBounds.extend(L.latLng(newPosition.lat, newPosition.lng));
//             newBounds.extend(L.latLng(currentBounds!.getSouthWest().lat, currentBounds!.getSouthWest().lng));
//           } else if (corner === 'sw') {
//             newBounds.extend(L.latLng(newPosition.lat, newPosition.lng));
//             newBounds.extend(L.latLng(currentBounds!.getNorthEast().lat, currentBounds!.getNorthEast().lng));
//           } else if (corner === 'se') {
//             newBounds.extend(L.latLng(newPosition.lat, newPosition.lng));
//             newBounds.extend(L.latLng(currentBounds!.getNorthWest().lat, currentBounds!.getNorthWest().lng));
//           }
          
//           setCurrentBounds(newBounds);
//         });
        
//         marker.on('dragend', () => {
//           onBoundsChange(currentBounds!);
//         });
        
//         return marker;
//       };
      
//       cornerRefs.current.nw = createCornerMarker(nw, 'nw');
//       cornerRefs.current.ne = createCornerMarker(ne, 'ne');
//       cornerRefs.current.sw = createCornerMarker(sw, 'sw');
//       cornerRefs.current.se = createCornerMarker(se, 'se');
//     }
    
//     // Make the rectangle itself draggable
//     const handleRectClick = (e: L.LeafletMouseEvent) => {
//       if (cornerRefs.current.nw) {
//         L.DomEvent.stopPropagation(e);
//         setIsDragging(true);
//         setDragStart(e.latlng);
//         map.dragging.disable();
//       }
//     };
    
//     const handleMouseMove = (e: L.LeafletMouseEvent) => {
//       if (isDragging && dragStart && currentBounds) {
//         const dx = e.latlng.lng - dragStart.lng;
//         const dy = e.latlng.lat - dragStart.lat;
        
//         // Move the entire rectangle
//         const sw = currentBounds.getSouthWest();
//         const ne = currentBounds.getNorthEast();
        
//         const newBounds = L.latLngBounds(
//           L.latLng(sw.lat + dy, sw.lng + dx),
//           L.latLng(ne.lat + dy, ne.lng + dx)
//         );
        
//         setCurrentBounds(newBounds);
//         setDragStart(e.latlng);
        
//         // Update corner markers
//         if (cornerRefs.current.nw) cornerRefs.current.nw.setLatLng(newBounds.getNorthWest());
//         if (cornerRefs.current.ne) cornerRefs.current.ne.setLatLng(newBounds.getNorthEast());
//         if (cornerRefs.current.sw) cornerRefs.current.sw.setLatLng(newBounds.getSouthWest());
//         if (cornerRefs.current.se) cornerRefs.current.se.setLatLng(newBounds.getSouthEast());
//       }
//     };
    
//     const handleMouseUp = () => {
//       if (isDragging && currentBounds) {
//         setIsDragging(false);
//         map.dragging.enable();
//         onBoundsChange(currentBounds);
//       }
//     };
    
//     map.on('mousedown', handleRectClick);
//     map.on('mousemove', handleMouseMove);
//     map.on('mouseup', handleMouseUp);
    
//     return () => {
//       map.off('mousedown', handleRectClick);
//       map.off('mousemove', handleMouseMove);
//       map.off('mouseup', handleMouseUp);
      
//       // Remove all corner markers
//       Object.values(cornerRefs.current).forEach(marker => {
//         if (marker) map.removeLayer(marker);
//       });
//     };
//   }, [map, currentBounds, isDragging, dragStart, onBoundsChange]);
  
//   if (!currentBounds) return null;
  
//   return (
//     <Rectangle 
//       bounds={currentBounds}
//       eventHandlers={{
//         click: (e) => {
//           L.DomEvent.stopPropagation(e.originalEvent);
//         }
//       }}
//       pathOptions={{ 
//         color: '#3388ff', 
//         weight: 3, 
//         fillOpacity: 0.2,
//         className: 'draggable-rectangle'
//       }}
//     />
//   );
// };

// // Main Map Component
// const MapComponent = () => {
//   const [isDrawing, setIsDrawing] = useState(false);
//   const [selectedBounds, setSelectedBounds] = useState<L.LatLngBounds | null>(null);
  
//   // Default map center (Israel)
//   const defaultCenter: [number, number] = [31.7683, 35.2137];
//   const defaultZoom = 8;

//   // Handle completed rectangle
//   const handleRectangleComplete = (bounds: L.LatLngBounds) => {
//     setSelectedBounds(bounds);
//     setIsDrawing(false);
//   };
  
//   // Handle bounds update from dragging
//   const handleBoundsChange = (newBounds: L.LatLngBounds) => {
//     setSelectedBounds(newBounds);
//   };

//   // Clear selection
//   const clearSelection = () => {
//     setSelectedBounds(null);
//   };

//   return (
//     <div className="relative h-screen w-full">
//       <MapContainer 
//         center={defaultCenter} 
//         zoom={defaultZoom} 
//         className="h-full w-full z-0"
//       >
//         <TileLayer
//           attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//         />
        
//         <DrawRectangle 
//           isDrawing={isDrawing} 
//           onRectangleComplete={handleRectangleComplete} 
//         />
        
//         {selectedBounds && (
//           <DraggableRectangle 
//             bounds={selectedBounds} 
//             onBoundsChange={handleBoundsChange} 
//           />
//         )}
//       </MapContainer>

//       {/* Control Panel */}
//       <Card className="absolute top-4 right-4 p-4 z-10 bg-opacity-90 bg-white shadow-lg">
//         <div className="space-y-4">
//           <Button 
//             onClick={() => setIsDrawing(!isDrawing)}
//             className={`flex items-center gap-2 ${isDrawing ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
//             disabled={isDrawing}
//           >
//             <Square className="h-5 w-5" /> 
//             בחירת אזור
//           </Button>

//           {selectedBounds && (
//             <div className="space-y-2">
//               <div className="text-sm text-left">
//                 <div>צפון-מערב: {selectedBounds.getNorthWest().lat.toFixed(4)}, {selectedBounds.getNorthWest().lng.toFixed(4)}</div>
//                 <div>דרום-מזרח: {selectedBounds.getSouthEast().lat.toFixed(4)}, {selectedBounds.getSouthEast().lng.toFixed(4)}</div>
//               </div>
//               <div className="flex items-center gap-2">
//                 <Button 
//                   onClick={clearSelection}
//                   variant="destructive"
//                   size="sm"
//                 >
//                   נקה בחירה
//                 </Button>
//                 <Button 
//                   variant="outline"
//                   size="sm"
//                   className="flex items-center gap-1"
//                   title="הזז את המלבן על ידי גרירה או שנה גודל על ידי גרירת הפינות"
//                 >
//                   <Move className="h-4 w-4" />
//                   הזז/שנה
//                 </Button>
//               </div>
//             </div>
//           )}
//         </div>
//       </Card>
//     </div>
//   );
// };

// export default MapComponent;

import { useEffect, useState, useCallback, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, useMap, Rectangle, Polygon } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Square, Move, Send } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import 'leaflet/dist/leaflet.css';

// Fix the Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component to handle rectangle drawing
const DrawRectangle = ({ isDrawing, onRectangleComplete }: { 
  isDrawing: boolean; 
  onRectangleComplete: (bounds: L.LatLngBounds) => void;
}) => {
  const map = useMap();
  const [startPoint, setStartPoint] = useState<L.LatLng | null>(null);
  const [currentRect, setCurrentRect] = useState<L.LatLngBounds | null>(null);
  const rectRef = useRef<L.Rectangle | null>(null);
  const isDraggingRef = useRef(false);

  // Handle map click events for rectangle drawing
  const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
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
  }, [isDrawing, map, startPoint, onRectangleComplete]);

  const handleMouseMove = useCallback((e: L.LeafletMouseEvent) => {
    if (!isDrawing || !startPoint) return;
    
    // Update rectangle as mouse moves
    const bounds = L.latLngBounds(startPoint, e.latlng);
    setCurrentRect(bounds);
  }, [isDrawing, startPoint]);

  // Setup and cleanup map event listeners
  useEffect(() => {
    if (isDrawing) {
      map.on('click', handleMapClick);
      map.on('mousemove', handleMouseMove);
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.off('click', handleMapClick);
      map.off('mousemove', handleMouseMove);
      map.getContainer().style.cursor = '';
      
      // Clean up any incomplete rectangle
      setCurrentRect(null);
      setStartPoint(null);
    }

    return () => {
      map.off('click', handleMapClick);
      map.off('mousemove', handleMouseMove);
    };
  }, [map, isDrawing, handleMapClick, handleMouseMove]);

  return currentRect ? (
    <Rectangle 
      bounds={currentRect}
      pathOptions={{ color: '#3388ff', weight: 3, fillOpacity: 0.2, dashArray: '5, 5' }}
    />
  ) : null;
};

// Component to display and make the selected area draggable
const DraggableRectangle = ({ bounds, onBoundsChange }: { 
  bounds: L.LatLngBounds | null;
  onBoundsChange: (newBounds: L.LatLngBounds) => void;
}) => {
  const map = useMap();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<L.LatLng | null>(null);
  const [currentBounds, setCurrentBounds] = useState<L.LatLngBounds | null>(bounds);
  const cornerRefs = useRef<{[key: string]: L.Marker | null}>({
    nw: null, ne: null, sw: null, se: null
  });
  
  // Update current bounds when props change
  useEffect(() => {
    setCurrentBounds(bounds);
  }, [bounds]);
  
  useEffect(() => {
    if (!currentBounds) return;
    
    // Clear existing markers
    Object.values(cornerRefs.current).forEach(marker => {
      if (marker) map.removeLayer(marker);
    });
    
    if (currentBounds) {
      // Create draggable corner markers
      const nw = currentBounds.getNorthWest();
      const ne = currentBounds.getNorthEast();
      const sw = currentBounds.getSouthWest();
      const se = currentBounds.getSouthEast();
      
      const createCornerMarker = (position: L.LatLng, corner: string) => {
        const marker = L.marker(position, {
          draggable: true,
          icon: L.divIcon({
            className: 'rectangle-corner-marker',
            html: '<div style="width: 10px; height: 10px; background-color: #3388ff; border-radius: 50%; border: 2px solid white;"></div>',
            iconSize: [10, 10],
            iconAnchor: [5, 5]
          })
        }).addTo(map);
        
        marker.on('drag', (e) => {
          const newPosition = (e.target as L.Marker).getLatLng();
          const newBounds = L.latLngBounds(currentBounds!.getSouthWest(), currentBounds!.getNorthEast());
          
          if (corner === 'nw') {
            newBounds.extend(L.latLng(newPosition.lat, newPosition.lng));
            newBounds.extend(L.latLng(currentBounds!.getSouthEast().lat, currentBounds!.getSouthEast().lng));
          } else if (corner === 'ne') {
            newBounds.extend(L.latLng(newPosition.lat, newPosition.lng));
            newBounds.extend(L.latLng(currentBounds!.getSouthWest().lat, currentBounds!.getSouthWest().lng));
          } else if (corner === 'sw') {
            newBounds.extend(L.latLng(newPosition.lat, newPosition.lng));
            newBounds.extend(L.latLng(currentBounds!.getNorthEast().lat, currentBounds!.getNorthEast().lng));
          } else if (corner === 'se') {
            newBounds.extend(L.latLng(newPosition.lat, newPosition.lng));
            newBounds.extend(L.latLng(currentBounds!.getNorthWest().lat, currentBounds!.getNorthWest().lng));
          }
          
          setCurrentBounds(newBounds);
        });
        
        marker.on('dragend', () => {
          onBoundsChange(currentBounds!);
        });
        
        return marker;
      };
      
      cornerRefs.current.nw = createCornerMarker(nw, 'nw');
      cornerRefs.current.ne = createCornerMarker(ne, 'ne');
      cornerRefs.current.sw = createCornerMarker(sw, 'sw');
      cornerRefs.current.se = createCornerMarker(se, 'se');
    }
    
    // Make the rectangle itself draggable
    const handleRectClick = (e: L.LeafletMouseEvent) => {
      if (cornerRefs.current.nw) {
        L.DomEvent.stopPropagation(e);
        setIsDragging(true);
        setDragStart(e.latlng);
        map.dragging.disable();
      }
    };
    
    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if (isDragging && dragStart && currentBounds) {
        const dx = e.latlng.lng - dragStart.lng;
        const dy = e.latlng.lat - dragStart.lat;
        
        // Move the entire rectangle
        const sw = currentBounds.getSouthWest();
        const ne = currentBounds.getNorthEast();
        
        const newBounds = L.latLngBounds(
          L.latLng(sw.lat + dy, sw.lng + dx),
          L.latLng(ne.lat + dy, ne.lng + dx)
        );
        
        setCurrentBounds(newBounds);
        setDragStart(e.latlng);
        
        // Update corner markers
        if (cornerRefs.current.nw) cornerRefs.current.nw.setLatLng(newBounds.getNorthWest());
        if (cornerRefs.current.ne) cornerRefs.current.ne.setLatLng(newBounds.getNorthEast());
        if (cornerRefs.current.sw) cornerRefs.current.sw.setLatLng(newBounds.getSouthWest());
        if (cornerRefs.current.se) cornerRefs.current.se.setLatLng(newBounds.getSouthEast());
      }
    };
    
    const handleMouseUp = () => {
      if (isDragging && currentBounds) {
        setIsDragging(false);
        map.dragging.enable();
        onBoundsChange(currentBounds);
      }
    };
    
    map.on('mousedown', handleRectClick);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);
    
    return () => {
      map.off('mousedown', handleRectClick);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
      
      // Remove all corner markers
      Object.values(cornerRefs.current).forEach(marker => {
        if (marker) map.removeLayer(marker);
      });
    };
  }, [map, currentBounds, isDragging, dragStart, onBoundsChange]);
  
  if (!currentBounds) return null;
  
  return (
    <Rectangle 
      bounds={currentBounds}
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stopPropagation(e.originalEvent);
        }
      }}
      pathOptions={{ 
        color: '#3388ff', 
        weight: 3, 
        fillOpacity: 0.2,
        className: 'draggable-rectangle'
      }}
    />
  );
};

// Main Map Component
const MapComponent = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedBounds, setSelectedBounds] = useState<L.LatLngBounds | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Default map center (Israel)
  const defaultCenter: [number, number] = [31.7683, 35.2137];
  const defaultZoom = 8;

  // Handle completed rectangle
  const handleRectangleComplete = (bounds: L.LatLngBounds) => {
    setSelectedBounds(bounds);
    setIsDrawing(false);
  };
  
  // Handle bounds update from dragging
  const handleBoundsChange = (newBounds: L.LatLngBounds) => {
    setSelectedBounds(newBounds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedBounds(null);
  };

  // Export selected area as osm.pbf file
  const exportAreaToPBF = async () => {
    if (!selectedBounds) {
      toast.error('אנא בחר אזור במפה לפני שליחה');
      return;
    }

    try {
      setIsLoading(true);
      
      // Format the bounds for the server
      const bounds = {
        north: selectedBounds.getNorth(),
        south: selectedBounds.getSouth(),
        east: selectedBounds.getEast(),
        west: selectedBounds.getWest()
      };
      
      // Convert bounds to XML format that will be converted to PBF
      // This is a simplified representation - actual OSM XML is more complex
      const osmXml = `
        <osm version="0.6" generator="leaflet-export">
          <bounds minlat="${bounds.south}" minlon="${bounds.west}" maxlat="${bounds.north}" maxlon="${bounds.east}"/>
        </osm>
      `;
      
      // Create a Blob from the XML
      const blob = new Blob([osmXml], { type: 'application/xml' });
      
      // Create FormData to send the file to the server
      const formData = new FormData();
      formData.append('file', blob, 'export.osm');
      
      // Send the data to the server
      // Note: Replace 'YOUR_API_ENDPOINT' with your actual .NET server endpoint
      const response = await fetch('https://localhost:7163/api/Graph/upload-osm', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      toast.success('האזור נשלח בהצלחה לשרת');
    } catch (error) {
      console.error('Error exporting area:', error);
      toast.error('שגיאה בשליחת האזור לשרת');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full">
      <MapContainer 
        center={defaultCenter} 
        zoom={defaultZoom} 
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <DrawRectangle 
          isDrawing={isDrawing} 
          onRectangleComplete={handleRectangleComplete} 
        />
        
        {selectedBounds && (
          <DraggableRectangle 
            bounds={selectedBounds} 
            onBoundsChange={handleBoundsChange} 
          />
        )}
      </MapContainer>

      {/* Control Panel */}
      <Card className="absolute top-4 right-4 p-4 z-10 bg-opacity-90 bg-white shadow-lg">
        <div className="space-y-4">
          <Button 
            onClick={() => setIsDrawing(!isDrawing)}
            className={`flex items-center gap-2 ${isDrawing ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
            disabled={isDrawing}
          >
            <Square className="h-5 w-5" /> 
            בחירת אזור
          </Button>

          {selectedBounds && (
            <div className="space-y-2">
              <div className="text-sm text-left">
                <div>צפון-מערב: {selectedBounds.getNorthWest().lat.toFixed(4)}, {selectedBounds.getNorthWest().lng.toFixed(4)}</div>
                <div>דרום-מזרח: {selectedBounds.getSouthEast().lat.toFixed(4)}, {selectedBounds.getSouthEast().lng.toFixed(4)}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={clearSelection}
                  variant="destructive"
                  size="sm"
                >
                  נקה בחירה
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  title="הזז את המלבן על ידי גרירה או שנה גודל על ידי גרירת הפינות"
                >
                  <Move className="h-4 w-4" />
                  הזז/שנה
                </Button>
              </div>
              
              {/* Finish button */}
              <Button 
                onClick={exportAreaToPBF}
                variant="default"
                className="w-full mt-2 flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                <Send className="h-5 w-5" />
                {isLoading ? 'שולח...' : 'סיום ושליחה לשרת'}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default MapComponent;