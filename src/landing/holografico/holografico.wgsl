// Adaptado do exemplo "Holographic Card" do vgpu (https://vgpu.sh, revisão af8ab2106af8…), que
// desenha um cartão de grafite com gravações holográficas reveladas pela aproximação do cursor.
// As funções de material abaixo (difração, perolado, gravações) são as do exemplo, sem
// mudanças. O que mudou fica todo em fs_main:
//   - o cartão ocupa o canvas inteiro, na proporção da moldura do projeto (o exemplo desenhava um
//     cartão retrato no meio de um fundo, com sombra);
//   - a inclinação da moldura é feita pelo CSS da página, então aqui ela só muda a luz e a
//     difração, e não a geometria (assim o brilho fica preso à imagem do app);
//   - o cartão não tem cor própria: sai preto onde não há brilho, e a página mistura o canvas sobre
//     o vídeo do app com mix-blend-mode: screen (preto não muda nada);
//   - o padrão é só uma marca d'água: as gravações onduladas no cartão inteiro, discretas, sem o
//     triângulo fractal, os contornos, a cruz e as marcas de registro do exemplo;
//   - sem o texto do exemplo ("vgpu. Holographic..."), que era a marca dele.
struct Params {
  resolution: vec2f,
  tilt: vec2f,
  pointer: vec2f,
  hover: f32,
  // Raio do canto da moldura, em unidades do cartão (meia altura = 0,91)
  corner: f32,
}
@group(0) @binding(0) var<uniform> params: Params;

fn roundedBox(p: vec2f, halfSize: vec2f, radius: f32) -> f32 {
  let q = abs(p) - halfSize + radius;
  return length(max(q, vec2f(0))) + min(max(q.x, q.y), 0.0) - radius;
}

fn stroke(distance: f32, width: f32, aa: f32) -> f32 {
  return 1.0 - smoothstep(width, width + aa, abs(distance));
}

// Approximate visible wavelengths in micrometers with smooth display RGB responses.
fn wavelengthColor(wavelength: f32) -> vec3f {
  let response = (vec3f(wavelength) - vec3f(0.610, 0.545, 0.460)) / vec3f(0.045, 0.038, 0.032);
  let visible = smoothstep(0.380, 0.410, wavelength) * (1.0 - smoothstep(0.700, 0.780, wavelength));
  return exp(-0.5 * response * response) * visible;
}

// Reflection grating approximation: m * wavelength = d * dot(L + V, across).
// L and V point away from the surface; across is perpendicular to the grooves.
// Based on the diffraction-order model in GPU Gems, chapter 8 (Jos Stam).
fn diffraction(across: vec2f, lightAndView: vec2f, spacing: f32) -> vec3f {
  let pathDifference = spacing * abs(dot(lightAndView, across));
  let along = dot(lightAndView, vec2f(-across.y, across.x));
  // Finite, imperfect groove patches broaden the directional reflection.
  let envelope = exp(-along * along / 0.36);
  var reflected = vec3f(0);
  for (var order = 1; order <= 3; order++) {
    let m = f32(order);
    reflected += wavelengthColor(pathDifference / m) / (m * m);
  }
  return reflected * envelope;
}

// Broad, art-directed pearlescence underneath the finer diffraction detail.
fn pearlColor(phase: f32) -> vec3f {
  return vec3f(0.55, 0.52, 0.64) + vec3f(0.43, 0.40, 0.34)
    * cos(6.2831853 * (phase + vec3f(0.05, 0.38, 0.63)));
}

fn grain(point: vec2f) -> f32 {
  let p = vec2u(abs(point) * 2400.0);
  var n = (p.x * 1597334677u) ^ (p.y * 3812015801u);
  n = (n ^ (n >> 16u)) * 2246822519u;
  return f32(n & 1023u) / 1023.0 - 0.5;
}

fn etchedPhase(p: vec2f) -> f32 {
  // Warp the surface before tracing contours, so their spacing flows in soft waves.
  let warp = vec2f(
    sin(p.y * 7.0 + sin(p.x * 4.0)) * 0.085,
    sin(p.x * 6.0 - p.y * 3.0) * 0.07
  );
  let q = p + warp - vec2f(0.13, 0.08);
  let radius = length(q * vec2f(1.0, 0.76));
  return radius * 142.0 + sin(atan2(q.y, q.x) * 3.0 + radius * 8.0) * 1.7;
}

