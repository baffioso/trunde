import { Component, OnInit } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements OnInit {
  constructor() {}

  ngOnInit() {
    let map = new mapboxgl.Map({
      accessToken:
        'pk.eyJ1IjoiYmFmZmlvc28iLCJhIjoiT1JTS1lIMCJ9.f5ubY91Bi42yPnTrgiq-Gw',
      container: 'map', // container id
      style: 'mapbox://styles/baffioso/ckavgjc4z235f1il3hef9gz2q', // stylesheet location
      center: [12.595, 55.674], // starting position [lng, lat]
      zoom: 13, // starting zoom
    });

    map.on('load', () => {
      console.log('object');
    });
  }
}
