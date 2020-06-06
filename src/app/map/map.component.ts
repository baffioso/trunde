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
      // this.addDancingBuildings();

      this.fetchLocations().subscribe((res: any) => {
        const payload = res.locations[0].payload;
        const lastPosistion: [number, number] = [payload.lon, payload.lat];
        this.addBoatIcon(lastPosistion, payload.direction);
        this.flyTo(lastPosistion, 14);
      });

      interval(2 * 1000).subscribe(() => {
        this.fetchLocations().subscribe((res: any) => {
          const payload = res.locations[0].payload;
          const lastPosistion: [number, number] = [payload.lon, payload.lat];

          // update data
          (this.map.getSource('boat') as mapboxgl.GeoJSONSource).setData(
            this.toGeojsonPoint(lastPosistion) as any
          );

          // change boat icon direction
          this.map.setLayoutProperty('boat', 'icon-rotate', payload.direction);

          // zoom to last position
          this.flyTo(lastPosistion, 16);
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
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          direction: pos.coords.heading ? pos.coords.heading : 0,
        };

        this.http.post(environment.apiUrl + '/location', body).subscribe();
      });
    }
  }

  addDancingBuildings() {
    const bins = 16;
    const maxHeight = 200;
    const binWidth = maxHeight / bins;

    // Divide the buildings into 16 bins based on their true height, using a layer filter.
    for (let i = 0; i < bins; i++) {
      this.map.addLayer({
        id: '3d-buildings-' + i,
        source: 'composite',
        'source-layer': 'building',
        filter: [
          'all',
          ['==', 'extrude', 'true'],
          ['>', 'height', i * binWidth],
          ['<=', 'height', (i + 1) * binWidth],
        ],
        type: 'fill-extrusion',
        minzoom: 2,
        paint: {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height-transition': {
            duration: 0,
            delay: 0,
          },
          'fill-extrusion-opacity': 0.6,
        },
      });
    }

    // Older browsers might not implement mediaDevices at all, so we set an empty object first

    const navigatorCopy = navigator as any;
    if (navigatorCopy.mediaDevices === undefined) {
      navigatorCopy.mediaDevices = {};
    }
    // if (navigator.mediaDevices === undefined) {
    //   navigator.mediaDevices = {};
    // }

    // Some browsers partially implement mediaDevices. We can't just assign an object
    // with getUserMedia as it would overwrite existing properties.
    // Here, we will just add the getUserMedia property if it's missing.
    if (navigatorCopy.mediaDevices.getUserMedia === undefined) {
      navigatorCopy.mediaDevices.getUserMedia = (constraints) => {
        // First get ahold of the legacy getUserMedia, if present
        const getUserMedia =
          navigatorCopy.webkitGetUserMedia || navigatorCopy.mozGetUserMedia;

        // Some browsers just don't implement it - return a rejected promise with an error
        // to keep a consistent interface
        if (!getUserMedia) {
          return Promise.reject(
            new Error('getUserMedia is not implemented in this browser')
          );
        }

        // Otherwise, wrap the call to the old navigatorCopy.getUserMedia with a Promise
        return new Promise((resolve, reject) => {
          getUserMedia.call(navigatorCopy, constraints, resolve, reject);
        });
      };
    }

    navigatorCopy.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        // Set up a Web Audio AudioContext and AnalyzerNode, configured to return the
        // same number of bins of audio frequency data.
        var audioCtx = new (window['AudioContext'] ||
          window['webkitAudioContext'])();

        var analyser = audioCtx.createAnalyser();
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        analyser.smoothingTimeConstant = 0.85;

        var source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        analyser.fftSize = bins * 2;

        var dataArray = new Uint8Array(bins);

        const draw = (now) => {
          analyser.getByteFrequencyData(dataArray);

          // Use that data to drive updates to the fill-extrusion-height property.
          var avg = 0;
          for (var i = 0; i < bins; i++) {
            avg += dataArray[i];
            this.map.setPaintProperty(
              '3d-buildings-' + i,
              'fill-extrusion-height',
              10 + 4 * i + dataArray[i]
            );
          }
          avg /= bins;

          // Animate the map bearing and light color over time, and make the light more
          // intense when the audio is louder.
          // this.map.setBearing(now / 500);
          this.map.setLight({
            color:
              'hsl(' +
              ((now / 100) % 360) +
              ',' +
              Math.min(50 + avg / 4, 100) +
              '%,50%)',
            intensity: Math.min(1, (avg / 256) * 10),
          });

          requestAnimationFrame(draw);
        };

        requestAnimationFrame(draw);
      })
      .catch((err) => {
        console.log('The following gUM error occured: ' + err);
      });
  }
}