// Força geral do brilho sobre a imagem do app
const INTENSITY: f32 = 0.75;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let resolution = max(params.resolution, vec2f(1));
  // O cartão preenche a moldura: meia altura 0,91 como no exemplo, e a largura segue a proporção
  let halfSize = vec2f(0.91 * resolution.x / resolution.y, 0.91);
  let p = (uv - 0.5) * 2.0 * halfSize;
  let sx = sin(params.tilt.y);
  let cx = cos(params.tilt.y);
  let sy = sin(params.tilt.x);
  let cy = cos(params.tilt.x);
  let right = vec3f(cy, 0, -sy);
  let down = vec3f(sy * sx, cx, cy * sx);
  let normal = cross(right, down);
  let eye = vec3f(0, 0, 4.5);
  // Ponto no plano inclinado do cartão: só a luz enxerga a inclinação
  let hit = right * p.x + down * p.y;
  let aa = max(length(fwidth(p)), 0.0006);
  let edge = roundedBox(p, halfSize, params.corner);

  // Só a luz rasante do cursor revela o foil
  let hover = clamp(params.hover, 0.0, 1.0);
  let lightCenter = params.pointer * halfSize;
  let delta = p - lightCenter;
  let sweepDistance = delta.x * 0.72 + delta.y * 0.52 + sin(p.y * 4.0 + p.x * 3.0) * 0.08;
  let bandDistance = sweepDistance / 0.36;
  let lightBand = exp(-bandDistance * bandDistance);
  let glintDistance = sweepDistance / 0.085;
  let glint = exp(-glintDistance * glintDistance);
  let spotlight = exp(-dot(delta * vec2f(1.05, 0.72), delta * vec2f(1.05, 0.72)) * 2.6);
  let light = lightBand * spotlight * hover;
  let lightDirection = normalize(vec3f(lightCenter, 1.2) - hit);
  let viewDirection = normalize(eye - hit);
  let lightAndView = vec2f(dot(lightDirection + viewDirection, right), dot(lightDirection + viewDirection, down));
  let illumination = max(dot(normal, lightDirection), 0.0) * max(dot(normal, viewDirection), 0.0);
  let tint = vec3f(0.72, 0.76, 0.8);
  let noise = grain(p + vec2f(2));
  // Sem o grafite de base: o grão só aparece onde a luz passa
  var color = vec3f(0);
  color += max(noise, 0.0) * light * 0.085;
  color += light * (vec3f(0.045) + tint * 0.065);

  // Marca d'água: só as gravações onduladas do exemplo, no cartão inteiro e mais discretas (sem o
  // triângulo fractal, os contornos, a cruz e as marcas de registro do exemplo)
  let contour = etchedPhase(p);
  // Transform screen derivatives back into the card plane: microscopic grooves
  // follow the visible contours, but their 1.65um spacing is independent of zoom.
  let dx = dpdx(p);
  let dy = dpdy(p);
  let gradient = vec2f(dpdx(contour) * dy.y - dpdy(contour) * dx.y, dpdy(contour) * dx.x - dpdx(contour) * dy.x);
  let across = gradient / max(length(gradient), 0.00000001);
  let grooveDiffraction = diffraction(across, lightAndView, 1.65) * illumination;
  let contours = stroke(sin(contour), 0.05, min(fwidth(contour), 1.0));
  // Quase nada fora da luz; a marca aparece onde o cursor passa
  let reveal = hover * (0.02 + 0.12 * spotlight + light * 0.7);
  let pearlPhase = dot(lightAndView, vec2f(0.48, -0.32)) + p.y * 0.32 + contour * 0.003;
  let pearl = pearlColor(pearlPhase);
  color += pearl * light * 0.2;
  color += (pearl * 0.5 + vec3f(0.5)) * glint * spotlight * hover * 0.1;
  let sparkle = pow(max(noise + 0.5, 0.0), 24.0) * glint * spotlight * hover;
  color += pearl * sparkle * 0.18;
  let foil = vec3f(0.12, 0.14, 0.18) + pearl * 0.65 + grooveDiffraction * 0.12;
  color += contours * 0.5 * foil * reveal;

  // Um eco espectral fino, deslocado com a inclinação, nas mesmas gravações
  let foilOffset = vec2f(0.007, -0.004) + params.tilt * 0.012;
  let foilPhase = etchedPhase(p - foilOffset);
  let foilLines = stroke(sin(foilPhase), 0.025, min(fwidth(foilPhase), 1.0));
  color += foilLines * 0.5 * (pearl + grooveDiffraction * 0.2) * reveal * 0.2;

  // A borda da moldura acende perto da luz
  let rim = stroke(edge + 0.002, 0.0008, aa * 0.7);
  let rimLight = pow(max(0.0, 1.0 - length(delta) * 0.65), 3.0) * hover;
  color += rim * (pearl * 0.7 + tint * 0.3) * rimLight * 0.6;

  return vec4f(color * INTENSITY, 1.0);
}
