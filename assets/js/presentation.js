/**
 * PresentationEngine - Motor de presentación
 * Data Strategic Transformation | Moneda Patria
 */

class PresentationEngine {
    constructor() {
        this.baseWidth = 1920;
        this.baseHeight = 1080;
        this.currentSlide = 0;
        this.slides = document.querySelectorAll('.slide');
        this.indicators = document.querySelectorAll('.indicator');
        this.totalSlides = this.slides.length;
        this.container = document.getElementById('presentationContainer');
        this.isTransitioning = false;
        this.isScaling = false;
        this.resizeTimeout = null;

        this.init();
    }

    init() {
        // Configurar eventos de botones
        document.getElementById('prevBtn')?.addEventListener('click', () => this.prevSlide());
        document.getElementById('nextBtn')?.addEventListener('click', () => this.nextSlide());
        document.getElementById('fullscreenBtn')?.addEventListener('click', () => this.toggleFullscreen());

        // Configurar indicadores
        this.indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => this.goToSlide(index));
        });

        // Teclado
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Touch/swipe support
        this.initTouchSupport();

        // Resize con debounce para evitar múltiples llamadas
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => this.scaleToFit(), 150);
        });
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());

        // Escalar inicialmente
        this.scaleToFit();
        
        // Encontrar el slide activo inicial
        this.slides.forEach((slide, index) => {
            if (slide.classList.contains('active')) {
                this.currentSlide = index;
            }
        });

        // Iniciar animaciones
        this.initAnimations();
    }

    initTouchSupport() {
        let touchStartX = 0;
        let touchStartY = 0;

        this.container.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });

        this.container.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const deltaX = touchStartX - touchEndX;
            const deltaY = Math.abs(touchStartY - touchEndY);

            if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > deltaY) {
                if (deltaX > 0) {
                    this.nextSlide();
                } else {
                    this.prevSlide();
                }
            }
        });
    }

    initAnimations() {
        // Animar números cuando el slide esté activo
        this.animateNumbers();

        // Animar gráfico circular en Slide 3
        this.animateCircularProgress();
    }

    animateNumbers() {
        const animateValue = (element, start, end, duration) => {
            if (!element) return;

            const range = end - start;
            const increment = end > start ? 1 : -1;
            const stepTime = Math.abs(Math.floor(duration / range));
            let current = start;

            const timer = setInterval(() => {
                current += increment;
                element.textContent = current + (element.dataset.suffix || '');
                if (current === end) {
                    clearInterval(timer);
                }
            }, stepTime);
        };

        // Animar números en slides activos
        const activeSlide = this.slides[this.currentSlide];
        activeSlide.querySelectorAll('[data-animate-number]').forEach(el => {
            const endValue = parseInt(el.dataset.animateNumber);
            animateValue(el, 0, endValue, 1000);
        });
    }

    animateCircularProgress() {
        const activeSlide = this.slides[this.currentSlide];
        if (!activeSlide) return;

        const progressRing = activeSlide.querySelector('.progress-ring');
        if (progressRing) {
            // PASO 1: Remover transición temporalmente para reset instantáneo
            progressRing.style.transition = 'none';
            progressRing.style.animation = 'none';

            // PASO 2: Forzar estado inicial (vacío) inmediatamente
            progressRing.style.strokeDashoffset = '628.3';

            // PASO 3: Forzar reflow para que el navegador aplique el cambio
            void progressRing.offsetWidth;

            // PASO 4: Re-habilitar transición y animar
            requestAnimationFrame(() => {
                progressRing.style.transition = 'stroke-dashoffset 2s ease-out';
                progressRing.style.animation = '';

                // PASO 5: Animar al estado final (70% lleno)
                requestAnimationFrame(() => {
                    progressRing.style.strokeDashoffset = '188.5';
                });
            });
        }
    }

    scaleToFit() {
        // Evitar ejecuciones concurrentes
        if (this.isScaling) return;
        this.isScaling = true;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Detectar DPI/escala del sistema
        const dpr = window.devicePixelRatio || 1;

        // Calcular escalas base
        const scaleX = viewportWidth / this.baseWidth;
        const scaleY = viewportHeight / this.baseHeight;
        const baseScale = Math.min(scaleX, scaleY);

        // Determinar si estamos en fullscreen
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;

        // Calcular margen dinámico basado en viewport y DPI
        let margin;
        if (isFullscreen) {
            margin = 1.0; // Sin margen en fullscreen
        } else if (viewportWidth <= 1280 && dpr >= 1.5) {
            // Rango crítico: exactamente 1280px con escala 150% (Windows 1080p @ 150%)
            margin = 0.88; // Margen más agresivo para evitar overflow horizontal
        } else if (viewportWidth < 1280 || viewportHeight < 720) {
            margin = 0.96; // Margen mayor para viewports muy pequeños
        } else if (viewportWidth < 1600 && (dpr > 1 || viewportWidth < 1440)) {
            // Rango problemático: 1280-1600px con DPR > 1 o viewports < 1440
            margin = 0.92; // Margen más agresivo para configuraciones problemáticas
        } else if (dpr > 1.5) {
            margin = 0.94; // Margen para pantallas de alta densidad
        } else {
            margin = 0.95; // Margen estándar
        }

        // Aplicar límites para evitar escalados extremos
        const minScale = 0.4;
        const maxScale = 1.5;
        let scale = baseScale * margin;
        scale = Math.max(minScale, Math.min(maxScale, scale));

        // Aplicar transformación con centrado - SIEMPRE incluir translate
        this.container.style.transform = `translate(-50%, -50%) scale(${scale})`;

        // Single-pass overflow check sin recursión
        if (margin > 0.90) {
            requestAnimationFrame(() => {
                this.checkAndFixOverflow(scale);
                this.isScaling = false;
            });
        } else {
            this.isScaling = false;
        }
    }

    checkAndFixOverflow(currentScale) {
        const rect = this.container.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Verificar si hay overflow con tolerancia muy pequeña
        const tolerance = 2;
        const hasOverflow =
            rect.right > viewportWidth + tolerance ||
            rect.bottom > viewportHeight + tolerance ||
            rect.left < -tolerance ||
            rect.top < -tolerance;

        if (hasOverflow) {
            // Calcular cuánto necesitamos reducir
            const overflowRight = Math.max(0, rect.right - viewportWidth);
            const overflowBottom = Math.max(0, rect.bottom - viewportHeight);
            const overflowLeft = Math.max(0, -rect.left);
            const overflowTop = Math.max(0, -rect.top);

            const maxOverflow = Math.max(overflowRight, overflowBottom, overflowLeft, overflowTop);

            // Calcular factor de ajuste basado en el overflow
            const adjustmentFactor = maxOverflow > 20 ? 0.96 : 0.98;
            const adjustedScale = currentScale * adjustmentFactor;

            // CRÍTICO: Siempre mantener translate(-50%, -50%) para centrado
            this.container.style.transform = `translate(-50%, -50%) scale(${adjustedScale})`;

            // Sin recursión - single-pass adjustment
        }
    }

    showSlide(index) {
        if (this.isTransitioning) return;
        if (index < 0 || index >= this.totalSlides) return;
        
        // Permitir navegación incluso si es el mismo slide (para refrescar)
        this.isTransitioning = true;

        // Remover todas las clases primero
        this.slides.forEach(slide => {
            slide.classList.remove('active', 'prev', 'slide-index');
        });
        
        // Aplicar las clases según la posición
        this.slides.forEach((slide, i) => {
            if (i < index) {
                slide.classList.add('prev');
            } else if (i === index) {
                slide.classList.add('active');
                // Mantener la clase slide-index si es el slide 0
                if (i === 0) {
                    slide.classList.add('slide-index');
                }
            }
        });

        // Actualizar indicadores
        this.indicators.forEach((indicator, i) => {
            indicator.classList.remove('active');
            if (i === index) {
                indicator.classList.add('active');
            }
        });
        
        // Actualizar barra de progreso
        this.updateProgressBar(index);

        this.currentSlide = index;

        // Reiniciar animaciones para el nuevo slide
        setTimeout(() => {
            this.initAnimations();
        }, 300);

        setTimeout(() => {
            this.isTransitioning = false;
        }, 600);
    }
    
    updateProgressBar(index) {
        const progressBar = document.querySelector('.slide-progress');
        if (progressBar) {
            const percentage = ((index + 1) / this.totalSlides) * 100;
            progressBar.style.height = `${percentage}%`;
        }
    }

    goToSlide(index) {
        // Forzar la transición incluso si es el mismo slide
        if (index === this.currentSlide) {
            // Si es el mismo slide, refrescar
            this.slides[index].classList.remove('active');
            setTimeout(() => {
                this.showSlide(index);
            }, 10);
        } else {
            this.showSlide(index);
        }
    }

    nextSlide() {
        const next = (this.currentSlide + 1) % this.totalSlides;
        this.showSlide(next);
    }

    prevSlide() {
        const prev = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
        this.showSlide(prev);
    }

    handleKeyboard(e) {
        switch (e.key) {
            case 'ArrowRight':
            case ' ':
                e.preventDefault();
                this.nextSlide();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.prevSlide();
                break;
            case 'Escape':
                if (document.fullscreenElement || document.webkitFullscreenElement) {
                    this.exitFullscreen();
                }
                break;
            case 'f':
            case 'F':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.toggleFullscreen();
                }
                break;
            default:
                if (e.key >= '1' && e.key <= '9') {
                    const slideIndex = parseInt(e.key) - 1;
                    if (slideIndex < this.totalSlides) {
                        this.goToSlide(slideIndex);
                    }
                }
                break;
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            }
        } else {
            this.exitFullscreen();
        }
    }

    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }

    handleFullscreenChange() {
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
        const navigation = document.querySelector('.navigation');

        if (isFullscreen) {
            navigation?.classList.add('fullscreen');
        } else {
            navigation?.classList.remove('fullscreen');
        }

        setTimeout(() => this.scaleToFit(), 100);
    }
}

// Inicializar la presentación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const presentation = new PresentationEngine();
    
    // Hacer la instancia disponible globalmente para el botón de inicio
    window.presentationApp = presentation;
    
    // Agregar funcionalidad a los cards del índice
    document.querySelectorAll('.section-card').forEach(card => {
        card.addEventListener('click', function() {
            const targetSlide = parseInt(this.dataset.slide);
            presentation.goToSlide(targetSlide);
        });
    });
});