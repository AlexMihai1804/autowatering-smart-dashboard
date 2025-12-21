declare module 'd3-geo-projection' {
  // Minimal typing shim for ESM-only d3-geo-projection.
  // We only use geoInterruptedHomolosine() to project lon/lat -> meters.
  export function geoInterruptedHomolosine(): any;
}
