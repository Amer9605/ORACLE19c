import { createSVGRect, createSVGText } from './utils.js';

let svg, particles = [], animFrame;

export function initDataGuardSVG(containerId) {
    const container = document.getElementById(containerId);
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 1000 750');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    
    // Draw Primary Side (Left box)
    const primGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    primGroup.id = 'dg_primary';
    primGroup.appendChild(createSVGRect(100, 100, 250, 500, 10, 'rgba(0,0,0,0.4)', '#3b82f6', 2));
    primGroup.appendChild(createSVGText(225, 140, 'PRIMARY DB', '#93c5fd', 20));
    
    primGroup.appendChild(createSVGRect(150, 250, 150, 60, 6, '#1e293b', '#ef4444', 1));
    primGroup.appendChild(createSVGText(225, 285, 'LNS / LGWR', '#fff', 14));
    
    primGroup.appendChild(createSVGRect(150, 400, 150, 100, 6, '#1e293b', '#eab308', 1));
    primGroup.appendChild(createSVGText(225, 455, 'Online Redo', '#fff', 14));
    svg.appendChild(primGroup);
    
    // Draw Standby Side (Right box)
    const stdGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    stdGroup.id = 'dg_standby';
    stdGroup.appendChild(createSVGRect(650, 100, 250, 500, 10, 'rgba(0,0,0,0.4)', '#10b981', 2));
    stdGroup.appendChild(createSVGText(775, 140, 'PHYSICAL STANDBY', '#6ee7b7', 20));
    
    stdGroup.appendChild(createSVGRect(700, 250, 150, 60, 6, '#1e293b', '#ef4444', 1));
    stdGroup.appendChild(createSVGText(775, 285, 'RFS Process', '#fff', 14));
    
    stdGroup.appendChild(createSVGRect(700, 360, 150, 80, 6, '#1e293b', '#eab308', 1));
    stdGroup.appendChild(createSVGText(775, 405, 'Standby Redo Logs', '#fff', 14));
    
    stdGroup.appendChild(createSVGRect(700, 480, 150, 60, 6, '#1e293b', '#10b981', 1));
    stdGroup.appendChild(createSVGText(775, 515, 'MRP (Apply)', '#fff', 14));
    svg.appendChild(stdGroup);

    // Network Path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M300,280 L700,280');
    path.setAttribute('stroke', 'rgba(239, 68, 68, 0.4)');
    path.setAttribute('stroke-width', '4');
    path.setAttribute('stroke-dasharray', '8,8');
    svg.appendChild(path);

    container.appendChild(svg);
    renderParticles();
}

function renderParticles() {
    const time = performance.now();
    particles = particles.filter(p => {
        p.progress = (time - p.startTime) / p.duration;
        if(p.progress >= 1) {
            if(p.el.parentNode) svg.removeChild(p.el);
            return false;
        }
        p.el.setAttribute('cx', p.startX + (p.endX - p.startX) * p.progress);
        return true;
    });
    requestAnimationFrame(renderParticles);
}

export function simulateRedoTransport(latencyMs) {
    const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    particle.setAttribute('r', 7);
    particle.setAttribute('fill', '#ef4444');
    particle.setAttribute('cy', 280);
    particle.setAttribute('filter', 'drop-shadow(0 0 6px #ef4444)');
    svg.appendChild(particle);
    
    particles.push({
        el: particle, startX: 300, endX: 700,
        startTime: performance.now(), duration: latencyMs, progress: 0
    });
}

export function performSwitchoverVisuals() {
    document.querySelector('#dg_primary text').textContent = 'NEW STANDBY';
    document.querySelector('#dg_primary text').setAttribute('fill', '#6ee7b7');
    document.querySelector('#dg_primary rect').setAttribute('stroke', '#10b981');
    
    document.querySelector('#dg_standby text').textContent = 'NEW PRIMARY';
    document.querySelector('#dg_standby text').setAttribute('fill', '#93c5fd');
    document.querySelector('#dg_standby rect').setAttribute('stroke', '#3b82f6');
}

export function performFailoverVisuals() {
    document.querySelector('#dg_primary rect').setAttribute('stroke', '#475569');
    document.querySelector('#dg_primary text').textContent = 'FAILED PRIMARY';
    document.querySelector('#dg_primary text').setAttribute('fill', '#ef4444');
    
    document.querySelector('#dg_standby text').textContent = 'NEW PRIMARY';
    document.querySelector('#dg_standby text').setAttribute('fill', '#93c5fd');
    document.querySelector('#dg_standby rect').setAttribute('stroke', '#3b82f6');
}
