import { useCallback, useEffect, useRef, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const INDIA_CENTER = [20.5937, 78.9629];

function addressParts(address = {}) {
  return {
    city: address.city || address.town || address.village || address.municipality || address.county || "",
    state: address.state || "",
    pincode: address.postcode || "",
  };
}

function MapViewport({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 16);
  }, [map, position]);
  return null;
}

function MapClickHandler({ onPick }) {
  useMapEvents({ click: (event) => onPick([event.latlng.lat, event.latlng.lng]) });
  return null;
}

export default function LeafletLocationPicker({ address, latitude, longitude, onSelect }) {
  const hasInitialPosition = latitude !== "" && latitude !== null && latitude !== undefined &&
    longitude !== "" && longitude !== null && longitude !== undefined &&
    Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
  const [position, setPosition] = useState(hasInitialPosition ? [Number(latitude), Number(longitude)] : null);
  const [query, setQuery] = useState(address || "");
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [message, setMessage] = useState("Search for a venue, or click its location on the map.");
  const positionRef = useRef(position);
  const queryRef = useRef(query);
  const skipAutocompleteSearch = useRef(false);
  positionRef.current = position;
  queryRef.current = query;

  useEffect(() => {
    setQuery(address || "");
  }, [address]);

  useEffect(() => {
    if (hasInitialPosition) setPosition([Number(latitude), Number(longitude)]);
  }, [hasInitialPosition, latitude, longitude]);

  const findPlaces = useCallback(async (searchTerm) => {
    const term = searchTerm.trim();
    if (term.length < 3) {
      setSuggestions([]);
      return;
    }
    setBusy(true);
    try {
      const params = new URLSearchParams({ q: term, limit: "6", lang: "en" });
      const searchCenter = positionRef.current;
      if (searchCenter) {
        params.set("lat", String(searchCenter[0]));
        params.set("lon", String(searchCenter[1]));
        params.set("zoom", "12");
        params.set("location_bias_scale", "0.2");
      } else {
        params.set("lat", "10.75");
        params.set("lon", "75.95");
        params.set("zoom", "8");
        params.set("location_bias_scale", "0.2");
      }
      const response = await fetch(`https://photon.komoot.io/api/?${params}`);
      if (!response.ok) throw new Error("Place search is unavailable right now.");
      let features = (await response.json()).features || [];
      let showingAreaResults = false;
      if (!features.length) {
        const terms = term.split(/\s+/);
        const areaQueries = [...new Set([
          terms.length > 1 ? terms.slice(-2).join(" ") : "",
          terms.length > 1 ? terms[terms.length - 1] : "",
        ].filter(Boolean))];
        for (const areaQuery of areaQueries) {
          const fallbackParams = new URLSearchParams({ q: areaQuery, limit: "6", lang: "en" });
          const fallbackResponse = await fetch(`https://photon.komoot.io/api/?${fallbackParams}`);
          if (fallbackResponse.ok) {
            features = (await fallbackResponse.json()).features || [];
            if (features.length) {
              showingAreaResults = true;
              break;
            }
          }
        }
      }
      setSuggestions(features);
      if (showingAreaResults) setMessage(`No exact venue match. Choose a nearby result to move the map, then click the venue itself.`);
      else if (!features.length) setMessage("No mapped place matched. Try a nearby town, or click the map to drop the pin.");
    } catch (error) {
      setSuggestions([]);
      setMessage(error.message || "Place search failed. You can still select a place on the map.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (skipAutocompleteSearch.current) {
      skipAutocompleteSearch.current = false;
      return undefined;
    }
    if (query.trim().length < 3) {
      setSuggestions([]);
      return undefined;
    }
    const timer = window.setTimeout(() => findPlaces(query), 350);
    return () => window.clearTimeout(timer);
  }, [findPlaces, query]);

  const choosePlace = useCallback(async (lat, lon, suppliedAddress = "", parts = {}) => {
    const nextPosition = [Number(lat), Number(lon)];
    setPosition(nextPosition);
    if (suppliedAddress) {
      if (queryRef.current !== suppliedAddress) {
        skipAutocompleteSearch.current = true;
        setQuery(suppliedAddress);
      }
      onSelect({ address: suppliedAddress, ...addressParts(parts), latitude: nextPosition[0], longitude: nextPosition[1] });
      setMessage("Location selected. You can click the map to adjust the pin.");
      return;
    }

    setBusy(true);
    setMessage("Looking up this location…");
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1`);
      if (!response.ok) throw new Error("Address lookup is unavailable. You can enter the address below.");
      const result = await response.json();
      const selectedAddress = result.display_name || "";
      if (queryRef.current !== selectedAddress) {
        skipAutocompleteSearch.current = true;
        setQuery(selectedAddress);
      }
      onSelect({ address: selectedAddress, ...addressParts(result.address), latitude: nextPosition[0], longitude: nextPosition[1] });
      setMessage(selectedAddress ? "Location selected. You can click the map to adjust the pin." : "Pin selected. Enter the venue address below.");
    } catch (error) {
      onSelect({ latitude: nextPosition[0], longitude: nextPosition[1] });
      setMessage(error.message || "Pin selected. Enter the venue address below.");
    } finally {
      setBusy(false);
    }
  }, [onSelect]);

  const searchPlace = async () => {
    if (!query.trim()) {
      setMessage("Type a venue name or address to search.");
      return;
    }
    setMessage("Choose the correct place from the suggestions, or click its location on the map.");
    await findPlaces(query);
  };

  const selectSuggestion = (feature) => {
    const properties = feature.properties || {};
    const [lon, lat] = feature.geometry.coordinates;
    const addressLabel = [
      properties.name,
      properties.housenumber && properties.street ? `${properties.housenumber} ${properties.street}` : properties.street,
      properties.district || properties.city || properties.locality || properties.county,
      properties.state,
      properties.country,
    ].filter((part, index, all) => part && all.indexOf(part) === index).join(", ");
    setSuggestions([]);
    choosePlace(lat, lon, addressLabel, properties);
  };

  return (
    <div className="leafletLocationPicker">
      <div className="leafletLocationSearch">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              searchPlace();
            }
          }}
          placeholder="Search venue or address"
          aria-label="Search venue or address"
        />
        <button type="button" onClick={searchPlace} disabled={busy}>{busy ? "Searching…" : "Search map"}</button>
      </div>
      {suggestions.length > 0 && (
        <ul className="leafletPlaceSuggestions" aria-label="Place suggestions">
          {suggestions.map((feature) => {
            const props = feature.properties || {};
            const label = [props.name, props.street, props.district || props.city || props.locality, props.state, props.country]
              .filter((part, index, all) => part && all.indexOf(part) === index).join(", ");
            return <li key={`${props.osm_type || "place"}-${props.osm_id || label}`}><button type="button" onClick={() => selectSuggestion(feature)}>{label || "Unnamed place"}</button></li>;
          })}
        </ul>
      )}
      <MapContainer className="leafletMapCanvas" center={position || INDIA_CENTER} zoom={position ? 16 : 5} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewport position={position} />
        <MapClickHandler onPick={(point) => choosePlace(point[0], point[1])} />
        {position && <CircleMarker center={position} radius={9} pathOptions={{ color: "#087f4b", fillColor: "#14a66a", fillOpacity: 0.9 }}><Popup>{query || "Selected venue"}</Popup></CircleMarker>}
      </MapContainer>
      <small role="status">{message}</small>
    </div>
  );
}
