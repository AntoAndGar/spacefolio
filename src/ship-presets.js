export const SHIP_PRESETS = {
  // keys = file name without extension, lowercase
  "x_wing":               { yaw: -Math.PI,   scale: 0.07, offset: [0, 0.00, 0],  shipRadius: 2.5, name: "X-Wing" },
  "spaceship_rescue":     { yaw: -Math.PI/2, scale: 3.55, offset: [0, 0.00, 0],  shipRadius: 1.5, name: "Spaceship Rescue" },
  "spaceship_futuristic": { yaw: -Math.PI,   scale: 0.50, offset: [0, 0.00, -4], shipRadius: 2.5, name: "Spaceship Futuristic" },
  "falcon":               { yaw:  Math.PI,   scale: 0.04, offset: [0, 0.00, 0],  shipRadius: 1.8, name: "Millennium Falcon" },
  "ufo_mk2":              { yaw: -Math.PI/2, scale: 1.20, offset: [0, 0.00, 0],  shipRadius: 1.2, name: "UFO Mk2" },
  "interceptor":          { yaw:  0,         scale: 0.65, shipRadius: 1.0, name: "Interceptor" },
  "default":              { yaw: -Math.PI/2, scale: 1.55, offset: [0, 0.00, 0],  shipRadius: 1.0, name: "Default Ship" }
};