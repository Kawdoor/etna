import React, { useEffect, useRef } from 'react';

export const FloatingGeometryHero: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = container.clientWidth;
        let height = container.clientHeight;
        
        let mouseX = width / 2;
        let mouseY = height / 2;

        const resize = () => {
             width = container.clientWidth;
             height = container.clientHeight;
             canvas.width = width;
             canvas.height = height;
        };
        
        window.addEventListener('resize', resize);
        resize();

        const particles: Particle[] = [];
        const particleCount = Math.min(Math.floor((width * height) / 10000), 100); // Responsive count

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;

            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.5; // Slow movement
                this.vy = (Math.random() - 0.5) * 0.5;
                this.size = Math.random() * 2 + 1;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                // Bounce off edges
                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;
            }
        }

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        };
        
        // Add mouse as an attractor/repulsor
        window.addEventListener('mousemove', handleMouseMove);

        const animate = () => {
            if(!ctx) return;
            ctx.clearRect(0, 0, width, height);
            
            // Draw background gradient gently
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, 'rgba(23, 23, 23, 0)'); // Zinc-900 like
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            // Update particles
            particles.forEach(p => p.update());

            // Draw connections
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 0.5;

            // Connect particles to each other
            for (let i = 0; i < particles.length; i++) {
                const p1 = particles[i];
                
                // Connect to mouse if close
                const dxMouse = mouseX - p1.x;
                const dyMouse = mouseY - p1.y;
                const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
                if (distMouse < 200) {
                     // Slightly push particles away from mouse for interaction
                     p1.x -= dxMouse * 0.005;
                     p1.y -= dyMouse * 0.005;

                     ctx.beginPath();
                     ctx.moveTo(p1.x, p1.y);
                     ctx.lineTo(mouseX, mouseY);
                     ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 * (1 - distMouse / 200)})`;
                     ctx.stroke();
                }

                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 150) {
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        // Opacity based on distance
                        ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * (1 - distance / 150)})`;
                        ctx.stroke();
                        
                        // Fill triangles (optional, adds "star/mesh" look)
                        // Looking for a third point to form a triangle
                         for (let k = j + 1; k < particles.length; k++) {
                            const p3 = particles[k];
                             const dist31 = Math.sqrt(Math.pow(p1.x - p3.x, 2) + Math.pow(p1.y - p3.y, 2));
                             const dist32 = Math.sqrt(Math.pow(p2.x - p3.x, 2) + Math.pow(p2.y - p3.y, 2));
                             
                             if (dist31 < 100 && dist32 < 100) {
                                  ctx.beginPath();
                                  ctx.moveTo(p1.x, p1.y);
                                  ctx.lineTo(p2.x, p2.y);
                                  ctx.lineTo(p3.x, p3.y);
                                  ctx.closePath();
                                  ctx.fillStyle = `rgba(255, 255, 255, ${0.03 * (1 - Math.max(distance, dist31, dist32) / 100)})`;
                                  ctx.fill();
                             }
                        }
                    }
                }
                
                // Draw particle
                ctx.beginPath();
                ctx.arc(p1.x, p1.y, p1.size, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.fill();
            }

            requestAnimationFrame(animate);
        };

        const animationId = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationId);
        };
    }, []);

    return (
        <div ref={containerRef} className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-navalBlue to-stone-900 overflow-hidden">
             <canvas 
                ref={canvasRef} 
                className="absolute inset-0 w-full h-full block"
            />
            {/* Overlay gradient to blend with content below if needed */}
            <div className="absolute inset-0 bg-gradient-to-t from-navalBlue/40 to-transparent pointer-events-none"></div>
        </div>
    );
};
