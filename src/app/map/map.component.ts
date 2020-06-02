import { Component, OnInit } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements OnInit {
  map: mapboxgl.Map;
  currentPosistion: [number, number];
  marker: mapboxgl.Marker;

  constructor() {}

  ngOnInit() {
    this.map = new mapboxgl.Map({
      accessToken:
        'pk.eyJ1IjoiYmFmZmlvc28iLCJhIjoiT1JTS1lIMCJ9.f5ubY91Bi42yPnTrgiq-Gw',
      container: 'map', // container id
      style: 'mapbox://styles/baffioso/ckavgjc4z235f1il3hef9gz2q', // stylesheet location
      center: [12.595, 55.674], // starting position [lng, lat]
      zoom: 13, // starting zoom
    });

    this.map.on('load', () => {
      this.addBoatIcon([12.563738, 55.660052], 155);

      this.flyTo([12.563738, 55.660052], 14);
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

  fetchLocations() {}
}
