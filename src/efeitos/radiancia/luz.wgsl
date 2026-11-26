import { rc_atlas_texel, rc_block_size, rc_ray_count } from "./rc-directions.wgsl";

// Adaptado de present.wgsl do exemplo "Radiance Cascades" do vgpu, para os riscos de luz da
// abertura: só a luz que os emissores jogam em volta, sem a grade e sem desenhar os próprios
// emissores (a página desenha os riscos nítidos num canvas 2D por cima, na resolução da tela).
// A "parede" que a luz ilumina é o fundo preto da abertura: o canvas sai preto onde não há luz.
// Tonemap ACES e sRGB uma vez só, aqui, como no exemplo.
//
// A luz é atenuada pela distância até o risco mais próximo (o campo de distância que a cadeia já
// calcula). Em 2D, um risco comprido ilumina quase a cena inteira por igual (a irradiância cai
// só com 1/r); a atenuação, perto de 1/r² como numa luz real, deixa a luz em volta dos riscos e
// mantém as sombras suaves que eles fazem uns nos outros.

fn tonemap_aces(color: vec3f) -> vec3f {
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e = 0.14;
  return clamp(
    (color * (a * color + b)) / (color * (c * color + d) + e),
    vec3f(0.0),
    vec3f(1.0),
  );
}

fn linear_to_srgb(color: vec3f) -> vec3f {
  let low = color * 12.92;
  let high =
    1.055 * pow(max(color, vec3f(0.0)), vec3f(1.0 / 2.4)) - 0.055;
  return select(high, low, color <= vec3f(0.0031308));
}

struct Luz {
  /** x: intensity (fades in and out), y: exposure, z: falloff radius (scene pixels). */
  params: vec4f,
};

@group(0) @binding(0) var<uniform> luz: Luz;
@group(0) @binding(1) var cascade_tex: texture_2d<f32>;
@group(0) @binding(2) var emitter_tex: texture_2d<f32>;
@group(0) @binding(3) var sdf_tex: texture_2d<f32>;

/** Irradiance at a pixel: the mean of cascade 0's four rays (as in the example's present). */
fn resolve_cascade0(pixel: vec2f) -> vec3f {
  let block = rc_block_size(0.0);
  let rays = rc_ray_count(0.0);
  let atlas_size = vec2f(textureDimensions(cascade_tex));
  let probe = clamp(floor(pixel), vec2f(0.0), atlas_size / block - 1.0);
  var total = vec3f(0.0);
  for (var i = 0.0; i < rays; i = i + 1.0) {
    let coord = rc_atlas_texel(probe, i, block);
    total += textureLoad(cascade_tex, vec2i(coord), 0).rgb;
  }
  return total / rays;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let size = vec2f(textureDimensions(emitter_tex));
  let pixel = uv * size;
  let irradiance = resolve_cascade0(pixel);
  let texel = vec2i(clamp(floor(pixel), vec2f(0.0), size - 1.0));
  let distance_px = textureLoad(sdf_tex, texel, 0).r;
  let falloff = 1.0 / (1.0 + pow(distance_px / max(luz.params.z, 1.0), 2.0));
  // Albedo médio da grade do exemplo (0,38): a luz cai numa parede neutra
  let lit = irradiance * falloff * 0.38 * luz.params.x * luz.params.y;
  return vec4f(linear_to_srgb(tonemap_aces(lit * 0.85)), 1.0);
}
