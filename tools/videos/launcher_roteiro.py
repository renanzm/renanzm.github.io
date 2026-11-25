"""Roteiro da gravação do App Launcher (chamado por gravar-launcher.mjs).

Roda uma cópia isolada do launcher (outro app_id e pasta Apps própria). Os quadros saem de
window.grab() (renderização do próprio Qt, sem captura de tela) e vão direto para o ffmpeg em
30 fps. Os cliques usam QTest; o cursor é um widget desenhado dentro da janela.

Variáveis de ambiente: LAUNCHER_COPIA (pasta com o pacote "launcher" e o launcher_config.json),
LAUNCHER_BRUTO (vídeo de saída sem acabamento) e FFMPEG.
"""
import os
import subprocess
import sys
import time
from pathlib import Path

COPIA = Path(os.environ["LAUNCHER_COPIA"])
BRUTO = Path(os.environ["LAUNCHER_BRUTO"])
FFMPEG = os.environ["FFMPEG"]
FPS = 30
sys.path.insert(0, str(COPIA))

from PyQt6.QtCore import QEasingCurve, QPoint, QPropertyAnimation, Qt, QTimer  # noqa: E402
from PyQt6.QtGui import QColor, QImage, QPainter, QPainterPath, QPen, QPixmap  # noqa: E402
from PyQt6.QtTest import QTest  # noqa: E402
from PyQt6.QtWidgets import QLabel, QScrollArea  # noqa: E402

from launcher.ui import main_window as mw  # noqa: E402


def seta() -> QPixmap:
    pix = QPixmap(30, 30)
    pix.fill(Qt.GlobalColor.transparent)
    p = QPainter(pix)
    p.setRenderHint(QPainter.RenderHint.Antialiasing)
    path = QPainterPath()
    for i, (x, y) in enumerate([(4, 2), (4, 22), (9.5, 17), (13, 25), (17, 23.4), (13.5, 15.8), (20.5, 15.8)]):
        path.moveTo(x, y) if i == 0 else path.lineTo(x, y)
    path.closeSubpath()
    p.setPen(QPen(QColor(17, 17, 17), 1.6))
    p.setBrush(QColor(255, 255, 255))
    p.drawPath(path)
    p.end()
    return pix


