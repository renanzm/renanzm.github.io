// Emissores a partir de uma imagem enviada pela página (os riscos de luz da abertura), no lugar
// da pintura com o cursor do exemplo "Radiance Cascades". Mesmo formato de saída do
// paint-emitter.wgsl: RGB é a radiância linear e A é a máscara de onde o jump flood semeia.
// A imagem chega nova a cada quadro, então não há acumulação.
//
// O alfa da imagem é a forma do risco (o jump flood só semeia acima de 0,5) e o vermelho é o
// quanto ele ainda brilha: assim o risco apaga devagar, sem a luz sumir de uma vez quando o
// alfa passasse de 0,5.

struct Emissor {
  /** RGB radiance (linear HDR); A multiplies it. */
  radiance: vec4f,
};

@group(0) @binding(0) var<uniform> emissor: Emissor;
@group(0) @binding(1) var imagem: texture_2d<f32>;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let size = vec2f(textureDimensions(imagem));
  let texel = vec2i(clamp(floor(uv * size), vec2f(0.0), size - 1.0));
  let pixel = textureLoad(imagem, texel, 0);
  let mask = pixel.a;
  return vec4f(emissor.radiance.rgb * emissor.radiance.a * pixel.r * mask, mask);
}
