// React imports
import React, { useState, useEffect, useCallback } from 'react';

// Standard imports
import Toast, { toast } from '../SharedComponents/Toast';

// API endpoints imports
import { ChargerGetAllWithEmail, FavouriteChargerAdd, FavouriteChargerRemove } from '../API/API';

// Leaflet imports
import { Icon, LatLng, Layer, control, divIcon, geoJson, layerGroup, map, marker } from 'leaflet'
import { MapContainer, TileLayer, useMap, useMapEvents, Marker, Popup, GeoJSON } from 'react-leaflet';
import "leaflet/dist/leaflet.css";
import markerIconPng from "./marker-icon.png";
import markerIconFavouritePng from "./marker-icon-favourite.png";
import geoJsonSubzone from "./2-planning-area.json";
import geoJsonRegion from "./master-plan-2019-region-boundary-no-sea-geojson.json";

//navigation import
import Route from "./Route";
import routeIconPng from "./route-icon.png"

import GeometryUtil from 'leaflet-geometryutil';

// This component renders a map centered on singapore. Pass in properties to change the kind of returns you get.
//
// Supported Props:[
// desiredZoom: how zoomed in the map initially is, the smaller the value the more zoomed out.
// mapWidth: how wide the map is. (%)
// mapHeight: how tall the map is. (html measurements e.g. vh)
// ] See defaults below.
export default function Map(props) {
    const singaporeCenter = [1.3521, 103.8198];
    const defaultZoom = 12;
    const defaultWidth = "100%";
    const defaultHeight = "70vh";

    const districtZoomThreshold = 12;
    const displayMarkersThreshold = 14;

    const userEmail = localStorage.getItem("user_email");
    const [allChargerInfo, setAllChargerInfo] = useState();

    //const for navigation
    const [sourceLocation, setSourceLocation] = useState({});
    const [destinationLocation, setDestinationLocation] = useState({});
    const [nearestMarkerLatLng, setNearestMarkerLatLng] = useState();

    // Function that loads all chargers. Called on page load, populates allChargerInfo.
    const fetchAllChargers = useCallback(async () => {
        const response = await ChargerGetAllWithEmail(userEmail);

        // If success returned, store charger information
        if (response.status === 'success') {
            setAllChargerInfo(response['data'])
        } else {
            toast.error(<div>{response.message}<br />{response.reason}</div>);
        }
    }, [userEmail]);

    useEffect(() => {
        fetchAllChargers();
    }, [fetchAllChargers]);

    async function handleFavourite(IDCharger, operation) {
        // Ugly confirmation prompt, TODO better
        //maybe can make a dialog that opens when button is clicked, then yes no goes to handle favourite?
        if (!window.confirm(operation + " favourite charger?")) {
            //do nothing if cancel confirmation
            return;
        }

        let response;
        // Pick API endpoint
        if (operation === "add") {
            response = await FavouriteChargerAdd(userEmail, IDCharger);
        } else if (operation === "remove") {
            response = await FavouriteChargerRemove(userEmail, IDCharger);
        } else {
            return;
        }

        // If operation successful, reload charger information
        // Which reloads markers
        if (response.status === 'success') {
            fetchAllChargers();
            if (operation === "add") {
                toast.success("Added to favourites!")
            }
            if (operation === "remove") {
                toast.success("Removed from favourites!")
            }
        }
        else {
            toast.error(<div>{response.message}<br />{response.reason}</div>);
        }
    }

    // Returns zoom level of map.
    function GetZoomLevel() {
        const [zoomLevel, setZoomLevel] = useState(-1);

        // Attach zoomend event handler
        const mapEvents = useMapEvents({
            zoomend: () => {
                setZoomLevel(mapEvents.getZoom());
            },
        });

        // If zoomLevel "uninitialised", init it
        if (zoomLevel <= -1) {
            setZoomLevel(mapEvents.getZoom());
        }

        return zoomLevel;
    }

    // Component that formats charger information into markers for display. Reads from allChargerInfo.
    function RenderMarkers() {
        let result = [];

        PopulateRecommendations();

        for (var i = 0; i < allChargerInfo.length; i++) {
            // this is necessary for event handler to work, using allChargerInfo[i] directly causes it to go out of bound for some reason
            let id = allChargerInfo[i].id;
            let favourite = allChargerInfo[i].is_favourite;
            let lat = allChargerInfo[i].latitude;
            let lng = allChargerInfo[i].longitude;

            /*
            const newMarker = marker(new LatLng(lat, lng), {
                iconUrl: favourite === false ? markerIconPng : markerIconFavouritePng, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [0, -30], key:{id}
                //iconUrl: markerIconFavouritePng, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [0, -30], key:{id}

            });

            newMarker.bindPopup(
                <Popup>
                        <div className="pb-1">
                            <span className="font-semibold text-sm">Name:</span> {allChargerInfo[i].name}
                            <br />
                            <span className="font-semibold text-sm">Address:</span> {allChargerInfo[i].address}
                            <br />
                            <span className="font-semibold text-sm">Solar Current In:</span> {allChargerInfo[i].pv_current_in} A
                            <br />
                            <span className="font-semibold text-sm">Solar Stored Charge:</span> {allChargerInfo[i].pv_energy_level} kWh
                            <br />
                            <span className="font-semibold text-sm">Price Rate:</span> ${allChargerInfo[i].rate_current} / kWh
                        </div>
                        <button id={allChargerInfo[i].id}
                            onClick={() => handleFavourite(id, favourite === false ? 'add' : 'remove')}
                            className={(allChargerInfo[i].is_favourite === false ? "hover:bg-red-900" : "hover:bg-red-300")
                                + " bg-red-400 px-3 py-2 mr-2 rounded-full text-white"}
                        >
                            {allChargerInfo[i].is_favourite === false ? <i className="fas fa-heart" style={{ color: "#ffffff" }}></i> : <i className="fas fa-heart-broken" style={{ color: "#ffffff" }}></i>}
                            {allChargerInfo[i].is_favourite === false ? ' Add to favourites' : ' Remove favourite'}
                        </button>
                        <button id={allChargerInfo[i].id}
                            onClick={() => navigate(lat, lng)}
                            className="bg-green-400 hover:bg-green-900 px-3 py-2 rounded-full text-white">
                            Go
                            <i className="fas fa-location-arrow pl-1"></i>
                        </button>
                    </Popup>
            )

            layergrp.addLayer(newMarker);
             */

            result.push(
                <Marker position={[allChargerInfo[i].latitude, allChargerInfo[i].longitude]}
                    icon={allChargerInfo[i].is_favourite === false ?
                        new Icon({ iconUrl: markerIconPng, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [0, -30] }) :
                        new Icon({ iconUrl: markerIconFavouritePng, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [0, -30] })}
                    key={allChargerInfo[i].id}>
                    <Popup>
                        <div className="pb-1">
                            <span className="font-semibold text-sm">Name:</span> {allChargerInfo[i].name}
                            <br />
                            <span className="font-semibold text-sm">Address:</span> {allChargerInfo[i].address}
                            <br />
                            <span className="font-semibold text-sm">Solar Voltage In:</span> {allChargerInfo[i].pv_voltage_in} V
                            <br />
                            <span className="font-semibold text-sm">Solar Current In:</span> {allChargerInfo[i].pv_current_in} A
                            <br />
                            <span className="font-semibold text-sm">Solar Voltage Out:</span> {allChargerInfo[i].pv_voltage_out} V
                            <br />
                            <span className="font-semibold text-sm">Solar Current Out:</span> {allChargerInfo[i].pv_current_out} A
                            <br />
                            <span className="font-semibold text-sm">Price Rate:</span> ${allChargerInfo[i].rate_current} / kWh
                        </div>
                        <button id={allChargerInfo[i].id}
                            onClick={() => handleFavourite(id, favourite === false ? 'add' : 'remove')}
                            className={(allChargerInfo[i].is_favourite === false ? "hover:bg-red-900" : "hover:bg-red-300")
                                + " bg-red-400 px-3 py-2 mr-2 rounded-full text-white"}
                        >
                            {allChargerInfo[i].is_favourite === false ? <i className="fas fa-heart" style={{ color: "#ffffff" }}></i> : <i className="fas fa-heart-broken" style={{ color: "#ffffff" }}></i>}
                            {allChargerInfo[i].is_favourite === false ? ' Add to favourites' : ' Remove favourite'}
                        </button>
                        <button id={allChargerInfo[i].id}
                            onClick={() => navigate(lat, lng)}
                            className="bg-green-400 hover:bg-green-900 px-3 py-2 rounded-full text-white">
                            Go
                            <i className="fas fa-location-arrow pl-1"></i>
                        </button>
                    </Popup>
                </Marker>
            )
        }
        return result;
    }

    let mapMarkers = [];
    // Component that overlays region information and markers on map.
    function OverlayRender() {
        const zoomLevel = GetZoomLevel();

        // Get bounds of map on map change.
        // TODO optimise markers displayed only within screen
        const mapEvents = useMapEvents({
            dragend: (e) => handleMapEvent(e),
            zoomend: (e) => handleMapEvent(e),
        });
        const handleMapEvent = (e) => {
            console.log("mapCenter", e.target.getCenter());
            console.log("map bounds", e.target.getBounds());
        };

        // Remove all old markers
        const map = useMap();
        for (var i = 0; i < mapMarkers.length; i++) {
            map.removeLayer(mapMarkers[i]);
        }

        // displays district name in region centre, currently not used
        // use by placing in onEachFeature={onEachFeature} in GeoJSON
        const onEachFeature = (feature, layer) => {
            const label = divIcon({
                className: 'label',
                html: feature.properties.name,
                iconSize: [100, 40],
            });

            const center = layer.getBounds().getCenter();
            const newMarker = marker(center, { icon: label });

            mapMarkers.push(newMarker);
            newMarker.addTo(map);
        };

        //if location allowed, set view as current location
        navigator.geolocation.getCurrentPosition((position) => location(map, position.coords.latitude, position.coords.longitude));

        // Return geoJSON overlay depending on zoom level
        if (zoomLevel >= displayMarkersThreshold) {// No overlay, only markers
            return allChargerInfo && <div><RenderMarkers /></div>;
        }
        if (zoomLevel >= districtZoomThreshold) {  // District Level
            return allChargerInfo && <div><GeoJSON data={geoJsonSubzone} key={Date.now()} /></div>;
        }
        else {                                     // Region Level

            return <GeoJSON data={geoJsonRegion} key={Date.now()} />;
        }
    }


    function PopulateRecommendations() {

        const map = useMap();
        var layers = [];
        
        console.log("sourceLocation", sourceLocation);

        var markersArray = [];
        for (var i = 0; i < allChargerInfo.length; i++) {
            //markersArray.push(new LatLng(allChargerInfo[i].latitude, allChargerInfo[i].longitude));
            markersArray.push(allChargerInfo[i]);
        }

        //console.log("markersarray", markersArray);

        map.eachLayer( function(layer) {
            //check if is marker and is not current location
            if (layer._latlng != undefined) {
                if (layer._latlng.lat != undefined && layer._latlng.lng != undefined && layer._latlng.lat != sourceLocation.lat && layer._latlng.lng != sourceLocation.lng) {
                    layers.push(layer);
                }
            }
        });

        if (layers.length > 0) {
            console.log("layers", layers);

            console.log(sourceLocation);


            //for nearest charger
    
            var nearest = GeometryUtil.closestLayer(map, layers, sourceLocation); //supposed to use closestLayer instead of closest ****
    
            console.log(nearest);
    
            var nearestMarker = markersArray.find(element => element.latitude === nearest.latlng.lat && element.longitude === nearest.latlng.lng);

            console.log("nearestMarker", nearestMarker);

            document.getElementById("nearest-charger-name").innerText = nearestMarker.name;
            document.getElementById("nearest-charger-button").addEventListener("click", () => {
                map.panTo(new LatLng(nearest.latlng.lat, nearest.latlng.lng))
            });


            //for best value charger
            var prices = [];

            markersArray.forEach(item => {
                prices.push(item.rate_current);
            });

            console.log("prices", Math.min.apply(Math, prices));

            var valueMarker = markersArray.find(element => element.rate_current == Math.min.apply(Math, prices));

            console.log("valueMarker", valueMarker);
            document.getElementById("best-value-charger-name").innerText = valueMarker.name;
            document.getElementById("best-value-charger-button").addEventListener("click", () => {
                map.panTo(new LatLng(valueMarker.latitude, valueMarker.longitude))
            });



        }
        
    }


    function location(map, lat, lng) {

        const center = new LatLng(lat, lng);

        map.setView(center, 24);

        if (sourceLocation.lat !== center.lat && sourceLocation.lng !== center.lng) {
            setSourceLocation(center);

            const newMarker = marker(center, {icon: new Icon({ iconUrl: routeIconPng, iconSize: [41, 41], iconAnchor: [20, 41] })});

            newMarker.addTo(map);
        }
        
    }

    function navigate(destinationLat, destinationLng) {
        console.log(destinationLat);
        console.log(destinationLng);

        setDestinationLocation(new LatLng(destinationLat, destinationLng));
        console.log(destinationLocation);
    }

    return (
        <>
            <Toast />

            <MapContainer center={singaporeCenter} zoom={props.desiredZoom || defaultZoom} scrollWheelZoom={true}
                style={{ width: props.mapWidth || defaultWidth, height: props.mapHeight || defaultHeight }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {<OverlayRender />  /* Must be rendered as a component to be a considered descendant of MapContainer */}
                {allChargerInfo && <PopulateRecommendations/>}
                <Route source={sourceLocation} destination={destinationLocation}/>
            </MapContainer>
        </>
    );
}