class Gravador:
    def __init__(self, win):
        self.win = win
        self.proc = None
        self.inicio = 0.0
        self.escritos = 0
        self.timer = QTimer(win)
        self.timer.setTimerType(Qt.TimerType.PreciseTimer)
        self.timer.timeout.connect(self.quadro)

    def iniciar(self):
        img = self._imagem()
        self.tamanho = (img.width(), img.height())
        self.proc = subprocess.Popen(
            [FFMPEG, "-y", "-hide_banner", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgra",
             "-s", f"{img.width()}x{img.height()}", "-r", str(FPS), "-i", "-",
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "14", "-pix_fmt", "yuv420p", str(BRUTO)],
            stdin=subprocess.PIPE)
        self.inicio = time.perf_counter()
        self.timer.start(1000 // FPS)
        self.quadro()

    def _imagem(self) -> QImage:
        return self.win.grab().toImage().convertToFormat(QImage.Format.Format_ARGB32)

    def quadro(self):
        img = self._imagem()
        if (img.width(), img.height()) != self.tamanho:
            img = img.scaled(*self.tamanho)
        ptr = img.constBits()
        ptr.setsize(img.sizeInBytes())
        dados = bytes(ptr)
        alvo = int((time.perf_counter() - self.inicio) * FPS) + 1
        while self.escritos < alvo:  # mantém o ritmo real mesmo se o timer atrasar
            self.proc.stdin.write(dados)
            self.escritos += 1

    def parar(self):
        self.timer.stop()
        self.proc.stdin.close()
        self.proc.wait()


class Roteiro:
    def __init__(self, win):
        self.win = win
        self.cursor = QLabel(win)
        self.cursor.setPixmap(seta())
        self.cursor.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents)
        self.cursor.resize(30, 30)
        self.cursor.move(win.width() // 2 + 120, win.height() // 2 + 60)
        self.cursor.show()
        self.gravador = Gravador(win)
        self.anims = []

    def _acima(self):
        self.cursor.raise_()

    def apontar(self, widget, dx=0.5, dy=0.5, ms=750):
        alvo = widget.mapTo(self.win, QPoint(int(widget.width() * dx), int(widget.height() * dy)))
        anim = QPropertyAnimation(self.cursor, b"pos", self.win)
        anim.setDuration(ms)
        anim.setStartValue(self.cursor.pos())
        anim.setEndValue(alvo - QPoint(4, 2))
        anim.setEasingCurve(QEasingCurve.Type.InOutCubic)
        anim.start()
        self.anims.append(anim)
        self._acima()

    def clicar(self, widget):
        self._acima()
        QTest.mouseClick(widget, Qt.MouseButton.LeftButton)
        self._acima()

    def rolar_notas(self, ate=420, ms=1400):
        area = self.win.notes if isinstance(self.win.notes, QScrollArea) else self.win.notes.findChild(QScrollArea)
        if not area:
            return
        barra = area.verticalScrollBar()
        anim = QPropertyAnimation(barra, b"value", self.win)
        anim.setDuration(ms)
        anim.setStartValue(barra.value())
        anim.setEndValue(min(ate, barra.maximum()))
        anim.setEasingCurve(QEasingCurve.Type.InOutCubic)
        anim.start()
        self.anims.append(anim)

    def executar(self, passos):
        """passos: lista de (espera_ms, função). Cada espera conta a partir do passo anterior."""
        def proximo(i=0):
            if i >= len(passos):
                return
            atraso, f = passos[i]
            QTimer.singleShot(atraso, lambda: (f(), proximo(i + 1)))
        proximo()


def iniciar_roteiro(win):
    r = Roteiro(win)
    tile = win.sidebar.group.button
    aba = win.topbar.tabs.button
    play = win.bar.play
    fim = {"feito": False}

    def esperar_instalacao():
        # Termina quando o botão principal vira "Abrir" (ou depois de 14 s)
        inicio = time.perf_counter()

        def checar():
            texto = play.text().lower()
            if ("abrir" in texto or "open" in texto or time.perf_counter() - inicio > 14) and not fim["feito"]:
                fim["feito"] = True
                QTimer.singleShot(1800, encerrar)
            elif not fim["feito"]:
                QTimer.singleShot(150, checar)
        QTimer.singleShot(400, checar)

    def encerrar():
        r.gravador.parar()
        print("GRAVADO", r.gravador.escritos, flush=True)
        win.close()

    # Sound Mod → Usage Widget → Notas de versão (rolando) → Início → Sound Mod → Instalar
    r.executar([
        (8000, r.gravador.iniciar),  # espera dados, imagens e ícones do GitHub
        (1400, lambda: r.apontar(tile(1))),
        (800, lambda: r.clicar(tile(1))),
        (2200, lambda: r.apontar(aba(1))),
        (800, lambda: r.clicar(aba(1))),
        (900, lambda: r.rolar_notas()),
        (2200, lambda: r.apontar(aba(0))),
        (800, lambda: r.clicar(aba(0))),
        (700, lambda: r.apontar(tile(0))),
        (800, lambda: r.clicar(tile(0))),
        (1500, lambda: r.apontar(play)),
        (850, lambda: r.clicar(play)),
        (10, esperar_instalacao),
    ])


_show = mw.MainWindow.show


def show(self):
    _show(self)
    QTimer.singleShot(0, lambda: iniciar_roteiro(self))


mw.MainWindow.show = show

if __name__ == "__main__":
    from launcher import app
    sys.exit(app.main(["launcher", "--config", str(COPIA / "launcher_config.json"), "--lang", "pt-BR", "--no-splash"]))
