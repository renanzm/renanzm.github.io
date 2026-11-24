---
titulo: Sound Mod
resumo: Soundboard para Windows que toca sons direto no microfone.
descricao: Aperte uma tecla e o som sai no seu microfone, no Discord, no jogo ou na call, enquanto você continua falando. Reescrito do zero em Rust, é um único .exe que abre na hora, sem nada para instalar.
destaques:
  - Hotkeys globais que funcionam com o app minimizado
  - Efeitos de voz ao vivo, de robô a autotune
  - Grava os últimos segundos do áudio do PC para tocar no microfone
  - Interface neon em 8 cores e um tema Vice City
stack: [Rust, egui, WASAPI]
plataforma: Windows
data: 2026-11-21
ordem: 1
cor: '#e879f9'
capa: ../../assets/projetos/sound-mod-rs.png
links:
  - rotulo: Código no GitHub
    url: https://github.com/renanzm/sound-mod-rs
  - rotulo: Manual do usuário
    url: https://github.com/renanzm/sound-mod-rs/blob/master/docs/MANUAL.md
downloads:
  - rotulo: Programa + manual offline (.zip)
    plataforma: windows
    url: https://github.com/renanzm/sound-mod-rs/releases/download/v1.0.0/SoundMod-v1.0.0-windows-x64.zip
    versao: 1.0.0
    tamanho: 5,4 MB
  - rotulo: Só o executável (.exe)
    plataforma: windows
    url: https://github.com/renanzm/sound-mod-rs/releases/download/v1.0.0/SoundMod.exe
    versao: 1.0.0
    tamanho: 9,8 MB
---

Aperte uma tecla (ou clique num botão) e o som sai no canal do seu microfone, para Discord, jogos, chamadas e lives, enquanto você continua falando normalmente. Ele também grava **os últimos segundos do áudio do PC** para você recortar e tocar no microfone.

É a reescrita em Rust do [Sound Mod original em Python](/projetos/sound-mod): um único `.exe`, sem runtime e sem nada para instalar.

## Destaques

- **Hotkeys globais** (F1, F2, `Ctrl+1`...) que funcionam com o app minimizado, sem bloquear a tecla no jogo.
- **Microfone e sons juntos**, sem trocar de dispositivo.
- **Efeitos de voz ao vivo**: Grave, Agudo, Robô, Ogro, Autotune, Eco, Rádio e Alien.
- **Clipe do áudio do PC** com forma de onda, recorte, mudança de tom e "Salvar como som".
- **Coleções**, ordem personalizada e lista compacta para organizar muitos sons.
- **Interface neon** em 8 cores mais o tema Vice City, em português e inglês.

## Como funciona

O Windows não deixa injetar áudio num microfone físico, então o app usa um cabo de áudio virtual, o [VB-CABLE](https://vb-audio.com/Cable/) (gratuito). Instale o cabo, reinicie o PC e escolha **CABLE Output** como microfone no Discord ou no jogo.

> O programa ainda não tem assinatura digital. Na primeira vez, o SmartScreen pode mostrar um aviso: clique em **Mais informações → Executar assim mesmo**.
