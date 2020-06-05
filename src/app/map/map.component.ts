import { Component, AfterViewInit } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import { HttpClient } from '@angular/common/http';
import { interval } from 'rxjs';

import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements AfterViewInit {
  map: mapboxgl.Map;
  isLocated;

  constructor(private http: HttpClient) {}

  ngAfterViewInit() {
    this.fetchLocations();

    this.map = new mapboxgl.Map({
      accessToken:
        'pk.eyJ1IjoiYmFmZmlvc28iLCJhIjoiT1JTS1lIMCJ9.f5ubY91Bi42yPnTrgiq-Gw',
      container: 'map', // container id
      style: 'mapbox://styles/baffioso/ckavgjc4z235f1il3hef9gz2q', // stylesheet location
      center: [12.595, 55.674], // starting position [lng, lat]
      zoom: 13, // starting zoom
    });

    this.map.on('load', () => {
      this.fetchLocations().subscribe((res: any) => {
        const payload = res.locations[0].payload.payload;
        const lastPosistion: [number, number] = [payload.lon, payload.lat];
        this.addBoatIcon(lastPosistion, payload.direction);
        this.flyTo(lastPosistion, 14);
      });

      interval(2 * 1000).subscribe(() => {
        this.fetchLocations().subscribe((res: any) => {
          const payload = res.locations[0].payload.payload;
          const lastPosistion: [number, number] = [payload.lon, payload.lat];

          // update data
          (this.map.getSource('boat') as mapboxgl.GeoJSONSource).setData(
            this.toGeojsonPoint(lastPosistion) as any
          );

          // change boat icon direction
          this.map.setLayoutProperty('boat', 'icon-rotate', payload.direction);

          // zoom to last position
          this.flyTo(lastPosistion, 14);
        });
      });
    });
  }

  addBoatIcon(coords: [number, number], direction: number) {
    this.map.addLayer({
      id: 'boat',
      type: 'symbol',
      source: {
        type: 'geojson',
        data: this.toGeojsonPoint(coords) as any,
      },
      layout: {
        'icon-image': 'boat',
        'icon-size': 0.1,
        'icon-rotate': direction,
      },
    });
  }

  flyTo(center: [number, number], zoom: number) {
    this.map.flyTo({
      center,
      zoom,
    });
  }

  toGeojsonPoint(coords: [number, number]) {
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: coords,
          },
        },
      ],
    };
  }

  fetchLocations() {
    return this.http.get(environment.apiUrl + '/location');
  }

  updateLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const body = {
          payload: {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            direction: pos.coords.heading ? pos.coords.heading : 0,
          },
        };

        this.http.post(environment.apiUrl + '/location', body).subscribe();
      });
    }
  }
}
