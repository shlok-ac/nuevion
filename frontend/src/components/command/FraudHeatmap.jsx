import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MapPinned, Maximize2, Minimize2 } from "lucide-react";

const HEAT_GRADIENT = {
  0.0: "#1234a6",
  0.2: "#176ee8",
  0.4: "#11c7c9",
  0.6: "#35d04f",
  0.78: "#f4e62b",
  0.9: "#ff8c1a",
  1.0: "#ff2418",
};

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = lines.shift().split(",").map((header) => header.trim());
  return lines.map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, (values[index] || "").trim()]));
  });
}

function unique(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort();
}

export default function FraudHeatmap() {
  const cardRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const heatRef = useRef(null);
  const markersRef = useRef([]);
  const [rows, setRows] = useState([]);
  const [atmRows, setAtmRows] = useState([]);
  const [city, setCity] = useState("ALL");
  const [crimeType, setCrimeType] = useState("ALL");
  const [risk, setRisk] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fromTime, setFromTime] = useState("00:00");
  const [toTime, setToTime] = useState("23:59");
  const [error, setError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapRevision, setMapRevision] = useState(0);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === cardRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useLayoutEffect(() => {
    let disposed = false;
    let frame = 0;
    let resizeFrame = 0;
    let timer = 0;
    let retryCount = 0;
    let createdMap = null;

    const removeMap = () => {
      if (heatRef.current) {
        heatRef.current.remove();
        heatRef.current = null;
      }
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      const map = createdMap || mapInstance.current;
      if (map) {
        map.remove();
        if (mapInstance.current === map) mapInstance.current = null;
      }
      createdMap = null;
    };

    const initializeMap = () => {
      if (disposed) return;
      const L = window.L;
      const container = mapRef.current;
      if (!L || !container) return;
      if (createdMap) {
        createdMap.invalidateSize({ animate: false, pan: false });
        return;
      }

      const { width, height } = container.getBoundingClientRect();
      if (width === 0 || height === 0) {
        if (retryCount < 60) {
          retryCount += 1;
          frame = window.requestAnimationFrame(initializeMap);
        }
        return;
      }

      removeMap();
      createdMap = L.map(container, {
        scrollWheelZoom: true,
        maxBounds: [[6, 67], [37.5, 98]],
        maxBoundsViscosity: 0.85,
      }).setView([22.7, 79.2], 5);

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(createdMap);
      mapInstance.current = createdMap;
      setMapRevision((revision) => revision + 1);

      resizeFrame = window.requestAnimationFrame(() => {
        if (!disposed && mapInstance.current === createdMap) {
          createdMap.invalidateSize({ animate: false, pan: false });
        }
      });
    };

    const handleLoad = () => initializeMap();
    if (!window.L) window.addEventListener("load", handleLoad);
    frame = window.requestAnimationFrame(initializeMap);
    timer = window.setTimeout(initializeMap, 250);

    return () => {
      disposed = true;
      window.removeEventListener("load", handleLoad);
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(resizeFrame);
      window.clearTimeout(timer);
      removeMap();
    };
  }, [isFullscreen]);

  useEffect(() => {
    const container = mapRef.current;
    if (!container || !window.ResizeObserver) return undefined;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const map = mapInstance.current;
        if (map && container.clientWidth > 0 && container.clientHeight > 0) {
          map.invalidateSize({ animate: false, pan: false });
        }
      });
    });
    observer.observe(container);
    if (container.parentElement) observer.observe(container.parentElement);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [isFullscreen, mapRevision]);

  useEffect(() => {
    Promise.all([
      fetch("/fraud_incidents.csv").then((response) => {
        if (!response.ok) throw new Error("fraud incidents unavailable");
        return response.text();
      }),
      fetch("/atm_predictions.csv").then((response) => {
        if (!response.ok) throw new Error("ATM predictions unavailable");
        return response.text();
      }),
    ])
      .then(([incidentText, atmText]) => {
        setRows(parseCsv(incidentText));
        setAtmRows(parseCsv(atmText));
      })
      .catch(() => setError("Could not load the fraud incident or ATM data."));
  }, []);

  const cities = useMemo(() => unique(rows, "city"), [rows]);
  const crimes = useMemo(() => unique(rows, "crime_type"), [rows]);
  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const rowDateTime = `${row.date || ""}T${(row.time || "").slice(0, 5)}`;
        const fromDateTime = fromDate ? `${fromDate}T${fromTime}` : "";
        const toDateTime = toDate ? `${toDate}T${toTime}` : "";
        const dateTimeOk =
          (!fromDateTime || rowDateTime >= fromDateTime) &&
          (!toDateTime || rowDateTime <= toDateTime);
        return (
          dateTimeOk &&
          (city === "ALL" || row.city === city) &&
          (crimeType === "ALL" || row.crime_type === crimeType) &&
          (risk === "ALL" || row.risk_level === risk)
        );
      }),
    [rows, city, crimeType, risk, fromDate, toDate, fromTime, toTime],
  );

  const rankedAtms = useMemo(
    () =>
      atmRows
        .filter(
          (row) =>
            (city === "ALL" || row.city === city) &&
            (risk === "ALL" || String(row.risk_level || "").toUpperCase() === risk),
        )
        .map((row) => ({
          id: row.atm_id || row.id,
          bank: row.bank_name || "—",
          city: row.city || "—",
          score: Number.isFinite(Number(row.risk_score)) ? Number(row.risk_score) : 0,
          level: String(row.risk_level || "LOW").toUpperCase(),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 8),
    [atmRows, city, risk],
  );

  useEffect(() => {
    const map = mapInstance.current;
    const L = window.L;
    if (!map || !L) return;
    if (heatRef.current) heatRef.current.remove();
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const points = filtered
      .map((row) => [
        Number(row.latitude),
        Number(row.longitude),
        String(row.risk_level || "").toUpperCase() === "HIGH"
          ? 1
          : String(row.risk_level || "").toUpperCase() === "MEDIUM"
            ? 0.7
            : String(row.risk_level || "").toUpperCase() === "CRITICAL"
              ? 1
              : 0.4,
      ])
      .filter(([latitude, longitude]) => Number.isFinite(latitude) && Number.isFinite(longitude));

    if (points.length && typeof L.heatLayer === "function") {
      heatRef.current = L.heatLayer(points, {
        radius: 38,
        blur: 25,
        maxZoom: 11,
        max: 1,
        minOpacity: 0.35,
        gradient: HEAT_GRADIENT,
      }).addTo(map);
    }

    filtered.forEach((row) => {
      const latitude = Number(row.latitude);
      const longitude = Number(row.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
      const marker = L.circleMarker([latitude, longitude], {
        radius: 4,
        fillColor: "#111827",
        color: "#ffffff",
        weight: 1,
        fillOpacity: 0.9,
      })
        .bindPopup(
          `<strong>${row.incident_id || "Fraud case"}</strong><br />Date: ${row.date || "—"} ${row.time || ""}<br />City: ${row.city || "—"}<br />Area: ${row.area || "—"}<br />Crime: ${row.crime_type || "—"}<br />Risk: ${row.risk_level || "—"}`,
        )
        .addTo(map);
      markersRef.current.push(marker);
    });

    if (points.length) {
      map.fitBounds(
        L.latLngBounds(points.map(([latitude, longitude]) => [latitude, longitude])).pad(0.08),
        { maxZoom: 10, animate: false },
      );
    }
  }, [filtered, mapRevision]);

  const reset = () => {
    setCity("ALL");
    setCrimeType("ALL");
    setRisk("ALL");
    setFromDate("");
    setToDate("");
    setFromTime("00:00");
    setToTime("23:59");
  };

  const toggleFullscreen = async () => {
    if (!cardRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    try {
      await cardRef.current.requestFullscreen();
    } catch {
      setError("Fullscreen could not be enabled in this browser.");
    }
  };

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden border bg-card text-card-foreground shadow ${
        isFullscreen
          ? "fixed inset-0 z-50 flex h-screen w-screen flex-col rounded-none"
          : "rounded-lg"
      }`}
    >
      <div className="flex shrink-0 flex-col gap-3 border-b p-4 pr-14 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex xl:flex-1 xl:-translate-x-4 xl:items-center xl:justify-center">
          <h2 className="inline-flex min-h-12 w-70 items-center gap-2 whitespace-nowrap px-6 py-3 text-base font-semibold text-primary">
            <MapPinned aria-hidden="true" className="h-6 w-6 shrink-0" />
            Fraud Heatmap
          </h2>
        </div>
        <button
          type="button"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "View heatmap fullscreen"}
          title={isFullscreen ? "Exit fullscreen" : "View fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        <div className="grid w-full gap-2 sm:grid-cols-2 xl:max-w-4xl xl:grid-cols-4">
          <div className="relative">
            <select className="h-9 w-full appearance-none rounded-md border bg-background pl-2 pr-10 text-xs" value={city} onChange={(event) => setCity(event.target.value)}>
              <option value="ALL">All cities</option>
              {cities.map((value) => <option key={value}>{value}</option>)}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <div className="relative">
            <select className="h-9 w-full appearance-none rounded-md border bg-background pl-2 pr-10 text-xs" value={crimeType} onChange={(event) => setCrimeType(event.target.value)}>
              <option value="ALL">All crime types</option>
              {crimes.map((value) => <option key={value}>{value}</option>)}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <div className="relative">
            <select className="h-9 w-full appearance-none rounded-md border bg-background pl-2 pr-10 text-xs" value={risk} onChange={(event) => setRisk(event.target.value)}>
              <option value="ALL">All risk levels</option>
              {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((value) => <option key={value}>{value}</option>)}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <button type="button" className="h-9 rounded-md bg-destructive px-3 text-xs font-medium text-destructive-foreground xl:w-[calc(100%_-_0.25rem)]" onClick={reset}>Reset</button>
          <div className="flex h-9 items-center gap-2 sm:col-span-2 xl:col-span-2">
            <span className="inline-flex h-9 min-w-12 shrink-0 items-center justify-center rounded-md border bg-muted px-3 text-xs font-semibold text-muted-foreground">From</span>
            <input className="h-9 w-44 shrink-0 rounded-md border bg-background px-2 text-xs" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="From date" />
            <input className="h-9 w-32 shrink-0 rounded-md border bg-background px-2 text-xs" type="time" value={fromTime} onChange={(event) => setFromTime(event.target.value)} aria-label="From time" />
          </div>
          <div className="flex h-9 items-center gap-2 sm:col-span-2 xl:col-span-2">
            <span className="inline-flex h-9 min-w-12 shrink-0 items-center justify-center rounded-md border bg-muted px-3 text-xs font-semibold text-muted-foreground">To</span>
            <input className="h-9 w-44 shrink-0 rounded-md border bg-background px-2 text-xs" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label="To date" />
            <input className="h-9 w-32 shrink-0 rounded-md border bg-background px-2 text-xs" type="time" value={toTime} onChange={(event) => setToTime(event.target.value)} aria-label="To time" />
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex min-h-96 items-center justify-center p-6 text-sm text-destructive">{error}</div>
      ) : (
        <div className={`grid min-h-0 lg:grid-cols-[minmax(0,1fr)_20rem] ${isFullscreen ? "flex-1 grid-rows-[minmax(0,1fr)]" : ""}`}>
          <div className={`m-3 min-h-0 overflow-hidden rounded-md border bg-muted ${isFullscreen ? "h-full min-h-[20rem]" : ""}`}>
            <div
              ref={mapRef}
              className={`${isFullscreen ? "h-full min-h-[20rem]" : "h-[20rem] lg:h-[27rem]"} [&_.leaflet-container]:h-full`}
            />
          </div>
          <aside className={`overflow-auto border-t [scrollbar-width:none] lg:border-l lg:border-t-0 [&::-webkit-scrollbar]:hidden ${isFullscreen ? "max-h-none" : "max-h-[27.5rem]"}`}>
            <div className="m-3 flex items-center justify-between rounded-lg border bg-background p-4 shadow-sm">
              <div><h3 className="text-sm font-semibold">ATM Ranking</h3><p className="text-[11px] text-muted-foreground">Highest risk first</p></div>
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-bold text-primary">{rankedAtms.length}</span>
            </div>
            <div className="px-3 pb-3">
              {rankedAtms.length ? rankedAtms.map((atm, index) => (
                <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 border-b py-3 last:border-0" key={atm.id}>
                  <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>
                  <div className="min-w-0"><strong className="block truncate text-xs">{atm.id}</strong><span className="block truncate text-[10px] text-muted-foreground">{atm.bank} · {atm.city}</span></div>
                  <div className="text-right"><strong className="block text-sm">{atm.score.toFixed(0)}</strong><span className="text-[9px] font-bold uppercase text-muted-foreground">{atm.level}</span></div>
                </div>
              )) : <div className="p-4 text-center text-xs text-muted-foreground">No ATMs match the selected filters.</div>}
            </div>
          </aside>
        </div>
      )}
      <div className="flex flex-wrap gap-4 border-t px-4 py-3 text-xs text-muted-foreground">
        <span><b>Cases shown:</b> {filtered.length}</span>
        <span><b>Crime:</b> {crimeType === "ALL" ? "All" : crimeType}</span>
        <span><b>Location:</b> {city === "ALL" ? "India" : city}</span>
        <span className="ml-auto"><b>Fraud density</b></span>
      </div>
    </div>
  );
}
